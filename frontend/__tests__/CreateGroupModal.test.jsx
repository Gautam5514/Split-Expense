import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateGroupModal from "@/components/CreateGroupModal";

// api/toast are real modules with real side effects (axios instance, Firebase
// auth interceptor, react-hot-toast) - mock them so the component tests only
// exercise the modal's own logic.
jest.mock("@/lib/api", () => ({ api: { post: jest.fn() } }));
jest.mock("@/lib/toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

import { api } from "@/lib/api";
import toast from "@/lib/toast";

beforeEach(() => {
  jest.clearAllMocks();
});

// Walks the wizard: step 1 (pick type) -> step 2 (name/details) -> step 3 (people).
async function toDetails(user) {
  await user.click(screen.getByRole("button", { name: /continue with roommates/i }));
  return screen.findByLabelText("Group name");
}

async function toPeople(user, name) {
  const input = await toDetails(user);
  await user.clear(input);
  if (name) await user.type(input, name);
  await user.click(screen.getByRole("button", { name: /^next/i }));
}

describe("CreateGroupModal", () => {
  test("renders nothing when isOpen is false", () => {
    const { container } = render(<CreateGroupModal isOpen={false} onClose={jest.fn()} onCreated={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("starts on the type picker with Roommates as the default", () => {
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    expect(screen.getByText("What's this group for?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with roommates/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Group name")).not.toBeInTheDocument();
  });

  test("picking a type moves to the details step with a suggested name", async () => {
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    const input = await toDetails(user);
    expect(input).toBeInTheDocument();
    expect(input.value.trim().length).toBeGreaterThan(0);
  });

  test("rejects a name shorter than 2 characters without calling the API", async () => {
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);

    await toPeople(user, "A");

    expect(await screen.findByText("Must be at least 2 characters.")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("rejects an empty name without calling the API", async () => {
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);

    await toPeople(user, "");

    expect(await screen.findByText("Group name is required.")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("creates the group with its type and reports success", async () => {
    api.post.mockImplementation((url) =>
      Promise.resolve(url === "/groups"
        ? { data: { _id: "g1", name: "Goa Trip", groupType: "roommate" } }
        : { data: { joinLink: "https://x.test/join/abc" } })
    );
    const onCreated = jest.fn();
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={onClose} onCreated={onCreated} />);

    await toPeople(user, "Goa Trip");
    await user.click(await screen.findByRole("button", { name: /create group/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/groups", expect.objectContaining({ name: "Goa Trip", groupType: "roommate" }))
    );
    // onCreated fires when the user leaves the "Group ready" screen.
    await user.click(await screen.findByRole("button", { name: /open group/i }));
    expect(onCreated).toHaveBeenCalledWith({ _id: "g1", name: "Goa Trip", groupType: "roommate" });
    expect(onClose).toHaveBeenCalled();
  });

  test("surfaces a field-specific error from the API under the name input", async () => {
    api.post.mockRejectedValueOnce({ response: { data: { field: "name", message: "Name already taken" } } });
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);

    await toPeople(user, "Duplicate");
    await user.click(await screen.findByRole("button", { name: /create group/i }));

    expect(await screen.findByText("Name already taken")).toBeInTheDocument();
  });

  test("falls back to a toast for a non-field API error, and the modal stays open", async () => {
    api.post.mockRejectedValueOnce({ response: { data: { message: "Server exploded" } } });
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={onClose} onCreated={jest.fn()} />);

    await toPeople(user, "Valid Name");
    await user.click(await screen.findByRole("button", { name: /create group/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Server exploded"));
    expect(onClose).not.toHaveBeenCalled();
  });

  test("Close dismisses the modal without calling the API", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={onClose} onCreated={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });
});
