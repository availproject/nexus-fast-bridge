import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@/": `${resolve(import.meta.dirname, "packages/fast-bridge-app/src")}/`,
      "@avail-project/nexus-core": resolve(
        import.meta.dirname,
        "apps/megaeth/node_modules/@avail-project/nexus-core/dist/index.esm.js"
      ),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
