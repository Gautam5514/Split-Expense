import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemePage from "@/app/theme/page";
import { ThemeProvider, ACCENT_STORAGE_KEY } from "@/context/ThemeContext";
import { api } from "@/lib/api";

jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ token: "test-token", loading: false }) }));
jest.mock("@/lib/api", () => ({ api: { get: jest.fn(), post: jest.fn() } }));
jest.mock("@/lib/toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const theme = (key, name, light, dark, cost, access) => ({
  id: `theme:${key}`, key, name, colors: { light, dark }, cost,
  price: access === "locked" ? cost : 0, access, usable: access === "owned" || access === "tier",
});
const THEMES = [
  theme("royal-amethyst", "Royal Amethyst", "#6D28D9", "#A78BFA", 450, "owned"),
  theme("emerald-noir", "Emerald Noir", "#047857", "#34D399", 550, "locked"),
  theme("aurum-gold", "Aurum Gold", "#B45309", "#FBBF24", 700, "locked"),
];
const root = document.documentElement;
const renderPage = () => render(<ThemeProvider><ThemePage /></ThemeProvider>);

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  localStorage.setItem("theme", "light");
  root.removeAttribute("data-accent");
  root.removeAttribute("style");
});

describe("Appearance page accent themes", () => {
  it("lists themes with balance, applies a usable one and goes back to Default", async () => {
    api.get.mockResolvedValue({ data: { coins: 600, store: { themes: THEMES } } });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("600 coins")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Royal Amethyst/ }));
    expect(root).toHaveAttribute("data-accent", "royal-amethyst");
    expect(screen.getByRole("button", { name: /Royal Amethyst/ })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /Default/ }));
    expect(root).not.toHaveAttribute("data-accent");
    expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBeNull();
  });

  it("shows the shortfall with a link to earn coins when the balance is short", async () => {
    api.get.mockResolvedValue({ data: { coins: 600, store: { themes: THEMES } } });
    renderPage();

    expect(await screen.findByText("700 coins · 100 more needed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Earn coins" })).toHaveAttribute("href", "/profile#rewards");
  });

  it("confirms, purchases and applies a locked theme", async () => {
    api.get.mockResolvedValue({ data: { coins: 600, store: { themes: THEMES } } });
    api.post.mockResolvedValue({
      data: {
        coins: 50,
        store: { themes: THEMES.map((t) => (t.key === "emerald-noir" ? { ...t, access: "owned", price: 0, usable: true } : t)) },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Unlock" }));
    expect(api.post).not.toHaveBeenCalled(); // asks first
    expect(screen.getByText("Unlock Emerald Noir?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Unlock · 550/ }));

    expect(api.post).toHaveBeenCalledWith("/referrals/purchase", { itemId: "theme:emerald-noir" });
    await waitFor(() => expect(root).toHaveAttribute("data-accent", "emerald-noir"));
    expect(screen.getByText("50 coins")).toBeInTheDocument();
  });

  it("asks before spending the Bronze free pick, then unlocks and applies", async () => {
    const free = THEMES.map((t) => ({ ...t, access: "free-pick", price: 0, usable: false }));
    api.get.mockResolvedValue({ data: { coins: 0, store: { themes: free } } });
    api.post.mockResolvedValue({ data: { coins: 0, store: { themes: THEMES } } });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findAllByText("Free with Bronze")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: /Royal Amethyst/ }));
    expect(api.post).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(api.post).toHaveBeenCalledWith("/referrals/purchase", { itemId: "theme:royal-amethyst" });
    await waitFor(() => expect(root).toHaveAttribute("data-accent", "royal-amethyst"));
  });

  it("keeps the theme unapplied and reports the server message when a purchase fails", async () => {
    const toast = require("@/lib/toast").default;
    api.get.mockResolvedValue({ data: { coins: 600, store: { themes: THEMES } } });
    api.post.mockRejectedValue({ response: { data: { message: "Not enough coins - you need 5 more." } } });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Unlock" }));
    await user.click(screen.getByRole("button", { name: /Unlock · 550/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Not enough coins - you need 5 more."));
    expect(root).not.toHaveAttribute("data-accent");
  });

  it("keeps White/Black working when the store request fails", async () => {
    api.get.mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/Couldn't load accent themes/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Black/ }));
    await waitFor(() => expect(root).toHaveClass("dark"));
    expect(within(screen.getByRole("button", { name: /Default/ })).getByText("Default")).toBeInTheDocument();
  });

  it("drops a saved accent this account cannot use", async () => {
    localStorage.setItem(ACCENT_STORAGE_KEY, JSON.stringify({ key: "aurum-gold", light: "#B45309", dark: "#FBBF24" }));
    api.get.mockResolvedValue({ data: { coins: 0, store: { themes: THEMES } } });
    renderPage();

    await screen.findByText("0 coins");
    await waitFor(() => expect(root).not.toHaveAttribute("data-accent"));
    expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBeNull();
  });
});
