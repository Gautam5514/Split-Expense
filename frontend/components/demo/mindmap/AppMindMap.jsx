"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize2, RotateCcw, Search, X, ZoomIn, ZoomOut } from "lucide-react";

import { CORE_COLOR } from "./appMap.mjs";
import { computeLayout } from "./layout.mjs";
import { MINDMAP_STYLES } from "./styles";
import CoreNode from "./CoreNode";
import BranchNode from "./BranchNode";
import PageNode from "./PageNode";

const nodeTypes = { core: CoreNode, branch: BranchNode, page: PageNode };

/** Everything flows rightward: parents emit on the right, children receive on the left. */
const HANDLES = { source: "sr", target: "tl" };

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function Flow({ appMap, onOpenPage }) {
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const wrapperRef = useRef(null);

  const allBranchIds = useMemo(
    () => appMap.branches.map((b) => b.id),
    [appMap]
  );
  // Progressive disclosure: start with just the core. Click it to reveal the
  // branches (to its right), click a branch to reveal its pages (further right).
  const [coreExpanded, setCoreExpanded] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const [query, setQuery] = useState("");

  const toggleCore = useCallback(() => setCoreExpanded((v) => !v), []);

  const toggleBranch = useCallback((id) => {
    // Expanding a branch implies the core is open.
    setCoreExpanded(true);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openPage = useCallback(
    (page, newTab) => {
      if (newTab) {
        window.open(page.route, "_blank", "noopener,noreferrer");
        return;
      }
      if (onOpenPage) onOpenPage(page);
      else router.push(page.route);
    },
    [onOpenPage, router]
  );

  const q = query.trim().toLowerCase();
  const matches = useCallback(
    (text) => q.length > 0 && text.toLowerCase().includes(q),
    [q]
  );

  // While searching, open everything so matches in collapsed branches surface.
  const effectiveCoreExpanded = q ? true : coreExpanded;
  const effectiveExpanded = useMemo(
    () => (q ? new Set(allBranchIds) : expanded),
    [q, allBranchIds, expanded]
  );

  const { positions } = useMemo(
    () =>
      computeLayout(appMap, {
        coreExpanded: effectiveCoreExpanded,
        expanded: effectiveExpanded,
      }),
    [appMap, effectiveCoreExpanded, effectiveExpanded]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Ids to fit to: matches when searching, otherwise the whole map.
  const fitTargetIds = useMemo(() => {
    if (!q) return null;
    const ids = [];
    if (matches(appMap.core.label)) ids.push(appMap.core.id);
    for (const branch of appMap.branches) {
      if (matches(branch.label)) ids.push(branch.id);
      for (const page of branch.pages) {
        if (matches(page.label) || matches(page.route)) ids.push(page.id);
      }
    }
    return ids;
  }, [q, matches, appMap]);

  // Build the visible graph from the config + layout whenever state changes.
  useEffect(() => {
    const dim = (hit) => q.length > 0 && !hit;

    const nextNodes = [];
    const nextEdges = [];

    const corePos = positions[appMap.core.id];
    nextNodes.push({
      id: appMap.core.id,
      type: "core",
      position: { x: corePos.x, y: corePos.y },
      width: corePos.width,
      height: corePos.height,
      draggable: false,
      data: {
        label: appMap.core.label,
        description: appMap.core.description,
        color: CORE_COLOR,
        count: appMap.branches.length,
        expanded: effectiveCoreExpanded,
        dimmed: dim(matches(appMap.core.label)),
        onToggle: toggleCore,
      },
    });

    if (effectiveCoreExpanded) {
      for (const branch of appMap.branches) {
        const bPos = positions[branch.id];
        if (!bPos) continue;
        const isExpanded = effectiveExpanded.has(branch.id);
        const branchHit = matches(branch.label);

        nextNodes.push({
          id: branch.id,
          type: "branch",
          position: { x: bPos.x, y: bPos.y },
          width: bPos.width,
          height: bPos.height,
          draggable: false,
          data: {
            label: branch.label,
            color: branch.color,
            count: branch.pages.length,
            expanded: isExpanded,
            dimmed: dim(branchHit),
            onToggle: () => toggleBranch(branch.id),
          },
        });

        nextEdges.push({
          id: `e-core-${branch.id}`,
          source: appMap.core.id,
          target: branch.id,
          sourceHandle: HANDLES.source,
          targetHandle: HANDLES.target,
          type: "default",
          style: {
            stroke: branch.color,
            strokeWidth: 1.5,
            strokeOpacity: dim(branchHit) ? 0.1 : 0.6,
          },
        });

        if (!isExpanded) continue;

        for (const page of branch.pages) {
          const pPos = positions[page.id];
          if (!pPos) continue;
          const pageHit = matches(page.label) || matches(page.route);

          nextNodes.push({
            id: page.id,
            type: "page",
            position: { x: pPos.x, y: pPos.y },
            width: pPos.width,
            height: pPos.height,
            draggable: false,
            data: {
              label: page.label,
              route: page.route,
              description: page.description,
              color: branch.color,
              live: page.live === true,
              dimmed: dim(pageHit),
              onOpen: (newTab) => openPage(page, newTab),
            },
          });

          nextEdges.push({
            id: `e-${branch.id}-${page.id}`,
            source: branch.id,
            target: page.id,
            sourceHandle: HANDLES.source,
            targetHandle: HANDLES.target,
            type: "default",
            style: {
              stroke: branch.color,
              strokeWidth: 1.25,
              strokeOpacity: dim(pageHit) ? 0.08 : 0.5,
            },
          });
        }
      }
    }

    setNodes(nextNodes);
    setEdges(nextEdges);
  }, [
    appMap,
    positions,
    effectiveCoreExpanded,
    effectiveExpanded,
    q,
    matches,
    toggleCore,
    toggleBranch,
    openPage,
    setNodes,
    setEdges,
  ]);

  // Fit on load and after expand/collapse/search settles.
  useEffect(() => {
    if (!nodesInitialized) return;
    const id = requestAnimationFrame(() => {
      fitView({
        padding: 0.2,
        maxZoom: 1.1,
        duration: reducedMotion ? 0 : 500,
        nodes:
          fitTargetIds && fitTargetIds.length > 0
            ? fitTargetIds.map((nodeId) => ({ id: nodeId }))
            : undefined,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [
    nodesInitialized,
    effectiveCoreExpanded,
    effectiveExpanded,
    fitTargetIds,
    fitView,
    reducedMotion,
  ]);

  // Reset returns to the engaging starting point: just the core.
  const resetView = useCallback(() => {
    setQuery("");
    setCoreExpanded(false);
    setExpanded(new Set());
  }, []);

  const flowInstanceRef = useRef(null);

  // Arrow keys pan the viewport when focus is inside the canvas.
  const onKeyDown = useCallback(
    (e) => {
      const step = 64;
      const deltas = {
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
        ArrowLeft: [step, 0],
        ArrowRight: [-step, 0],
      };
      const d = deltas[e.key];
      if (!d) return;
      e.preventDefault();
      const instance = flowInstanceRef.current;
      if (!instance) return;
      const cur = instance.getViewport();
      instance.setViewport(
        { x: cur.x + d[0], y: cur.y + d[1], zoom: cur.zoom },
        { duration: reducedMotion ? 0 : 120 }
      );
    },
    [reducedMotion]
  );

  return (
    <div
      ref={wrapperRef}
      className="mm-root"
      onKeyDown={onKeyDown}
      role="tree"
      aria-label="SplitEase application architecture mind map"
    >
      <style>{MINDMAP_STYLES}</style>

      {/* Search */}
      <div className="mm-search">
        <Search size={14} className="mm-search-icon" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pages…"
          aria-label="Search the mind map"
          className="mm-search-input"
        />
        {query && (
          <button
            type="button"
            className="mm-search-clear"
            aria-label="Clear search"
            onClick={() => setQuery("")}
          >
            <X size={13} />
          </button>
        )}
      </div>

      <ReactFlow
        onInit={(instance) => (flowInstanceRef.current = instance)}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: "default" }}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        style={{ backgroundColor: "#070709" }}
      >
        <Background variant="dots" gap={28} size={1} color="#1b1b24" />
        <MiniMap
          pannable
          zoomable
          className="mm-minimap"
          maskColor="rgba(7,7,9,0.78)"
          nodeStrokeWidth={2}
          nodeColor={(n) =>
            n.type === "core" ? CORE_COLOR : n.data?.color || "#3f3f46"
          }
          nodeStrokeColor={(n) =>
            n.type === "core" ? CORE_COLOR : n.data?.color || "#3f3f46"
          }
        />
      </ReactFlow>

      {/* Control cluster (bottom-right) */}
      <div className="mm-controls" role="toolbar" aria-label="Map controls">
        <button
          type="button"
          className="mm-ctrl"
          aria-label="Fit view"
          title="Fit view"
          onClick={() =>
            fitView({ padding: 0.2, maxZoom: 1.1, duration: reducedMotion ? 0 : 500 })
          }
        >
          <Maximize2 size={16} />
        </button>
        <button
          type="button"
          className="mm-ctrl"
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => zoomOut({ duration: reducedMotion ? 0 : 200 })}
        >
          <ZoomOut size={16} />
        </button>
        <button
          type="button"
          className="mm-ctrl"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => zoomIn({ duration: reducedMotion ? 0 : 200 })}
        >
          <ZoomIn size={16} />
        </button>
        <button
          type="button"
          className="mm-ctrl mm-ctrl--accent"
          aria-label="Reset view"
          title="Reset"
          onClick={resetView}
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Interactive, auto-laid-out architecture mind map.
 *
 * @param {{ appMap: import("./appMap.mjs").AppMap, onOpenPage?: (page: any) => void }} props
 */
export default function AppMindMap({ appMap, onOpenPage }) {
  return (
    <ReactFlowProvider>
      <Flow appMap={appMap} onOpenPage={onOpenPage} />
    </ReactFlowProvider>
  );
}
