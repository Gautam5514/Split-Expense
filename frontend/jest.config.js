import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/__tests__/**/*.test.{js,jsx}"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

// next/jest handles SWC transforms, CSS/image mocks and env loading for us.
export default createJestConfig(customJestConfig);
