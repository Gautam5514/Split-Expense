import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useThemeContext, ACCENT_STORAGE_KEY } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";

// AuthProvider's Firebase subscription, captured so a test can fire it.
let mockAuthListener;
jest.mock("@/lib/firebaseClient", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({
  onIdTokenChanged: (_auth, cb) => { mockAuthListener = cb; return () => {}; },
}));
jest.mock("@/lib/api", () => ({ setAuthToken: jest.fn() }));

const AMETHYST = { key: "royal-amethyst", light: "#6D28D9", dark: "#A78BFA" };
const root = document.documentElement;

function Probe() {
  const { accent, setAccent } = useThemeContext();
  return (
    <div>
      <span data-testid="accent">{accent ? accent.key : "default"}</span>
      <button onClick={() => setAccent(AMETHYST)}>apply</button>
      <button onClick={() => setAccent(null)}>reset</button>
      <button onClick={() => setAccent({ key: "bad", light: "red; background:url(x)", dark: "#fff" })}>bad</button>
    </div>
  );
}

const renderProvider = () => render(<ThemeProvider><Probe /></ThemeProvider>);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("theme", "light"); // skip the matchMedia branch (not in jsdom)
  root.removeAttribute("data-accent");
  root.removeAttribute("style");
});

describe("ThemeContext accent", () => {
  it("starts on the default ink with nothing applied", async () => {
    renderProvider();
    await waitFor(() => expect(root).toHaveClass("light"));
    expect(screen.getByTestId("accent")).toHaveTextContent("default");
    expect(root).not.toHaveAttribute("data-accent");
    expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBeNull();
  });

  it("applies an accent, persists it, and restores the default exactly on reset", async () => {
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByText("apply"));
    expect(screen.getByTestId("accent")).toHaveTextContent("royal-amethyst");
    expect(root).toHaveAttribute("data-accent", "royal-amethyst");
    expect(root.style.getPropertyValue("--se-accent-light")).toBe("#6D28D9");
    expect(root.style.getPropertyValue("--se-accent-dark")).toBe("#A78BFA");
    expect(JSON.parse(localStorage.getItem(ACCENT_STORAGE_KEY))).toEqual(AMETHYST);

    await user.click(screen.getByText("reset"));
    expect(screen.getByTestId("accent")).toHaveTextContent("default");
    expect(root).not.toHaveAttribute("data-accent");
    expect(root.style.getPropertyValue("--se-accent-light")).toBe("");
    expect(root.style.getPropertyValue("--se-accent-dark")).toBe("");
    expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBeNull();
  });

  it("restores a saved accent on load and survives the legacy cleanup", async () => {
    localStorage.setItem(ACCENT_STORAGE_KEY, JSON.stringify(AMETHYST));
    localStorage.setItem("customPrimary", "#ff0000"); // legacy key, wiped on load
    root.style.setProperty("--primary", "#ff0000"); // legacy inline var, removed on load

    renderProvider();

    await waitFor(() => expect(root).toHaveAttribute("data-accent", "royal-amethyst"));
    expect(root.style.getPropertyValue("--se-accent-light")).toBe("#6D28D9");
    expect(root.style.getPropertyValue("--primary")).toBe("");
    expect(localStorage.getItem("customPrimary")).toBeNull();
    expect(localStorage.getItem(ACCENT_STORAGE_KEY)).not.toBeNull();
  });

  it("ignores a malformed saved value or an invalid colour", async () => {
    localStorage.setItem(ACCENT_STORAGE_KEY, "{not json");
    const user = userEvent.setup();
    renderProvider();
    await waitFor(() => expect(root).toHaveClass("light"));
    expect(screen.getByTestId("accent")).toHaveTextContent("default");

    await user.click(screen.getByText("bad"));
    expect(screen.getByTestId("accent")).toHaveTextContent("default");
    expect(root).not.toHaveAttribute("data-accent");
    expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBeNull();
  });

  it("clears the accent when Firebase reports a signed-out user", async () => {
    localStorage.setItem(ACCENT_STORAGE_KEY, JSON.stringify(AMETHYST));
    render(<ThemeProvider><AuthProvider><Probe /></AuthProvider></ThemeProvider>);
    await waitFor(() => expect(root).toHaveAttribute("data-accent", "royal-amethyst"));

    // Signed in: accent stays.
    await act(async () => { await mockAuthListener({ getIdToken: async () => "tok" }); });
    expect(root).toHaveAttribute("data-accent", "royal-amethyst");

    // Signed out: accent goes.
    await act(async () => { await mockAuthListener(null); });
    expect(screen.getByTestId("accent")).toHaveTextContent("default");
    expect(root).not.toHaveAttribute("data-accent");
    expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBeNull();
  });
});
