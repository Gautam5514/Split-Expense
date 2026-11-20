// People the user knows, and how findable the user is to others.
//
// Same trust boundary as the app: searching by name only covers contacts
// (people the user already shares a group with). Anyone else can be found only
// by their exact email, and then with the address masked.
import { fail, IDEMPOTENT_WRITE, ok, READ } from "../helpers.js";

export function registerPeopleTools(ctx) {
  const { tool, z } = ctx;

  tool(
    "find_people",
    {
      title: "Find people",
      description:
        "Look up people to split with. A name (or part of one) searches the user's contacts: people they already share a " +
        "group with. A full email address checks whether that person is on SplitEase. Leave query empty to list contacts.",
      inputSchema: { query: z.string().trim().max(100).optional().describe('A name, part of a name, or a full email. Empty = all contacts.') },
      annotations: READ,
    },
    async ({ query = "" }) => {
      const contacts = await ctx.call("getContacts", { query: { q: query } });
      if (contacts.error) return contacts.error;
      const people = (contacts.data || []).map((c) => ({ id: c._id, name: c.name, email: c.email, isContact: true }));

      let onSplitEase;
      if (query.includes("@") && !people.some((p) => String(p.email).toLowerCase() === query.toLowerCase())) {
        const looked = await ctx.call("lookupByEmail", { query: { email: query } });
        if (!looked.error && looked.data?.found) {
          const u = looked.data.user;
          people.push({ id: u._id, name: u.name, email: u.email, isContact: !!u.isContact });
          onSplitEase = true;
        } else if (!looked.error) {
          onSplitEase = false;
        }
      }
      return ok({
        query,
        people,
        ...(onSplitEase === false
          ? { note: "No SplitEase account is visible for that email. add_members still works: they get a join link by email." }
          : {}),
        summary: people.length
          ? `Found ${people.length} ${people.length === 1 ? "person" : "people"}${query ? ` for "${query}"` : ""}.`
          : query
            ? `Nobody matching "${query}" among the user's contacts.`
            : "The user has no contacts yet. Contacts appear once they share a group with someone.",
      });
    },
  );

  const shapePrivacy = (d = {}) => ({
    whoCanAddMe: d.addPolicy === "invite" ? "invite_only" : "contacts_directly",
    findableByEmail: d.discoverableByEmail !== false,
    blocked: (d.blocked || []).map((b) => ({ id: b._id, name: b.name, email: b.email })),
  });

  tool(
    "get_privacy_settings",
    {
      title: "Get privacy settings",
      description:
        "The user's privacy settings: whether contacts can add them to groups directly or everyone must send an invite, " +
        "whether they can be found by email, and who they have blocked.",
      inputSchema: {},
      annotations: READ,
    },
    async () => {
      const res = await ctx.call("getPrivacy");
      if (res.error) return res.error;
      return ok(shapePrivacy(res.data));
    },
  );

  tool(
    "update_privacy_settings",
    {
      title: "Update privacy settings",
      description:
        "Change who can add the user to groups (contacts_directly, or invite_only so every add needs their OK) and " +
        "whether people can find them by their email address.",
      inputSchema: {
        whoCanAddMe: z.enum(["contacts_directly", "invite_only"]).optional(),
        findableByEmail: z.boolean().optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ whoCanAddMe, findableByEmail }) => {
      const body = {};
      if (whoCanAddMe !== undefined) body.addPolicy = whoCanAddMe === "invite_only" ? "invite" : "contacts";
      if (findableByEmail !== undefined) body.discoverableByEmail = findableByEmail;
      if (!Object.keys(body).length) return fail("Nothing to change - pass whoCanAddMe or findableByEmail.");
      const res = await ctx.call("updatePrivacy", { body });
      if (res.error) return res.error;
      const p = shapePrivacy(res.data);
      return ok({
        ...p,
        summary:
          `${p.whoCanAddMe === "invite_only" ? "Everyone now needs your OK before adding you to a group" : "Your contacts can add you to groups directly"}; ` +
          `you ${p.findableByEmail ? "can" : "can't"} be found by email.`,
      });
    },
  );
}
