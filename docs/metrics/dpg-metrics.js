/**
 * READ-ONLY, ANONYMISED usage metrics for the DPG / SDG application.
 * Prints only aggregate counts. No names, emails, or messages are read or printed.
 *
 * Run from the repository root:
 *   NODE_PATH=backend/node_modules node docs/metrics/dpg-metrics.js
 * (uses MONGO_URI from backend/.env; make sure it points at the database you want to measure)
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../backend/.env") });
const mongoose = require("mongoose");

const DAY = 24 * 60 * 60 * 1000;
const since30 = new Date(Date.now() - 30 * DAY);
const since30Str = since30.toISOString().slice(0, 10);

(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 20000,
    readPreference: "secondaryPreferred",
  });
  const db = mongoose.connection.db;
  const c = (n) => db.collection(n);
  const agg = (n, p) => c(n).aggregate(p).toArray();

  const out = { generatedAt: new Date().toISOString() };

  // Users (counts only)
  out.users = {
    total: await c("users").countDocuments({}),
    joinedLast30Days: await c("users").countDocuments({ createdAt: { $gte: since30 } }),
    activeLast30Days: await c("users").countDocuments({ lastActiveDate: { $gte: since30Str } }),
    withPushTokens_android: await c("users").countDocuments({ "expoPushTokens.platform": "android" }),
    withPushTokens_ios: await c("users").countDocuments({ "expoPushTokens.platform": "ios" }),
  };
  const firstUser = await c("users").find({}, { projection: { createdAt: 1, _id: 0 } }).sort({ createdAt: 1 }).limit(1).toArray();
  out.firstUserJoined = firstUser[0]?.createdAt || null;

  out.profiles = {
    withUpiId: await c("userprofiles").countDocuments({ upiId: { $nin: [null, ""] } }),
    withCity: await c("userprofiles").countDocuments({ city: { $nin: [null, ""] } }),
  };

  // Groups
  out.groups = { total: await c("groups").countDocuments({}) };
  out.groups.byType = Object.fromEntries(
    (await agg("groups", [{ $group: { _id: "$groupType", n: { $sum: 1 } } }])).map((r) => [r._id || "general", r.n])
  );
  const sizes = await agg("groups", [{ $project: { s: { $size: { $ifNull: ["$members", []] } } } }]);
  const buckets = { "1": 0, "2": 0, "3-5": 0, "6-10": 0, "11+": 0 };
  let sum = 0;
  for (const g of sizes) {
    sum += g.s;
    if (g.s <= 1) buckets["1"]++; else if (g.s === 2) buckets["2"]++;
    else if (g.s <= 5) buckets["3-5"]++; else if (g.s <= 10) buckets["6-10"]++; else buckets["11+"]++;
  }
  out.groups.sizeBuckets = buckets;
  out.groups.avgMembers = sizes.length ? +(sum / sizes.length).toFixed(2) : 0;
  out.groups.activeLast30Days = (await agg("expenses", [
    { $match: { date: { $gte: since30 }, isSettlement: { $ne: true } } },
    { $group: { _id: "$groupId" } }, { $count: "n" },
  ]))[0]?.n || 0;

  // Expenses (excluding settlement entries)
  const real = { isSettlement: { $ne: true } };
  out.expenses = {
    total: await c("expenses").countDocuments(real),
    last30Days: await c("expenses").countDocuments({ ...real, date: { $gte: since30 } }),
    withReceiptImage: await c("expenses").countDocuments({ ...real, imageUrl: { $nin: [null, ""] } }),
    recurringGenerated: await c("expenses").countDocuments({ ...real, recurringId: { $ne: null } }),
    foreignCurrency: await c("expenses").countDocuments({ ...real, currency: { $nin: [null, ""] } }),
  };
  out.expenses.topCategories = (await agg("expenses", [
    { $match: real }, { $group: { _id: "$category", n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 6 },
  ])).map((r) => ({ category: r._id, count: r.n }));
  out.expenses.byMonth = (await agg("expenses", [
    { $match: real },
    { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, n: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])).map((r) => ({ month: r._id, expenses: r.n }));
  // Total value recorded, in each group's own currency (INR by default)
  out.expenses.valueByGroupCurrency = (await agg("expenses", [
    { $match: real },
    { $lookup: { from: "groups", localField: "groupId", foreignField: "_id", as: "g" } },
    { $group: { _id: { $ifNull: [{ $arrayElemAt: ["$g.settings.currency", 0] }, "INR"] }, total: { $sum: "$amount" } } },
  ])).map((r) => ({ currency: r._id, total: Math.round(r.total) }));

  // Other features
  out.features = {
    quickSplits: await c("quicksplits").countDocuments({}),
    recurringActive: await c("recurringexpenses").countDocuments({ active: true }),
    settlementRequests: await c("settlementrequests").countDocuments({}),
    settlementsConfirmed: await c("settlementrequests").countDocuments({ status: "confirmed" }),
    notepads: await c("notepads").countDocuments({}),
  };

  console.log(JSON.stringify(out, null, 2));
  await mongoose.disconnect();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
