import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import ShareSplitEditor, { MAX_SHARES } from "@/components/people/ShareSplitEditor";
import { sharesToWeights } from "@/lib/people";

const ann = { key: "u:a", kind: "user", userId: "a", name: "Ann", sub: "ann@x.com", direct: true };
const bob = { key: "u:b", kind: "user", userId: "b", name: "Bob", sub: "bob@x.com", direct: true };
const pendingUser = { key: "u:c", kind: "user", userId: "c", name: "Cara", sub: "c@x.com", direct: false };
const emailOnly = { key: "e:d@x.com", kind: "email", email: "d@x.com", name: "d@x.com", sub: "Joining invite by email", direct: false };

// Controlled wrapper, same way the modal uses it.
function Harness({ people, initial = {}, spy }) {
  const [shares, setShares] = useState(initial);
  spy?.(shares);
  return <ShareSplitEditor people={people} shares={shares} onChange={setShares} />;
}

describe("ShareSplitEditor", () => {
  test("shows You first, then each person by name, everyone at 1 share", () => {
    render(<Harness people={[ann, bob]} />);
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Ann")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("3 shares total")).toBeInTheDocument();
    expect(screen.getAllByText("33% of every bill")).toHaveLength(3);
  });

  test("works with nobody else added (only You)", () => {
    render(<Harness people={[]} />);
    expect(screen.getByText("1 share total")).toBeInTheDocument();
    expect(screen.getByText("100% of every bill")).toBeInTheDocument();
  });

  test("+ and - change shares and the live percentages", async () => {
    const user = userEvent.setup();
    render(<Harness people={[ann]} />);
    await user.click(screen.getByRole("button", { name: "More shares for Ann" }));
    await user.click(screen.getByRole("button", { name: "More shares for Ann" }));
    expect(screen.getByText("4 shares total")).toBeInTheDocument(); // You 1 + Ann 3
    expect(screen.getByText("75% of every bill")).toBeInTheDocument();
    expect(screen.getByText("25% of every bill")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fewer shares for Ann" }));
    expect(screen.getByText("3 shares total")).toBeInTheDocument();
  });

  test("cannot go below 1 share", async () => {
    const user = userEvent.setup();
    render(<Harness people={[ann]} />);
    const minus = screen.getByRole("button", { name: "Fewer shares for Ann" });
    expect(minus).toBeDisabled();
    await user.click(minus);
    expect(screen.getByText("2 shares total")).toBeInTheDocument();
  });

  test(`cannot go above ${MAX_SHARES} shares`, async () => {
    render(<Harness people={[ann]} initial={{ "u:a": MAX_SHARES }} />);
    expect(screen.getByRole("button", { name: "More shares for Ann" })).toBeDisabled();
  });

  test("a stale or out-of-range stored value is clamped on the next change", async () => {
    const user = userEvent.setup();
    let last;
    render(<Harness people={[ann]} initial={{ "u:a": 0 }} spy={(s) => { last = s; }} />);
    await user.click(screen.getByRole("button", { name: "More shares for Ann" }));
    expect(last["u:a"]).toBeGreaterThanOrEqual(1);
  });

  test("email invites and not-yet-accepted users are locked at 1 share (no stepper)", () => {
    render(<Harness people={[ann, pendingUser, emailOnly]} />);
    expect(screen.getByText("Gets 1 share once they accept")).toBeInTheDocument();
    expect(screen.getByText("Gets 1 share once they join")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /shares for Cara/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /shares for d@x.com/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More shares for Ann" })).toBeInTheDocument();
    // You 1 + Ann 1 + Cara 1 + email 1
    expect(screen.getByText("4 shares total")).toBeInTheDocument();
  });

  test("percentages follow when someone is removed", () => {
    const { rerender } = render(<ShareSplitEditor people={[ann, bob]} shares={{ "u:a": 2 }} onChange={() => {}} />);
    expect(screen.getByText("4 shares total")).toBeInTheDocument();
    rerender(<ShareSplitEditor people={[bob]} shares={{ "u:a": 2 }} onChange={() => {}} />);
    expect(screen.queryByText("Ann")).not.toBeInTheDocument();
    expect(screen.getByText("2 shares total")).toBeInTheDocument(); // stale Ann entry ignored
  });
});

describe("sharesToWeights", () => {
  const group = { members: [{ _id: "me1" }, { _id: "a" }, { _id: "b" }] };

  test("maps creator via 'me' and others via u:<id>, defaulting to 1", () => {
    expect(sharesToWeights(group, { me: 2, "u:a": 3 }, "me1")).toEqual([
      { userId: "me1", value: 2 }, { userId: "a", value: 3 }, { userId: "b", value: 1 },
    ]);
  });

  test("accepts members as plain id strings and an object creator id", () => {
    expect(sharesToWeights({ members: ["me1", "a"] }, { me: 5 }, "me1")).toEqual([
      { userId: "me1", value: 5 }, { userId: "a", value: 1 },
    ]);
  });

  test("ignores shares for people who are not members (pending invites, removed)", () => {
    const w = sharesToWeights(group, { "u:ghost": 9, "u:a": 2 }, "me1");
    expect(w.map((x) => x.userId)).toEqual(["me1", "a", "b"]);
  });

  test("unknown creator id leaves everyone else mapped and nobody dropped", () => {
    expect(sharesToWeights(group, { me: 4 }, undefined)).toHaveLength(3);
  });

  test("empty / missing group gives no weights", () => {
    expect(sharesToWeights(undefined, {}, "x")).toEqual([]);
    expect(sharesToWeights({}, {}, "x")).toEqual([]);
  });
});
