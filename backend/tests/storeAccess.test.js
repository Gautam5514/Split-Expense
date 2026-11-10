// Referral benefits: the Elite tier badge and which themes a tier unlocks.
import { buildThemeStore, eliteTierKey, themeAccess } from "../utils/storeAccess.js";

const AMETHYST = "theme:royal-amethyst";
const EMERALD = "theme:emerald-noir";

describe("eliteTierKey", () => {
  test("tiers follow the coin thresholds", () => {
    expect(eliteTierKey({})).toBe("starter");
    expect(eliteTierKey({ coins: 99 })).toBe("starter");
    expect(eliteTierKey({ coins: 100 })).toBe("bronze");
    expect(eliteTierKey({ coins: 300 })).toBe("silver");
    expect(eliteTierKey({ coins: 750 })).toBe("gold");
    expect(eliteTierKey({ coins: 1500 })).toBe("elite");
  });

  test("spending coins never demotes: lifetime earned wins over the balance", () => {
    expect(eliteTierKey({ coins: 10, lifetimeCoinsEarned: 320 })).toBe("silver");
  });
});

describe("themeAccess", () => {
  test("starter pays the full cost", () => {
    expect(themeAccess({ coins: 50 }, AMETHYST)).toEqual({ access: "locked", price: 450 });
  });

  test("bronze gets exactly one free pick", () => {
    const bronze = { coins: 100, unlockedItems: [] };
    expect(themeAccess(bronze, AMETHYST)).toEqual({ access: "free-pick", price: 0 });
    const picked = { coins: 100, unlockedItems: [AMETHYST] };
    expect(themeAccess(picked, AMETHYST)).toEqual({ access: "owned", price: 0 });
    expect(themeAccess(picked, EMERALD)).toEqual({ access: "locked", price: 550 });
  });

  test("owning only a font does not use up the free theme pick", () => {
    expect(themeAccess({ coins: 100, unlockedItems: ["font:poppins"] }, AMETHYST).access).toBe("free-pick");
  });

  test("silver and above use every theme without buying", () => {
    expect(themeAccess({ coins: 300 }, EMERALD)).toEqual({ access: "tier", price: 0 });
    expect(themeAccess({ coins: 2000 }, AMETHYST)).toEqual({ access: "tier", price: 0 });
  });

  test("non-themes and unknown ids are not themes", () => {
    expect(themeAccess({ coins: 5000 }, "font:poppins")).toBeNull();
    expect(themeAccess({ coins: 5000 }, "theme:nope")).toBeNull();
  });
});

describe("buildThemeStore", () => {
  test("lists only themes that have colours, with this user's price", () => {
    const { themes } = buildThemeStore({ coins: 0 });
    expect(themes.map((t) => t.key)).toEqual(["royal-amethyst", "emerald-noir", "crimson-velvet", "aurum-gold"]);
    for (const t of themes) {
      expect(t.colors.light).toMatch(/^#[0-9A-F]{6}$/i);
      expect(t.colors.dark).toMatch(/^#[0-9A-F]{6}$/i);
      expect(t.usable).toBe(false);
      expect(t.price).toBe(t.cost);
    }
  });

  test("usable is true only for owned or tier-granted themes", () => {
    const bronze = buildThemeStore({ coins: 100, unlockedItems: [AMETHYST] }).themes;
    expect(bronze.find((t) => t.id === AMETHYST).usable).toBe(true);
    expect(bronze.find((t) => t.id === EMERALD).usable).toBe(false);
    expect(buildThemeStore({ coins: 300 }).themes.every((t) => t.usable)).toBe(true);
  });
});
