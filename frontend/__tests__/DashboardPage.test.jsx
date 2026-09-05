import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "@/app/dashboard/page";

jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ token: "test-token" }) }));
jest.mock("@/lib/api", () => ({ api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));
jest.mock("@/lib/toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));
// Stub out the two modals not under test here so this file only exercises
// the dashboard <-> CreateGroupModal wiring.
jest.mock("@/components/InviteModal", () => (props) => (
  <div data-testid="invite-modal" data-group-id={props.groupId} />
));
jest.mock("@/components/ConfirmDeleteModal", () => (props) =>
  props.isOpen ? <div data-testid="confirm-delete-modal" /> : null
);

import { api } from "@/lib/api";

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: [] });
});

describe("DashboardPage - group creation wiring (task #6)", () => {
  test("clicking 'New Group' opens the CreateGroupModal", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/groups"));

    expect(screen.queryByText("Create New Group")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /new group/i }));
    expect(screen.getByText("Create New Group")).toBeInTheDocument();
  });

  test("creating a group posts just the name, refreshes the list, and opens the invite modal", async () => {
    api.post.mockResolvedValueOnce({ data: { _id: "new-group-1", name: "Goa Trip", groupType: "trip" } });
    const user = userEvent.setup();
    render(<DashboardPage />);
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: /new group/i }));
    await user.type(screen.getByPlaceholderText("e.g. Goa Trip"), "Goa Trip");
    await user.click(screen.getByRole("button", { name: /create group/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/groups", { name: "Goa Trip" }));
    // Modal closes...
    expect(screen.queryByText("Create New Group")).not.toBeInTheDocument();
    // ...group list is refetched...
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    // ...and the invite modal opens for the newly created group.
    expect(await screen.findByTestId("invite-modal")).toHaveAttribute("data-group-id", "new-group-1");
  });
});
