import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve "@/..." imports from tsconfig.json, the same way the app does.
  resolve: { tsconfigPaths: true },
});
