// Autopilot's people directory (faces on the plan cards) against a REAL MongoDB.
// Skipped unless MONGO_TEST_URI is set:
//   MONGO_TEST_URI=mongodb://127.0.0.1:27099/splitease_ap_test npm test -- autopilotPeople.int
import { jest } from "@jest/globals";

const URI = process.env.MONGO_TEST_URI;
const d = URI ? describe : describe.skip;

jest.unstable_mockModule("../index.js", () => ({ io: { to: () => ({ emit: jest.fn() }), emit: jest.fn() }, onlineUsers: new Map() }));
jest.unstable_mockModule("../config/firebaseAdmin.js", () => ({ default: { auth: () => ({}), messaging: () => ({}) } }));

const mongoose = (await import("mongoose")).default;
const User = (await import("../models/userModel.js")).default;
const UserProfile = (await import("../models/userProfileModel.js")).default;
const Group = (await import("../models/groupModel.js")).default;
const { peopleDirectory } = await import("../modules/autopilot/people.js");

d("Autopilot people directory", () => {
  beforeAll(async () => { await mongoose.connect(URI); });
  afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  beforeEach(async () => { await Promise.all([User, UserProfile, Group].map((M) => M.deleteMany({}))); });

  test("returns me and the people I share a group with, with the same photo the app shows", async () => {
    const mk = (name, extra = {}) => User.create({ name, email: `${name.toLowerCase()}@test.io`, firebaseUid: name, ...extra });
    const [meera, farah, ravi, stranger] = await Promise.all([
      mk("Meera"), mk("Farah", { photoURL: "https://img.test/google-farah.jpg" }), mk("Ravi"), mk("Stranger", { photoURL: "https://img.test/stranger.jpg" }),
    ]);
    await UserProfile.create({ userId: ravi._id, profileImage: { url: "https://img.test/upload-ravi.jpg" } });
    // Google photo wins over an upload, as everywhere else in the app.
    await UserProfile.create({ userId: farah._id, profileImage: { url: "https://img.test/upload-farah.jpg" } });
    await Group.create({ name: "Flat", createdBy: meera._id, members: [meera._id, farah._id, ravi._id] });
    await Group.create({ name: "Elsewhere", createdBy: stranger._id, members: [stranger._id] });

    const out = await peopleDirectory(String(meera._id));
    expect(out.me).toBe(String(meera._id));
    expect(out.people[String(farah._id)]).toEqual({ name: "Farah", photoUrl: "https://img.test/google-farah.jpg" });
    expect(out.people[String(ravi._id)]).toEqual({ name: "Ravi", photoUrl: "https://img.test/upload-ravi.jpg" });
    expect(out.people[String(meera._id)]).toEqual({ name: "Meera", photoUrl: null });
    // Someone I share no group with is never included.
    expect(out.people[String(stranger._id)]).toBeUndefined();
  });

  test("someone with no groups still gets themself back", async () => {
    const solo = await User.create({ name: "Solo", email: "solo@test.io", firebaseUid: "solo", photoURL: "https://img.test/solo.jpg" });
    const out = await peopleDirectory(String(solo._id));
    expect(Object.keys(out.people)).toEqual([String(solo._id)]);
    expect(out.people[String(solo._id)].photoUrl).toBe("https://img.test/solo.jpg");
  });
});
