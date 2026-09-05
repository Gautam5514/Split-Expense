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

describe("CreateGroupModal", () => {
  test("renders nothing when isOpen is false", () => {
    const { container } = render(<CreateGroupModal isOpen={false} onClose={jest.fn()} onCreated={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("defaults to the Trip Split type with its own suggestions and placeholder", () => {
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    // "Trip Split" appears twice by design: once in the live gradient preview
    // badge, once as the selector card's title.
    expect(screen.getAllByText("Trip Split").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Roommate Split")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Goa Trip")).toBeInTheDocument();
    expect(screen.getByText("Goa Trip", { selector: "button" })).toBeInTheDocument();
  });

  test("switching to Roommate updates the placeholder and suggestion chips", async () => {
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);

    await user.click(screen.getByText("Roommate Split"));

    expect(screen.getByPlaceholderText("e.g. Flat 304")).toBeInTheDocument();
    expect(screen.getByText("Flat 304", { selector: "button" })).toBeInTheDocument();
    expect(screen.queryByText("Goa Trip", { selector: "button" })).not.toBeInTheDocument();
  });

  test("clicking a suggestion chip fills the name input", async () => {
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);

    await user.click(screen.getByText("Weekend Getaway"));

    expect(screen.getByPlaceholderText("e.g. Goa Trip")).toHaveValue("Weekend Getaway");
  });

  test("rejects a name shorter than 2 characters without calling the API", async () => {
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);

    await user.type(screen.getByPlaceholderText("e.g. Goa Trip"), "A");
    await user.click(screen.getByRole("button", { name: /create trip split/i }));

    expect(await screen.findByText("Must be at least 2 characters.")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("rejects an empty name without calling the API", async () => {
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: /create trip split/i }));

    expect(await screen.findByText("Group name is required.")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("submits { name, groupType: 'trip' } by default and reports success", async () => {
    api.post.mockResolvedValueOnce({ data: { _id: "g1", name: "Goa Trip", groupType: "trip" } });
    const onCreated = jest.fn();
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={onClose} onCreated={onCreated} />);

    await user.type(screen.getByPlaceholderText("e.g. Goa Trip"), "Goa Trip");
    await user.click(screen.getByRole("button", { name: /create trip split/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/groups", { name: "Goa Trip", groupType: "trip" }));
    expect(toast.success).toHaveBeenCalledWith("Group created successfully!");
    expect(onCreated).toHaveBeenCalledWith({ _id: "g1", name: "Goa Trip", groupType: "trip" });
    expect(onClose).toHaveBeenCalled();
  });

  test("submits groupType: 'roommate' after switching the type selector (task #6 - matches the app)", async () => {
    api.post.mockResolvedValueOnce({ data: { _id: "g2", name: "Flat 304", groupType: "roommate" } });
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);

    await user.click(screen.getByText("Roommate Split"));
    await user.type(screen.getByPlaceholderText("e.g. Flat 304"), "Flat 304");
    await user.click(screen.getByRole("button", { name: /create roommate split/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/groups", { name: "Flat 304", groupType: "roommate" })
    );
  });

  test("surfaces a field-specific error from the API under the name input", async () => {
    api.post.mockRejectedValueOnce({ response: { data: { field: "name", message: "Name already taken" } } });
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);

    await user.type(screen.getByPlaceholderText("e.g. Goa Trip"), "Duplicate");
    await user.click(screen.getByRole("button", { name: /create trip split/i }));

    expect(await screen.findByText("Name already taken")).toBeInTheDocument();
  });

  test("falls back to a toast for a non-field API error, and the modal stays open", async () => {
    api.post.mockRejectedValueOnce({ response: { data: { message: "Server exploded" } } });
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={onClose} onCreated={jest.fn()} />);

    await user.type(screen.getByPlaceholderText("e.g. Goa Trip"), "Valid Name");
    await user.click(screen.getByRole("button", { name: /create trip split/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Server exploded"));
    expect(onClose).not.toHaveBeenCalled();
  });

  test("Cancel closes the modal without calling the API", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={onClose} onCreated={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });
});
