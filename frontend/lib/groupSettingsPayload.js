// Builds the PATCH /groups/:id/settings body for the Group settings screen.
// Once a group has an expense, only the two switches may change, so that is
// all we send (the server enforces the same rule - see applyExpenseLock).

export const SPLIT_LOCKED_NOTE =
  "Locked after the first expense. You can still pick a different split on each expense.";

// Returns an error message, or "" when the default split is fine to save.
export function validateDefaultSplit({ splitType, weights, members }) {
  if (splitType === "equal") return "";
  const total = members.reduce((a, m) => a + (Number(weights[String(m._id)]) || 0), 0);
  if (splitType === "percent" && Math.abs(total - 100) > 0.01) return "Default percentages must add up to 100.";
  if (splitType === "shares" && !(total > 0)) return "Give at least one member a share.";
  return "";
}

export function buildSettingsPayload({ locked, receiptRequired, joinApproval, currency, splitType, weights, members, groupType, trip }) {
  const settings = { receiptRequired: !!receiptRequired, joinApproval: !!joinApproval };
  if (locked) return { settings };

  settings.currency = currency;
  settings.defaultSplit = {
    type: splitType,
    weights: splitType === "equal" ? [] : members.map((m) => ({
      userId: String(m._id),
      value: Number(weights[String(m._id)]) || 0,
    })),
  };
  const body = { groupType, settings };
  if (groupType === "trip" && trip) {
    body.trip = { startDate: trip.startDate || null, endDate: trip.endDate || null, budget: trip.budget === "" || trip.budget == null ? null : trip.budget };
  }
  return body;
}

// The server answered "locked" (an expense was added after this screen opened).
export const isLockedError = (err) => err?.response?.status === 409 && err?.response?.data?.code === "SETTINGS_LOCKED";
