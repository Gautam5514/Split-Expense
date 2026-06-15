"use client";

import { Handle, Position } from "@xyflow/react";

/**
 * Four connection handles (a source + a target on each horizontal side) so an
 * edge can enter/leave whichever side faces its parent. Hidden by default;
 * the core renders them as faint white "junction" dots via `junction`.
 */
export default function NodeHandles({ junction = false }) {
  const cls = junction ? "mm-handle mm-handle--junction" : "mm-handle";
  return (
    <>
      <Handle id="tl" type="target" position={Position.Left} className={cls} isConnectable={false} />
      <Handle id="sl" type="source" position={Position.Left} className={cls} isConnectable={false} />
      <Handle id="tr" type="target" position={Position.Right} className={cls} isConnectable={false} />
      <Handle id="sr" type="source" position={Position.Right} className={cls} isConnectable={false} />
    </>
  );
}
