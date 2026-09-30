// /balances/summary replaces one /balances/:groupId request per group on the
// home screens. It must report exactly what the per-group maths reports.
import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { makeFakeModel } from "./helpers/fakeModel.js";
import { makeReq, makeRes } from "./helpers/httpMocks.js";

const fakeUserModel = makeFakeModel([]);
const fakeGroupModel = makeFakeModel([], { members: fakeUserModel });
const fakeExpenseModel = makeFakeModel([]);
const fakeProfileModel = makeFakeModel([]);

jest.unstable_mockModule("../models/groupModel.js", () => ({ default: fakeGroupModel }));
jest.unstable_mockModule("../models/expenseModel.js", () => ({ default: fakeExpenseModel }));
jest.unstable_mockModule("../models/userProfileModel.js", () => ({ default: fakeProfileModel }));

const { getMyBalanceSummary, computeGroupBalances } = await import("../controllers/balanceController.js");

const oid = () => new mongoose.Types.ObjectId();

beforeEach(() => {
  [fakeUserModel, fakeGroupModel, fakeExpenseModel].forEach((m) => { m._docs.length = 0; });
});

test("totals match the per-group balances and skip completed groups", async () => {
  const me = oid(), a = oid(), b = oid();
  [me, a, b].forEach((id, i) => fakeUserModel.__addDoc({ _id: id, name: `U${i}`, email: `u${i}@x.com` }));
  const g1 = fakeGroupModel.__addDoc({ _id: oid(), name: "Flat", members: [me, a] });
  const g2 = fakeGroupModel.__addDoc({ _id: oid(), name: "Trip", members: [me, a, b] });
  const done = fakeGroupModel.__addDoc({ _id: oid(), name: "Old", members: [me, a], isCompleted: true });

  // g1: A paid 1000 split evenly -> I owe 500
  fakeExpenseModel.__addDoc({ _id: oid(), groupId: g1._id, paidBy: a, amount: 1000,
    splits: [{ userId: me, share: 500 }, { userId: a, share: 500 }] });
  // g2: I paid 900 split 3 ways (-> +600), then a multi-payer 300 split 3 ways
  fakeExpenseModel.__addDoc({ _id: oid(), groupId: g2._id, paidBy: me, amount: 900,
    splits: [{ userId: me, share: 300 }, { userId: a, share: 300 }, { userId: b, share: 300 }] });
  fakeExpenseModel.__addDoc({ _id: oid(), groupId: g2._id, paidBy: a, amount: 300,
    payers: [{ userId: a, amount: 200 }, { userId: me, amount: 100 }],
    splits: [{ userId: me, share: 100 }, { userId: a, share: 100 }, { userId: b, share: 100 }] });
  // completed group must not count
  fakeExpenseModel.__addDoc({ _id: oid(), groupId: done._id, paidBy: a, amount: 400,
    splits: [{ userId: me, share: 400 }] });

  const res = makeRes();
  await getMyBalanceSummary(makeReq({ user: { id: String(me) } }), res);

  const expected = {};
  for (const g of [g1, g2]) {
    expected[String(g._id)] = (await computeGroupBalances(g._id)).balances[String(me)];
  }
  expect(res.body.perGroup).toEqual(expected);
  expect(res.body.perGroup[String(g1._id)]).toBe(-500);
  expect(res.body.perGroup[String(g2._id)]).toBe(600);
  expect(res.body.totalOwe).toBe(500);
  expect(res.body.totalOwed).toBe(600);
});

test("no groups -> zero totals", async () => {
  const res = makeRes();
  await getMyBalanceSummary(makeReq({ user: { id: String(oid()) } }), res);
  expect(res.body).toEqual({ totalOwed: 0, totalOwe: 0, perGroup: {} });
});
