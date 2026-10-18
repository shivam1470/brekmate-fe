import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["integration/backend.test.ts"], environment: "node" },
});
