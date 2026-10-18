import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
    exclude: ["test/native.test.tsx", "test/*.native.test.tsx"],
    environment: "jsdom",
    clearMocks: true,
  },
});
