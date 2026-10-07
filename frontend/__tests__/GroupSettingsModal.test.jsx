import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroupSettingsModal from "@/components/group/GroupSettingsModal";
import { buildSettingsPayload, validateDefaultSplit, isLockedError } from "@/lib/groupSettingsPayload";

jest.mock("@/lib/api", () => ({ api: { patch: jest.fn() } }));
jest.mock("@/lib/toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
import { api } from "@/lib/api";
import toast from "@/lib/toast";

const members = [{ _id: "m1", name: "Meera" }, { _id: "m2", name: "Farah" }];
const mkGroup = (over = {}) => ({
  _id: "g1", groupType: "roommate", members,
  settings: { currency: "INR", receiptRequired: false, joinApproval: false, defaultSplit: { type: "equal", weights: [] } },
  ...over,
});
const sharesGroup = (over = {}) => mkGroup({
  settings: { currency: "INR", receiptRequired: false, joinApproval: false, defaultSplit: { type: "shares", weights: [{ userId: "m1", value: 2 }, { userId: "m2", value: 1 }] } },
  ...over,
});

beforeEach(() => {
  jest.resetAllMocks();
  api.patch.mockResolvedValue({ data: { _id: "g1", hasExpenses: false } });
});

const open = (group, hasExpenses = false, extra = {}) => {
  const onSaved = jest.fn(); const onClose = jest.fn();
  render(<GroupSettingsModal group={group} hasExpenses={hasExpenses} onClose={onClose} onSaved={onSaved} {...extra} />);
  return { onSaved, onClose };
};
const save = (user) => user.click(screen.getByRole("button", { name: /save settings/i }));
const receipt = () => screen.getByRole("checkbox", { name: /receipt required/i });
const approve = () => screen.getByRole("checkbox", { name: /approve people who join/i });

describe("GroupSettingsModal - before the first expense", () => {
  test("shows the editable split picker, currency, and no lock notice", () => {
    open(mkGroup());
    expect(screen.getByRole("button", { name: "Equal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Shares" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Percent" })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeEnabled();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.queryByTestId("split-locked")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  test("saves split, currency and toggles together", async () => {
    const user = userEvent.setup();
    const { onSaved, onClose } = open(mkGroup());
    await user.click(screen.getByRole("button", { name: "Shares" }));
    await user.click(receipt());
    await user.selectOptions(screen.getByRole("combobox"), "USD");
    await save(user);

    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(api.patch).toHaveBeenCalledWith("/groups/g1/settings", {
      groupType: "roommate",
      settings: {
        receiptRequired: true, joinApproval: false, currency: "USD",
        defaultSplit: { type: "shares", weights: [{ userId: "m1", value: 1 }, { userId: "m2", value: 1 }] },
      },
    });
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test("percent must total 100 - blocked client-side with no request", async () => {
    const user = userEvent.setup();
    open(mkGroup());
    await user.click(screen.getByRole("button", { name: "Percent" }));
    await save(user);
    expect(toast.error).toHaveBeenCalledWith("Default percentages must add up to 100.");
    expect(api.patch).not.toHaveBeenCalled();
  });

  test("shares need at least one non-zero share", async () => {
    const user = userEvent.setup();
    open(mkGroup());
    await user.click(screen.getByRole("button", { name: "Shares" }));
    for (const input of screen.getAllByRole("spinbutton")) { await user.clear(input); await user.type(input, "0"); }
    await save(user);
    expect(toast.error).toHaveBeenCalledWith("Give at least one member a share.");
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe.each([
  ["list says there are expenses (prop)", (g) => ({ group: g, has: true })],
  ["server flag group.hasExpenses", (g) => ({ group: { ...g, hasExpenses: true }, has: false })],
])("GroupSettingsModal - locked: %s", (_n, make) => {
  const openLocked = (g = mkGroup()) => { const { group, has } = make(g); return open(group, has); };

  test("shows the split as plain values - no picker, no inputs, no explanation text", () => {
    openLocked(sharesGroup());
    expect(screen.queryByRole("button", { name: "Equal" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Shares" })).not.toBeInTheDocument();
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    const box = screen.getByTestId("split-locked");
    expect(within(box).getByText("By shares")).toBeInTheDocument();
    expect(within(box).getByText("Meera")).toBeInTheDocument();
    expect(within(box).getByText("2")).toBeInTheDocument();
  });

  test("no lock banner, no 'locked' wording, anywhere", () => {
    openLocked(sharesGroup());
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/locked|can't be changed|after the first expense/i);
  });

  test("currency is a plain value (no dropdown)", () => {
    openLocked();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("split-locked")).getByText("INR")).toBeInTheDocument();
  });

  test("equal split shows just 'Equal'", () => {
    openLocked(mkGroup());
    expect(within(screen.getByTestId("split-locked")).getByText("Equal")).toBeInTheDocument();
  });

  test("trip dates and budget are plain text, not inputs", () => {
    openLocked(mkGroup({ groupType: "trip", trip: { startDate: "2026-10-01T00:00:00.000Z", endDate: "2026-10-09T00:00:00.000Z", budget: 500 } }));
    expect(document.querySelectorAll('input[type="date"], input[type="number"]')).toHaveLength(0);
    expect(screen.getByText("Start date")).toBeInTheDocument();
    expect(screen.getByText("INR 500")).toBeInTheDocument();
  });

  test("the close (cross) button is at the top and closes the modal", async () => {
    const user = userEvent.setup();
    const { onClose } = openLocked();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  test("the two switches still work and ONLY they are sent", async () => {
    const user = userEvent.setup();
    const { onSaved } = openLocked(sharesGroup());
    expect(receipt()).toBeEnabled();
    expect(approve()).toBeEnabled();
    await user.click(receipt());
    await user.click(approve());
    await save(user);
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(api.patch).toHaveBeenCalledWith("/groups/g1/settings", { settings: { receiptRequired: true, joinApproval: true } });
    expect(onSaved).toHaveBeenCalled();
  });

  test("a legacy group with odd percent weights can still save its toggles (no split validation)", async () => {
    const user = userEvent.setup();
    const g = mkGroup({ settings: { currency: "INR", defaultSplit: { type: "percent", weights: [{ userId: "m1", value: 10 }] } } });
    openLocked(g);
    await user.click(receipt());
    await save(user);
    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe("GroupSettingsModal - race: an expense is added while the sheet is open", () => {
  test("a 409 SETTINGS_LOCKED flips the sheet to locked and tells the user", async () => {
    api.patch.mockRejectedValueOnce({ response: { status: 409, data: { code: "SETTINGS_LOCKED", field: "defaultSplit", message: "This can't be changed after the first expense is added." } } });
    const user = userEvent.setup();
    const { onSaved, onClose } = open(mkGroup());
    await user.click(screen.getByRole("button", { name: "Shares" }));
    await save(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/after the first expense/i)));
    expect(await screen.findByTestId("split-locked")).toBeInTheDocument(); // sheet flips to plain values
    expect(screen.queryByRole("button", { name: "Shares" })).not.toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    // and the retry now sends only the switches
    api.patch.mockResolvedValueOnce({ data: { _id: "g1", hasExpenses: true } });
    await user.click(receipt());
    await save(user);
    await waitFor(() => expect(api.patch).toHaveBeenLastCalledWith("/groups/g1/settings", { settings: { receiptRequired: true, joinApproval: false } }));
  });

  test("a generic failure keeps the sheet editable", async () => {
    api.patch.mockRejectedValueOnce({ response: { status: 500, data: { message: "boom" } } });
    const user = userEvent.setup();
    open(mkGroup());
    await save(user);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("boom"));
    expect(screen.getByRole("button", { name: "Shares" })).toBeInTheDocument();
  });
});

describe("groupSettingsPayload", () => {
  const base = { receiptRequired: true, joinApproval: false, currency: "USD", splitType: "shares", weights: { m1: "2", m2: "x" }, members, groupType: "trip", trip: { startDate: "2026-10-01", endDate: "", budget: "" } };

  test("locked -> only the two switches, coerced to booleans", () => {
    expect(buildSettingsPayload({ ...base, locked: true, receiptRequired: 1, joinApproval: undefined })).toEqual({ settings: { receiptRequired: true, joinApproval: false } });
  });
  test("unlocked -> full payload; bad weight text becomes 0; empty trip fields become null", () => {
    const p = buildSettingsPayload({ ...base, locked: false });
    expect(p.settings.defaultSplit.weights).toEqual([{ userId: "m1", value: 2 }, { userId: "m2", value: 0 }]);
    expect(p.trip).toEqual({ startDate: "2026-10-01", endDate: null, budget: null });
    expect(p.settings.currency).toBe("USD");
  });
  test("equal split sends no weights; non-trip sends no trip block", () => {
    const p = buildSettingsPayload({ ...base, locked: false, splitType: "equal", groupType: "roommate" });
    expect(p.settings.defaultSplit).toEqual({ type: "equal", weights: [] });
    expect(p.trip).toBeUndefined();
  });
  test("validateDefaultSplit", () => {
    expect(validateDefaultSplit({ splitType: "equal", weights: {}, members })).toBe("");
    expect(validateDefaultSplit({ splitType: "percent", weights: { m1: "60", m2: "40" }, members })).toBe("");
    expect(validateDefaultSplit({ splitType: "percent", weights: { m1: "60", m2: "30" }, members })).toMatch(/100/);
    expect(validateDefaultSplit({ splitType: "shares", weights: { m1: "0", m2: "" }, members })).toMatch(/at least one/);
    expect(validateDefaultSplit({ splitType: "shares", weights: { m1: "1" }, members })).toBe("");
  });
  test("isLockedError only matches the server's lock response", () => {
    expect(isLockedError({ response: { status: 409, data: { code: "SETTINGS_LOCKED" } } })).toBe(true);
    expect(isLockedError({ response: { status: 409, data: { code: "OTHER" } } })).toBe(false);
    expect(isLockedError({ response: { status: 400, data: { code: "SETTINGS_LOCKED" } } })).toBe(false);
    expect(isLockedError(undefined)).toBe(false);
  });
});
