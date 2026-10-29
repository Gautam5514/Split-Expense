import Group from "../models/groupModel.js";

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
  if (!io || !groupId) return;
  try {
    const gid = String(groupId);
    const payload = { groupId: gid, kind };
    io.to(`group:${gid}`).emit("groupUpdate", payload);

    let ids = memberIds;
    if (!ids) {
      const group = await Group.findById(gid).select("members").lean();
      ids = group?.members || [];
    }
    for (const id of new Set(ids.map(String))) io.to(`user:${id}`).emit("dashboardUpdate", payload);
  } catch (err) {
    console.error("❌ notifyGroupChange:", err.message);
  }
};
