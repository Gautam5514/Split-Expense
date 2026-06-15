/**
 * Unit tests for the pure layout function.
 * Run with:  node --test frontend/components/demo/mindmap/layout.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";

import { computeLayout, DIMENSIONS } from "./layout.mjs";
import { APP_MAP } from "./appMap.mjs";

const allBranchIds = () => new Set(APP_MAP.branches.map((b) => b.id));

/** Axis-aligned bounding-box overlap (touching edges is allowed). */
function overlaps(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function assertNoOverlaps(positions) {
  const boxes = Object.entries(positions);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      assert.ok(
        !overlaps(boxes[i][1], boxes[j][1]),
        `${boxes[i][0]} overlaps ${boxes[j][0]}`
      );
    }
  }
}

test("collapsed root shows only the core, centered at the origin", () => {
  const { positions } = computeLayout(APP_MAP);
  assert.equal(Object.keys(positions).length, 1);
  const core = positions[APP_MAP.core.id];
  assert.equal(core.x, -DIMENSIONS.core.w / 2);
  assert.equal(core.y, -DIMENSIONS.core.h / 2);
});

test("expanded core shows core + 6 branches, no pages, no overlaps", () => {
  const { positions } = computeLayout(APP_MAP, { coreExpanded: true });
  assert.equal(Object.keys(positions).length, 1 + APP_MAP.branches.length);
  assertNoOverlaps(positions);
});

test("fully expanded shows core + 6 branches + 27 pages, no overlaps", () => {
  const { positions } = computeLayout(APP_MAP, {
    coreExpanded: true,
    expanded: allBranchIds(),
  });
  const pages = APP_MAP.branches.reduce((n, b) => n + b.pages.length, 0);
  assert.equal(APP_MAP.branches.length, 6);
  assert.equal(pages, 27);
  assert.equal(Object.keys(positions).length, 1 + 6 + 27);
  assertNoOverlaps(positions);
});

test("everything flows rightward: core < branches < pages on x", () => {
  const { positions } = computeLayout(APP_MAP, {
    coreExpanded: true,
    expanded: allBranchIds(),
  });
  const coreX = positions[APP_MAP.core.id].x;
  for (const branch of APP_MAP.branches) {
    assert.ok(positions[branch.id].x > coreX, `${branch.id} right of core`);
    for (const page of branch.pages) {
      assert.ok(
        positions[page.id].x > positions[branch.id].x,
        `${page.id} right of ${branch.id}`
      );
    }
  }
});

test("only the expanded branch reveals its pages", () => {
  const { positions } = computeLayout(APP_MAP, {
    coreExpanded: true,
    expanded: new Set(["ai"]),
  });
  for (const page of APP_MAP.branches.find((b) => b.id === "ai").pages) {
    assert.ok(positions[page.id]);
  }
  for (const page of APP_MAP.branches.find((b) => b.id === "auth").pages) {
    assert.ok(!positions[page.id]);
  }
});

test("is deterministic", () => {
  const opts = { coreExpanded: true, expanded: allBranchIds() };
  const a = JSON.stringify(computeLayout(APP_MAP, opts).positions);
  const b = JSON.stringify(computeLayout(APP_MAP, opts).positions);
  assert.equal(a, b);
});

test("handles an empty branch without throwing or overlapping", () => {
  const map = {
    core: { id: "core", label: "Core", description: "" },
    branches: [
      { id: "empty", label: "Empty", color: "#fff", pages: [] },
      {
        id: "one",
        label: "One",
        color: "#fff",
        pages: [{ id: "p1", label: "P1", route: "/p1", description: "" }],
      },
    ],
  };
  const { positions } = computeLayout(map, {
    coreExpanded: true,
    expanded: new Set(["empty", "one"]),
  });
  assert.ok(positions.empty && positions.one && positions.p1);
  assertNoOverlaps(positions);
});
