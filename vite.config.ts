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
  // Only variables listed here reach the client bundle. List only values that
  // are safe to publish, never a secret.
  envPrefix: [
    "VITE_APP_BASE_PATH",
    "VITE_CONFIG_NEXUS_",
    "VITE_IS_APP_DOWN",
    "VITE_TURNSTILE_SITE_KEY",
    "VITE_WALLET_CONNECT_ID",
  ],
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
