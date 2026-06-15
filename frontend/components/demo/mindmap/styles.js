/**
 * Self-contained styles for the mind map, injected via a <style> tag so the
 * component stays portable (no global-CSS import restrictions in app router).
 */
export const MINDMAP_STYLES = `
.mm-root {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: #070709;
  outline: none;
  font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
}

/* ── Node cards ───────────────────────────────────────────────── */
.mm-card {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 1.5px solid;
  border-radius: 9999px;
  background: rgba(12, 14, 20, 0.92);
  backdrop-filter: blur(2px);
  color: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  user-select: none;
  transition: transform 0.18s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}
.mm-card:hover { transform: translateY(-1px); }
.mm-card:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
}

.mm-card--core   { width: 220px; min-height: 60px; }
.mm-card--branch { width: 240px; min-height: 54px; }
.mm-card--page   { width: 250px; min-height: 46px; }

.mm-card--planned {
  border-style: dashed;
  opacity: 0.78;
}

.mm-dot { width: 8px; height: 8px; border-radius: 9999px; flex-shrink: 0; }
.mm-card--core .mm-dot { width: 9px; height: 9px; }

.mm-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mm-label--core {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.mm-label--branch {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.mm-label--page {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: rgba(255, 255, 255, 0.88);
}

.mm-toggle, .mm-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
}
.mm-card:hover .mm-open { color: rgba(255, 255, 255, 0.95); }
.mm-toggle:hover, .mm-open:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(1.08);
}

/* ── Handles ──────────────────────────────────────────────────── */
.mm-handle {
  width: 1px;
  height: 1px;
  min-width: 0;
  min-height: 0;
  border: 0;
  background: transparent;
  opacity: 0;
}
.mm-handle--junction {
  width: 5px;
  height: 5px;
  background: #ffffff;
  opacity: 0.7;
  border-radius: 9999px;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
}

/* ── Enter animation: children slide in from the left (their parent) ── */
.mm-enter { animation: mmEnter 0.3s ease backwards; }

@keyframes mmEnter {
  from { opacity: 0; transform: translateX(-14px) scale(0.96); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .mm-card, .mm-enter { animation: none !important; transition: none !important; }
}

/* ── Search box ───────────────────────────────────────────────── */
.mm-search {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(320px, 70vw);
  padding: 8px 12px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(10, 11, 16, 0.7);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 30px -12px rgba(0, 0, 0, 0.8);
}
.mm-search-icon { color: rgba(255, 255, 255, 0.4); flex-shrink: 0; }
.mm-search-input {
  flex: 1 1 auto;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: rgba(255, 255, 255, 0.92);
  font-size: 13px;
}
.mm-search-input::placeholder { color: rgba(255, 255, 255, 0.35); }
.mm-search-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  flex-shrink: 0;
}
.mm-search-clear:hover { background: rgba(255, 255, 255, 0.16); color: #fff; }

/* ── Control cluster ──────────────────────────────────────────── */
.mm-controls {
  position: absolute;
  bottom: 24px;
  right: 24px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 30px -12px rgba(0, 0, 0, 0.8);
}
.mm-ctrl {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.mm-ctrl:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
.mm-ctrl:focus-visible { outline: 2px solid rgba(56, 189, 248, 0.7); outline-offset: 1px; }
.mm-ctrl--accent { color: #38bdf8; }
.mm-ctrl--accent:hover {
  color: #7dd3fc;
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.3);
}

/* ── MiniMap ──────────────────────────────────────────────────── */
.mm-minimap {
  background: rgba(10, 11, 16, 0.85) !important;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

/* React Flow edges sit beneath nodes already; keep selection subtle. */
.react-flow__node:focus { outline: none; }
.react-flow__node-default,
.react-flow__node { background: transparent; border: none; padding: 0; }
.react-flow__node.selected,
.react-flow__node:focus-visible { outline: none; box-shadow: none; }
`;
