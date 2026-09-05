// Covers createGroup (task #6's groupType field, now sent by both web and
// app) plus the member-management/lifecycle endpoints, against a fake Group
// model (see tests/helpers/fakeModel.js for why there's no real MongoDB here).
import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { makeFakeModel } from "./helpers/fakeModel.js";
import { makeReq, makeRes } from "./helpers/httpMocks.js";

const fakeGroupModel = makeFakeModel([]);
const fakeUserModel = makeFakeModel([]);
const fakeUserProfileModel = makeFakeModel([]);
const fakeExpenseModel = makeFakeModel([]);
const fakeGroupMessageModel = makeFakeModel([]);
const fakeNotepadModel = makeFakeModel([]);
const fakeNotificationModel = makeFakeModel([]);

const fakeCreateNotification = jest.fn(async () => {});

jest.unstable_mockModule("../models/groupModel.js", () => ({ default: fakeGroupModel }));
jest.unstable_mockModule("../models/userModel.js", () => ({ default: fakeUserModel }));
jest.unstable_mockModule("../models/userProfileModel.js", () => ({ default: fakeUserProfileModel }));
jest.unstable_mockModule("../models/expenseModel.js", () => ({ default: fakeExpenseModel }));
jest.unstable_mockModule("../models/groupMessageModel.js", () => ({ default: fakeGroupMessageModel }));
jest.unstable_mockModule("../models/notepadModel.js", () => ({ default: fakeNotepadModel }));
jest.unstable_mockModule("../models/notification.model.js", () => ({ default: fakeNotificationModel }));
jest.unstable_mockModule("../controllers/notificationController.js", () => ({
  createNotification: fakeCreateNotification,
}));
jest.unstable_mockModule("../utils/emailService.js", () => ({
  sendEmail: jest.fn(async () => {}),
  sendEmailsSafely: jest.fn(async () => {}),
}));

const {
  createGroup,
  removeMember,
  markGroupCompleted,
  deleteGroup,
} = await import("../controllers/groupController.js");

const oid = () => new mongoose.Types.ObjectId();

beforeEach(() => {
  [fakeGroupModel, fakeUserModel, fakeUserProfileModel, fakeExpenseModel, fakeGroupMessageModel, fakeNotepadModel, fakeNotificationModel]
    .forEach((m) => { m._docs.length = 0; });
  fakeCreateNotification.mockClear();
});

describe("createGroup", () => {
  test("defaults groupType to 'trip' when the client omits it (legacy web/app callers)", async () => {
    const uid = oid();
    const req = makeReq({ user: { id: uid, name: "Alice" }, body: { name: "My Group" } });
    const res = makeRes();

    await createGroup(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.groupType).toBe("trip");
    expect(res.body.name).toBe("My Group");
    expect(res.body.members.map(String)).toEqual([String(uid)]);
  });

  test("stores 'roommate' groupType when the client sends it (web's new picker, task #6)", async () => {
    const uid = oid();
    const req = makeReq({ user: { id: uid, name: "Bob" }, body: { name: "Flat 304", groupType: "roommate" } });
    const res = makeRes();

    await createGroup(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.groupType).toBe("roommate");
  });

  test.each([
    ["", "Group name is required."],
    ["   ", "Group name is required."],
    ["a", "Group name must be at least 2 characters."],
    ["x".repeat(101), "Group name must be under 100 characters."],
  ])("rejects invalid name %j", async (name, expectedMessage) => {
    const req = makeReq({ user: { id: oid(), name: "Alice" }, body: { name } });
    const res = makeRes();

    await createGroup(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.field).toBe("name");
    expect(res.body.message).toBe(expectedMessage);
  });

  test("rejects when there is no authenticated user", async () => {
    const req = makeReq({ user: undefined, body: { name: "Valid Name" } });
    const res = makeRes();

    await createGroup(req, res);

    expect(res.statusCode).toBe(401);
  });
});

describe("removeMember", () => {
  test("creator can remove a non-creator member", async () => {
    const creator = oid();
    const member = oid();
    const group = fakeGroupModel.__addDoc({
      _id: oid(),
      name: "G",
      createdBy: creator,
      members: [creator, member],
    });

    const req = makeReq({ user: { id: creator }, params: { groupId: group._id, userId: member } });
    const res = makeRes();
    await removeMember(req, res);

    expect(res.statusCode).toBe(200);
    expect(group.members.map(String)).not.toContain(String(member));
  });

  test("non-creator cannot remove a member", async () => {
    const creator = oid();
    const member = oid();
    const outsider = oid();
    const group = fakeGroupModel.__addDoc({ _id: oid(), name: "G", createdBy: creator, members: [creator, member] });

    const req = makeReq({ user: { id: outsider }, params: { groupId: group._id, userId: member } });
    const res = makeRes();
    await removeMember(req, res);

    expect(res.statusCode).toBe(403);
    expect(group.members.map(String)).toContain(String(member));
  });

  test("the creator can never be removed, even by themselves", async () => {
    const creator = oid();
    const group = fakeGroupModel.__addDoc({ _id: oid(), name: "G", createdBy: creator, members: [creator] });

    const req = makeReq({ user: { id: creator }, params: { groupId: group._id, userId: creator } });
    const res = makeRes();
    await removeMember(req, res);

    expect(res.statusCode).toBe(400);
    expect(group.members.map(String)).toContain(String(creator));
  });

  test("404s for a group that doesn't exist", async () => {
    const req = makeReq({ user: { id: oid() }, params: { groupId: oid(), userId: oid() } });
    const res = makeRes();
    await removeMember(req, res);
    expect(res.statusCode).toBe(404);
  });
});

describe("markGroupCompleted", () => {
  test("creator marks the group completed and notifies the other members", async () => {
    const creator = oid();
    const member = oid();
    const group = fakeGroupModel.__addDoc({
      _id: oid(), name: "Trip", createdBy: creator, members: [creator, member], isCompleted: false,
    });

    const req = makeReq({ user: { id: creator, name: "Creator" }, params: { groupId: group._id } });
    const res = makeRes();
    await markGroupCompleted(req, res);

    expect(res.statusCode).toBe(200);
    expect(group.isCompleted).toBe(true);
    expect(fakeCreateNotification).toHaveBeenCalledWith(
      [String(member)],
      expect.stringContaining("marked as completed"),
      `/groups/${group._id}`,
      "group",
      expect.objectContaining({ groupName: "Trip" })
    );
  });

  test("non-creator is forbidden from marking a group completed", async () => {
    const creator = oid();
    const member = oid();
    const group = fakeGroupModel.__addDoc({ _id: oid(), name: "Trip", createdBy: creator, members: [creator, member] });

    const req = makeReq({ user: { id: member, name: "Member" }, params: { groupId: group._id } });
    const res = makeRes();
    await markGroupCompleted(req, res);

    expect(res.statusCode).toBe(403);
    expect(group.isCompleted).toBeFalsy();
  });
});

describe("deleteGroup", () => {
  test("creator can delete their group, cascading related data", async () => {
    const creator = oid();
    const group = fakeGroupModel.__addDoc({ _id: oid(), name: "G", createdBy: creator, members: [creator] });
    fakeExpenseModel.__addDoc({ _id: oid(), groupId: group._id });

    const req = makeReq({ user: { id: creator }, params: { groupId: group._id } });
    const res = makeRes();
    await deleteGroup(req, res);

    expect(res.statusCode).toBe(200);
    expect(fakeGroupModel._docs.find((g) => String(g._id) === String(group._id))).toBeUndefined();
    expect(fakeExpenseModel._docs).toHaveLength(0);
  });

  test("non-creator cannot delete the group", async () => {
    const creator = oid();
    const outsider = oid();
    const group = fakeGroupModel.__addDoc({ _id: oid(), name: "G", createdBy: creator, members: [creator] });

    const req = makeReq({ user: { id: outsider }, params: { groupId: group._id } });
    const res = makeRes();
    await deleteGroup(req, res);

    expect(res.statusCode).toBe(403);
    expect(fakeGroupModel._docs).toHaveLength(1);
  });
});
