// Controller-level integration tests for the SSRF fixes: these drive the
// actual Express handlers (not just the helper) to prove the guard is wired
// in, returns the right status, and — critically — that the dangerous
// downstream call (Cloudinary remote-fetch / OCR fetch) is NEVER reached
// when the payload is hostile.
import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { makeFakeModel } from "./helpers/fakeModel.js";
import { makeReq, makeRes } from "./helpers/httpMocks.js";

// --- Shared fakes -----------------------------------------------------------
const fakeGroupModel = makeFakeModel([]);
const fakeExpenseModel = makeFakeModel([]);
const fakeSettlementModel = makeFakeModel([]);
const fakeUserProfileModel = makeFakeModel([]);

// The one function an SSRF must never reach: Cloudinary's remote-fetch upload.
const cloudinaryUpload = jest.fn(async () => ({
  secure_url: "https://res.cloudinary.com/x/y.png",
  public_id: "y",
  resource_type: "image",
}));
const cloudinaryDestroy = jest.fn(async () => ({ result: "ok" }));
const runOcr = jest.fn(async () => "some ocr text");

jest.unstable_mockModule("../config/cloudinary.js", () => ({
  default: { uploader: { upload: cloudinaryUpload, destroy: cloudinaryDestroy } },
}));
jest.unstable_mockModule("../utils/ocrService.js", () => ({ runOcr }));

// expenseController side-effect imports we don't exercise here.
jest.unstable_mockModule("../index.js", () => ({
  io: { to: () => ({ emit: jest.fn() }), emit: jest.fn() },
  onlineUsers: new Map(),
}));
jest.unstable_mockModule("../config/firebaseAdmin.js", () => ({
  default: { auth: () => ({ updateUser: jest.fn(async () => {}) }) },
}));
jest.unstable_mockModule("../controllers/notificationController.js", () => ({
  createNotification: jest.fn(async () => {}),
  sendPushToUsers: jest.fn(async () => {}),
}));
jest.unstable_mockModule("../utils/referralService.js", () => ({
  incrementExpenseCount: jest.fn(async () => {}),
  checkAndQualifyMilestones: jest.fn(async () => {}),
  cancelPendingReferralFor: jest.fn(async () => {}),
}));

jest.unstable_mockModule("../models/groupModel.js", () => ({ default: fakeGroupModel }));
jest.unstable_mockModule("../models/expenseModel.js", () => ({ default: fakeExpenseModel }));
jest.unstable_mockModule("../models/settlementRequestModel.js", () => ({ default: fakeSettlementModel }));
jest.unstable_mockModule("../models/userProfileModel.js", () => ({ default: fakeUserProfileModel }));
jest.unstable_mockModule("../models/userModel.js", () => ({ default: makeFakeModel([]) }));

const { addExpense } = await import("../controllers/expenseController.js");
const { uploadMedia } = await import("../controllers/uploadController.js");
const { uploadProfileImage } = await import("../controllers/userProfileController.js");

const oid = () => new mongoose.Types.ObjectId();

beforeEach(() => {
  fakeGroupModel._docs.length = 0;
  fakeExpenseModel._docs.length = 0;
  fakeUserProfileModel._docs.length = 0;
  cloudinaryUpload.mockClear();
  cloudinaryDestroy.mockClear();
  runOcr.mockClear();
});

// ---------------------------------------------------------------------------
// FIX #1 — SSRF via OCR fileUrl (addExpense)
// ---------------------------------------------------------------------------
describe("addExpense OCR SSRF guard (fileUrl)", () => {
  const seedGroupWithMember = (uid) => {
    const group = { _id: oid(), name: "G", members: [uid], createdBy: uid };
    fakeGroupModel.__addDoc(group);
    return group;
  };

  const baseBody = (groupId, fileUrl) => ({
    groupId: String(groupId),
    description: "Dinner",
    amount: 300,
    splitType: "equal",
    fileUrl,
  });

  const ssrfUrls = [
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost:5000/internal",
    "https://evil.com/x.png",
    "http://res.cloudinary.com/demo/image.png",       // http, not https
    "https://res.cloudinary.com.evil.com/x.png",      // host spoof
    "file:///etc/passwd",
  ];

  test.each(ssrfUrls)("rejects hostile fileUrl %s with 400 and never calls OCR", async (url) => {
    const uid = oid();
    const group = seedGroupWithMember(uid);
    const req = makeReq({ user: { id: uid }, body: baseBody(group._id, url) });
    const res = makeRes();

    await addExpense(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ field: "fileUrl" });
    expect(runOcr).not.toHaveBeenCalled();          // the SSRF sink was never hit
  });

  test("allows a trusted https://res.cloudinary.com fileUrl through to OCR", async () => {
    const uid = oid();
    const group = seedGroupWithMember(uid);
    const url = "https://res.cloudinary.com/demo/image/upload/receipt.jpg";
    const req = makeReq({ user: { id: uid }, body: baseBody(group._id, url) });
    const res = makeRes();

    await addExpense(req, res);

    expect(runOcr).toHaveBeenCalledWith(url);         // sink reached only for trusted host
    expect(res.statusCode).toBe(201);
  });

  test("no fileUrl at all skips OCR entirely (optional field)", async () => {
    const uid = oid();
    const group = seedGroupWithMember(uid);
    const req = makeReq({ user: { id: uid }, body: baseBody(group._id, undefined) });
    const res = makeRes();

    await addExpense(req, res);

    expect(runOcr).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// FIX #2 — SSRF via Cloudinary upload payload (uploadMedia + uploadProfileImage)
// ---------------------------------------------------------------------------
describe("uploadMedia SSRF guard (upload payload)", () => {
  const hostile = [
    "https://res.cloudinary.com/demo/image.png",   // raw URL -> Cloudinary remote-fetch
    "http://169.254.169.254/latest/meta-data/",
    "https://evil.com/x.png",
    "file:///etc/passwd",
  ];

  test.each(hostile)("rejects raw URL %s with 400 and never calls Cloudinary", async (file) => {
    const req = makeReq({ body: { file } });
    const res = makeRes();

    await uploadMedia(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ message: "Invalid file payload" });
    expect(cloudinaryUpload).not.toHaveBeenCalled();
  });

  test("400 when no file provided (never calls Cloudinary)", async () => {
    const req = makeReq({ body: {} });
    const res = makeRes();
    await uploadMedia(req, res);
    expect(res.statusCode).toBe(400);
    expect(cloudinaryUpload).not.toHaveBeenCalled();
  });

  test("accepts a base64 data URI and forwards it to Cloudinary", async () => {
    const file = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA=";
    const req = makeReq({ body: { file } });
    const res = makeRes();

    await uploadMedia(req, res);

    expect(cloudinaryUpload).toHaveBeenCalledTimes(1);
    expect(cloudinaryUpload.mock.calls[0][0]).toBe(file);
    expect(res.body).toMatchObject({ url: expect.any(String), public_id: expect.any(String) });
  });
});

describe("uploadProfileImage SSRF guard (upload payload)", () => {
  test("rejects a raw URL with 400 and never calls Cloudinary", async () => {
    const uid = oid();
    const req = makeReq({ user: { id: uid }, body: { file: "https://evil.com/x.png" } });
    const res = makeRes();

    await uploadProfileImage(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ message: "Invalid file payload" });
    expect(cloudinaryUpload).not.toHaveBeenCalled();
  });

  test("accepts a base64 data URI and uploads it", async () => {
    const uid = oid();
    // Seed a profile doc so the fake's findOneAndUpdate (no upsert support)
    // has a row to update and returns a doc rather than null.
    fakeUserProfileModel.__addDoc({ _id: oid(), userId: uid });
    const file = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD=";
    const req = makeReq({ user: { id: uid }, body: { file } });
    const res = makeRes();

    await uploadProfileImage(req, res);

    expect(cloudinaryUpload).toHaveBeenCalledTimes(1);
    expect(cloudinaryUpload.mock.calls[0][0]).toBe(file);
    expect(res.body).toMatchObject({ message: "Profile image updated successfully" });
  });
});
