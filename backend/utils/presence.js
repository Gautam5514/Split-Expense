// Who should hear that a user went online/offline?
//
// Old behaviour: io.emit("userStatus") to EVERY connected client on every
// connect/disconnect. That is O(users) work per event (O(users^2) during a
// reconnect storm) and told strangers when anyone was online.
//
// New behaviour: only people who actually share something with the user -
// a 1:1 chat or a group - plus the user's own other devices.

const MAX_CONVERSATIONS = 500;
const MAX_GROUPS = 200;
const MAX_AUDIENCE = 3000;

/** Ids of everyone who shares a conversation or group with `userId` (not the user). */
export async function buildStatusAudience({ Conversation, Group }, userId) {
  const me = String(userId);
  const [convos, groups] = await Promise.all([
    Conversation.find({ members: userId }).select("members").limit(MAX_CONVERSATIONS).lean(),
    Group.find({ members: userId }).select("members").limit(MAX_GROUPS).lean(),
  ]);
  const ids = new Set();
  for (const doc of [...convos, ...groups]) {
    for (const m of doc.members || []) {
      const id = String(m);
      if (id !== me) ids.add(id);
      if (ids.size >= MAX_AUDIENCE) break;
    }
  }
  return [...ids];
}

/** Emit `userStatus` to the user's peers (and own devices). Never throws. */
export async function emitPresence(io, models, userId, payload) {
  try {
    const peers = await buildStatusAudience(models, userId);
    const rooms = [`user:${userId}`, ...peers.map((id) => `user:${id}`)];
    io.to(rooms).emit("userStatus", payload);
  } catch (err) {
    console.error("❌ emitPresence:", err.message);
  }
}
