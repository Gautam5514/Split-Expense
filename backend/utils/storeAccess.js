// Who gets what from referring friends: the Elite tier badge and the themes
// that tier (or coins) unlocks. Pure functions - no database access - so the
// rules live in one place and both the app and the web read the result.

import { ELITE_TIERS } from "../config/referralConfig.js";
import { STORE_ITEMS } from "../config/storeConfig.js";

const TIER_KEYS = ELITE_TIERS.map((t) => t.key);
const tierRank = (key) => Math.max(TIER_KEYS.indexOf(key), 0);

// Tier comes from lifetime coins earned, never the spendable balance, so
// spending coins on a theme can never take a badge away.
export const tierBasisCoins = (user) =>
  Math.max(user?.lifetimeCoinsEarned || 0, user?.coins || 0);

/** "starter" | "bronze" | "silver" | "gold" | "elite" */
export const eliteTierKey = (user) => {
  const coins = tierBasisCoins(user);
  let key = ELITE_TIERS[0].key;
  for (const tier of ELITE_TIERS) if (coins >= tier.minCoins) key = tier.key;
  return key;
};

const isTheme = (id) => STORE_ITEMS[id]?.type === "theme";
const ownsAnyTheme = (user) => (user?.unlockedItems || []).some(isTheme);

/**
 * How this user can get one theme right now:
 *  owned     - bought (or picked) earlier, theirs forever
 *  tier      - Silver and above use every theme, nothing to buy
 *  free-pick - Bronze chooses ONE theme for free (their first)
 *  locked    - costs `price` coins
 */
export const themeAccess = (user, itemId) => {
  const item = STORE_ITEMS[itemId];
  if (!item || item.type !== "theme") return null;
  const rank = tierRank(eliteTierKey(user));
  if ((user?.unlockedItems || []).includes(itemId)) return { access: "owned", price: 0 };
  if (rank >= tierRank("silver")) return { access: "tier", price: 0 };
  if (rank >= tierRank("bronze") && !ownsAnyTheme(user)) return { access: "free-pick", price: 0 };
  return { access: "locked", price: item.cost };
};

/** The theme shelf the clients draw. Only themes with colours are listed. */
export const buildThemeStore = (user) => ({
  themes: Object.entries(STORE_ITEMS)
    .filter(([, item]) => item.type === "theme" && item.colors)
    .map(([id, item]) => {
      const { access, price } = themeAccess(user, id);
      return {
        id,
        key: id.replace(/^theme:/, ""),
        name: item.name,
        colors: item.colors,
        cost: item.cost,
        price,
        access,
        usable: access === "owned" || access === "tier",
      };
    }),
});
