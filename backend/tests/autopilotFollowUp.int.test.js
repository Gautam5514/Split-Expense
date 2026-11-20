// The reported conversation, end to end against a REAL MongoDB with the offline
// planner (no model call): a group plan is waiting, the user asks to add one more
// person, and the plan is updated instead of a new request asking "which group?".
// Skipped unless MONGO_TEST_URI is set:
//   MONGO_TEST_URI=mongodb://127.0.0.1:27099/splitease_ap_test npm test -- autopilotFollowUp.int
import { jest } from "@jest/globals";
import { randomUUID } from "node:crypto";

const URI = process.env.MONGO_TEST_URI;
const d = URI ? describe : describe.skip;
process.env.AUTOPILOT_PROVIDER = "local";

jest.unstable_mockModule("../index.js", () => ({ io: { to: () => ({ emit: jest.fn() }), emit: jest.fn() }, onlineUsers: new Map() }));
jest.unstable_mockModule("../config/firebaseAdmin.js", () => ({ default: { auth: () => ({}), messaging: () => ({}) } }));
jest.unstable_mockModule("../utils/ocrService.js", () => ({ runOcr: jest.fn(async () => null) }));
jest.unstable_mockModule("../utils/referralService.js", () => ({ incrementExpenseCount: jest.fn(async () => {}) }));
jest.unstable_mockModule("../utils/emailService.js", () => ({ sendEmail: jest.fn(async () => {}), sendEmailsSafely: jest.fn(async () => {}) }));
jest.unstable_mockModule("../controllers/notificationController.js", () => ({ createNotification: jest.fn(async () => {}), sendPushToUsers: jest.fn(async () => {}) }));

const mongoose = (await import("mongoose")).default;
const User = (await import("../models/userModel.js")).default;
const Group = (await import("../models/groupModel.js")).default;
const { AgentRun } = await import("../modules/autopilot/models.js");
const { createRun } = await import("../modules/autopilot/run.service.js");

d("Autopilot: follow-ups to a waiting group plan", () => {
  let actor;
  const say = async (message, parent) => (await createRun(actor, { message, requestKey: randomUUID(), groupId: null, parentRunId: parent ? String(parent._id) : null })).toObject();
  const people = (run) => run.plan.steps.find((s) => s.type === "add_members")?.payload.people.map((p) => p.email || p.name) || [];

  beforeAll(async () => { await mongoose.connect(URI); await Promise.all([User, Group, AgentRun].map((M) => M.init())); });
  afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  beforeEach(async () => {
    await Promise.all([User, Group, AgentRun].map((M) => M.deleteMany({})));
    const me = await User.create({ name: "Gautam", email: "gautam@test.io", firebaseUid: "g1" });
    actor = { id: String(me._id), name: me.name, email: me.email };
  });

  test("“add one more, x@y.com isko bhi add kro isme” updates the waiting plan", async () => {
    const first = await say("Create group Business plan with a@x.com, b@x.com and c@x.com, budget 300000");
    expect(first.status).toBe("waiting_approval");
    expect(people(first)).toHaveLength(3);

    const second = await say("add one more...!!! gopo1247@gmail.com isko bhi add kro isme..!!!", first);
    // Same plan, continued: still ready to approve, now with four people, and nothing asked.
    expect(second.status).toBe("waiting_approval");
    expect(String(second.parentRunId)).toBe(String(first._id));
    expect(second.plan.clarifications).toEqual([]);
    expect(second.plan.steps.map((s) => s.type)).toEqual(first.plan.steps.map((s) => s.type));
    expect(people(second)).toEqual(expect.arrayContaining(["gopo1247@gmail.com", "a@x.com", "b@x.com", "c@x.com"]));
    expect(people(second)).toHaveLength(4);
    // The older version is closed, so only one plan is waiting.
    expect((await AgentRun.findById(first._id).lean()).status).toBe("cancelled");
    expect(await AgentRun.countDocuments({ status: "waiting_approval" })).toBe(1);

    // "The same one we just made" keeps that plan instead of asking which group.
    const third = await say("in same business mai..!! abhi jo bnye", second);
    expect(third.status).toBe("waiting_approval");
    expect(third.plan.clarifications).toEqual([]);
    expect(people(third)).toHaveLength(4);
    // Nothing was created by talking: the group only exists after approval.
    expect(await Group.countDocuments({})).toBe(0);
  });

  test("asked for a group name, the reply “my-own” becomes the name instead of the question coming back", async () => {
    const ASK = "Please provide a name for the new business group you want to create.";
    const request = "create a business plan in that three are 1. me 2 is gautamgpandit01@gmail.com 3. gautampandit797@gmail.com and the last is yashika so add these all and budges add the 3lakh";
    // The state the screenshot shows: the request was read, and a name was asked for.
    const asked = await AgentRun.create({ actorId: actor.id, groupId: null, requestKey: randomUUID(), message: request, status: "clarification_required", intent: { groupName: null, currency: null, clarification: ASK, actions: [] }, plan: { version: 1, steps: [], clarifications: [ASK], questions: [], notes: [] }, events: [] });

    const answered = await say("my-own", asked);
    expect(answered.plan.clarifications.join(" ")).not.toMatch(/name/i);
    const group = answered.plan.steps.find((s) => s.type === "create_group");
    expect(group.payload.name).toBe("my-own");
    expect(people(answered)).toEqual(expect.arrayContaining(["gautamgpandit01@gmail.com", "gautampandit797@gmail.com"]));
    expect(answered.status).toBe("waiting_approval");
    expect((await AgentRun.findById(asked._id).lean()).status).toBe("cancelled");
  });

  test("an unrelated question while a plan waits is still its own request", async () => {
    const first = await say("Create group Business plan with a@x.com, budget 300000");
    const other = await say("What's my total balance across all groups?", first);
    expect(other.parentRunId).toBeNull();
    expect((await AgentRun.findById(first._id).lean()).status).toBe("waiting_approval");
  });
});
