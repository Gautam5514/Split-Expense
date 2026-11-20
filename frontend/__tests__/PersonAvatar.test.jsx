import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { api } from "@/lib/api";

jest.mock("@/lib/api", () => ({ api: { get: jest.fn() } }));
const { default: PersonAvatar, resetPeopleDirectory } = require("@/components/autopilot/PersonAvatar");

const RAVI = "a".repeat(24), ME = "b".repeat(24), TWIN1 = "c".repeat(24), TWIN2 = "d".repeat(24);
const directory = {
  me: ME,
  people: {
    [RAVI]: { name: "Ravi Kumar", photoUrl: "https://img.test/ravi.jpg" },
    [ME]: { name: "Gautam Pandit", photoUrl: "https://img.test/me.jpg" },
    [TWIN1]: { name: "Aman", photoUrl: "https://img.test/aman1.jpg" },
    [TWIN2]: { name: "Aman", photoUrl: "https://img.test/aman2.jpg" },
  },
};
beforeEach(() => { jest.clearAllMocks(); resetPeopleDirectory(); api.get.mockResolvedValue({ data: directory }); });
afterEach(cleanup);
const src = (c) => c.querySelector("img")?.getAttribute("src");

test("shows the person's real photo, loading the directory once for every avatar", async () => {
  const { container } = render(<><PersonAvatar id={RAVI} name="Ravi Kumar" /><PersonAvatar id={ME} name="Gautam Pandit" /></>);
  expect(screen.getByText("RK")).toBeInTheDocument(); // initials until the photo is known
  await waitFor(() => expect(container.querySelectorAll("img")).toHaveLength(2));
  expect(src(container)).toBe("https://img.test/ravi.jpg");
  expect(api.get).toHaveBeenCalledTimes(1);
});

test("with no id it recognises “You” and an unambiguous name, but never guesses between namesakes", async () => {
  const you = render(<PersonAvatar name="You" />);
  await waitFor(() => expect(src(you.container)).toBe("https://img.test/me.jpg"));
  const byName = render(<PersonAvatar name="ravi kumar" />);
  expect(src(byName.container)).toBe("https://img.test/ravi.jpg");
  const twin = render(<PersonAvatar name="Aman" />);
  expect(twin.container.querySelector("img")).toBeNull();
  expect(screen.getByText("A")).toBeInTheDocument();
});

test("a photo that fails to load, or a server without photos, falls back to initials", async () => {
  const { container } = render(<PersonAvatar id={RAVI} name="Ravi Kumar" />);
  await waitFor(() => expect(container.querySelector("img")).not.toBeNull());
  fireEvent.error(container.querySelector("img"));
  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByText("RK")).toBeInTheDocument();

  cleanup(); resetPeopleDirectory();
  api.get.mockRejectedValue({ response: { status: 404 } });
  render(<PersonAvatar id={RAVI} name="Ravi Kumar" />);
  expect(await screen.findByText("RK")).toBeInTheDocument();
});
