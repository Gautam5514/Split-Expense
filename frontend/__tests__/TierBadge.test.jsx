import { render, screen } from "@testing-library/react";
import TierBadge from "@/components/ui/TierBadge";

describe("TierBadge", () => {
  it.each([
    ["bronze", "Bronze"],
    ["silver", "Silver"],
    ["gold", "Gold"],
    ["elite", "Elite"],
  ])("shows the %s tier name", (tier, label) => {
    render(<TierBadge tier={tier} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByTitle(`${label} member`)).toBeInTheDocument();
  });

  it.each([["starter"], [undefined], [null], [""], ["platinum"]])(
    "renders nothing for %p",
    (tier) => {
      const { container } = render(<TierBadge tier={tier} />);
      expect(container).toBeEmptyDOMElement();
    }
  );

  it("gives each tier its own colour and supports the solid variant", () => {
    const classes = ["bronze", "silver", "gold", "elite"].map((tier) => {
      const { container, unmount } = render(<TierBadge tier={tier} />);
      const cls = container.firstChild.className;
      unmount();
      return cls;
    });
    expect(new Set(classes).size).toBe(4);

    const { container } = render(<TierBadge tier="gold" variant="solid" className="extra" />);
    expect(container.firstChild).toHaveClass("bg-amber-400", "extra");
  });
});
