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

describe("UsersPage - group creation wiring (task #6)", () => {
  test("clicking 'New Group / Trip' opens the CreateGroupModal", async () => {
    const user = userEvent.setup();
    render(<UserDashboardPage />);
    const newGroupButton = await screen.findByRole("button", { name: /new group \/ trip/i });

    await user.click(newGroupButton);
    expect(screen.getByText("Create New Group")).toBeInTheDocument();
  });

  test("creating a group posts groupType, refetches dashboard data, and navigates into the new group", async () => {
    api.post.mockResolvedValueOnce({ data: { _id: "grp-9", name: "Flat 304", groupType: "roommate" } });
    const user = userEvent.setup();
    render(<UserDashboardPage />);
    const newGroupButton = await screen.findByRole("button", { name: /new group \/ trip/i });
    const callsBefore = api.get.mock.calls.length;

    await user.click(newGroupButton);
    await user.click(screen.getByText("Roommate Split"));
    await user.type(screen.getByPlaceholderText("e.g. Flat 304"), "Flat 304");
    await user.click(screen.getByRole("button", { name: /create roommate split/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/groups", { name: "Flat 304", groupType: "roommate" })
    );
    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(pushMock).toHaveBeenCalledWith("/groups/grp-9");
  });
});
