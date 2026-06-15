// Server-side catalog of everything purchasable with coins. The client also
// has display copies of these (theme/page.jsx) but cost validation always
// happens here - never trust a price sent by the browser.

export const STORE_ITEMS = {
  // Premium themes
  "theme:glass": { type: "theme", name: "Aurora Glass", cost: 1000 },
  "theme:midnight-black": { type: "theme", name: "Midnight Black", cost: 200 },
  "theme:royal-amethyst": { type: "theme", name: "Royal Amethyst", cost: 450 },
  "theme:emerald-noir": { type: "theme", name: "Emerald Noir", cost: 550 },
  "theme:crimson-velvet": { type: "theme", name: "Crimson Velvet", cost: 600 },
  "theme:aurum-gold": { type: "theme", name: "Aurum Gold", cost: 700 },

  // Premium fonts (inter is free and not listed)
  "font:poppins": { type: "font", name: "Poppins", cost: 100 },
  "font:nunito": { type: "font", name: "Nunito", cost: 100 },
  "font:dm-sans": { type: "font", name: "DM Sans", cost: 120 },
  "font:jakarta": { type: "font", name: "Plus Jakarta Sans", cost: 150 },
  "font:outfit": { type: "font", name: "Outfit", cost: 150 },
};
