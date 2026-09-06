import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddExpenseModal from "@/components/AddExpenseModal";

jest.mock("@/lib/api", () => ({ api: { post: jest.fn() } }));
jest.mock("@/lib/toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

import { api } from "@/lib/api";
import toast from "@/lib/toast";

const group = {
  _id: "g1",
  name: "Goa Trip",
  members: [
    { _id: "u1", name: "Priya" },
    { _id: "u2", name: "Felix" },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AddExpenseModal field-level validation", () => {
  test("shows inline errors for amount, payer, and participants without calling the API", async () => {
    const user = userEvent.setup();
    render(<AddExpenseModal group={{ ...group, members: [] }} onClose={jest.fn()} onSuccess={jest.fn()} />);

    await user.type(screen.getByPlaceholderText("E.g. Dinner, Cab Ride"), "Dinner");
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    expect(await screen.findByText("Amount is required.")).toBeInTheDocument();
    expect(screen.getByText("Select who paid.")).toBeInTheDocument();
    expect(screen.getByText("Select at least one participant.")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("rejects a non-positive amount inline", async () => {
    const user = userEvent.setup();
    render(<AddExpenseModal group={group} onClose={jest.fn()} onSuccess={jest.fn()} />);

    await user.type(screen.getByPlaceholderText("E.g. Dinner, Cab Ride"), "Dinner");
    await user.type(screen.getByPlaceholderText("Enter amount"), "0");
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    expect(await screen.findByText("Amount must be a positive number.")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("catches split amounts that do not sum to the total before submit", async () => {
    const user = userEvent.setup();
    render(<AddExpenseModal group={group} onClose={jest.fn()} onSuccess={jest.fn()} />);

    await user.type(screen.getByPlaceholderText("E.g. Dinner, Cab Ride"), "Dinner");
    await user.type(screen.getByPlaceholderText("Enter amount"), "100");

    const priyaShare = await screen.findByLabelText("Split amount for Priya");
    await user.clear(priyaShare);
    await user.type(priyaShare, "10");

    await user.click(screen.getByRole("button", { name: /add expense/i }));

    expect(await screen.findByText(/Split amounts must sum to 100/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test("maps a 4xx field error onto the matching input", async () => {
    api.post.mockRejectedValueOnce({
      response: { status: 400, data: { field: "amount", message: "Amount is too high" } },
    });
    const user = userEvent.setup();
    render(<AddExpenseModal group={group} onClose={jest.fn()} onSuccess={jest.fn()} />);

    await user.type(screen.getByPlaceholderText("E.g. Dinner, Cab Ride"), "Dinner");
    await user.type(screen.getByPlaceholderText("Enter amount"), "50");
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    expect(await screen.findByText("Amount is too high")).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("toasts a general 4xx error that cannot be mapped to a field", async () => {
    api.post.mockRejectedValueOnce({
      response: { status: 400, data: { message: "Group is archived" } },
    });
    const user = userEvent.setup();
    render(<AddExpenseModal group={group} onClose={jest.fn()} onSuccess={jest.fn()} />);

    await user.type(screen.getByPlaceholderText("E.g. Dinner, Cab Ride"), "Dinner");
    await user.type(screen.getByPlaceholderText("Enter amount"), "50");
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Group is archived"));
  });
});
