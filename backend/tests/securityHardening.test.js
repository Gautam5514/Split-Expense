// Controller-level tests for the security hardening pass. Models are replaced
// by jest.fn() stubs so each test can assert exactly which DB operation (and
// with which filter) a handler performs - e.g. that OTP attempts are claimed
// atomically, or that a non-member never reaches the user search query.
import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { makeReq, makeRes } from "./helpers/httpMocks.js";

// Thenable query stub supporting the chain methods controllers use.
const q = (value) => {
  const chain = {
    select: () => chain, lean: () => chain, populate: () => chain,
    sort: () => chain, limit: () => chain, skip: () => chain,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return chain;
};
const model = () => ({
  find: jest.fn(() => q([])),
  findOne: jest.fn(() => q(null)),
  findById: jest.fn(() => q(null)),
  findOneAndUpdate: jest.fn(() => q(null)),
  findByIdAndUpdate: jest.fn(() => q(null)),
  updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
  updateMany: jest.fn(async () => ({})),
  deleteOne: jest.fn(async () => ({})),
  deleteMany: jest.fn(async () => ({})),
  exists: jest.fn(async () => null),
  create: jest.fn(async (d) => ({ _id: new mongoose.Types.ObjectId(), ...d })),
  countDocuments: jest.fn(async () => 0),
});

const User = model();
const SignupOtp = model();
const Group = model();
const UserProfile = model();
const Notepad = model();
const JobPosting = model();
const JobApplication = model();

const cloudinaryUpload = jest.fn(async () => ({ secure_url: "https://res.cloudinary.com/x.png", public_id: "x", resource_type: "image" }));
const sendEmail = jest.fn(async () => {});
const sendEmailsSafely = jest.fn(async () => {});
const firebaseAuth = {
  verifyIdToken: jest.fn(),
  updateUser: jest.fn(async () => {}),
  revokeRefreshTokens: jest.fn(async () => {}),
  getUserByEmail: jest.fn(),
  createUser: jest.fn(),
  createCustomToken: jest.fn(),
  deleteUser: jest.fn(),
};

jest.unstable_mockModule("../models/userModel.js", () => ({ default: User }));
jest.unstable_mockModule("../models/signupOtpModel.js", () => ({ default: SignupOtp }));
jest.unstable_mockModule("../models/groupModel.js", () => ({ default: Group }));
jest.unstable_mockModule("../models/userProfileModel.js", () => ({ default: UserProfile }));
jest.unstable_mockModule("../models/notepadModel.js", () => ({ default: Notepad }));
jest.unstable_mockModule("../models/jobPostingModel.js", () => ({ default: JobPosting }));
jest.unstable_mockModule("../models/jobApplicationModel.js", () => ({ default: JobApplication }));
jest.unstable_mockModule("../models/expenseModel.js", () => ({ default: model() }));
jest.unstable_mockModule("../models/groupMessageModel.js", () => ({ default: model() }));
jest.unstable_mockModule("../models/notification.model.js", () => ({ default: model() }));
jest.unstable_mockModule("../models/settlementRequestModel.js", () => ({ default: model() }));
jest.unstable_mockModule("../models/conversationModel.js", () => ({ default: model() }));
jest.unstable_mockModule("../models/groupInviteModel.js", () => ({ default: model() }));
jest.unstable_mockModule("../config/cloudinary.js", () => ({
  default: { uploader: { upload: cloudinaryUpload, destroy: jest.fn(async () => ({})) } },
}));
jest.unstable_mockModule("../config/firebaseAdmin.js", () => ({ default: { auth: () => firebaseAuth } }));
jest.unstable_mockModule("../utils/emailService.js", () => ({ sendEmail, sendEmailsSafely }));
jest.unstable_mockModule("../utils/ocrService.js", () => ({ runOcr: jest.fn() }));
jest.unstable_mockModule("../index.js", () => ({
  io: { to: () => ({ emit: jest.fn() }) },
  onlineUsers: new Map(),
}));
jest.unstable_mockModule("../controllers/notificationController.js", () => ({
  createNotification: jest.fn(async () => {}),
  sendPushToUsers: jest.fn(async () => {}),
}));
jest.unstable_mockModule("../utils/referralService.js", () => ({
  findOrCreateUser: jest.fn(),
  attributeReferral: jest.fn(),
  recordActiveDay: jest.fn(async () => {}),
  incrementExpenseCount: jest.fn(async () => {}),
  checkAndQualifyMilestones: jest.fn(async () => {}),
  cancelPendingReferralFor: jest.fn(async () => {}),
}));

const bcrypt = (await import("bcryptjs")).default;
const auth = await import("../controllers/authController.js");
const { uploadMedia, uploadAdminMedia } = await import("../controllers/uploadController.js");
const { buildProfileUpdate, updateProfile } = await import("../controllers/userProfileController.js");
const { buildSplits } = await import("../controllers/expenseController.js");
const { applyToJob } = await import("../controllers/careerController.js");
const { listAvailableUsers, joinGroupByInvite } = await import("../controllers/groupController.js");
const { reorderSteps } = await import("../controllers/notepadController.js");
const { listUsers } = await import("../controllers/userController.js");

const oid = () => new mongoose.Types.ObjectId();
const PNG = "data:image/png;base64,iVBORw0KGgo=";

beforeEach(() => {
  jest.clearAllMocks();
  for (const m of [User, SignupOtp, Group, UserProfile, Notepad, JobPosting, JobApplication]) {
    m.findOne.mockImplementation(() => q(null));
    m.findById.mockImplementation(() => q(null));
    m.findOneAndUpdate.mockImplementation(() => q(null));
    m.find.mockImplementation(() => q([]));
    m.exists.mockImplementation(async () => null);
  }
});

// ---------------------------------------------------------------------------
describe("login: no user enumeration, no secret leakage", () => {
  test("unknown email and wrong password get the SAME message", async () => {
    const res1 = makeRes();
    await auth.login(makeReq({ body: { email: "nobody@x.com", password: "Password1" } }), res1);

    const hash = await bcrypt.hash("RealPassword1", 4);
    User.findOne.mockImplementation(() => q({ _id: oid(), email: "a@x.com", password: hash }));
    const res2 = makeRes();
    await auth.login(makeReq({ body: { email: "a@x.com", password: "WrongPass1" } }), res2);

    expect(res1.statusCode).toBe(400);
    expect(res2.statusCode).toBe(400);
    expect(res1.body).toEqual(res2.body);
  });

  test("successful login response never contains the password hash or OTP state", async () => {
    const hash = await bcrypt.hash("RealPassword1", 4);
    User.findOne.mockImplementation(() =>
      q({ _id: oid(), name: "A", email: "a@x.com", password: hash, loginOtp: "h", resetPasswordToken: "t", webPushTokens: ["f"] })
    );
    const res = makeRes();
    await auth.login(makeReq({ body: { email: "A@X.com ", password: "RealPassword1" } }), res);
    expect(res.statusCode).toBe(200);
    const json = JSON.stringify(res.body);
    expect(json).not.toContain(hash);
    expect(res.body.user).not.toHaveProperty("password");
    expect(res.body.user).not.toHaveProperty("loginOtp");
    expect(res.body.user).not.toHaveProperty("resetPasswordToken");
    expect(res.body.user).not.toHaveProperty("webPushTokens");
    // normalized AND original casing are both tried (legacy mixed-case rows)
    expect(User.findOne).toHaveBeenCalledWith({ email: { $in: ["a@x.com", "A@X.com"] } });
    // non-secret fields the clients use are still returned
    expect(res.body.user).toMatchObject({ name: "A", email: "a@x.com" });
  });

  test("operator-injection email ({$ne:null}) is rejected before any DB query", async () => {
    const res = makeRes();
    await auth.login(makeReq({ body: { email: { $ne: null }, password: "x" } }), res);
    expect(res.statusCode).toBe(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe("verifyLoginOtp: atomic attempt counter", () => {
  test("claims an attempt with a filter that enforces the cap (no read-then-save race)", async () => {
    const res = makeRes();
    await auth.verifyLoginOtp(makeReq({ body: { email: "a@x.com", otp: "123456" } }), res);
    const [filter, update] = User.findOneAndUpdate.mock.calls[0];
    expect(filter).toMatchObject({ email: { $in: ["a@x.com"] }, loginOtpAttempts: { $lt: 5 } });
    expect(filter.loginOtpExpires).toHaveProperty("$gt");
    expect(update).toEqual({ $inc: { loginOtpAttempts: 1 } });
  });

  test("unknown user and no pending OTP give the same generic answer", async () => {
    const res = makeRes();
    await auth.verifyLoginOtp(makeReq({ body: { email: "ghost@x.com", otp: "123456" } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/No OTP found/);
  });

  test("locked-out code (attempts exhausted) returns 429 and is wiped", async () => {
    const id = oid();
    User.findOne.mockImplementation(() => q({ _id: id, loginOtpAttempts: 5 }));
    const res = makeRes();
    await auth.verifyLoginOtp(makeReq({ body: { email: "a@x.com", otp: "123456" } }), res);
    expect(res.statusCode).toBe(429);
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: id },
      { $set: { loginOtp: null, loginOtpExpires: null, loginOtpAttempts: 0 } }
    );
  });

  test("non-6-digit / object OTP never matches", async () => {
    User.findOneAndUpdate.mockImplementation(() => q({ _id: oid(), loginOtp: "a".repeat(64) }));
    const res = makeRes();
    await auth.verifyLoginOtp(makeReq({ body: { email: "a@x.com", otp: { $gt: "" } } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Incorrect/);
  });
});

describe("verifySignupOtp: atomic attempt counter", () => {
  test("uses findOneAndUpdate with attempts < 5 and $inc before comparing", async () => {
    const res = makeRes();
    await auth.verifySignupOtp(
      makeReq({ body: { email: "new@x.com", otp: "123456", password: "Password1" } }),
      res
    );
    const [filter, update] = SignupOtp.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ email: "new@x.com", attempts: { $lt: 5 } });
    expect(update).toEqual({ $inc: { attempts: 1 } });
    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
describe("resetPassword", () => {
  test("revokes all Firebase sessions after a successful reset", async () => {
    const user = { firebaseUid: "fb1", save: jest.fn(async () => {}) };
    User.findOne.mockImplementation(() => q(user));
    const res = makeRes();
    await auth.resetPassword(makeReq({ body: { token: "a".repeat(64), password: "NewPassword1" } }), res);
    expect(res.statusCode).toBe(200);
    expect(firebaseAuth.revokeRefreshTokens).toHaveBeenCalledWith("fb1");
    expect(user.resetPasswordToken).toBeNull();
    expect(user.loginOtp).toBeNull();
  });

  test("malformed tokens are rejected without a DB lookup", async () => {
    for (const token of [{ $ne: null }, "short", "z".repeat(64)]) {
      const res = makeRes();
      await auth.resetPassword(makeReq({ body: { token, password: "NewPassword1" } }), res);
      expect(res.statusCode).toBe(400);
    }
    expect(User.findOne).not.toHaveBeenCalled();
  });
});

describe("forgotPassword", () => {
  test("escapes the user's name in the email HTML", async () => {
    const user = { name: `<a href="https://evil">Claim</a>`, email: "a@x.com", save: jest.fn(async () => {}) };
    User.findOne.mockImplementation(() => q(user));
    const res = makeRes();
    await auth.forgotPassword(makeReq({ body: { email: "a@x.com" } }), res);
    expect(res.statusCode).toBe(200);
    const html = sendEmail.mock.calls[0][0].html;
    expect(html).not.toContain(`<a href="https://evil">`);
    expect(html).toContain("&lt;a href=&quot;https://evil&quot;&gt;");
  });

  test("throttles repeat requests per account (no second email within 60s)", async () => {
    const user = { name: "A", email: "a@x.com", resetPasswordExpires: new Date(Date.now() + 14.9 * 60 * 1000), save: jest.fn() };
    User.findOne.mockImplementation(() => q(user));
    const res = makeRes();
    await auth.forgotPassword(makeReq({ body: { email: "a@x.com" } }), res);
    expect(res.statusCode).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(user.save).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe("uploads", () => {
  test("SVG (script-capable) upload is rejected before Cloudinary", async () => {
    const res = makeRes();
    await uploadMedia(makeReq({ user: { id: "u" }, body: { file: "data:image/svg+xml;base64,PHN2Zz4=" } }), res);
    expect(res.statusCode).toBe(400);
    expect(cloudinaryUpload).not.toHaveBeenCalled();
  });

  test("client-chosen folder / resource_type outside the allow-list is overridden", async () => {
    const res = makeRes();
    await uploadMedia(
      makeReq({ user: { id: "u" }, body: { file: PNG, folder: "splitwise_profile_images/../admin", resourceType: "raw" } }),
      res
    );
    expect(res.statusCode).toBe(200);
    expect(cloudinaryUpload).toHaveBeenCalledWith(PNG, { folder: "splitwise_uploads", resource_type: "auto" });
  });

  test("untyped (octet-stream) payloads from mobile/HEIC are accepted but pinned to image", async () => {
    const file = "data:application/octet-stream;base64,AAAA";
    const res = makeRes();
    await uploadMedia(makeReq({ user: { id: "u" }, body: { file, folder: "splitwise_receipts", resourceType: "auto" } }), res);
    expect(res.statusCode).toBe(200);
    expect(cloudinaryUpload).toHaveBeenCalledWith(file, { folder: "splitwise_receipts", resource_type: "image" });
  });

  test.each(["image/heic", "image/avif", "image/bmp", "application/pdf"])("receipt accepts %s", async (mime) => {
    const res = makeRes();
    await uploadMedia(makeReq({ user: { id: "u" }, body: { file: `data:${mime};base64,AAAA`, folder: "splitwise_receipts" } }), res);
    expect(res.statusCode).toBe(200);
  });

  test("allowed receipt folder is honored", async () => {
    await uploadMedia(makeReq({ user: { id: "u" }, body: { file: PNG, folder: "splitwise_receipts", resourceType: "auto" } }), makeRes());
    expect(cloudinaryUpload).toHaveBeenCalledWith(PNG, { folder: "splitwise_receipts", resource_type: "auto" });
  });

  test("admin upload accepts blog folder, rejects PDF", async () => {
    await uploadAdminMedia(makeReq({ body: { file: PNG, folder: "splitease_blog", resourceType: "image" } }), makeRes());
    expect(cloudinaryUpload).toHaveBeenCalledWith(PNG, { folder: "splitease_blog", resource_type: "image" });
    const res = makeRes();
    await uploadAdminMedia(makeReq({ body: { file: "data:application/pdf;base64,JVBE" } }), res);
    expect(res.statusCode).toBe(400);
  });

  test("upload failure never echoes the provider error to the client", async () => {
    cloudinaryUpload.mockRejectedValueOnce(new Error("Invalid api_secret abc123"));
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = makeRes();
    await uploadMedia(makeReq({ user: { id: "u" }, body: { file: PNG } }), res);
    spy.mockRestore();
    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("api_secret");
  });
});

// ---------------------------------------------------------------------------
describe("profile update mass-assignment", () => {
  test("only whitelisted fields are written", () => {
    const { update } = buildProfileUpdate({
      city: " Pune ",
      bio: "hi",
      profileImage: { url: "https://evil/x.png", public_id: "victim_img" },
      userId: "someone-else",
      createdAt: "1970-01-01",
      coins: 999999,
    });
    expect(update).toEqual({ city: "Pune", bio: "hi" });
  });

  test("over-long and non-string fields are rejected", () => {
    expect(buildProfileUpdate({ bio: "x".repeat(5001) }).error).toBeTruthy();
    expect(buildProfileUpdate({ city: { $gt: "" } }).error).toBeTruthy();
    expect(buildProfileUpdate({ interests: Array(51).fill("a") }).error).toBeTruthy();
  });

  test("an over-limit value that is ALREADY saved is accepted (legacy data never blocks a save)", () => {
    const longBio = "x".repeat(9000);
    const { update, error } = buildProfileUpdate({ bio: longBio, city: "Pune" }, { bio: longBio });
    expect(error).toBeUndefined();
    expect(update).toEqual({ bio: longBio, city: "Pune" });
  });

  test("the full object clients echo back from GET /profile saves cleanly", () => {
    const echoed = {
      _id: "p1", __v: 0, userId: "u1", name: "A", email: "a@x.com",
      profileImage: { url: "https://res.cloudinary.com/x.png", public_id: "x" },
      createdAt: "2026-01-01T00:00:00.000Z",
      mobile: 9876543210, city: "Pune", state: null, bio: "", timezone: "Asia/Kolkata",
    };
    const { update, error } = buildProfileUpdate(echoed, {});
    expect(error).toBeUndefined();
    expect(update).toEqual({ mobile: "9876543210", city: "Pune", state: "", bio: "", timezone: "Asia/Kolkata" });
  });

  test("handler writes via $set with the caller's userId only", async () => {
    UserProfile.findOneAndUpdate.mockImplementation(() => q({ toObject: () => ({}) }));
    User.findById.mockImplementation(() => q({ name: "A", email: "a@x.com" }));
    const res = makeRes();
    await updateProfile(
      makeReq({ user: { id: "me" }, body: { city: "X", userId: "victim", profileImage: { url: "u" } } }),
      res
    );
    expect(res.statusCode).toBe(200);
    const [filter, update] = UserProfile.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ userId: "me" });
    expect(update).toEqual({ $set: { city: "X", userId: "me" } });
  });
});

// ---------------------------------------------------------------------------
describe("buildSplits rejects balance-manipulating splits", () => {
  const a = oid();
  const b = oid();
  const participants = [a, b];

  test("negative exact share (sums correctly but shifts debt) is rejected", () => {
    expect(() =>
      buildSplits({ splitType: "exact", amount: 100, participants, exactSplits: [{ userId: a, share: 200 }, { userId: b, share: -100 }] })
    ).toThrow(/zero or positive/);
  });

  test("NaN share is rejected", () => {
    expect(() =>
      buildSplits({ splitType: "exact", amount: 100, participants, exactSplits: [{ userId: a, share: "abc" }, { userId: b, share: 100 }] })
    ).toThrow();
  });

  test("the same member listed twice is rejected", () => {
    expect(() =>
      buildSplits({ splitType: "exact", amount: 100, participants, exactSplits: [{ userId: a, share: 50 }, { userId: a, share: 50 }] })
    ).toThrow(/twice/);
  });

  test("negative percent is rejected", () => {
    expect(() =>
      buildSplits({ splitType: "percent", amount: 100, participants, percentSplits: [{ userId: a, percent: 150 }, { userId: b, percent: -50 }] })
    ).toThrow(/zero or positive/);
  });

  test("valid exact + percent splits still work", () => {
    expect(buildSplits({ splitType: "exact", amount: 100, participants, exactSplits: [{ userId: a, share: 60 }, { userId: b, share: 40 }] }))
      .toHaveLength(2);
    const pct = buildSplits({ splitType: "percent", amount: 100, participants, percentSplits: [{ userId: a, percent: 50 }, { userId: b, percent: 50 }] });
    expect(pct.reduce((s, x) => s + x.share, 0)).toBeCloseTo(100);
  });
});

// ---------------------------------------------------------------------------
describe("careers applyToJob (stored XSS into admin panel)", () => {
  const body = (resumeLink) => ({ name: "Jane", email: "jane@x.com", resumeLink });
  beforeEach(() => {
    JobPosting.findOne.mockImplementation(() => q({ _id: oid(), status: "open" }));
  });

  test.each([
    "javascript:alert(document.cookie)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
  ])("rejects %s", async (link) => {
    const res = makeRes();
    await applyToJob(makeReq({ params: { id: String(oid()) }, body: body(link) }), res);
    expect(res.statusCode).toBe(400);
    expect(JobApplication.create).not.toHaveBeenCalled();
  });

  test("bare domain is upgraded to https://", async () => {
    const res = makeRes();
    await applyToJob(makeReq({ params: { id: String(oid()) }, body: body("linkedin.com/in/jane") }), res);
    expect(res.statusCode).toBe(201);
    expect(JobApplication.create.mock.calls[0][0].resumeLink).toBe("https://linkedin.com/in/jane");
  });

  test("oversized cover note rejected", async () => {
    const res = makeRes();
    await applyToJob(
      makeReq({ params: { id: String(oid()) }, body: { ...body("https://x.com"), coverNote: "x".repeat(20001) } }),
      res
    );
    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
describe("user directory scraping", () => {
  test("listAvailableUsers: non-member of the group gets 403 and no user query runs", async () => {
    const groupId = String(oid());
    Group.findById.mockImplementation(() => q({ _id: groupId, members: [oid()], createdBy: oid() }));
    const res = makeRes();
    await listAvailableUsers(makeReq({ user: { id: String(oid()) }, params: { groupId }, query: { q: "al" } }), res);
    expect(res.statusCode).toBe(403);
    expect(User.find).not.toHaveBeenCalled();
  });

  test("listAvailableUsers: with no known contacts nothing comes back and no user query runs", async () => {
    const me = oid();
    const groupId = String(oid());
    Group.findById.mockImplementation(() => q({ _id: groupId, members: [me], createdBy: me }));
    const res = makeRes();
    await listAvailableUsers(makeReq({ user: { id: String(me) }, params: { groupId }, query: {} }), res);
    expect(res.body).toEqual([]);
    expect(User.find).not.toHaveBeenCalled();
  });

  test("listUsers: empty query returns nothing and page size is capped", async () => {
    const res = makeRes();
    await listUsers(makeReq({ user: { id: "me" }, query: { limit: "100000" } }), res);
    expect(res.body.items).toEqual([]);
    expect(User.find).not.toHaveBeenCalled();

    const res2 = makeRes();
    await listUsers(makeReq({ user: { id: "me" }, query: { q: "ali", limit: "100000" } }), res2);
    expect(res2.body.limit).toBe(20);
  });
});

describe("joinGroupByInvite accepts every real invite code format", () => {
  test.each(["a1b2c3d4", "0123456789abcdef0123456789abcdef"])("looks up %s", async (inviteCode) => {
    const res = makeRes();
    await joinGroupByInvite(makeReq({ user: { id: "me", name: "Me" }, params: { inviteCode } }), res);
    expect(Group.findOne).toHaveBeenCalledWith({ inviteCode });
    expect(res.statusCode).toBe(404); // stub returns no group
  });
});

describe("joinGroupByInvite", () => {
  test("malformed invite codes are rejected without a DB lookup", async () => {
    for (const inviteCode of ["../../x", "a".repeat(200), "ab", "x y z"]) {
      const res = makeRes();
      await joinGroupByInvite(makeReq({ user: { id: "me", name: "Me" }, params: { inviteCode } }), res);
      expect(res.statusCode).toBe(404);
    }
    expect(Group.findOne).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe("notepad reorderSteps can only reorder, never rewrite", () => {
  const me = oid();
  const s1 = { _id: oid(), title: "A", createdBy: oid() };
  const s2 = { _id: oid(), title: "B", createdBy: oid() };
  const setup = () => {
    const notepad = { groupId: oid(), steps: [s1, s2], save: jest.fn(async () => {}) };
    Notepad.findById.mockImplementation(() => q(notepad));
    Group.findById.mockImplementation(() => q({ members: [me] }));
    return notepad;
  };

  test("injected / forged steps are rejected", async () => {
    const notepad = setup();
    const res = makeRes();
    await reorderSteps(
      makeReq({
        user: { id: String(me) },
        params: { notepadId: String(oid()) },
        body: { steps: [{ _id: oid(), title: "forged", createdBy: oid() }, s1] },
      }),
      res
    );
    expect(res.statusCode).toBe(400);
    expect(notepad.save).not.toHaveBeenCalled();
  });

  test("dropping a step (delete via reorder) is rejected", async () => {
    const notepad = setup();
    const res = makeRes();
    await reorderSteps(makeReq({ user: { id: String(me) }, params: { notepadId: String(oid()) }, body: { steps: [s1] } }), res);
    expect(res.statusCode).toBe(400);
    expect(notepad.save).not.toHaveBeenCalled();
  });

  test("a genuine reorder keeps the server's step data, ignoring client edits", async () => {
    const notepad = setup();
    const res = makeRes();
    await reorderSteps(
      makeReq({
        user: { id: String(me) },
        params: { notepadId: String(oid()) },
        body: { steps: [{ ...s2, title: "tampered" }, s1] },
      }),
      res
    );
    expect(res.statusCode).toBe(200);
    expect(notepad.steps.map((s) => s.title)).toEqual(["B", "A"]);
  });
});
