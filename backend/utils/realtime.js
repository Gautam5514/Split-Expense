import Group from "../models/groupModel.js";

// The Socket.IO server, registered once at startup (index.js). Lets code that
// has no `req` - the recurring-bill runner, background jobs - push live updates
// too. Callers that do pass an `io` keep working exactly as before.
let sharedIO = null;
export const setRealtimeIO = (io) => { sharedIO = io || null; };
export const getRealtimeIO = () => sharedIO;

/**
 * Tell every connected client that something about a group changed so web and
 * app screens refetch on their own (no manual refresh).
 *
 *  - "groupUpdate"     -> room `group:<id>`: people with that group open
 *  - "dashboardUpdate" -> room `user:<id>` of every member: their home/dashboard
 *                         totals and group list
 *
 * `memberIds` can be passed when the caller already has them (or when members
 * were just removed/deleted and a lookup would miss them); otherwise they are
 * read from the group. Never throws: a realtime hiccup must not fail the API call.
 */
export const notifyGroupChange = async (io, groupId, kind, memberIds) => {
  const server = io || sharedIO;
  if (!server || !groupId) return;
  try {
    const gid = String(groupId);
    const payload = { groupId: gid, kind };
    server.to(`group:${gid}`).emit("groupUpdate", payload);

    let ids = memberIds;
    if (!ids) {
      const group = await Group.findById(gid).select("members").lean();
      ids = group?.members || [];
    }
    for (const id of new Set(ids.map(String))) server.to(`user:${id}`).emit("dashboardUpdate", payload);
  } catch (err) {
    console.error("❌ notifyGroupChange:", err.message);
  }
};

/**
 * Refresh the dashboard of specific users who are not (yet) group members -
 * e.g. someone who was just invited, so their pending-invites list updates live.
 */
export const notifyUsers = (io, userIds, payload = {}) => {
  const server = io || sharedIO;
  if (!server || !userIds?.length) return;
  try {
    for (const id of new Set(userIds.map(String))) server.to(`user:${id}`).emit("dashboardUpdate", payload);
  } catch (err) {
    console.error("❌ notifyUsers:", err.message);
  }
};
