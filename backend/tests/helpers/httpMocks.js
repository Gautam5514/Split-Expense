import { jest } from "@jest/globals";

/** Minimal Express `res` fake that records what a controller sent back. */
export function makeRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    status: jest.fn(function (code) {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn(function (payload) {
      res.body = payload;
      return res;
    }),
  };
  return res;
}

/** Minimal Express `req` fake. */
export function makeReq({ user, params = {}, body = {}, query = {} } = {}) {
  return { user, params, body, query };
}
