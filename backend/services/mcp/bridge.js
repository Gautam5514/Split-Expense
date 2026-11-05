/**
 * Runs an existing Express controller in-process for an MCP tool.
 *
 * Why: the REST controllers are the single source of truth for every business
 * rule (validation, permissions, settings lock, receipt policy, consent for
 * adding people, notifications, live updates). Calling them directly means a
 * bill added from ChatGPT/Claude behaves exactly like one added in the app -
 * no second copy of the rules that could drift.
 *
 * The request is built server-side: `user` always comes from the verified MCP
 * credential, never from tool arguments.
 */
import { getRealtimeIO } from "../../utils/realtime.js";

export function invokeController(handler, { user, params = {}, body = {}, query = {} }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (status, data) => {
      if (settled) return;
      settled = true;
      resolve({ status, data });
    };

    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { finish(this.statusCode, data); return this; },
      send(data) { finish(this.statusCode, data); return this; },
      end() { finish(this.statusCode, null); return this; },
      set() { return this; },
      setHeader() { return this; },
      header() { return this; },
      get headersSent() { return settled; },
    };

    const req = {
      user: { ...user },
      params,
      body,
      query,
      headers: {},
      method: "POST",
      ip: "mcp",
      app: { get: (key) => (key === "io" ? getRealtimeIO() : undefined) },
      get: () => undefined,
      header: () => undefined,
    };

    Promise.resolve()
      .then(() => handler(req, res))
      .then(
        () => { if (!settled) finish(500, { message: "The handler did not respond." }); },
        (err) => { if (!settled) reject(err); },
      );
  });
}

/**
 * Loads the controllers lazily so merely listing tools (or importing this
 * module in tests) never pulls in the whole app.
 */
let controllersPromise = null;
export const loadControllers = () => (controllersPromise ||= import("./controllers.js"));
