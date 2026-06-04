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
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
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
      "safe-buffer": path.resolve(
        __dirname,
        "./packages/fast-bridge-app/src/shims/safe-buffer.ts"
      ),
    },
  },
  envPrefix: ["VITE_"],
  build: {
    outDir: "apps/root/dist",
    emptyOutDir: true,
    target: "esnext",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
});
