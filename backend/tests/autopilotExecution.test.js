// Mocked domain/transaction tests: no server, database or provider is started.
import { jest, beforeEach, afterAll } from "@jest/globals";
const originalFlag = process.env.AUTOPILOT_WRITES_ENABLED;
afterAll(() => { if (originalFlag === undefined) delete process.env.AUTOPILOT_WRITES_ENABLED; else process.env.AUTOPILOT_WRITES_ENABLED = originalFlag; });
const actor = { id: "000000000000000000000001" };
let run;
const Model = {
  findOne: jest.fn(() => ({ session: async () => run })),
  findById: jest.fn(() => ({ select: () => ({ lean: async () => ({ groupId: run.groupId }) }), then: resolve => Promise.resolve(run).then(resolve) })),
  updateOne: jest.fn(async (filter, update) => {
    if (filter.status === "running" && run.status !== "running") return;
    if (update.$set) Object.assign(run, update.$set);
    if (update.$push?.events) run.events.push(update.$push.events);
  }),
  findOneAndUpdate: jest.fn(),
};
const authorize = jest.fn();
const snapshot = jest.fn();
const applyStep = jest.fn();
jest.unstable_mockModule("mongoose", () => ({ default: { connection: { transaction: async fn => fn({}) } } }));
jest.unstable_mockModule("../models/groupModel.js", () => ({ default: {} }));
jest.unstable_mockModule("../models/userModel.js", () => ({ default: {} }));
jest.unstable_mockModule("../modules/autopilot/models.js", () => ({ AgentRun: Model }));
jest.unstable_mockModule("../modules/autopilot/context.js", () => ({ authorizedRun: authorize, snapshot, fail: (status, code, message) => Object.assign(new Error(message), { status, code }) }));
jest.unstable_mockModule("../modules/autopilot/domain.js", () => ({ applyStep }));
jest.unstable_mockModule("../modules/autopilot/insights.js", () => ({ computeInsights: jest.fn() }));
jest.unstable_mockModule("../modules/autopilot/planner.js", () => ({ extractIntent: jest.fn(), buildPlan: jest.fn(), collectPeopleRefs: jest.fn() }));
jest.unstable_mockModule("../modules/autopilot/people.js", () => ({ resolvePeople: jest.fn() }));
jest.unstable_mockModule("../utils/contacts.js", () => ({ getContactIds: jest.fn() }));
jest.unstable_mockModule("../middleware/validate.js", () => ({ isValidEmail: jest.fn(), normalizeEmail: jest.fn() }));
jest.unstable_mockModule("../controllers/balanceController.js", () => ({ invalidateBalanceCache: jest.fn(), computeGroupBalances: jest.fn(), buildSettlement: jest.fn() }));
const { executeRun, decide } = await import("../modules/autopilot/run.service.js");
const { hash } = await import("../modules/autopilot/contracts.js");
beforeEach(() => {
  jest.clearAllMocks();
  process.env.AUTOPILOT_WRITES_ENABLED = "true";
  const plan = { version: 1, clarifications: [], steps: [{ id: "step_1", type: "create_expense", requiresApproval: true }, { id: "step_2", type: "create_expense", requiresApproval: true }] };
  run = { _id: "000000000000000000000010", actorId: actor.id, groupId: "000000000000000000000020", status: "running", planVersion: 1, plan, payloadHash: hash(plan), snapshotHash: "approved", results: [], events: [], approvals: [{ decision: "approve", approverId: actor.id, planVersion: 1, payloadHash: hash(plan) }], save: jest.fn(async () => {}) };
  authorize.mockImplementation(async () => run);
  snapshot.mockResolvedValue({ fingerprint: "approved" });
  applyStep.mockImplementation(async step => ({ recordId: `record-${step.id}`, verified: true }));
});
test("kill switch stops even an approved run", async () => {
  process.env.AUTOPILOT_WRITES_ENABLED = "false";
  await expect(executeRun(actor, run._id)).rejects.toMatchObject({ code: "WRITES_DISABLED" });
  expect(applyStep).not.toHaveBeenCalled();
});
test("execution requires a persisted matching approval", async () => {
  run.approvals = [];
  await expect(executeRun(actor, run._id)).rejects.toMatchObject({ code: "APPROVAL_REQUIRED" });
  expect(applyStep).not.toHaveBeenCalled();
});
test("unavailable owner or group stops before tools", async () => {
  authorize.mockRejectedValue(Object.assign(new Error("Unavailable"), { status: 404 }));
  await expect(executeRun(actor, run._id)).rejects.toMatchObject({ status: 404 });
  expect(applyStep).not.toHaveBeenCalled();
});
test("resume skips committed steps and uses stable ledger keys", async () => {
  run.results.push({ stepId: "step_1", verified: true });
  await executeRun(actor, run._id);
  expect(applyStep).toHaveBeenCalledTimes(1);
  expect(applyStep.mock.calls[0][0].id).toBe("step_2");
  expect(run.results[1].idempotencyKey).toBe(`${run._id}:step_2:v1`);
  expect(run.status).toBe("completed");
});
test("failure preserves committed results and halts remaining work", async () => {
  applyStep.mockImplementation(async step => {
    if (step.id === "step_2") throw Object.assign(new Error("Changed context"), { status: 409, code: "STALE_CONTEXT" });
    return { verified: true, recordId: "first" };
  });
  await executeRun(actor, run._id);
  expect(run.results.map(r => r.stepId)).toEqual(["step_1"]);
  expect(run.status).toBe("partial_success");
});
test("changed context blocks all tools", async () => {
  snapshot.mockResolvedValue({ fingerprint: "changed" });
  await executeRun(actor, run._id);
  expect(applyStep).not.toHaveBeenCalled();
  expect(run.status).toBe("failed");
});
test("cancelled runs cannot resume", async () => {
  run.status = "cancelled";
  await expect(executeRun(actor, run._id)).rejects.toMatchObject({ code: "NOT_RESUMABLE" });
  expect(applyStep).not.toHaveBeenCalled();
});
test("stale approval is refused before compare-and-swap", async () => {
  run.status = "waiting_approval";
  snapshot.mockResolvedValue({ fingerprint: "changed" });
  await expect(decide(actor, run._id, { decision: "approve", planVersion: 1, payloadHash: run.payloadHash, approvedStepIds: ["step_1", "step_2"] })).rejects.toMatchObject({ code: "STALE_CONTEXT" });
  expect(Model.findOneAndUpdate).not.toHaveBeenCalled();
});
