import { ok, READ, WRITE } from "../helpers.js";

export function registerInviteTools(ctx) {
  const { tool, z, objectId } = ctx;

  tool(
    "list_my_invites",
    {
      title: "List my group invites",
      description: "Group invites waiting for the user's answer: which group, who invited them, and the invite id.",
      inputSchema: {},
      annotations: READ,
    },
    async () => {
      const res = await ctx.call("getMyInvites");
      if (res.error) return res.error;
      return ok(
        (res.data || []).map((i) => ({
          inviteId: i._id,
          group: i.group?.name,
          groupType: i.group?.groupType,
          memberCount: i.group?.memberCount,
          invitedBy: i.invitedBy?.name || null,
          expiresAt: i.expiresAt,
        })),
      );
    },
  );

  tool(
    "respond_to_invite",
    {
      title: "Accept / decline a group invite",
      description:
        "Accept or decline an invite from list_my_invites. block: true on decline also stops that person from inviting the user again.",
      inputSchema: {
        inviteId: objectId,
        action: z.enum(["accept", "decline"]),
        block: z.boolean().optional(),
      },
      annotations: WRITE,
    },
    async ({ inviteId, action, block }) => {
      if (action === "accept") {
        const res = await ctx.call("acceptInvite", { params: { inviteId } });
        if (res.error) return res.error;
        return ok({ groupId: res.data?.groupId, summary: "Invite accepted - you're in the group now." });
      }
      const res = await ctx.call("declineInvite", { params: { inviteId }, body: { block: block === true } });
      if (res.error) return res.error;
      return ok({ summary: block ? "Invite declined, and that person can't invite you again." : "Invite declined." });
    },
  );
}
