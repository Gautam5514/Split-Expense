"use client";

import { memo } from "react";
import { Minus, Plus } from "lucide-react";
import NodeHandles from "./nodeHandles";

/**
 * Central app-shell node. Clicking it reveals the branches to its right.
 * Stronger blue glow + focus ring than the branches.
 * data: { label, description, color, count, expanded, dimmed, onToggle }
 */
function CoreNode({ data }) {
  const { label, description, color, count, expanded, dimmed, onToggle } = data;
  const Icon = expanded ? Minus : Plus;

  return (
    <div
      role="treeitem"
      tabIndex={0}
      aria-selected={false}
      aria-expanded={expanded}
      aria-label={`${label}. ${description} ${count} categories, ${expanded ? "expanded" : "collapsed"}.`}
      title={description}
      className="mm-card mm-card--core"
      style={{
        borderColor: color,
        boxShadow: `0 0 28px ${color}66, 0 0 6px ${color}99, inset 0 0 14px ${color}22`,
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
      <span className="mm-dot" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
      <span className="mm-label mm-label--core">{label}</span>
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
      <NodeHandles junction />
    </div>
  );
}

export default memo(CoreNode);
