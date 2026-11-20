import Group from "../../../models/groupModel.js";
import Expense from "../../../models/expenseModel.js";
import { computeGroupBalances } from "../../../controllers/balanceController.js";
import { resolveMember } from "../resolve.js";
import { currencyOf, DESTRUCTIVE, fail, IDEMPOTENT_WRITE, money, normText, ok, person, READ, round2, WRITE } from "../helpers.js";

const GROUP_TYPES = ["roommate", "trip", "business", "general"];
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "THB", "SGD", "JPY", "AUD", "CAD", "NPR", "LKR", "MYR", "IDR", "VND"];
const BALANCE_CONCURRENCY = 5;

// Balances are a nice-to-have on read tools: one group failing must not fail the list.
const safeBalances = (groupId) => Promise.resolve().then(() => computeGroupBalances(groupId)).catch(() => null);

const isCreatorOf = (group, uid) => String(group.createdBy?._id ?? group.createdBy) === String(uid);
const date = (z) => z.string().trim().max(40).describe("A date, e.g. 2026-12-20.");

/** Turn the friendly settings args into the controller's body shape. */
function settingsBody(args, groupType) {
  const body = {};
  const settings = {};
  if (args.currency !== undefined) settings.currency = args.currency;
  if (args.receiptRequired !== undefined) settings.receiptRequired = args.receiptRequired;
  if (args.joinApproval !== undefined) settings.joinApproval = args.joinApproval;
  if (Object.keys(settings).length) body.settings = settings;

  const tripFields = ["budget", "startDate", "endDate"].filter((k) => args[k] !== undefined);
  if (tripFields.length) {
    if (groupType !== "trip") return { error: `Budget and trip dates only apply to trip groups; this is a ${groupType} group.` };
    body.trip = Object.fromEntries(tripFields.map((k) => [k, args[k]]));
  }
  if (args.billDay !== undefined) {
    if (groupType !== "roommate") return { error: `A monthly bill day only applies to roommate groups; this is a ${groupType} group.` };
    body.roommate = { billDay: args.billDay };
  }
  return { body };
}

export function registerGroupTools(ctx) {
  const { tool, uid, z, groupRef, memberRef } = ctx;

  // ── read ────────────────────────────────────────────────────────────────
  tool(
    "list_groups",
    {
      title: "List groups",
      description:
        "List the user's groups with members, currency and the user's own balance in each " +
        "(positive = others owe them, negative = they owe).",
      inputSchema: {
        status: z.enum(["active", "completed", "all"]).optional().describe("Default: all."),
        includeBalances: z.boolean().optional().describe("Include your balance per group. Default true."),
      },
      annotations: READ,
    },
    async ({ status = "all", includeBalances = true }) => {
      let groups = await Group.find({ members: uid })
        .populate("members", "name email")
        .sort({ updatedAt: -1 })
        .lean();
      if (status === "active") groups = groups.filter((g) => !g.isCompleted);
      if (status === "completed") groups = groups.filter((g) => g.isCompleted);

      const balances = new Map();
      if (includeBalances) {
        for (let i = 0; i < groups.length; i += BALANCE_CONCURRENCY) {
          const batch = groups.slice(i, i + BALANCE_CONCURRENCY);
          const results = await Promise.all(batch.map((g) => safeBalances(g._id)));
          batch.forEach((g, idx) => {
            const b = results[idx]?.balances?.[uid];
            if (b !== undefined) balances.set(String(g._id), round2(b));
          });
        }
      }

      return ok(
        groups.map((g) => ({
          id: g._id,
          name: g.name,
          groupType: g.groupType,
          isCompleted: g.isCompleted,
          currency: currencyOf(g),
          youCreatedIt: isCreatorOf(g, uid),
          memberCount: (g.members || []).length,
          members: (g.members || []).map(person),
          ...(includeBalances ? { yourBalance: balances.get(String(g._id)) ?? 0 } : {}),
          updatedAt: g.updatedAt,
        })),
      );
    },
  );

  tool(
    "get_group",
    {
      title: "Get group details",
      description:
        "One group's details: members, type, currency, settings (budget, dates, bill day, receipt rule, join approval), " +
        "whether settings are locked, and your balance.",
      inputSchema: { group: groupRef },
      annotations: READ,
    },
    async ({ group: ref }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const g = r.group;
      const [computed, hasExpenses] = await Promise.all([
        safeBalances(g._id),
        Expense.exists({ groupId: g._id }),
      ]);
      return ok({
        id: g._id,
        name: g.name,
        groupType: g.groupType,
        isCompleted: g.isCompleted,
        currency: currencyOf(g),
        youCreatedIt: isCreatorOf(g, uid),
        members: (g.members || []).map(person),
        yourBalance: round2(computed?.balances?.[uid] || 0),
        hasExpenses: !!hasExpenses,
        settingsLocked: !!hasExpenses,
        settings: {
          receiptRequired: !!g.settings?.receiptRequired,
          joinApproval: !!g.settings?.joinApproval,
          defaultSplit: g.settings?.defaultSplit?.type || "equal",
          categories: g.settings?.categories || [],
        },
        trip: g.groupType === "trip" ? { startDate: g.trip?.startDate ?? null, endDate: g.trip?.endDate ?? null, budget: g.trip?.budget ?? null } : undefined,
        roommate: g.groupType === "roommate" ? { billDay: g.roommate?.billDay ?? null } : undefined,
      });
    },
  );

  // ── create / edit ───────────────────────────────────────────────────────
  tool(
    "create_group",
    {
      title: "Create group",
      description:
        "Create a group owned by the user, optionally inviting people by email in the same step. " +
        "Types: roommate (flatmates, monthly bills), trip (budget + dates), business (team / client spends), general.",
      inputSchema: {
        name: z.string().trim().min(2).max(100).describe("Group name."),
        groupType: z.enum(GROUP_TYPES).optional().describe("Default: roommate. Can't be changed later."),
        currency: z.enum(CURRENCIES).optional().describe("Default: INR."),
        budget: z.number().min(0).max(99999999).optional().describe("Trip budget (trip groups)."),
        startDate: date(z).optional().describe("Trip start date (trip groups)."),
        endDate: date(z).optional().describe("Trip end date (trip groups)."),
        billDay: z.number().int().min(1).max(28).optional().describe("Day of month bills are due (roommate groups)."),
        receiptRequired: z.boolean().optional().describe("Require a receipt photo on every expense."),
        joinApproval: z.boolean().optional().describe("You approve anyone joining by link."),
        memberEmails: z.array(z.string().trim().email()).max(20).optional().describe("People to add/invite right away, by email."),
        members: z.array(z.string().trim().min(1).max(200)).max(20).optional().describe("People to add right away: emails or names of existing contacts."),
      },
      annotations: WRITE,
    },
    async (args) => {
      const groupType = args.groupType || "roommate";
      const built = settingsBody(args, groupType);
      if (built.error) return fail(built.error);
      // Resolve people BEFORE creating, so an unknown name never leaves a half-made group behind.
      const invitees = await peopleToEmails(ctx, [...(args.memberEmails || []), ...(args.members || [])]);
      if (invitees.error) return fail(invitees.error);
      if (invitees.emails.length > 20) return fail("Add at most 20 people when creating a group; add the rest with add_members.");

      const created = await ctx.call("createGroup", { body: { name: args.name.trim(), groupType, ...built.body } });
      if (created.error) {
        if (created.status === 409) return fail("You already have a group with this name. Pick another name.");
        return created.error;
      }
      const g = created.data;
      const out = {
        id: g._id,
        name: g.name,
        groupType: g.groupType,
        currency: g.settings?.currency || "INR",
        summary: `Created ${groupType} group "${g.name}".`,
      };

      if (invitees.emails.length) {
        const added = await ctx.call("addMembersByEmail", { params: { groupId: String(g._id) }, body: { emails: invitees.emails } });
        if (added.error) {
          out.membersError = added.data?.message || "Couldn't add members.";
          out.summary += ` Adding members failed: ${out.membersError}`;
        } else {
          out.members = membersOutcome(added.data);
          out.summary += ` ${out.members.summary}`;
        }
      }
      return ok(out);
    },
  );

  tool(
    "update_group_settings",
    {
      title: "Update group settings",
      description:
        "Change a group's settings (creator only). After the first expense only receiptRequired and joinApproval " +
        "can still change; everything else is locked so existing splits stay correct.",
      inputSchema: {
        group: groupRef,
        currency: z.enum(CURRENCIES).optional(),
        budget: z.number().min(0).max(99999999).nullable().optional().describe("Trip budget; null clears it."),
        startDate: date(z).nullable().optional(),
        endDate: date(z).nullable().optional(),
        billDay: z.number().int().min(1).max(28).nullable().optional(),
        receiptRequired: z.boolean().optional(),
        joinApproval: z.boolean().optional(),
        defaultSplit: z
          .object({
            type: z.enum(["equal", "shares", "percent"]),
            weights: z.array(z.object({ member: memberRef, value: z.number().min(0).max(1000) })).max(100).optional(),
          })
          .optional()
          .describe("How new bills split by default. percent weights must add to 100."),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async (args) => {
      const r = await ctx.group(args.group);
      if (r.error) return r.error;
      const g = r.group;
      const built = settingsBody(args, g.groupType);
      if (built.error) return fail(built.error);
      const body = built.body;

      if (args.defaultSplit) {
        const weights = [];
        if (args.defaultSplit.type !== "equal") {
          for (const w of args.defaultSplit.weights || []) {
            const m = resolveMember(g, w.member, uid);
            if (m.error) return fail(m.error);
            weights.push({ userId: m.member.id, value: w.value });
          }
        }
        body.settings = { ...(body.settings || {}), defaultSplit: { type: args.defaultSplit.type, weights } };
      }
      if (!Object.keys(body).length) return fail("Nothing to change - pass at least one setting.");

      const res = await ctx.call("updateGroupSettings", { params: { groupId: String(g._id) }, body });
      if (res.error) return res.error;
      return ok({ id: g._id, name: g.name, summary: `Updated the settings of "${g.name}".` });
    },
  );

  // ── members ─────────────────────────────────────────────────────────────
  tool(
    "add_members",
    {
      title: "Add members",
      description:
        "Add people to a group (creator only, max 20 at a time). Give each person as an email, or as the name of someone " +
        "the user already shares a group with. People are only added with consent: known contacts join directly, other " +
        "SplitEase users get an invite to accept, and unknown emails get a join link by email.",
      inputSchema: {
        group: groupRef,
        people: z.array(z.string().trim().min(1).max(200)).min(1).max(20).optional().describe('Emails or contact names, e.g. ["riya@mail.com", "Aman"].'),
        emails: z.array(z.string().trim().email()).min(1).max(20).optional().describe("Emails only (same as people)."),
      },
      annotations: WRITE,
    },
    async ({ group: ref, people = [], emails = [] }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const resolved = await peopleToEmails(ctx, [...emails, ...people]);
      if (resolved.error) return fail(resolved.error);
      if (!resolved.emails.length) return fail("Who should be added? Pass people: emails or contact names.");
      if (resolved.emails.length > 20) return fail("Add at most 20 people at a time.");
      const res = await ctx.call("addMembersByEmail", { params: { groupId: String(r.group._id) }, body: { emails: resolved.emails } });
      if (res.error) return res.error;
      const outcome = membersOutcome(res.data);
      return ok({ group: r.group.name, ...outcome });
    },
  );

  tool(
    "remove_member",
    {
      title: "Remove member",
      description: "Remove someone from a group (creator only). Confirm with the user first.",
      inputSchema: { group: groupRef, member: memberRef },
      annotations: DESTRUCTIVE,
    },
    async ({ group: ref, member }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const m = resolveMember(r.group, member, uid);
      if (m.error) return fail(m.error);
      if (m.member.id === uid) return fail("You can't remove yourself. Use leave_group, or delete_group if you created it.");
      const res = await ctx.call("removeMember", { params: { groupId: String(r.group._id), userId: m.member.id } });
      if (res.error) return res.error;
      return ok({ summary: `Removed ${m.member.name} from "${r.group.name}".` });
    },
  );

  tool(
    "get_invite_link",
    {
      title: "Get invite link",
      description: "Get a shareable join link + code for a group (creator only). reset: true kills the old link.",
      inputSchema: { group: groupRef, reset: z.boolean().optional() },
      annotations: WRITE,
    },
    async ({ group: ref, reset }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const res = await ctx.call("generateInviteLink", { params: { groupId: String(r.group._id) }, body: { reset: reset === true } });
      if (res.error) return res.error;
      const d = res.data;
      return ok({
        group: d.groupName,
        joinLink: d.joinLink,
        inviteCode: d.inviteCode,
        expiresAt: d.expiresAt,
        joinApproval: d.joinApproval,
        summary: `Anyone with this link can ${d.joinApproval ? "ask to join (you approve)" : "join"} "${d.groupName}": ${d.joinLink}`,
      });
    },
  );

  tool(
    "join_group",
    {
      title: "Join group by invite",
      description: "Join a group with an invite code or link someone shared.",
      inputSchema: { invite: z.string().trim().min(4).max(300).describe("Invite code or the full join link.") },
      annotations: WRITE,
    },
    async ({ invite }) => {
      const code = invite.replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop();
      const res = await ctx.call("joinGroupByInvite", { params: { inviteCode: code } });
      if (res.error) return res.error;
      const d = res.data || {};
      if (d.pending) return ok({ pending: true, group: d.group?.name, summary: d.message });
      const name = d.group?.name || d.name;
      return ok({ id: d.group?._id || d._id, group: name, summary: `You're in "${name}".` });
    },
  );

  tool(
    "list_group_invites",
    {
      title: "List pending invites & join requests",
      description:
        "Creator only. People invited to a group who haven't answered yet, and people who asked to join by link and are " +
        "waiting for approval (when the group uses join approval).",
      inputSchema: { group: groupRef },
      annotations: READ,
    },
    async ({ group: ref }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      if (!isCreatorOf(r.group, uid) && String(r.group.createdBy) !== String(ctx.user.firebaseUid || "")) {
        return fail(`Only the creator of "${r.group.name}" can see its pending invites and join requests.`);
      }
      const res = await ctx.call("getGroupInvites", { params: { groupId: String(r.group._id) } });
      if (res.error) return res.error;
      const row = (x) => ({ inviteId: x._id, name: x.user?.name, email: x.user?.email, since: x.createdAt, expiresAt: x.expiresAt });
      const requests = (res.data?.requests || []).map(row);
      const invites = (res.data?.invites || []).map(row);
      return ok({
        group: r.group.name,
        joinRequests: requests,
        pendingInvites: invites,
        summary:
          requests.length || invites.length
            ? `"${r.group.name}": ${requests.length} join request${requests.length === 1 ? "" : "s"} to answer, ${invites.length} invite${invites.length === 1 ? "" : "s"} not answered yet.`
            : `Nobody is waiting to join "${r.group.name}".`,
      });
    },
  );

  tool(
    "manage_group_invite",
    {
      title: "Approve / decline a join request, or cancel an invite",
      description:
        "Creator only. approve lets someone who asked to join into the group. decline turns their request down. cancel " +
        "withdraws an invite the user sent. Ids come from list_group_invites.",
      inputSchema: {
        group: groupRef,
        inviteId: ctx.objectId,
        action: z.enum(["approve", "decline", "cancel"]),
      },
      annotations: WRITE,
    },
    async ({ group: ref, inviteId, action }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const params = { groupId: String(r.group._id), inviteId };
      const res = await ctx.call(action === "approve" ? "approveJoinRequest" : "cancelGroupInvite", { params });
      if (res.error) return res.error;
      const done = {
        approve: `Approved. They are now a member of "${r.group.name}".`,
        decline: `Declined the request to join "${r.group.name}".`,
        cancel: `Cancelled the invite to "${r.group.name}".`,
      }[action];
      return ok({ group: r.group.name, inviteId, action, summary: done });
    },
  );

  // ── lifecycle ───────────────────────────────────────────────────────────
  tool(
    "complete_group",
    {
      title: "Mark group completed",
      description: "Mark a group (e.g. a finished trip) as completed (creator only). Members are told.",
      inputSchema: { group: groupRef },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ group: ref }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const res = await ctx.call("markGroupCompleted", { params: { groupId: String(r.group._id) } });
      if (res.error) return res.error;
      return ok({ summary: `Marked "${r.group.name}" as completed.` });
    },
  );

  tool(
    "leave_group",
    {
      title: "Leave group",
      description: "Leave a group. Only possible once your balance there is settled; creators delete instead. Confirm first.",
      inputSchema: { group: groupRef },
      annotations: DESTRUCTIVE,
    },
    async ({ group: ref }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const res = await ctx.call("leaveGroup", { params: { groupId: String(r.group._id) } });
      if (res.error) {
        const bal = res.data?.balance;
        if (bal !== undefined) return fail(`${res.data.message} Your balance there is ${money(bal, currencyOf(r.group))}.`);
        return res.error;
      }
      return ok({ summary: `You left "${r.group.name}".` });
    },
  );

  tool(
    "delete_group",
    {
      title: "Delete group",
      description:
        "Permanently delete a group with all its expenses, notes and chat (creator only). Can't be undone. " +
        "Ask the user to confirm and pass the exact group name as confirmName.",
      inputSchema: {
        group: groupRef,
        confirmName: z.string().trim().min(1).max(200).describe("Must equal the group's name exactly - proves the user confirmed."),
      },
      annotations: DESTRUCTIVE,
    },
    async ({ group: ref, confirmName }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      if (confirmName.trim().toLowerCase() !== String(r.group.name).trim().toLowerCase()) {
        return fail(`Not deleted. confirmName must be the group's exact name ("${r.group.name}") after the user confirms.`);
      }
      const res = await ctx.call("deleteGroup", { params: { groupId: String(r.group._id) } });
      if (res.error) return res.error;
      return ok({ summary: `Deleted "${r.group.name}" and everything in it.` });
    },
  );
}

/** Plain-language result of addMembersByEmail. */
function membersOutcome(d = {}) {
  const parts = [];
  if (d.added) parts.push(`${d.added} added directly`);
  if (d.pending) parts.push(`${d.pending} invited in the app (they need to accept)`);
  if (d.invited) parts.push(`${d.invited} not on SplitEase yet, emailed a join link`);
  return {
    added: d.added || 0,
    pendingInvites: d.pending || 0,
    emailedInvites: d.invitedEmails || [],
    members: (d.group?.members || []).map(person),
    summary: parts.length ? `Members: ${parts.join("; ")}.` : "Nobody new was added (they may already be members).",
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Turns ["riya@mail.com", "Aman"] into emails. A name must match exactly one
 * of the user's contacts (people they already share a group with); anything
 * else comes back as a question, so nobody is invited by mistake.
 */
async function peopleToEmails(ctx, refs) {
  const emails = [];
  const push = (e) => { if (!emails.includes(e)) emails.push(e); };
  for (const raw of refs || []) {
    const ref = String(raw).trim();
    if (!ref) continue;
    if (ref.includes("@")) {
      if (!EMAIL.test(ref)) return { error: `"${ref}" is not a full email address.` };
      push(ref.toLowerCase());
      continue;
    }
    const res = await ctx.call("getContacts", { query: { q: ref } });
    if (res.error) return { error: res.data?.message || "Couldn't look up contacts." };
    const q = normText(ref);
    const list = res.data || [];
    let hits = list.filter((c) => normText(c.name) === q);
    if (!hits.length) hits = list.filter((c) => normText(c.name).split(" ")[0] === q);
    if (!hits.length) hits = list.filter((c) => normText(c.name).includes(q));
    if (!hits.length) return { error: `I couldn't find "${ref}" among the people you share groups with. Ask the user for their email address.` };
    if (hits.length > 1) {
      return { error: `"${ref}" matches several people: ${hits.slice(0, 8).map((c) => `${c.name} <${c.email}>`).join(", ")}. Ask which one, then pass their email.` };
    }
    push(String(hits[0].email).toLowerCase());
  }
  return { emails };
}
