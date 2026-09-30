// Group-type presets. Keep keys in sync with frontend/lib/groupPresets.js.
// A group's type decides its default categories, icon and which extra
// features (budget, recurring bills, reports) its page shows.

export const GROUP_TYPES = ["roommate", "trip", "business", "general"];

// Every category an expense may carry, across all group types.
export const EXPENSE_CATEGORIES = [
  "general", "food", "travel", "stay", "shopping", "bills",
  "rent", "groceries", "utilities", "household",
  "activities", "fuel", "client", "supplies",
];

export const SPLIT_TYPES = ["equal", "exact", "percent", "shares", "itemized"];
export const DEFAULT_SPLIT_TYPES = ["equal", "shares", "percent"];

export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "THB", "SGD", "JPY", "AUD", "CAD", "NPR", "LKR", "MYR", "IDR", "VND"];

export const GROUP_PRESETS = {
  roommate: {
    icon: "home",
    categories: ["rent", "groceries", "utilities", "household", "food", "general"],
  },
  trip: {
    icon: "plane",
    categories: ["food", "travel", "stay", "activities", "shopping", "fuel", "general"],
  },
  business: {
    icon: "briefcase",
    categories: ["travel", "stay", "client", "supplies", "fuel", "food", "general"],
  },
  general: {
    icon: null,
    categories: ["general", "food", "travel", "stay", "shopping", "bills"],
  },
};

export const presetFor = (type) => GROUP_PRESETS[type] || GROUP_PRESETS.general;
