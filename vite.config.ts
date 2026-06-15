import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      exclude: ["fs"],
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./packages/fast-bridge-app/src"),
      "@avail-project/nexus-core": path.resolve(
        __dirname,
        "./node_modules/@avail-project/nexus-core"
      ),
      buffer: "vite-plugin-node-polyfills/shims/buffer",
      global: "vite-plugin-node-polyfills/shims/global",
      process: "vite-plugin-node-polyfills/shims/process",
      "viem/actions": path.resolve(
        __dirname,
        "./packages/fast-bridge-app/src/lib/viem-actions-compat.ts"
      ),
    },
  },
  envPrefix: ["VITE_"],
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
    },
  },
  build: {
    target: "es2022",
    outDir: "apps/root/dist",
    emptyOutDir: true,
    target: "es2022",
  },
});
