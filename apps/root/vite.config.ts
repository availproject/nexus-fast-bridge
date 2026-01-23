import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chainsConfigPath = path.resolve(__dirname, "..", "..", "chains.config.json");
const chains = JSON.parse(fs.readFileSync(chainsConfigPath, "utf8")) as Array<{ slug: string }>;

const baseDevPort = 5173;
const proxy = Object.fromEntries(
  chains.map((chain, index) => {
    const envKey = `VITE_${chain.slug.toUpperCase()}_DEV_PORT`;
    const port = Number(process.env[envKey]) || baseDevPort + index;
    return [
      `/${chain.slug}`,
      {
        target: `http://localhost:${port}`,
        changeOrigin: true,
      },
    ];
  }),
);

export default defineConfig(({ command }) => {
  const isPreview =
    process.env.npm_lifecycle_event?.includes("preview") ||
    process.argv.some((arg) => arg.includes("preview"));
  const server = !isPreview && command === "serve" ? { proxy } : undefined;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    envPrefix: ["VITE_"],
    server,
  };
});
