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
  test("renders an inline name field with a Create button, no modal", async () => {
    render(<UserDashboardPage />);
    expect(await screen.findByPlaceholderText("New group name...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
    expect(screen.queryByText("Create New Group")).not.toBeInTheDocument();
  });

  test("creating a group posts just the name, refetches dashboard data, and navigates directly into the new group", async () => {
    api.post.mockResolvedValueOnce({ data: { _id: "grp-9", name: "Flat 304", groupType: "trip" } });
    const user = userEvent.setup();
    render(<UserDashboardPage />);
    const nameInput = await screen.findByPlaceholderText("New group name...");
    const callsBefore = api.get.mock.calls.length;

    await user.type(nameInput, "Flat 304");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/groups", { name: "Flat 304" })
    );
    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(pushMock).toHaveBeenCalledWith("/groups/grp-9");
  });

  test("shows an error toast and does not call the API when the name is empty", async () => {
    const toast = require("@/lib/toast").default;
    const user = userEvent.setup();
    render(<UserDashboardPage />);

    await user.click(await screen.findByRole("button", { name: /create/i }));

    expect(toast.error).toHaveBeenCalledWith("Enter a group name");
    expect(api.post).not.toHaveBeenCalled();
  });
});
