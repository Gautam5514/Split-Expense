"use client";

import { useEffect, useRef } from "react";
import socket, { connectSocket, joinGroupRoom, leaveGroupRoom, onResync } from "@/lib/socket";

/**
 * Run `onChange` whenever the server pushes a live update, so screens stay
 * current without a manual refresh.
 *
 *  - event "groupUpdate":     something changed in one group (pass `groupId` to
 *                             also join that group's room and filter by it)
 *  - event "dashboardUpdate": something changed in any group the user is in
 *
 * Bursts of events collapse into one call (debounced). The callback also runs
 * with `{ kind: "reconnect" }` whenever updates may have been missed - after
 * the socket reconnects, the network comes back, or the tab becomes visible
 * again after a while.
 */
export function useRealtime({ event, groupId, enabled = true, onChange }) {
  const handler = useRef(onChange);
  useEffect(() => { handler.current = onChange; });

  useEffect(() => {
    if (!enabled) return undefined;

    let timer = null;
    const fire = (payload) => {
      clearTimeout(timer);
      timer = setTimeout(() => handler.current?.(payload), 250);
    };

    connectSocket();
    if (groupId) joinGroupRoom(groupId);

    const onEvent = (payload) => {
      if (groupId && String(payload?.groupId) !== String(groupId)) return;
      fire(payload);
    };

    socket.on(event, onEvent);
    const stopResync = onResync(() => fire({ groupId, kind: "reconnect" }));
    return () => {
      clearTimeout(timer);
      socket.off(event, onEvent);
      stopResync();
      if (groupId) leaveGroupRoom(groupId);
    };
  }, [event, groupId, enabled]);
}
