"use client";
import { createElement } from "react";
import { getGroupIcon } from "@/lib/groupIcons";

const COLORS = [
  "bg-gradient-to-br from-blue-500 to-blue-600",
  "bg-gradient-to-br from-emerald-500 to-green-600",
  "bg-gradient-to-br from-teal-500 to-teal-700",
  "bg-gradient-to-br from-cyan-500 to-teal-600",
  "bg-gradient-to-br from-sky-500 to-cyan-600",
];
const colorForName = (name) => COLORS[name ? name.charCodeAt(0) % COLORS.length : 0];

// Shared group avatar: renders an uploaded photo if the group has one,
// else the group's chosen icon tile, else a colored letter avatar. Kept as
// its own component (not resolved inline in each caller) so the icon
// lookup never runs inside another component's render body.
export default function GroupAvatar({ group, size = 48 }) {
  const Icon = getGroupIcon(group?.icon);
  const dimension = `${size}px`;

  if (group?.photo?.url) {
    return (
      <img
        src={group.photo.url}
        alt={group.name}
        className="shrink-0 rounded-full object-cover ring-1 ring-black/5"
        style={{ width: dimension, height: dimension }}
      />
    );
  }

  if (Icon) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full text-white ring-1 ring-white/20 ${colorForName(group?.name)}`}
        style={{ width: dimension, height: dimension }}
      >
        {createElement(Icon, { size: Math.round(size * 0.42) })}
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-1 ring-white/20 ${colorForName(group?.name)}`}
      style={{ width: dimension, height: dimension, fontSize: Math.round(size * 0.38) }}
    >
      {group?.name?.charAt(0) || "?"}
    </div>
  );
}
