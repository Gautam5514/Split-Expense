/**
 * Many controllers historically answered failures with
 *   res.status(500).json({ message: err.message })
 * which leaks internals to clients: Mongo cast/validation errors, duplicate-key
 * index names, stack-ish driver messages, third-party API errors, etc.
 *
 * Rather than rely on every handler getting this right, wrap res.json once:
 * for any 5xx response, the body is replaced with a generic message (a
 * `code` field, if present, is preserved so clients can still branch on it).
 * The original is logged server-side for debugging. 4xx bodies are untouched -
 * those are intentional, user-facing validation messages.
 *
 * A handler that deliberately writes a friendly, non-sensitive 5xx message
 * (e.g. "email service unavailable") can opt out with `expose: true`.
 */
export const GENERIC_SERVER_ERROR = "Something went wrong. Please try again.";

export const sanitizeServerErrors = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500) {
      if (body && typeof body === "object" && (body.message || body.error)) {
        console.error(
          `[5xx] ${req.method} ${req.originalUrl}:`,
          body.error || body.message
        );
      }
      // JSON-RPC (MCP) responses have their own envelope - leave them alone,
      // they already use fixed messages.
      if (body && typeof body === "object" && body.jsonrpc) return originalJson(body);
      if (body && typeof body === "object" && body.expose === true && typeof body.message === "string") {
        const { expose: _expose, ...rest } = body;
        return originalJson({ message: rest.message, ...(typeof rest.code === "string" && { code: rest.code }) });
      }

      const safe = { message: GENERIC_SERVER_ERROR };
      if (body && typeof body === "object" && typeof body.code === "string") safe.code = body.code;
      return originalJson(safe);
    }
    return originalJson(body);
  };
  next();
};

export default sanitizeServerErrors;
