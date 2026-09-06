// Single source of truth for rendering money in the UI. Before this, amount
// displays were ad hoc across the app - some used Intl.NumberFormat, most just
// interpolated raw numbers (`₹${amount}`), so the same balance could render as
// "₹1200" in one place and "₹1,200" in another with no shared decimal rule.

const LOCALE_BY_CURRENCY = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
  JPY: "ja-JP",
  AUD: "en-AU",
};

const formatterCache = new Map();

function getFormatter(currency, { signed = false } = {}) {
  const code = (currency || "INR").toUpperCase();
  const key = `${code}:${signed ? "signed" : "plain"}`;
  if (formatterCache.has(key)) return formatterCache.get(key);

  const locale = LOCALE_BY_CURRENCY[code] || "en-IN";
  const fractionDigits = code === "JPY" ? 0 : 2;
  const options = {
    style: "currency",
    currency: code,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  };
  if (signed) options.signDisplay = "always";

  let formatter;
  try {
    formatter = new Intl.NumberFormat(locale, options);
  } catch {
    formatter = new Intl.NumberFormat("en-IN", {
      ...options,
      currency: "INR",
    });
  }
  formatterCache.set(key, formatter);
  return formatter;
}

function toFiniteNumber(amount) {
  const n = Number(amount);
  return Number.isFinite(n) ? n : 0;
}

// amount, currency -> "₹1,200.00" / "$1,200.00". Non-finite/missing input
// renders as a zero amount rather than "₹NaN" or "₹undefined".
export function formatCurrency(amount, currency = "INR") {
  return getFormatter(currency).format(toFiniteNumber(amount));
}

// amount, currency -> "+₹1,200.00" / "-₹1,200.00", for balances where the
// sign carries meaning (you're owed vs. you owe).
export function formatSignedCurrency(amount, currency = "INR") {
  return getFormatter(currency, { signed: true }).format(toFiniteNumber(amount));
}
