import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { writeFileSync } from "node:fs";
import type { AppEnv } from "./src/vite-env.d";
import { getConfig } from "./getConfig";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_") as unknown as AppEnv;

  const rawBase = env.VITE_APP_BASE_PATH || "/monad/";
  const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
  const config = getConfig(env);

  const manifestContent = {
    "name": config.meta.title,
    "short_name": config.appTitle,
    "description": config.meta.description,
    "start_url": base,
    "display": "standalone",
    "background_color": config.meta.backgroundColor,
    "theme_color": config.meta.themeColor,
    "orientation": "portrait-primary",
    "icons": [
      {
        "src": config.meta.faviconUrl,
        "sizes": "31x32",
        "type": "image/png",
        "purpose": "any"
      },
      {
        "src": config.meta.imageUrl,
        "sizes": "2444x1256",
        "type": "image/png",
        "purpose": "any"
      }
    ]
  };

  const outputPath = path.resolve(__dirname, 'dist', 'manifest.json');

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      nodePolyfills({
        exclude: ["fs"],
        protocolImports: true,
      }),
      // Create manifest.json at build
      {
        name: 'generate-manifest',
        writeBundle() {
          try {
            writeFileSync(outputPath, JSON.stringify(manifestContent, null, 2));
            console.log(`Generated dynamic manifest.json at ${outputPath}`);
          } catch (err) {
            console.error('Error generating manifest.json', err);
          }
        }
      },
      // Update title and meta of index.html at build
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          // Replace placeholders with actual values
          return html
            .replaceAll(/%= APP_TITLE =%/g, config.meta.title)
            .replaceAll(/%= APP_DESCRIPTION =%/g, config.meta.description)
            .replaceAll(/%= APP_CANONICAL_URL =%/g, config.meta.canonicalUrl)
            .replaceAll(/%= APP_FAVICON_URL =%/g, config.meta.faviconUrl)
            .replaceAll(/%= APP_THEME_COLOR =%/g, config.meta.themeColor)
            .replaceAll(/%= APP_META_IMAGE_URL =%/g, config.meta.imageUrl)
        }
      }
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
      emptyOutDir: true
    }
  }
});
