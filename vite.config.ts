import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const cspValue = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://*.walletconnect.com https://*.walletconnect.org https://*.reown.com https://*.web3modal.org",
  "script-src-elem 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://*.walletconnect.com https://*.walletconnect.org https://*.reown.com https://*.web3modal.org",
  "connect-src 'self' https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://*.reown.com https://api.reown.com https://*.web3modal.org https://api.web3modal.org https://*.infura.io https://*.alchemy.com https://mainnet.infura.io https://polygon-rpc.com https://api.avax.network https://rpc.ankr.com https://*.ankr.com https://*.arbitrum.io https://arb1.arbitrum.io https://*.optimism.io https://mainnet.optimism.io https://*.base.org https://mainnet.base.org https://rpc.scroll.io https://*.scroll.io https://sepolia.infura.io https://rpc.sepolia.org https://*.monad.xyz https://*.merkle.io",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org",
].join("; ");

export default defineConfig({
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
  server: {
    middlewareMode: false,
    headers: {
      "Content-Security-Policy": cspValue,
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  },
  envPrefix: ["VITE_"],
});
