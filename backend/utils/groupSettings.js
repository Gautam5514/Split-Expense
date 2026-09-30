import {
  GROUP_TYPES,
  EXPENSE_CATEGORIES,
  DEFAULT_SPLIT_TYPES,
  SUPPORTED_CURRENCIES,
} from "./groupPresets.js";
import { isValidObjectId } from "../middleware/validate.js";

const MAX_BUDGET = 99999999;

const toDateOrNull = (value) => {
  if (value === null || value === "" || value === undefined) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/**
 * Validates the type-specific group fields sent on create (POST /groups) or
 * update (PATCH /groups/:id/settings) and returns a flat Mongo $set.
 * Only keys present in `body` are written, so a PATCH can change one field.
 *
 * memberIds: current member ids - default-split weights may only name members.
 * Returns { update } or { error, field }.
 */
export const buildGroupSettingsUpdate = (body = {}, { memberIds = [] } = {}) => {
  const update = {};

  if (body.groupType !== undefined) {
    if (!GROUP_TYPES.includes(body.groupType))
      return { error: "Invalid group type.", field: "groupType" };
    update.groupType = body.groupType;
  }

  const settings = body.settings;
  if (settings !== undefined && settings !== null) {
    if (typeof settings !== "object" || Array.isArray(settings))
      return { error: "Invalid settings.", field: "settings" };

    if (settings.currency !== undefined) {
      if (!SUPPORTED_CURRENCIES.includes(settings.currency))
        return { error: "Unsupported currency.", field: "currency" };
      update["settings.currency"] = settings.currency;
    }

    if (settings.receiptRequired !== undefined)
      update["settings.receiptRequired"] = settings.receiptRequired === true;

    if (settings.joinApproval !== undefined)
      update["settings.joinApproval"] = settings.joinApproval === true;

    if (settings.notepadEnabled !== undefined)
      update["settings.notepadEnabled"] = settings.notepadEnabled === true;

    if (settings.categories !== undefined) {
      const list = settings.categories;
      if (!Array.isArray(list) || !list.length || list.some((c) => !EXPENSE_CATEGORIES.includes(c)))
        return { error: "Invalid categories.", field: "categories" };
      update["settings.categories"] = [...new Set(list)];
    }

    if (settings.defaultSplit !== undefined) {
      const ds = settings.defaultSplit || {};
      const type = ds.type || "equal";
      if (!DEFAULT_SPLIT_TYPES.includes(type))
        return { error: "Invalid default split.", field: "defaultSplit" };
      let weights = [];
      if (type !== "equal") {
        const members = new Set(memberIds.map(String));
        const seen = new Set();
        for (const w of Array.isArray(ds.weights) ? ds.weights : []) {
          const id = String(w?.userId ?? "");
          const value = Number(w?.value);
          if (!isValidObjectId(id) || !members.has(id) || seen.has(id))
            return { error: "Default split can only include group members once.", field: "defaultSplit" };
          if (!Number.isFinite(value) || value < 0 || value > 1000)
            return { error: "Default split values must be between 0 and 1000.", field: "defaultSplit" };
          seen.add(id);
          weights.push({ userId: id, value });
        }
        const total = weights.reduce((a, w) => a + w.value, 0);
        // Shares with no weights yet = everyone 1 share (picked at create
        // time, before anyone has joined); real shares are set in settings.
        const emptyShares = type === "shares" && weights.length === 0;
        if (!emptyShares && !(total > 0)) return { error: "Give at least one member a share.", field: "defaultSplit" };
        if (type === "percent" && Math.abs(total - 100) > 0.01)
          return { error: "Default percentages must add up to 100.", field: "defaultSplit" };
      }
      update["settings.defaultSplit"] = { type, weights };
    }
  }

  const trip = body.trip;
  if (trip !== undefined && trip !== null) {
    if (typeof trip !== "object") return { error: "Invalid trip details.", field: "trip" };
    if (trip.startDate !== undefined) {
      const d = toDateOrNull(trip.startDate);
      if (d === undefined) return { error: "Invalid start date.", field: "startDate" };
      update["trip.startDate"] = d;
    }
    if (trip.endDate !== undefined) {
      const d = toDateOrNull(trip.endDate);
      if (d === undefined) return { error: "Invalid end date.", field: "endDate" };
      update["trip.endDate"] = d;
    }
    const start = update["trip.startDate"];
    const end = update["trip.endDate"];
    if (start && end && end < start)
      return { error: "End date can't be before the start date.", field: "endDate" };
    if (trip.budget !== undefined) {
      if (trip.budget === null || trip.budget === "") update["trip.budget"] = null;
      else {
        const b = Number(trip.budget);
        if (!Number.isFinite(b) || b < 0 || b > MAX_BUDGET)
          return { error: "Budget must be a positive amount.", field: "budget" };
        update["trip.budget"] = Math.round(b * 100) / 100;
      }
    }
  }

  const roommate = body.roommate;
  if (roommate !== undefined && roommate !== null) {
    if (typeof roommate !== "object") return { error: "Invalid roommate details.", field: "roommate" };
    if (roommate.billDay !== undefined) {
      if (roommate.billDay === null || roommate.billDay === "") update["roommate.billDay"] = null;
      else {
        const day = Number(roommate.billDay);
        if (!Number.isInteger(day) || day < 1 || day > 28)
          return { error: "Bill day must be between 1 and 28.", field: "billDay" };
        update["roommate.billDay"] = day;
      }
    }
  }

  return { update };
};

// { "trip.budget": 5 } -> { trip: { budget: 5 } }, for Model.create().
export const unflatten = (flat) => {
  const out = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let node = out;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof node[parts[i]] !== "object" || node[parts[i]] === null) node[parts[i]] = {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = value;
  }
  return out;
};
