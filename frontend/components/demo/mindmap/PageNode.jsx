"use client";

import { memo } from "react";
import { ExternalLink } from "lucide-react";
import NodeHandles from "./nodeHandles";

/**
 * Leaf page node. Click navigates (onOpen); the icon opens in a new tab.
 * data: { label, route, description, color, live, dimmed, onOpen }
 */
function PageNode({ data }) {
  const { label, route, description, color, live, dimmed, onOpen } = data;
  const aria = `${label} page${live ? "" : " (planned)"}. ${description} Opens ${route}.`;

  return (
    <div
      role="treeitem"
      tabIndex={0}
      aria-selected={false}
      aria-label={aria}
      title={`${description}${live ? "" : "  ·  planned route"}`}
      className={`mm-card mm-card--page mm-enter${live ? "" : " mm-card--planned"}`}
      style={{
        borderColor: color,
        boxShadow: `0 0 12px ${color}33, inset 0 0 8px ${color}14`,
        opacity: dimmed ? 0.22 : 1,
      }}
      onClick={() => onOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(false);
        }
      }}
    >
      <span className="mm-dot" style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}` }} />
      <span className="mm-label mm-label--page">{label}</span>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="mm-open"
        title={`Open ${route} in a new tab`}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(true);
        }}
      >
        <ExternalLink size={13} strokeWidth={2.25} />
      </button>
      <NodeHandles />
    </div>
  );
}

export default memo(PageNode);
