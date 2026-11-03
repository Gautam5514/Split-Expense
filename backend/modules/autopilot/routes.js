import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import Group from "../../models/groupModel.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { AgentRun, BudgetMonitor, BudgetNotice } from "./models.js";
import { objectId } from "./contracts.js";
import { authorizedRun, memberGroup } from "./context.js";
import { createRun, decide, executeRun, event } from "./run.service.js";
import { checkBudgets } from "./monitor.service.js";
import { describeProviders } from "./llm.js";
import { realtime } from "./domain.js";
const router = express.Router();
const STALE_MS = 2 * 60_000;
if (process.env.NODE_ENV !== "test") {
  const ai = describeProviders();
  console.info(`[autopilot] enabled=${process.env.AUTOPILOT_ENABLED === "true"} writes=${process.env.AUTOPILOT_WRITES_ENABLED === "true"} planner=${ai.mode === "ai" ? `${ai.label} (${ai.model})${ai.fallbacks.length ? ` + ${ai.fallbacks.join(", ")}` : ""}` : "offline only (no AI key set)"}`);
}
// Off unless AUTOPILOT_ENABLED=true. Writes need a second switch (AUTOPILOT_WRITES_ENABLED).
router.use((req, res, next) => {
  if (process.env.AUTOPILOT_ENABLED !== "true") return res.status(404).json({ code: "AUTOPILOT_DISABLED", message: "Autopilot is disabled on this server." });
  next();
});
router.use(authMiddleware);
// Executed expenses notify members and refresh open screens, like the manual flow.
router.use((req, res, next) => { realtime.io ||= req.app?.get?.("io") || null; next(); });
// Per user per minute: reads (status polling) 240, other writes 60, new runs (each may call
// several LLMs) 20. Separate budgets so a long plan can't lock its owner out of progress checks.
const limiter = (limit, skip) => rateLimit({
  windowMs: 60000, limit, skip, keyGenerator: req => req.user.id, standardHeaders: "draft-8", legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ code: "RATE_LIMITED", message: "You're going a little fast. Give it a few seconds and try again." }),
});
router.use(limiter(240, req => req.method !== "GET"));
router.use(limiter(60, req => req.method === "GET"));
router.post("/runs", limiter(20));
const route = fn => (req,res,next) => Promise.resolve(fn(req,res)).catch(next);
const getRun = req => authorizedRun(AgentRun, req.user.id, objectId.parse(req.params.runId));
const present = run => {
  const data = run.toObject();
  // Lets the UI offer Resume/Cancel when a run stopped making progress (e.g. a server restart).
  const stale = ["planning", "running"].includes(data.status) && Date.now() - new Date(data.updatedAt).getTime() > STALE_MS;
  return { ...data, runId: String(run._id), writesEnabled: process.env.AUTOPILOT_WRITES_ENABLED === "true", stale };
};
router.get("/capabilities", (req,res) => res.json({ enabled: true, writesEnabled: process.env.AUTOPILOT_WRITES_ENABLED === "true", ai: describeProviders(), provider: describeProviders().provider, monitoring: "on_demand", features: ["edit_plan", "read_overall", "list_expenses", "group_types", "delete"] }));
router.get("/groups", route(async (req,res) => res.json(await Group.find({ members: req.user.id }).select("name settings.currency groupType photo.url").limit(100).lean())));
router.post("/runs", route(async (req,res) => {
  const run = await createRun(req.user, req.body);
  res.status(201).json(present(run));
}));
router.get("/runs", route(async (req,res) => {
  // Historical data is hidden immediately when current group membership ends.
  const groups = await Group.find({ members: req.user.id }).select("_id").lean();
  res.json(await AgentRun.find({ actorId: req.user.id, expiresAt: { $gt: new Date() }, $or: [{ groupId: null }, { groupId: { $in: groups.map(g => g._id) } }] }).select("message status createdAt groupId").sort({ createdAt: -1 }).limit(30).lean());
}));
router.get("/runs/:runId", route(async (req,res) => res.json(present(await getRun(req)))));
router.post("/runs/:runId/decision", route(async (req,res) => res.json(present(await decide(req.user, objectId.parse(req.params.runId), req.body)))));
router.post("/runs/:runId/resume", route(async (req,res) => {
  const run = await getRun(req);
  // A run that is genuinely still executing must not be driven twice in parallel.
  const busy = () => Object.assign(new Error("Still working on this one. Give it a moment."), { status: 409, code: "STILL_RUNNING" });
  if (run.status === "running" && Date.now() - new Date(run.updatedAt).getTime() < STALE_MS) throw busy();
  // Claim the run atomically so two resume clicks can't drive it in parallel.
  const claim = await AgentRun.updateOne({ _id: run._id, updatedAt: run.updatedAt }, { $set: { updatedAt: new Date() } }, { timestamps: false });
  if (!claim.modifiedCount) throw busy();
  await executeRun(req.user, req.params.runId);
  res.json(present(await getRun(req)));
}));
router.post("/runs/:runId/cancel", route(async (req,res) => {
  await getRun(req);
  await AgentRun.updateOne({ _id: req.params.runId, actorId: req.user.id, status: { $in: ["planning", "waiting_approval", "clarification_required", "running", "partial_success", "failed"] } }, { $set: { status: "cancelled" }, $push: { events: event("run.cancelled") } });
  res.json(present(await getRun(req)));
}));
router.get("/runs/:runId/events", route(async (req,res) => {
  await getRun(req);
  const cursor = req.headers["last-event-id"] || req.query.after || "0";
  let after = /^\d+$/.test(String(cursor)) ? Number(cursor) : 0;
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  let closed = false;
  req.on("close", () => { closed = true; });
  // Finite stream: clients reconnect using last event ID, no unbounded sockets.
  for (let i = 0; i < 25 && !closed; i++) {
    try {
      const run = await getRun(req); // Reauthorize every poll, including revocation.
      for (; after < run.events.length; after++) {
        const e = run.events[after];
        res.write(`id: ${after + 1}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
      }
      if (!["planning", "running"].includes(run.status)) break;
      res.write(": keepalive\n\n");
      await new Promise(resolve => {
        const done = () => { clearTimeout(timer); req.off("close", done); resolve(); };
        const timer = setTimeout(done, 1000); req.once("close", done);
      });
    } catch { break; }
  }
  res.end();
}));
router.get("/monitors", route(async (req,res) => {
  const groups = await Group.find({ members: req.user.id }).select("_id").lean();
  const filter = { ownerId: req.user.id, groupId: { $in: groups.map(g => g._id) } };
  res.json({ rules: await BudgetMonitor.find(filter).lean(), notices: await BudgetNotice.find(filter).sort({ createdAt: -1 }).limit(30).lean() });
}));
router.post("/monitors/check", route(async (req,res) => { await checkBudgets(req.user.id); res.json({ checked: true }); }));
router.patch("/monitors/:id", route(async (req,res) => {
  objectId.parse(req.params.id);
  z.object({ enabled: z.literal(false) }).strict().parse(req.body);
  const rule = await BudgetMonitor.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!rule) return res.status(404).json({ message: "Rule unavailable." });
  await memberGroup(req.user.id, rule.groupId);
  await BudgetMonitor.updateOne({ _id: rule._id, ownerId: req.user.id }, { $set: { enabled: false } });
  res.json({ enabled: false });
}));
router.use((err,req,res,next) => {
  if (res.headersSent) return next(err);
  const invalid = err instanceof z.ZodError;
  res.status(invalid ? 400 : err.status || 500).json({ code: invalid ? "INVALID_INPUT" : typeof err.code === "string" ? err.code : "AUTOPILOT_ERROR", message: invalid ? "Invalid request or plan. Check amounts, IDs and required fields." : err.status && err.status < 500 ? err.message : "Autopilot could not complete this request. Please try again." });
});
export default router;
