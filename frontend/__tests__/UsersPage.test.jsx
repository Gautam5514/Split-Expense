import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserDashboardPage from "@/app/users/page";

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ token: "test-token", loading: false }),
}));
jest.mock("@/lib/api", () => ({ api: { get: jest.fn(), post: jest.fn() } }));
jest.mock("@/lib/toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

import { api } from "@/lib/api";

beforeEach(() => {
  jest.clearAllMocks();
  pushMock.mockClear();
  // Keep this deliberately data-free: analytics=null skips the recharts
  // section entirely, which needs a ResizeObserver jsdom doesn't provide.
  api.get.mockImplementation((url) => {
    if (url === "/groups") return Promise.resolve({ data: [] });
    if (url === "/users/me") return Promise.resolve({ data: { _id: "me1" } });
    return Promise.resolve({ data: null });
  });
});

describe("UsersPage - group creation wiring", () => {
  test("'New group' opens the wizard", async () => {
    const user = userEvent.setup();
    render(<UserDashboardPage />);

    expect(screen.queryByText("What's this group for?")).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /new group/i }));
    expect(screen.getByText("What's this group for?")).toBeInTheDocument();
  });

  test("finishing the wizard creates the group, refetches dashboard data, and navigates into it", async () => {
    api.post.mockImplementation((url) =>
      Promise.resolve(url === "/groups"
        ? { data: { _id: "grp-9", name: "Flat 304", groupType: "roommate" } }
        : { data: { joinLink: "https://x.test/join/abc" } })
    );
    const user = userEvent.setup();
    render(<UserDashboardPage />);
    await user.click(await screen.findByRole("button", { name: /new group/i }));
    const callsBefore = api.get.mock.calls.length;

    await user.click(screen.getByRole("button", { name: /continue with roommates/i }));
    const input = await screen.findByLabelText("Group name");
    await user.clear(input);
    await user.type(input, "Flat 304");
    await user.click(screen.getByRole("button", { name: /^next/i }));
    await user.click(await screen.findByRole("button", { name: /create group/i }));
    await user.click(await screen.findByRole("button", { name: /open group/i }));

    expect(api.post).toHaveBeenCalledWith("/groups", expect.objectContaining({ name: "Flat 304", groupType: "roommate" }));
    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(pushMock).toHaveBeenCalledWith("/groups/grp-9");
  });
});
