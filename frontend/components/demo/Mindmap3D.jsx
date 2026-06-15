"use client";

import AppMindMap from "@/components/demo/mindmap/AppMindMap";
import { APP_MAP } from "@/components/demo/mindmap/appMap.mjs";

/**
 * SplitEase architecture mind map.
 *
 * Thin entry point kept for the existing `/demo/[id]` route. The whole graph is
 * driven by the single APP_MAP config; clicking a page node navigates to its
 * route. To add a page, edit the config in `mindmap/appMap.mjs` only.
 */
export default function Mindmap3D() {
  return (
    <div className="w-full h-full relative overflow-hidden bg-[#070709] select-none">
      <AppMindMap appMap={APP_MAP} />
    </div>
  );
}
