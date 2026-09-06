import { formatCurrency, formatSignedCurrency } from "@/lib/formatCurrency";

describe("formatCurrency", () => {
  test("formats INR with grouping and two decimal places", () => {
    expect(formatCurrency(1200, "INR")).toBe("₹1,200.00");
  });

  test("formats zero, negatives, and large amounts", () => {
    expect(formatCurrency(0, "INR")).toBe("₹0.00");
    expect(formatCurrency(-50.5, "INR")).toBe("-₹50.50");
    expect(formatCurrency(1000000, "INR")).toBe("₹10,00,000.00");
  });

  test("honors the currency argument", () => {
    expect(formatCurrency(1200, "USD")).toBe("$1,200.00");
    expect(formatCurrency(1200, "EUR")).toMatch(/1,200\.00/);
  });

  test("treats missing or non-finite amounts as zero", () => {
    expect(formatCurrency(undefined, "INR")).toBe("₹0.00");
    expect(formatCurrency("nope", "INR")).toBe("₹0.00");
  });

  test("defaults to INR when currency is omitted", () => {
    expect(formatCurrency(10)).toBe("₹10.00");
  });
});

describe("formatSignedCurrency", () => {
  test("always shows a sign for owed vs owing balances", () => {
    expect(formatSignedCurrency(1200, "INR")).toBe("+₹1,200.00");
    expect(formatSignedCurrency(-1200, "INR")).toBe("-₹1,200.00");
  });
});
