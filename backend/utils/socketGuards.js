/**
 * Socket.IO relay guards, extracted from index.js so the anti-spoofing logic
 * can be unit-tested without a live Socket.IO server.
 *
 * The rule: a socket may only relay `typing`/`sendMessage`/`groupTyping` into
 * a room if it (a) has an authenticated userId (set at `register` via a
 * verified Firebase token) and (b) is actually a member of that room. Rooms
 * are only ever joined via joinConversation/joinGroup, which each perform a
 * DB membership check. So "is in the room" transitively proves "is a member",
 * which stops a client from spoofing events into conversations/groups it isn't
 * part of.
 *
 * @param {{ userId?: string, rooms?: Set<string> }} socket
 * @param {string} roomName full room name (conversationId, or `group:<id>`)
 */
export const canRelayToRoom = (socket, roomName) => {
  if (!socket || !socket.userId) return false;
  if (!roomName) return false;
  if (!socket.rooms || typeof socket.rooms.has !== "function") return false;
  return socket.rooms.has(roomName);
};
