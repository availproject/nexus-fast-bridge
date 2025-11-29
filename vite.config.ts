import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// const isProduction = process.env.NODE_ENV === "production";

export default defineConfig({
  // base: isProduction ? "/monad/" : "/",
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
    // outDir: isProduction ? "dist/monad" : "dist",
  }
});
