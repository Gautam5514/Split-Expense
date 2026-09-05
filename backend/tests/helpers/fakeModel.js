// A minimal, hand-rolled stand-in for a Mongoose Model.
//
// Why this exists: this sandbox has no network path to download a real
// mongod binary for mongodb-memory-server (egress is allowlisted and
// fastdl.mongodb.org isn't on it), so integration tests against a real
// MongoDB aren't possible here. Rather than skip controller-level testing
// entirely, this fake reproduces just the slice of the Mongoose query API
// that the controllers under test actually call (create/find/findById/
// updateOne/aggregate + populate/lean/select/sort chaining), backed by a
// plain in-memory array. It uses real `mongoose.Types.ObjectId`s so id
// comparisons behave exactly like production code.
//
// This is a deliberate trade-off: it verifies business logic (validation,
// authorization branches, state transitions, notification payloads) with
// full fidelity, but does NOT verify Mongoose schema validation, indexes,
// or the real `pre("save")` hooks - those would need a real MongoDB.
import { jest } from "@jest/globals";
import mongoose from "mongoose";

const toIdString = (v) => {
  if (v == null) return v;
  if (typeof v === "object" && v._id) return String(v._id);
  return String(v);
};

const matchesOne = (fieldValue, cond) => {
  if (cond && typeof cond === "object" && !Array.isArray(cond) && !(cond instanceof mongoose.Types.ObjectId)) {
    if ("$in" in cond) {
      const wanted = cond.$in.map(toIdString);
      if (Array.isArray(fieldValue)) return fieldValue.some((v) => wanted.includes(toIdString(v)));
      return wanted.includes(toIdString(fieldValue));
    }
    if ("$nin" in cond) {
      const unwanted = cond.$nin.map(toIdString);
      if (Array.isArray(fieldValue)) return !fieldValue.some((v) => unwanted.includes(toIdString(v)));
      return !unwanted.includes(toIdString(fieldValue));
    }
    if ("$ne" in cond) return toIdString(fieldValue) !== toIdString(cond.$ne);
    if ("$exists" in cond) {
      const exists = fieldValue !== undefined && fieldValue !== null;
      return cond.$exists ? exists : !exists;
    }
  }
  if (Array.isArray(fieldValue)) return fieldValue.map(toIdString).includes(toIdString(cond));
  return toIdString(fieldValue) === toIdString(cond);
};

const matches = (doc, filter = {}) =>
  Object.entries(filter).every(([key, cond]) => matchesOne(doc[key], cond));

const resolveRef = (id, refModel) => {
  if (!refModel || id == null) return id;
  const found = refModel._docs.find((d) => String(d._id) === String(id));
  return found || id;
};

// Mimics Mongoose's .populate("field"): resolves stored ObjectId reference(s)
// into their full sub-document, looked up from another fake model's store.
// Returns a SHALLOW COPY so populating a read never mutates the underlying
// "stored" (unpopulated) document that other, non-populated reads rely on.
const applyPopulates = (data, populatedFields, refs) => {
  if (!populatedFields.length || data == null) return data;
  const applyToDoc = (doc) => {
    const copy = { ...doc };
    populatedFields.forEach((field) => {
      const refModel = refs[field];
      if (!refModel) return; // no ref configured - leave the raw id(s) as-is
      const val = doc[field];
      copy[field] = Array.isArray(val) ? val.map((v) => resolveRef(v, refModel)) : resolveRef(val, refModel);
    });
    return copy;
  };
  return Array.isArray(data) ? data.map(applyToDoc) : applyToDoc(data);
};

/** Wraps a lazily-evaluated result in a chainable, awaitable "query". */
function makeQuery(resultGetter, refs = {}) {
  const populatedFields = [];
  const query = {
    populate(field) { populatedFields.push(field); return query; },
    select() { return query; },
    lean() { return query; },
    sort() { return query; },
    limit() { return query; },
    skip() { return query; },
    then(resolve, reject) {
      try {
        const resolved = applyPopulates(resultGetter(), populatedFields, refs);
        return Promise.resolve(resolved).then(resolve, reject);
      } catch (e) { if (reject) reject(e); else throw e; }
    },
    catch(onRejected) { return Promise.resolve(this).catch(onRejected); },
  };
  return query;
}

/**
 * @param {Array<object>} seedDocs initial documents (mutated in place by the fake)
 * @param {Record<string, object>} refs maps a field name (e.g. "members") to
 *   another fake model whose docs `.populate(field)` should resolve against -
 *   mirrors a Mongoose schema's `ref: "SomeModel"`.
 * @param {Record<string, any>} defaults applied under any explicit fields on
 *   `create()`/`insertMany()` - mirrors a Mongoose schema's `default: ...`
 *   (this fake has no schema, so nothing sets these automatically otherwise).
 */
export function makeFakeModel(seedDocs = [], refs = {}, defaults = {}) {
  const docs = seedDocs;

  const attachSave = (doc) => {
    if (!doc.save) {
      doc.save = jest.fn(async function () { return this; });
    }
    return doc;
  };

  docs.forEach(attachSave);

  const model = {
    _docs: docs,

    create: jest.fn(async (data) => {
      const doc = attachSave({ _id: new mongoose.Types.ObjectId(), ...defaults, ...data });
      docs.push(doc);
      return doc;
    }),

    insertMany: jest.fn(async (items) => {
      const created = items.map((data) => attachSave({ _id: new mongoose.Types.ObjectId(), ...defaults, ...data }));
      docs.push(...created);
      return created;
    }),

    findById: jest.fn((id) => makeQuery(() => docs.find((d) => String(d._id) === String(id)) || null, refs)),

    findOne: jest.fn((filter) => makeQuery(() => docs.find((d) => matches(d, filter)) || null, refs)),

    find: jest.fn((filter = {}) => makeQuery(() => docs.filter((d) => matches(d, filter)), refs)),

    exists: jest.fn(async (filter) => (docs.some((d) => matches(d, filter)) ? { _id: "x" } : null)),

    updateOne: jest.fn(async (filter, update) => {
      const matched = docs.filter((d) => matches(d, filter));
      matched.forEach((doc) => applyUpdate(doc, update));
      return { matchedCount: matched.length, modifiedCount: matched.length };
    }),

    updateMany: jest.fn(async (filter, update) => {
      const matched = docs.filter((d) => matches(d, filter));
      matched.forEach((doc) => applyUpdate(doc, update));
      return { matchedCount: matched.length, modifiedCount: matched.length };
    }),

    findByIdAndUpdate: jest.fn(async (id, update) => {
      const doc = docs.find((d) => String(d._id) === String(id));
      if (!doc) return null;
      applyUpdate(doc, update);
      return doc;
    }),

    findOneAndUpdate: jest.fn((filter, update) => makeQuery(() => {
      const doc = docs.find((d) => matches(d, filter));
      if (!doc) return null;
      applyUpdate(doc, update);
      return doc;
    }, refs)),

    deleteMany: jest.fn(async (filter = {}) => {
      const before = docs.length;
      const keep = docs.filter((d) => !matches(d, filter));
      docs.length = 0;
      docs.push(...keep);
      return { deletedCount: before - docs.length };
    }),

    deleteOne: jest.fn(async (filter = {}) => {
      const idx = docs.findIndex((d) => matches(d, filter));
      if (idx >= 0) docs.splice(idx, 1);
      return { deletedCount: idx >= 0 ? 1 : 0 };
    }),

    aggregate: jest.fn(async () => []), // override per-test when a controller actually aggregates

    __addDoc(doc) {
      docs.push(attachSave(doc));
      return doc;
    },
  };

  return model;
}

function applyUpdate(doc, update) {
  if (!update) return;
  if (update.$set) Object.assign(doc, update.$set);
  if (update.$push) {
    Object.entries(update.$push).forEach(([k, v]) => {
      doc[k] = Array.isArray(doc[k]) ? doc[k] : [];
      doc[k].push(v);
    });
  }
  if (update.$addToSet) {
    Object.entries(update.$addToSet).forEach(([k, v]) => {
      doc[k] = Array.isArray(doc[k]) ? doc[k] : [];
      const exists = doc[k].some((x) => toIdString(x) === toIdString(v));
      if (!exists) doc[k].push(v);
    });
  }
  if (update.$pull) {
    Object.entries(update.$pull).forEach(([k, v]) => {
      if (!Array.isArray(doc[k])) return;
      doc[k] = doc[k].filter((x) => toIdString(x) !== toIdString(v));
    });
  }
  // Plain (non-operator) update object - merge directly (mirrors Mongoose's
  // shorthand of treating a plain object as an implicit $set).
  const hasOperators = Object.keys(update).some((k) => k.startsWith("$"));
  if (!hasOperators) Object.assign(doc, update);
}
