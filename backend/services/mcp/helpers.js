// Shared result/format helpers for the MCP tools.
//
// Results stay a single JSON text block (what every MCP client renders and
// what the tests parse). Write tools add a one-line `summary` the assistant
// can repeat to the user as-is.

export const ok = (data) => ({
  content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
});

export const fail = (message) => ({ content: [{ type: "text", text: message }], isError: true });

/**
 * Unexpected failure: log the real error server-side, tell the client only a
 * generic message (Mongo/Mongoose errors can leak schema + internals).
 */
export const internalFail = (tool, e) => {
  console.error(`❌ MCP tool ${tool} failed:`, e?.message || e);
  return fail("Something went wrong while running this tool. Please try again.");
};

export const round2 = (n) => Number(Number(n || 0).toFixed(2));

const SYMBOLS = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
/** "₹1,250.50" / "AED 40" - readable money for summaries. */
export const money = (amount, currency = "INR") => {
  const n = round2(amount);
  const text = n.toLocaleString("en-IN", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const sym = SYMBOLS[currency];
  return sym ? `${sym}${text}` : `${currency} ${text}`;
};

export const currencyOf = (group) => group?.settings?.currency || "INR";

/** Short, stable shape for a person in tool output. */
export const person = (m) => (m ? { id: String(m._id ?? m.id ?? m), name: m.name, email: m.email } : null);

// Tool annotations: let ChatGPT / Claude decide when to ask before running.
export const READ = { readOnlyHint: true, openWorldHint: false };
export const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
export const IDEMPOTENT_WRITE = { ...WRITE, idempotentHint: true };
export const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false };
