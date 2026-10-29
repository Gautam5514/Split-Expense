"use client";

import { useEffect, useRef } from "react";
import socket, { connectSocket } from "@/lib/socket";

/**
 * Run `onChange` whenever the server pushes a live update, so screens stay
 * current without a manual refresh.
 *
 *  - event "groupUpdate":     something changed in one group (pass `groupId` to
 *                             also join that group's room and filter by it)
 *  - event "dashboardUpdate": something changed in any group the user is in
 *
 * Bursts of events collapse into one call (debounced), and the callback also
 * runs after the socket reconnects, to catch anything missed while offline.
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

    if (!socket.connected) connectSocket();
    const join = () => { if (groupId) socket.emit("joinGroup", groupId); };
    join();

    const onEvent = (payload) => {
      if (groupId && String(payload?.groupId) !== String(groupId)) return;
      fire(payload);
    };
    const onReconnect = () => { connectSocket(); join(); fire({ kind: "reconnect" }); };

    socket.on(event, onEvent);
    socket.io?.on?.("reconnect", onReconnect);
    return () => {
      clearTimeout(timer);
      socket.off(event, onEvent);
      socket.io?.off?.("reconnect", onReconnect);
      if (groupId) socket.emit("leaveGroup", groupId);
    };
  }, [event, groupId, enabled]);
}
