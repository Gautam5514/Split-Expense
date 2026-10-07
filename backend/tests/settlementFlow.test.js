// The two-party settlement request/confirm/reject/cancel state machine -
// this is the ledger-affecting logic behind task #8 ("mark as paid"). The
// app-side bug was a frontend auth-gating issue (fixed in
// splitApp/app/groups/[id].jsx), but this suite locks in the backend
// invariants that make that fix safe: a balance can only move when BOTH
// parties agree, never from one side's say-so.
import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { makeFakeModel } from "./helpers/fakeModel.js";
import { makeReq, makeRes } from "./helpers/httpMocks.js";

// A minimal User-shaped ref store so Group.findById(...).populate("members", ...)
// (used internally by computeGroupBalances) can resolve raw member ObjectIds
// to {_id, name, email} - exactly like a real populate() would.
const fakeUserRefModel = makeFakeModel([]);
const fakeGroupModel = makeFakeModel([], { members: fakeUserRefModel, createdBy: fakeUserRefModel });
const fakeExpenseModel = makeFakeModel([]);
const fakeSettlementRequestModel = makeFakeModel(
  [],
  { fromUserId: fakeUserRefModel, toUserId: fakeUserRefModel, initiatedBy: fakeUserRefModel },
  { status: "pending" } // mirrors the schema's `default: "pending"`
);
const fakeCreateNotification = jest.fn(async () => {});
const fakeIoEmit = jest.fn();
const fakeIoTo = jest.fn(() => ({ emit: fakeIoEmit }));

const fakeUserProfileModel = makeFakeModel([]);

jest.unstable_mockModule("../index.js", () => ({ io: { to: fakeIoTo }, onlineUsers: new Map() }));
jest.unstable_mockModule("../models/groupModel.js", () => ({ default: fakeGroupModel }));
jest.unstable_mockModule("../models/expenseModel.js", () => ({ default: fakeExpenseModel }));
jest.unstable_mockModule("../models/settlementRequestModel.js", () => ({ default: fakeSettlementRequestModel }));
jest.unstable_mockModule("../models/userProfileModel.js", () => ({ default: fakeUserProfileModel }));
jest.unstable_mockModule("../controllers/notificationController.js", () => ({
  createNotification: fakeCreateNotification,
}));
jest.unstable_mockModule("../utils/ocrService.js", () => ({ runOcr: jest.fn(async () => null) }));
jest.unstable_mockModule("../utils/referralService.js", () => ({ incrementExpenseCount: jest.fn(async () => {}) }));

const {
  requestSettlement,
  confirmSettlementRequest,
  rejectSettlementRequest,
  cancelSettlementRequest,
  getPendingSettlements,
} = await import("../controllers/expenseController.js");

const oid = () => new mongoose.Types.ObjectId();

/** Seeds a 2-member group where `debtor` owes `creditor` exactly `amount`. */
function seedGroupWithDebt(amount) {
  const debtorId = oid();
  const creditorId = oid();
  fakeUserRefModel.__addDoc({ _id: debtorId, name: "Debtor", email: "d@x.com" });
  fakeUserRefModel.__addDoc({ _id: creditorId, name: "Creditor", email: "c@x.com" });
  const group = fakeGroupModel.__addDoc({
    _id: oid(),
    name: "Goa Trip",
    createdBy: debtorId,
    // Raw ObjectId refs, matching what a real (non-populated) Group document
    // looks like - ensureMember()/sameId() in expenseController.js compare
    // these directly via String(), so they must NOT be pre-populated objects.
    members: [debtorId, creditorId],
  });
  // One expense paid entirely by creditor, split evenly -> debtor owes `amount`.
  fakeExpenseModel.__addDoc({
    _id: oid(),
    groupId: group._id,
    paidBy: creditorId,
    amount: amount * 2,
    splits: [{ userId: debtorId, share: amount }, { userId: creditorId, share: amount }],
  });
  // Hand back STRING ids, not ObjectId instances: a real req.user.id (set by
  // auth middleware) and req.body fields (decoded from JSON) are always
  // plain strings in production - never live ObjectId objects - and several
  // equality checks in the controller (asId, sameId) only stringify one
  // side, so a test that fed them raw ObjectIds would pass for reasons a
  // real HTTP request never would.
  return { group, debtor: String(debtorId), creditor: String(creditorId) };
}

beforeEach(() => {
  [fakeGroupModel, fakeExpenseModel, fakeSettlementRequestModel, fakeUserRefModel, fakeUserProfileModel].forEach((m) => { m._docs.length = 0; });
  fakeCreateNotification.mockClear();
  fakeIoTo.mockClear();
  fakeIoEmit.mockClear();
});

describe("requestSettlement", () => {
  test("the debtor claiming 'I paid' creates a pending request and notifies the creditor", async () => {
    const { group, debtor, creditor } = seedGroupWithDebt(500);
    const req = makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 500, method: "cash" },
    });
    const res = makeRes();

    await requestSettlement(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("pending");
    expect(fakeSettlementRequestModel._docs).toHaveLength(1);
    expect(fakeCreateNotification).toHaveBeenCalledWith(
      [String(creditor)],
      expect.stringContaining("paid you"),
      `/groups/${group._id}`,
      "settlement",
      expect.objectContaining({ kind: "requested", amount: 500 })
    );
  });

  test("the creditor marking 'I received it' settles immediately, no counter-confirmation", async () => {
    const { group, debtor, creditor } = seedGroupWithDebt(500);
    const req = makeReq({
      user: { id: creditor, name: "Creditor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 500, method: "cash" },
    });
    const res = makeRes();

    await requestSettlement(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("confirmed");
    const settlementExpense = fakeExpenseModel._docs.find((e) => e.isSettlement);
    expect(settlementExpense).toBeDefined();
    expect(settlementExpense.amount).toBe(500);
    expect(String(settlementExpense.paidBy)).toBe(String(debtor));
    expect(fakeCreateNotification).toHaveBeenCalledWith(
      [String(debtor)],
      expect.stringContaining("received"),
      `/groups/${group._id}`,
      "settlement",
      expect.objectContaining({ kind: "confirmed", amount: 500 })
    );
  });

  test("the creditor still can't settle more than the live outstanding balance", async () => {
    const { group, debtor, creditor } = seedGroupWithDebt(500);
    const req = makeReq({
      user: { id: creditor, name: "Creditor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 900 },
    });
    const res = makeRes();

    await requestSettlement(req, res);

    expect(res.statusCode).toBe(400);
    expect(fakeExpenseModel._docs.filter((e) => e.isSettlement)).toHaveLength(0);
  });

  test("rejects a claim that exceeds the live outstanding balance", async () => {
    const { group, debtor, creditor } = seedGroupWithDebt(500);
    const req = makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 10000, method: "cash" },
    });
    const res = makeRes();

    await requestSettlement(req, res);

    expect(res.statusCode).toBe(400);
    expect(fakeSettlementRequestModel._docs).toHaveLength(0);
  });

  test("rejects a settlement claim when there's no outstanding balance at all", async () => {
    const { group, debtor, creditor } = seedGroupWithDebt(0);
    const req = makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 100, method: "cash" },
    });
    const res = makeRes();

    await requestSettlement(req, res);
    expect(res.statusCode).toBe(400);
  });

  test("a bystander who isn't fromUserId or toUserId cannot start a settlement claim", async () => {
    const { group, debtor, creditor } = seedGroupWithDebt(500);
    const bystander = oid();
    const req = makeReq({
      user: { id: bystander, name: "Bystander" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 500 },
    });
    const res = makeRes();

    await requestSettlement(req, res);
    expect(res.statusCode).toBe(403);
  });

  test("rejects settling with yourself", async () => {
    const { group, debtor } = seedGroupWithDebt(500);
    const req = makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: debtor, amount: 100 },
    });
    const res = makeRes();

    await requestSettlement(req, res);
    expect(res.statusCode).toBe(400);
  });
});

describe("confirmSettlementRequest", () => {
  async function makePendingRequest(amount = 500) {
    const { group, debtor, creditor } = seedGroupWithDebt(amount);
    const reqCreate = makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount, method: "cash" },
    });
    const resCreate = makeRes();
    await requestSettlement(reqCreate, resCreate);
    const requestId = resCreate.body._id;
    return { group, debtor, creditor, requestId };
  }

  test("the counterparty confirming creates the settlement expense and zeroes the debt", async () => {
    const { group, debtor, creditor, requestId } = await makePendingRequest(500);

    const req = makeReq({ user: { id: creditor, name: "Creditor" }, params: { requestId } });
    const res = makeRes();
    await confirmSettlementRequest(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.request.status).toBe("confirmed");
    // A new settlement Expense was written, moving the balance to zero.
    const settlementExpense = fakeExpenseModel._docs.find((e) => e.isSettlement);
    expect(settlementExpense).toBeDefined();
    expect(settlementExpense.amount).toBe(500);
    expect(String(settlementExpense.paidBy)).toBe(String(debtor));

    expect(fakeCreateNotification).toHaveBeenCalledWith(
      [String(debtor)],
      expect.stringContaining("confirmed"),
      `/groups/${group._id}`,
      "settlement",
      expect.objectContaining({ kind: "confirmed" })
    );
  });

  test("the initiator cannot confirm their own settlement request", async () => {
    const { debtor, requestId } = await makePendingRequest(500);

    const req = makeReq({ user: { id: debtor, name: "Debtor" }, params: { requestId } });
    const res = makeRes();
    await confirmSettlementRequest(req, res);

    expect(res.statusCode).toBe(403);
    const stored = fakeSettlementRequestModel._docs.find((d) => String(d._id) === String(requestId));
    expect(stored.status).toBe("pending");
  });

  test("a non-party cannot confirm someone else's settlement request", async () => {
    const { requestId } = await makePendingRequest(500);
    const outsider = oid();

    const req = makeReq({ user: { id: outsider, name: "Outsider" }, params: { requestId } });
    const res = makeRes();
    await confirmSettlementRequest(req, res);

    expect(res.statusCode).toBe(403);
  });

  test("confirming an already-resolved request is rejected with 409, not double-applied", async () => {
    const { creditor, requestId } = await makePendingRequest(500);

    const req1 = makeReq({ user: { id: creditor, name: "Creditor" }, params: { requestId } });
    await confirmSettlementRequest(req1, makeRes());

    const req2 = makeReq({ user: { id: creditor, name: "Creditor" }, params: { requestId } });
    const res2 = makeRes();
    await confirmSettlementRequest(req2, res2);

    expect(res2.statusCode).toBe(409);
    // Only one settlement expense should ever have been created.
    expect(fakeExpenseModel._docs.filter((e) => e.isSettlement)).toHaveLength(1);
  });
});

describe("rejectSettlementRequest", () => {
  test("the counterparty can reject a pending claim - no balance change, requester notified", async () => {
    const { group, debtor, creditor } = seedGroupWithDebt(300);
    const reqCreate = makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 300 },
    });
    const resCreate = makeRes();
    await requestSettlement(reqCreate, resCreate);
    const requestId = resCreate.body._id;

    const req = makeReq({ user: { id: creditor, name: "Creditor" }, params: { requestId } });
    const res = makeRes();
    await rejectSettlementRequest(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("rejected");
    expect(fakeExpenseModel._docs.filter((e) => e.isSettlement)).toHaveLength(0);
    expect(fakeCreateNotification).toHaveBeenCalledWith(
      [String(debtor)],
      expect.stringContaining("wasn't confirmed"),
      expect.any(String),
      "settlement",
      expect.objectContaining({ kind: "rejected" })
    );
  });

  test("the initiator cannot reject their own request (must cancel instead)", async () => {
    const { group, debtor, creditor } = seedGroupWithDebt(300);
    const reqCreate = makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 300 },
    });
    const resCreate = makeRes();
    await requestSettlement(reqCreate, resCreate);

    const req = makeReq({ user: { id: debtor, name: "Debtor" }, params: { requestId: resCreate.body._id } });
    const res = makeRes();
    await rejectSettlementRequest(req, res);

    expect(res.statusCode).toBe(403);
  });
});

describe("cancelSettlementRequest", () => {
  test("the initiator can cancel their own still-pending request", async () => {
    const { group, debtor, creditor } = seedGroupWithDebt(200);
    const reqCreate = makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 200 },
    });
    const resCreate = makeRes();
    await requestSettlement(reqCreate, resCreate);

    const req = makeReq({ user: { id: debtor }, params: { requestId: resCreate.body._id } });
    const res = makeRes();
    await cancelSettlementRequest(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });

  test("the counterparty (non-initiator) cannot cancel someone else's request", async () => {
    const { group, debtor, creditor } = seedGroupWithDebt(200);
    const reqCreate = makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 200 },
    });
    const resCreate = makeRes();
    await requestSettlement(reqCreate, resCreate);

    const req = makeReq({ user: { id: creditor }, params: { requestId: resCreate.body._id } });
    const res = makeRes();
    await cancelSettlementRequest(req, res);

    expect(res.statusCode).toBe(403);
  });
});

// ── Robustness fixes (the "request works many times / confirm errors" bugs) ──
describe("requestSettlement idempotency", () => {
  test("a debtor tapping 'I've Paid' twice doesn't error - it returns the SAME pending request", async () => {
    const { group, debtor, creditor } = seedGroupWithDebt(500);

    const first = makeRes();
    await requestSettlement(makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 500, method: "cash" },
    }), first);
    expect(first.statusCode).toBe(201);
    expect(first.body.status).toBe("pending");

    // Second identical request - must NOT 409, must NOT create a duplicate.
    const second = makeRes();
    await requestSettlement(makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 500, method: "cash" },
    }), second);

    expect(second.statusCode).toBe(200); // idempotent OK, not a 409 error
    expect(String(second.body._id)).toBe(String(first.body._id)); // same request
    expect(fakeSettlementRequestModel._docs.filter((d) => d.status === "pending")).toHaveLength(1);
  });

  test("the re-request re-nudges the counterparty so a stuck pending can be resurfaced", async () => {
    const { group, debtor, creditor } = seedGroupWithDebt(500);
    await requestSettlement(makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 500, method: "cash" },
    }), makeRes());

    fakeCreateNotification.mockClear();
    await requestSettlement(makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 500, method: "cash" },
    }), makeRes());

    expect(fakeCreateNotification).toHaveBeenCalledWith(
      [String(creditor)],
      expect.stringContaining("still waiting"),
      `/groups/${group._id}`,
      "settlement",
      expect.objectContaining({ kind: "requested" })
    );
  });
});

describe("confirmSettlementRequest clamping", () => {
  test("when the outstanding balance shrank after the request, confirm clamps DOWN and still succeeds (no reject-and-retry loop)", async () => {
    // Debtor owes 500, files "I paid 500".
    const { group, debtor, creditor } = seedGroupWithDebt(500);
    const resCreate = makeRes();
    await requestSettlement(makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 500, method: "cash" },
    }), resCreate);
    const requestId = resCreate.body._id;

    // Meanwhile the outstanding debt drops to 300 (e.g. a separate partial
    // settlement) - creditor paid debtor 200 back via another expense.
    fakeExpenseModel.__addDoc({
      _id: oid(),
      groupId: group._id,
      paidBy: debtor,       // debtor pays, reducing what debtor owes
      amount: 400,
      splits: [{ userId: creditor, share: 200 }, { userId: debtor, share: 200 }],
    });

    // Creditor confirms. Old behavior: 409 "balances have changed, reject it".
    // New behavior: clamp to the 300 that's actually still owed and settle it.
    const res = makeRes();
    await confirmSettlementRequest(
      makeReq({ user: { id: creditor, name: "Creditor" }, params: { requestId } }),
      res
    );

    expect(res.statusCode).toBe(200);
    const settlementExpense = fakeExpenseModel._docs.find((e) => e.isSettlement);
    expect(settlementExpense).toBeDefined();
    expect(settlementExpense.amount).toBe(300); // clamped down from 500
  });

  test("when the outstanding balance is now ZERO, confirm is rejected as stale (409)", async () => {
    const { group, debtor, creditor } = seedGroupWithDebt(500);
    const resCreate = makeRes();
    await requestSettlement(makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 500, method: "cash" },
    }), resCreate);
    const requestId = resCreate.body._id;

    // The whole debt gets cleared by another expense before confirm.
    fakeExpenseModel.__addDoc({
      _id: oid(),
      groupId: group._id,
      paidBy: debtor,
      amount: 1000,
      splits: [{ userId: creditor, share: 500 }, { userId: debtor, share: 500 }],
    });

    const res = makeRes();
    await confirmSettlementRequest(
      makeReq({ user: { id: creditor, name: "Creditor" }, params: { requestId } }),
      res
    );

    expect(res.statusCode).toBe(409);
    expect(fakeExpenseModel._docs.filter((e) => e.isSettlement)).toHaveLength(0);
  });
});

describe("getPendingSettlements enrichment", () => {
  test("each pending request carries the creditor's UPI details so an orphaned row can still show 'Pay'", async () => {
    const { group, debtor, creditor } = seedGroupWithDebt(500);
    fakeUserProfileModel.__addDoc({
      _id: oid(),
      userId: creditor,
      upiId: "creditor@okaxis",
      upiQr: { url: "https://cdn.example.com/qr.png" },
    });

    await requestSettlement(makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 500, method: "cash" },
    }), makeRes());

    const res = makeRes();
    await getPendingSettlements(makeReq({ user: { id: debtor }, params: { groupId: group._id } }), res);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].toUpi).toEqual({ upiId: "creditor@okaxis", upiQrUrl: "https://cdn.example.com/qr.png" });
  });

  test("a pending request with no UPI profile still returns a null-filled toUpi (never undefined)", async () => {
    const { group, debtor, creditor } = seedGroupWithDebt(500);
    await requestSettlement(makeReq({
      user: { id: debtor, name: "Debtor" },
      body: { groupId: group._id, fromUserId: debtor, toUserId: creditor, amount: 500, method: "cash" },
    }), makeRes());

    const res = makeRes();
    await getPendingSettlements(makeReq({ user: { id: creditor }, params: { groupId: group._id } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body[0].toUpi).toEqual({ upiId: null, upiQrUrl: null });
  });
});
