// Everything around the money: a group's notes and plans, its chat, and the
// user's notifications.
import GroupMessage from "../../../models/groupMessageModel.js";
import Notification from "../../../models/notification.model.js";
import { fail, IDEMPOTENT_WRITE, normText, ok, READ, WRITE } from "../helpers.js";

const idOf = (v) => String(v?._id ?? v);
const DEFAULT_NOTEPAD = "Notes";
const MAX_CHAT_TEXT = 2000;
const clip = (s, n) => (String(s || "").length > n ? `${String(s).slice(0, n)}…` : String(s || ""));

export function registerCollabTools(ctx) {
  const { tool, uid, z, groupRef, objectId } = ctx;

  // ── notes & plans ───────────────────────────────────────────────────────
  tool(
    "list_notes",
    {
      title: "List group notes & plans",
      description:
        "A group's notepads (trip plans, packing lists, house rules, to-dos) with their entries, in order.",
      inputSchema: { group: groupRef },
      annotations: READ,
    },
    async ({ group: ref }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const res = await ctx.call("getGroupNotepads", { params: { groupId: String(r.group._id) } });
      if (res.error) return res.error;
      const pads = (res.data || []).map((p) => ({
        notepadId: p._id,
        title: p.title,
        entries: (p.steps || []).map((s, k) => ({
          position: k + 1,
          title: s.title,
          notes: s.notes ? clip(s.notes, 2000) : null,
          date: s.date || null,
          addedBy: s.createdBy?.name || null,
        })),
      }));
      return ok({
        group: r.group.name,
        notepads: pads,
        summary: pads.length
          ? `"${r.group.name}" has ${pads.length} notepad${pads.length === 1 ? "" : "s"}: ${pads.map((p) => `"${p.title}" (${p.entries.length})`).join(", ")}.`
          : `"${r.group.name}" has no notes yet. add_note starts one.`,
      });
    },
  );

  tool(
    "add_note",
    {
      title: "Add a note or plan entry",
      description:
        "Add an entry to one of a group's notepads: an itinerary stop, a to-do, a house rule. Names a notepad by title; " +
        "if the group has no notepad with that title it is created. Everyone in the group can see it.",
      inputSchema: {
        group: groupRef,
        title: z.string().trim().min(1).max(200).describe('The entry, e.g. "Day 2: Baga beach, lunch at Britto\'s".'),
        notes: z.string().max(5000).optional().describe("More detail for this entry."),
        date: z.string().trim().max(40).optional().describe("A date or time for it, e.g. 2026-12-21."),
        notepad: z.string().trim().min(2).max(100).optional().describe(`Which notepad (title). Default: the group's only notepad, or "${DEFAULT_NOTEPAD}".`),
      },
      annotations: WRITE,
    },
    async (args) => {
      const r = await ctx.group(args.group);
      if (r.error) return r.error;
      const g = r.group;
      const listed = await ctx.call("getGroupNotepads", { params: { groupId: String(g._id) } });
      if (listed.error) return listed.error;
      const pads = listed.data || [];

      let pad = null;
      if (args.notepad) {
        const q = normText(args.notepad);
        let hits = pads.filter((p) => normText(p.title) === q);
        if (!hits.length) hits = pads.filter((p) => normText(p.title).includes(q));
        if (hits.length > 1) return fail(`"${args.notepad}" matches several notepads: ${hits.map((p) => `"${p.title}"`).join(", ")}. Use the exact title.`);
        pad = hits[0] || null;
      } else if (pads.length === 1) {
        pad = pads[0];
      } else if (pads.length > 1) {
        pad = pads.find((p) => normText(p.title) === normText(DEFAULT_NOTEPAD)) || null;
        if (!pad) return fail(`"${g.name}" has several notepads: ${pads.map((p) => `"${p.title}"`).join(", ")}. Say which one with notepad.`);
      }

      let created = false;
      if (!pad) {
        const made = await ctx.call("createNotepad", { body: { groupId: String(g._id), title: args.notepad || DEFAULT_NOTEPAD } });
        if (made.error) return made.error;
        pad = made.data;
        created = true;
      }
      const res = await ctx.call("addStep", {
        params: { notepadId: String(pad._id) },
        body: { title: args.title, notes: args.notes, date: args.date },
      });
      if (res.error) return res.error;
      return ok({
        group: g.name,
        notepadId: pad._id,
        notepad: pad.title,
        notepadCreated: created,
        entryCount: (res.data?.steps || []).length,
        summary: `Added "${args.title}" to ${created ? "a new notepad " : ""}"${pad.title}" in "${g.name}".`,
      });
    },
  );

  // ── group chat ──────────────────────────────────────────────────────────
  tool(
    "list_group_messages",
    {
      title: "Read group chat",
      description:
        "The latest messages in a group's chat, oldest first. Reading here does not mark them as seen for the user.",
      inputSchema: {
        group: groupRef,
        limit: z.number().int().min(1).max(100).optional().describe("Default 30."),
        search: z.string().trim().max(100).optional().describe("Only messages containing this text."),
      },
      annotations: READ,
    },
    async ({ group: ref, limit = 30, search }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const g = r.group;
      let rows = await GroupMessage.find({ groupId: g._id })
        .sort({ createdAt: -1 })
        .limit(search ? 500 : limit)
        .populate("sender", "name")
        .lean();
      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter((m) => String(m.text || "").toLowerCase().includes(q)).slice(0, limit);
      }
      const unread = rows.filter((m) => idOf(m.sender) !== uid && !(m.seenBy || []).some((s) => idOf(s) === uid)).length;
      return ok({
        group: g.name,
        messages: rows.reverse().map((m) => ({
          from: idOf(m.sender) === uid ? "you" : m.sender?.name || "Former member",
          text: clip(m.text, MAX_CHAT_TEXT),
          ...(m.mediaUrl ? { attachment: m.mediaType || "file" } : {}),
          at: m.createdAt,
        })),
        unread,
        summary: rows.length
          ? `${rows.length} message${rows.length === 1 ? "" : "s"} from "${g.name}"${unread ? `, ${unread} the user hasn't seen` : ""}.`
          : `No messages${search ? ` matching "${search}"` : ""} in "${g.name}".`,
      });
    },
  );

  tool(
    "send_group_message",
    {
      title: "Send a group chat message",
      description:
        "Post a message in a group's chat as the user. Every member sees it and gets a notification, so only send what " +
        "the user asked to send, in their words.",
      inputSchema: {
        group: groupRef,
        text: z.string().trim().min(1).max(MAX_CHAT_TEXT),
      },
      annotations: WRITE,
    },
    async ({ group: ref, text }) => {
      const r = await ctx.group(ref);
      if (r.error) return r.error;
      const res = await ctx.call("sendGroupMessage", { params: { groupId: String(r.group._id) }, body: { text } });
      if (res.error) return res.error;
      return ok({ messageId: res.data?._id, group: r.group.name, summary: `Sent to "${r.group.name}": "${clip(text, 120)}"` });
    },
  );

  // ── notifications ───────────────────────────────────────────────────────
  // Read straight from the model: these two endpoints carry no rules beyond
  // "your own notifications", which the userId filter below enforces.
  tool(
    "list_notifications",
    {
      title: "List notifications",
      description:
        "The user's SplitEase notifications, newest first: bills added, payments to confirm, invites, group changes. " +
        "Unread only by default.",
      inputSchema: {
        includeRead: z.boolean().optional().describe("Also show ones already read. Default false."),
        limit: z.number().int().min(1).max(50).optional().describe("Default 20."),
      },
      annotations: READ,
    },
    async ({ includeRead = false, limit = 20 }) => {
      const filter = { userId: uid, type: { $ne: "promo" }, ...(includeRead ? {} : { isRead: false }) };
      const rows = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
      const unread = rows.filter((n) => !n.isRead).length;
      return ok({
        notifications: rows.map((n) => ({
          notificationId: n._id,
          message: n.message,
          type: n.type,
          read: !!n.isRead,
          at: n.createdAt,
          ...(n.link ? { link: n.link } : {}),
        })),
        unread,
        summary: rows.length ? `${rows.length} notification${rows.length === 1 ? "" : "s"}, ${unread} unread.` : "No new notifications.",
      });
    },
  );

  tool(
    "mark_notifications_read",
    {
      title: "Mark notifications read",
      description: "Mark one notification (by id) or all of the user's notifications as read.",
      inputSchema: { notificationId: objectId.optional().describe("Leave out to mark everything read.") },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ notificationId }) => {
      const filter = { userId: uid, isRead: false, ...(notificationId ? { _id: notificationId } : {}) };
      const result = await Notification.updateMany(filter, { $set: { isRead: true } });
      const n = result?.modifiedCount || 0;
      if (notificationId && !n && !(await Notification.exists({ _id: notificationId, userId: uid }))) {
        return fail("Notification not found.");
      }
      return ok({ marked: n, summary: n ? `Marked ${n} notification${n === 1 ? "" : "s"} as read.` : "Nothing was unread." });
    },
  );
}
