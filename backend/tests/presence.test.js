import { jest } from "@jest/globals";
import { buildStatusAudience, emitPresence } from "../utils/presence.js";

const q = (docs) => ({ select: () => ({ limit: () => ({ lean: async () => docs }) }) });
const models = (convos, groups) => ({
  Conversation: { find: () => q(convos) },
  Group: { find: () => q(groups) },
});

describe("presence audience", () => {
  test("includes chat partners and group mates, excludes self and dedupes", async () => {
    const ids = await buildStatusAudience(
      models([{ members: ["me", "a"] }], [{ members: ["me", "a", "b"] }, { members: ["me", "c"] }]),
      "me"
    );
    expect(ids.sort()).toEqual(["a", "b", "c"]);
  });

  test("emits only to peers' personal rooms plus own devices, never to everyone", async () => {
    const to = jest.fn(() => ({ emit: jest.fn() }));
    const emit = jest.fn();
    to.mockReturnValue({ emit });
    const io = { to, emit: jest.fn() };
    await emitPresence(io, models([{ members: ["me", "a"] }], []), "me", { userId: "me", online: true });
    expect(io.emit).not.toHaveBeenCalled();
    expect(to).toHaveBeenCalledWith(["user:me", "user:a"]);
    expect(emit).toHaveBeenCalledWith("userStatus", { userId: "me", online: true });
  });

  test("a DB failure is swallowed (never crashes a socket handler)", async () => {
    const bad = { Conversation: { find: () => { throw new Error("db down"); } }, Group: { find: () => q([]) } };
    await expect(emitPresence({ to: jest.fn() }, bad, "me", {})).resolves.toBeUndefined();
  });
});
