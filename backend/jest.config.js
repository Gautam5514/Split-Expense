/** Jest config for the backend (native ESM, no Babel transform needed). */
export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  verbose: true,
};
