"use client";

import { memo } from "react";
import { Minus, Plus } from "lucide-react";
import NodeHandles from "./nodeHandles";

/**
 * Category node. Larger/bolder than pages, owns the +/- expand toggle.
 * data: { label, color, count, expanded, dimmed, onToggle }
 */
function BranchNode({ data }) {
  const { label, color, count, expanded, dimmed, onToggle } = data;
  const Icon = expanded ? Minus : Plus;
  const aria = `${label} category, ${count} pages, ${expanded ? "expanded" : "collapsed"}`;

  return (
    <div
      role="treeitem"
      tabIndex={0}
      aria-selected={false}
      aria-expanded={expanded}
      aria-label={aria}
      title={label}
      className="mm-card mm-card--branch mm-enter"
      style={{
        borderColor: color,
        boxShadow: `0 0 18px ${color}40, inset 0 0 10px ${color}1f`,
        opacity: dimmed ? 0.25 : 1,
      }}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <span className="mm-dot" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
      <span className="mm-label mm-label--branch">{label}</span>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="mm-toggle"
        style={{ color }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <Icon size={13} strokeWidth={3} />
      </button>
      <NodeHandles />
    </div>
  );
}

export default memo(BranchNode);
