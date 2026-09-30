import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "@/app/dashboard/page";

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
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

describe("DashboardPage - group creation wiring", () => {
  test("clicking 'New Group' opens the create-group wizard", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/groups"));

    expect(screen.queryByText("What's this group for?")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /new group/i }));
    expect(screen.getByText("What's this group for?")).toBeInTheDocument();
  });

  test("finishing the wizard creates the group, refreshes the list, and opens the group", async () => {
    api.post.mockImplementation((url) =>
      Promise.resolve(url === "/groups"
        ? { data: { _id: "new-group-1", name: "Goa Trip", groupType: "roommate" } }
        : { data: { joinLink: "https://x.test/join/abc" } })
    );
    const user = userEvent.setup();
    render(<DashboardPage />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/groups"));
    const callsBefore = api.get.mock.calls.length;

    await user.click(screen.getByRole("button", { name: /new group/i }));
    await user.click(screen.getByRole("button", { name: /continue with roommates/i }));
    const input = await screen.findByLabelText("Group name");
    await user.clear(input);
    await user.type(input, "Goa Trip");
    await user.click(screen.getByRole("button", { name: /^next/i }));
    await user.click(await screen.findByRole("button", { name: /create group/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/groups", expect.objectContaining({ name: "Goa Trip", groupType: "roommate" }))
    );
    await user.click(await screen.findByRole("button", { name: /open group/i }));

    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(pushMock).toHaveBeenCalledWith("/groups/new-group-1");
  });
});
