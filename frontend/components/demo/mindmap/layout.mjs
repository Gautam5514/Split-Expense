/**
 * Pure, deterministic auto-layout for the SplitEase mind map.
 *
 * Left-rooted, rightward-expanding tree (progressive disclosure):
 *   core (column 0)  ->  branches (column 1)  ->  pages (column 2)
 *
 * Everything flows to the right. The layout is expansion-aware: only visible
 * nodes are placed, and each branch reserves just enough vertical space for the
 * pages it is currently showing (a tidy vertical packing), so siblings glide
 * apart as you expand and the core stays vertically centered on the stack.
 *
 * No magic x/y lives in the config: positions are derived from the tree.
 * Coordinates returned are React Flow node positions (top-left corner).
 */

/** Fixed node footprints. Node components must render at these sizes. */
export const DIMENSIONS = {
  core: { w: 220, h: 60 },
  branch: { w: 240, h: 54 },
  page: { w: 250, h: 46 },
};

/** Vertical gap between two stacked rows (pages, or collapsed branches). */
const ROW_V_GAP = 16;
/** Extra vertical gap between two branch slots. */
const BRANCH_V_GAP = 22;
/** Horizontal distance (center to center) from core to a branch. */
const BRANCH_DX = 340;
/** Horizontal distance (center to center) from core to a page. */
const PAGE_DX = 720;

function place(cx, cy, size, kind) {
  return {
    x: cx - size.w / 2,
    y: cy - size.h / 2,
    width: size.w,
    height: size.h,
    kind,
  };
}

/**
 * @param {import("./appMap.mjs").AppMap} appMap
 * @param {{ coreExpanded?: boolean, expanded?: Set<string>, dims?: typeof DIMENSIONS }} [opts]
 * @returns {{ positions: Record<string, {x:number,y:number,width:number,height:number,kind:string}> }}
 */
export function computeLayout(appMap, opts = {}) {
  const { coreExpanded = false, expanded = new Set(), dims = DIMENSIONS } = opts;
  /** @type {Record<string, any>} */
  const positions = {};

  // Collapsed root: just the core, centered at the origin.
  if (!coreExpanded) {
    positions[appMap.core.id] = place(0, 0, dims.core, "core");
    return { positions };
  }

  const row = dims.page.h + ROW_V_GAP;

  // Each branch reserves rows for its visible pages (1 row when collapsed).
  const slots = appMap.branches.map((b) =>
    (expanded.has(b.id) ? Math.max(b.pages.length, 1) : 1) * row
  );
  const totalHeight =
    slots.reduce((sum, h) => sum + h, 0) +
    BRANCH_V_GAP * Math.max(appMap.branches.length - 1, 0);

  let cursor = -totalHeight / 2;
  appMap.branches.forEach((branch, i) => {
    const slot = slots[i];
    const centerY = cursor + slot / 2;
    cursor += slot + BRANCH_V_GAP;

    positions[branch.id] = place(BRANCH_DX, centerY, dims.branch, "branch");

    if (expanded.has(branch.id)) {
      const n = branch.pages.length;
      branch.pages.forEach((page, j) => {
        const pageY = centerY + (j - (n - 1) / 2) * row;
        positions[page.id] = place(PAGE_DX, pageY, dims.page, "page");
      });
    }
  });

  // Core sits at the vertical center of the branch stack (origin), to its left.
  positions[appMap.core.id] = place(0, 0, dims.core, "core");
  return { positions };
}

export default computeLayout;
