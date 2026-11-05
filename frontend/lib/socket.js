import { io } from "socket.io-client";
import { getAuth } from "firebase/auth";
import { API_URL } from "@/lib/config";

// One shared socket for the whole web app. To keep pages live without a
// manual refresh it:
//  - re-registers with a FRESH Firebase token on every (re)connect - the old
//    code registered once, so after a reconnect the server no longer knew who
//    this socket belonged to and stopped sending updates;
//  - re-joins every group room a page is still showing (rooms are lost on
//    reconnect), ref-counted so one component closing doesn't kick out another;
//  - signals a "resync" (refetch) when the tab becomes visible again, the
//    network comes back, or the socket reconnects.
const socket = io(API_URL, {
  transports: ["websocket"],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
});

const getToken = async () => {
  try {
    const auth = getAuth();
    // On a hard refresh the session is restored asynchronously; without this
    // the socket would register with a stale stored token and be ignored.
    await auth.authStateReady?.();
    const user = auth.currentUser;
    if (user) return await user.getIdToken();
  } catch {
    // fall through to the stored token
  }
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
};

// ── Group rooms, ref-counted ────────────────────────────────────────────────
const groupRooms = new Map(); // groupId -> number of components watching it

export const joinGroupRoom = (groupId) => {
  if (!groupId) return;
  const id = String(groupId);
  groupRooms.set(id, (groupRooms.get(id) || 0) + 1);
  if (socket.connected) socket.emit("joinGroup", id);
};

export const leaveGroupRoom = (groupId) => {
  if (!groupId) return;
  const id = String(groupId);
  const left = (groupRooms.get(id) || 0) - 1;
  if (left > 0) {
    groupRooms.set(id, left);
    return;
  }
  groupRooms.delete(id);
  if (socket.connected) socket.emit("leaveGroup", id);
};

// ── Resync: "you may have missed updates, refetch" ──────────────────────────
const resyncListeners = new Set();
export const onResync = (fn) => {
  resyncListeners.add(fn);
  return () => resyncListeners.delete(fn);
};
const emitResync = (reason) => {
  for (const fn of [...resyncListeners]) {
    try { fn(reason); } catch { /* one listener failing must not stop the rest */ }
  }
};

let hasConnectedBefore = false;
socket.on("connect", async () => {
  const token = await getToken();
  if (!token || !socket.connected) return;
  socket.emit("register", token);
  // The server queues these until "register" has been verified.
  for (const id of groupRooms.keys()) socket.emit("joinGroup", id);
  if (hasConnectedBefore) emitResync("reconnect");
  hasConnectedBefore = true;
});

export const connectSocket = async () => {
  const token = await getToken();
  if (!token) return;
  if (socket.connected) {
    // Re-register with the latest token (handles token refresh / login switch)
    socket.emit("register", token);
    return;
  }
  // `active` is true while socket.io is already (re)connecting on its own.
  if (!socket.active) socket.connect();
};

export const disconnectSocket = () => {
  if (socket.connected || socket.active) socket.disconnect();
};

// ── Tab visibility / network ────────────────────────────────────────────────
// Background tabs get throttled and laptops sleep; when the user comes back,
// make sure we are connected and refetch whatever changed meanwhile.
if (typeof window !== "undefined") {
  let hiddenAt = null;
  const STALE_AFTER_MS = 30000;
  const resume = () => {
    if (!hasConnectedBefore) return;
    if (!socket.connected) {
      connectSocket(); // the reconnect itself triggers a resync
      return;
    }
    emitResync("visible");
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    const away = hiddenAt == null ? 0 : Date.now() - hiddenAt;
    hiddenAt = null;
    if (away > STALE_AFTER_MS) resume();
  });
  window.addEventListener("online", resume);
}

export default socket;
