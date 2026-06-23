import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bufferShimPath = path.resolve(
  __dirname,
  "./packages/fast-bridge-app/src/shims/buffer.cjs"
);

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      exclude: ["fs"],
      globals: {
        Buffer: false,
        global: true,
        process: true,
      },
      overrides: {
        buffer: bufferShimPath,
      },
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./packages/fast-bridge-app/src"),
      buffer: bufferShimPath,
      "safe-buffer": path.resolve(
        __dirname,
        "./packages/fast-bridge-app/src/shims/safe-buffer"
      ),
      global: "vite-plugin-node-polyfills/shims/global",
      process: "vite-plugin-node-polyfills/shims/process",
    },
  },
  envPrefix: ["VITE_"],
  build: {
    target: "es2022",
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
