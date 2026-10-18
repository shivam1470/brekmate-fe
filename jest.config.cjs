module.exports = {
  preset: "jest-expo",
  testMatch: [
    "<rootDir>/test/native.test.tsx",
    "<rootDir>/test/*.native.test.tsx",
  ],
  moduleNameMapper: {
    "^@brekmate/core$": "<rootDir>/packages/core/src/index.ts",
    "^@brekmate/core/react$": "<rootDir>/packages/core/src/react.ts",
  },
  testTimeout: 15000,
};
