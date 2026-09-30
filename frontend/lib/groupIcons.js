import {
  Plane, MapPin, Car, Bus, TrainFront,
  Home, Building2, Utensils, Coffee, Pizza,
  Wine, IceCreamCone, ShoppingBag, ShoppingCart, Briefcase,
  Wallet, PiggyBank, PartyPopper, Music, Gamepad2,
  Film, Heart, Star, Gift, Dumbbell,
  Trophy, TreePine, Mountain, Camera, Sparkles,
  Users, BookOpen,
} from "lucide-react";

// Keep keys in sync with backend/utils/groupIcons.js and splitApp/lib/groupIcons.js
export const GROUP_ICONS = [
  { key: "plane", label: "Trip", category: "Travel", Icon: Plane },
  { key: "mapPin", label: "Adventure", category: "Travel", Icon: MapPin },
  { key: "car", label: "Road Trip", category: "Travel", Icon: Car },
  { key: "bus", label: "Commute", category: "Travel", Icon: Bus },
  { key: "trainFront", label: "Travel", category: "Travel", Icon: TrainFront },

  { key: "home", label: "Roommates", category: "Home & Food", Icon: Home },
  { key: "building2", label: "Office", category: "Home & Food", Icon: Building2 },
  { key: "utensils", label: "Food", category: "Home & Food", Icon: Utensils },
  { key: "coffee", label: "Coffee", category: "Home & Food", Icon: Coffee },
  { key: "pizza", label: "Pizza Night", category: "Home & Food", Icon: Pizza },
  { key: "wine", label: "Drinks", category: "Home & Food", Icon: Wine },
  { key: "iceCreamCone", label: "Treats", category: "Home & Food", Icon: IceCreamCone },

  { key: "shoppingBag", label: "Shopping", category: "Money & Work", Icon: ShoppingBag },
  { key: "shoppingCart", label: "Groceries", category: "Money & Work", Icon: ShoppingCart },
  { key: "briefcase", label: "Work", category: "Money & Work", Icon: Briefcase },
  { key: "wallet", label: "Expenses", category: "Money & Work", Icon: Wallet },
  { key: "piggyBank", label: "Savings", category: "Money & Work", Icon: PiggyBank },

  { key: "partyPopper", label: "Party", category: "Fun & Events", Icon: PartyPopper },
  { key: "music", label: "Music", category: "Fun & Events", Icon: Music },
  { key: "gamepad2", label: "Gaming", category: "Fun & Events", Icon: Gamepad2 },
  { key: "film", label: "Movies", category: "Fun & Events", Icon: Film },
  { key: "heart", label: "Couple", category: "Fun & Events", Icon: Heart },
  { key: "star", label: "Special", category: "Fun & Events", Icon: Star },
  { key: "gift", label: "Gifts", category: "Fun & Events", Icon: Gift },

  { key: "dumbbell", label: "Fitness", category: "Active & Outdoors", Icon: Dumbbell },
  { key: "trophy", label: "Sports", category: "Active & Outdoors", Icon: Trophy },
  { key: "treePine", label: "Camping", category: "Active & Outdoors", Icon: TreePine },
  { key: "mountain", label: "Trek", category: "Active & Outdoors", Icon: Mountain },
  { key: "camera", label: "Photos", category: "Active & Outdoors", Icon: Camera },

  { key: "sparkles", label: "Misc", category: "Misc", Icon: Sparkles },
  { key: "users", label: "Group", category: "Misc", Icon: Users },
  { key: "bookOpen", label: "Club", category: "Misc", Icon: BookOpen },
];

// GROUP_ICONS grouped by category, in declaration order - the picker renders
// one labeled section per entry instead of one flat grid.
export const GROUP_ICON_CATEGORIES = GROUP_ICONS.reduce((acc, icon) => {
  let section = acc.find((s) => s.category === icon.category);
  if (!section) {
    section = { category: icon.category, icons: [] };
    acc.push(section);
  }
  section.icons.push(icon);
  return acc;
}, []);

const ICON_MAP = Object.fromEntries(GROUP_ICONS.map((i) => [i.key, i.Icon]));

// Returns the matching Icon component for a group's stored icon key, or null
// if it has none / the key is unrecognized - callers fall back to the letter avatar.
export const getGroupIcon = (key) => ICON_MAP[key] || null;
