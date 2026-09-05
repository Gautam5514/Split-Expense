// Single source of truth for rendering money in the UI. Before this, amount
// displays were ad hoc across the app - some used Intl.NumberFormat, most just
// interpolated raw numbers (`₹${amount}`), so the same balance could render as
// "₹1200" in one place and "₹1,200" in another with no shared decimal rule.

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const signedFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
  signDisplay: "always",
});

// amount -> "₹1,200". Non-finite/missing input renders as "₹0" rather than
// "₹NaN" or "₹undefined".
export function formatCurrency(amount) {
  const n = Number(amount);
  return formatter.format(Number.isFinite(n) ? n : 0);
}

// amount -> "+₹1,200" / "-₹1,200", for balances where the sign carries meaning
// (you're owed vs. you owe).
export function formatSignedCurrency(amount) {
  const n = Number(amount);
  return signedFormatter.format(Number.isFinite(n) ? n : 0);
}
