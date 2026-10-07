import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateGroupModal from "@/components/CreateGroupModal";

// api/toast are real modules with real side effects (axios instance, Firebase
// auth interceptor, react-hot-toast) - mock them so the component tests only
// exercise the modal's own logic.
jest.mock("@/lib/api", () => ({ api: { post: jest.fn(), get: jest.fn(), patch: jest.fn() } }));
jest.mock("@/lib/toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

import { api } from "@/lib/api";
import toast from "@/lib/toast";

beforeEach(() => {
  jest.resetAllMocks();
  api.get.mockResolvedValue({ data: [] });
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

// ── By shares: asked only after people are added, then saved per person ──
describe("CreateGroupModal - split by shares", () => {
  const CONTACTS = [
    { _id: "u1", name: "Ann Lee", email: "ann@x.com", isContact: true },
    { _id: "u2", name: "Bob Ray", email: "bob@x.com", isContact: true },
  ];

  // group as the server returns it after creating + adding Ann and Bob
  const populated = {
    _id: "g1", name: "Flat", createdBy: "me1",
    members: [{ _id: "me1", name: "Me" }, { _id: "u1", name: "Ann Lee" }, { _id: "u2", name: "Bob Ray" }],
  };

  function wire({ members = { group: populated, added: 2, pending: 0, invited: 0 }, patch } = {}) {
    api.get.mockImplementation((url) => Promise.resolve({ data: url === "/users/contacts" ? CONTACTS : [] }));
    api.post.mockImplementation((url) => {
      if (url === "/groups") return Promise.resolve({ data: { _id: "g1", name: "Flat", createdBy: "me1", members: [{ _id: "me1" }] } });
      if (url.endsWith("/members")) return members instanceof Error ? Promise.reject(members) : Promise.resolve({ data: members });
      return Promise.resolve({ data: { joinLink: "https://x.test/j" } });
    });
    api.patch.mockImplementation(patch || (() => Promise.resolve({ data: populated })));
  }

  async function toPeopleStep(user) {
    await toPeople(user, "Flat");
    await screen.findByRole("button", { name: /create group/i });
  }
  const pick = async (user, name) => user.click(await screen.findByText(name));
  const chooseShares = (user) => user.click(screen.getByRole("button", { name: /by shares/i }));

  test("the split question is NOT on the details step", async () => {
    wire();
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    await toDetails(user);
    expect(screen.queryByText("How do you split expenses?")).not.toBeInTheDocument();
  });

  test("the split question only appears after at least one person is picked", async () => {
    wire();
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    await toPeopleStep(user);
    expect(screen.queryByText("How do you split expenses?")).not.toBeInTheDocument();

    await pick(user, "Ann Lee");
    expect(await screen.findByText("How do you split expenses?")).toBeInTheDocument();

    // removing the only person hides it again
    await user.click(screen.getByRole("button", { name: "Remove Ann Lee" }));
    expect(screen.queryByText("How do you split expenses?")).not.toBeInTheDocument();
  });

  test("By shares lists everyone by name; Equally hides the editor", async () => {
    wire();
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    await toPeopleStep(user);
    await pick(user, "Ann Lee");
    await pick(user, "Bob Ray");

    expect(screen.queryByText("Set shares for each person")).not.toBeInTheDocument();
    await chooseShares(user);
    expect(screen.getByText("Set shares for each person")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More shares for Ann Lee" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More shares for Bob Ray" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^equally/i }));
    expect(screen.queryByText("Set shares for each person")).not.toBeInTheDocument();
  });

  test("custom shares are saved per member after the people are added", async () => {
    wire();
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    await toPeopleStep(user);
    await pick(user, "Ann Lee");
    await pick(user, "Bob Ray");
    await chooseShares(user);
    await user.click(screen.getByRole("button", { name: "More shares for Ann Lee" })); // Ann 2
    await user.click(screen.getByRole("button", { name: "More shares for Bob Ray" }));
    await user.click(screen.getByRole("button", { name: "More shares for Bob Ray" })); // Bob 3
    await user.click(screen.getByRole("button", { name: /create & add 2/i }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(api.patch).toHaveBeenCalledWith("/groups/g1/settings", {
      settings: { defaultSplit: { type: "shares", weights: [
        { userId: "me1", value: 1 }, { userId: "u1", value: 2 }, { userId: "u2", value: 3 },
      ] } },
    });
    // members were added BEFORE shares were patched (weights need members)
    const membersIdx = api.post.mock.calls.findIndex((c) => c[0].endsWith("/members"));
    expect(membersIdx).toBeGreaterThanOrEqual(0);
    expect(api.post.mock.invocationCallOrder[membersIdx]).toBeLessThan(api.patch.mock.invocationCallOrder[0]);
  });

  test("the creator's own shares are included", async () => {
    wire();
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    await toPeopleStep(user);
    await pick(user, "Ann Lee");
    await chooseShares(user);
    await user.click(screen.getByRole("button", { name: "More shares for You" }));
    await user.click(screen.getByRole("button", { name: /create & add 1/i }));
    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    const w = api.patch.mock.calls[0][1].settings.defaultSplit.weights;
    expect(w.find((x) => x.userId === "me1").value).toBe(2);
  });

  test("everyone left at 1 share needs no extra save", async () => {
    wire();
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    await toPeopleStep(user);
    await pick(user, "Ann Lee");
    await chooseShares(user);
    await user.click(screen.getByRole("button", { name: /create & add 1/i }));
    await screen.findByRole("button", { name: /open group/i });
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith("/groups", expect.objectContaining({
      settings: expect.objectContaining({ defaultSplit: { type: "shares", weights: [] } }),
    }));
  });

  test("a share raised then lowered back to 1 sends nothing extra", async () => {
    wire();
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    await toPeopleStep(user);
    await pick(user, "Ann Lee");
    await chooseShares(user);
    await user.click(screen.getByRole("button", { name: "More shares for Ann Lee" }));
    await user.click(screen.getByRole("button", { name: "Fewer shares for Ann Lee" }));
    await user.click(screen.getByRole("button", { name: /create & add 1/i }));
    await screen.findByRole("button", { name: /open group/i });
    expect(api.patch).not.toHaveBeenCalled();
  });

  test("switching back to Equally after editing shares saves no shares", async () => {
    wire();
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    await toPeopleStep(user);
    await pick(user, "Ann Lee");
    await chooseShares(user);
    await user.click(screen.getByRole("button", { name: "More shares for Ann Lee" }));
    await user.click(screen.getByRole("button", { name: /^equally/i }));
    await user.click(screen.getByRole("button", { name: /create & add 1/i }));
    await screen.findByRole("button", { name: /open group/i });
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.post.mock.calls.find((c) => c[0] === "/groups")[1].settings?.defaultSplit).toBeUndefined();
  });

  test("a removed person's shares are not sent; re-adding keeps what was set", async () => {
    wire({ members: { group: { ...populated, members: populated.members.slice(0, 2) }, added: 1, pending: 0, invited: 0 } });
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    await toPeopleStep(user);
    await pick(user, "Ann Lee");
    await pick(user, "Bob Ray");
    await chooseShares(user);
    await user.click(screen.getByRole("button", { name: "More shares for Bob Ray" }));
    await user.click(screen.getByRole("button", { name: "Remove Bob Ray" }));
    await user.click(screen.getByRole("button", { name: "More shares for Ann Lee" }));
    await user.click(screen.getByRole("button", { name: /create & add 1/i }));
    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    const ids = api.patch.mock.calls[0][1].settings.defaultSplit.weights.map((x) => x.userId);
    expect(ids).toEqual(["me1", "u1"]);
  });

  test("people who could not be added (pending invite) are never weighted", async () => {
    // server added only the creator; Ann is a pending invite
    wire({ members: { group: { ...populated, members: [populated.members[0]] }, added: 0, pending: 1, invited: 0 } });
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    await toPeopleStep(user);
    await pick(user, "Ann Lee");
    await chooseShares(user);
    await user.click(screen.getByRole("button", { name: "More shares for You" }));
    await user.click(screen.getByRole("button", { name: /create & add 1/i }));
    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    expect(api.patch.mock.calls[0][1].settings.defaultSplit.weights).toEqual([{ userId: "me1", value: 2 }]);
  });

  test("if saving shares fails the group is still created and the user is told", async () => {
    wire({ patch: () => Promise.reject({ response: { data: { message: "nope" } } }) });
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    await toPeopleStep(user);
    await pick(user, "Ann Lee");
    await chooseShares(user);
    await user.click(screen.getByRole("button", { name: "More shares for Ann Lee" }));
    await user.click(screen.getByRole("button", { name: /create & add 1/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/shares weren't saved/i)));
    expect(await screen.findByRole("button", { name: /open group/i })).toBeInTheDocument();
  });

  test("if adding people fails the group still exists and shares for the creator still save", async () => {
    wire({ members: Object.assign(new Error("x"), { response: { data: { message: "add failed" } } }) });
    const user = userEvent.setup();
    render(<CreateGroupModal isOpen onClose={jest.fn()} onCreated={jest.fn()} />);
    await toPeopleStep(user);
    await pick(user, "Ann Lee");
    await chooseShares(user);
    await user.click(screen.getByRole("button", { name: "More shares for You" }));
    await user.click(screen.getByRole("button", { name: /create & add 1/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("add failed"));
    await screen.findByRole("button", { name: /open group/i });
    // only the creator is a member, so only the creator is weighted (backend rejects non-members)
    const w = api.patch.mock.calls[0]?.[1].settings.defaultSplit.weights;
    expect(w).toEqual([{ userId: "me1", value: 2 }]);
  });
});

