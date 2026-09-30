// Keys the frontend (web) and app icon pickers let users choose from for a
// group's avatar. Keep this list in sync with:
//   frontend/lib/groupIcons.js
//   splitApp/lib/groupIcons.js
export const GROUP_ICON_KEYS = [
  "plane", "mapPin", "car", "bus", "trainFront",
  "home", "building2", "utensils", "coffee", "pizza",
  "wine", "iceCreamCone", "shoppingBag", "shoppingCart", "briefcase",
  "wallet", "piggyBank", "partyPopper", "music", "gamepad2",
  "film", "heart", "star", "gift", "dumbbell",
  "trophy", "treePine", "mountain", "camera", "sparkles",
  "users", "bookOpen",
];

export const isValidGroupIcon = (icon) => GROUP_ICON_KEYS.includes(icon);
