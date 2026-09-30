// Exchange-rate service: primary/fallback providers, caching, and that no
// client-supplied value can reach the outbound URL.
import { jest } from "@jest/globals";

const { getRate, _clearFxCache } = await import("../utils/fxRates.js");

const ok = (body) => ({ ok: true, json: async () => body });
let fetchMock;

beforeEach(() => {
  _clearFxCache();
  fetchMock = jest.fn();
  global.fetch = fetchMock;
});

test("uses open.er-api.com and caches the base currency", async () => {
  fetchMock.mockResolvedValue(ok({ result: "success", rates: { INR: 83.5, EUR: 0.9 } }));
  expect((await getRate("USD", "INR")).rate).toBe(83.5);
  expect((await getRate("USD", "EUR")).rate).toBe(0.9);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe("https://open.er-api.com/v6/latest/USD");
});

test("falls back to frankfurter when the primary fails", async () => {
  fetchMock
    .mockRejectedValueOnce(new Error("down"))
    .mockResolvedValueOnce(ok({ rates: { INR: 90.1 } }));
  const r = await getRate("EUR", "INR");
  expect(r.rate).toBe(90.1);
  expect(r.source).toBe("frankfurter.dev");
  expect(fetchMock.mock.calls[1][0]).toContain("api.frankfurter.dev");
});

test("same currency needs no network", async () => {
  expect((await getRate("INR", "INR")).rate).toBe(1);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("unsupported / injected codes are rejected before any request", async () => {
  await expect(getRate("USD/../../evil", "INR")).rejects.toMatchObject({ status: 400 });
  await expect(getRate("XYZ", "INR")).rejects.toMatchObject({ status: 400 });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("both providers down -> 503 with a manual-entry hint", async () => {
  fetchMock.mockRejectedValue(new Error("down"));
  await expect(getRate("GBP", "INR")).rejects.toMatchObject({ status: 503 });
});
