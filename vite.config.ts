import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Set VITE_BASE before building for production:
 *   VITE_BASE=/a/ npm run build
 *
 * Locally you can keep VITE_BASE unset (defaults to '/').
 */
const BASE = process.env.VITE_BASE || "/";

export default defineConfig({
  base: BASE,
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
      "@": path.resolve(__dirname, "./src"),
      buffer: "vite-plugin-node-polyfills/shims/buffer",
      global: "vite-plugin-node-polyfills/shims/global",
      process: "vite-plugin-node-polyfills/shims/process",
    },
  },
  envPrefix: ["VITE_"],
  build: {
    outDir: "dist",
  },
  preview: {
    port: 5173,
    strictPort: false,
  },
});
