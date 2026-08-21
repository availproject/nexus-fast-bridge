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

const RE_REACT_PACKAGES =
  /\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//;

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
    outDir: "apps/root/dist",
    emptyOutDir: true,
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@avail-project/nexus-core")) {
              return "vendor-nexus";
            }
            if (
              id.includes("@reown") ||
              id.includes("@rainbow-me") ||
              id.includes("connectkit") ||
              id.includes("wagmi") ||
              id.includes("viem")
            ) {
              return "vendor-web3";
            }
            if (RE_REACT_PACKAGES.test(id)) {
              return "vendor-react";
            }
            if (id.includes("@radix-ui") || id.includes("lucide-react")) {
              return "vendor-ui";
            }
            if (id.includes("posthog-js")) {
              return "vendor-posthog";
            }
          }
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
});
