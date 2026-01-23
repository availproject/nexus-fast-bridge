#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const slug = process.argv[2];
const customAppDir = process.argv[3];

if (!slug) {
  console.error("Usage: node scripts/prepare-env.mjs <slug> [appDir]");
  process.exit(1);
}

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const prefix = `${slug.toUpperCase()}_`;
const appDir = customAppDir
  ? path.resolve(customAppDir)
  : path.join(rootDir, "apps", slug.toLowerCase());
const outputPathProd = path.join(appDir, ".env.production");
const outputPathLocal = path.join(appDir, ".env.local");
const localEnvPath = path.join(appDir, `.env.${slug}`);

// If a local .env.<slug> exists, copy it directly for local dev/builds
if (fs.existsSync(localEnvPath)) {
  const contents = fs.readFileSync(localEnvPath, "utf8");
  const envDir = path.dirname(outputPathProd);
  fs.mkdirSync(envDir, { recursive: true });
  fs.writeFileSync(outputPathProd, contents, { encoding: "utf8" });
  fs.writeFileSync(outputPathLocal, contents, { encoding: "utf8" });
  console.log(`Copied ${path.basename(localEnvPath)} to ${outputPathProd} and .env.local`);
  process.exit(0);
}

const entries = Object.entries(process.env).filter(([key]) =>
  key.startsWith(prefix)
);

if (!entries.length) {
  console.warn(`No environment variables found with prefix ${prefix} and no ${path.basename(localEnvPath)} present.`);
}

const lines = entries.map(([key, value]) => {
  const stripped = key.slice(prefix.length);
  return `${stripped}=${value ?? ""}`;
});

const envDir = path.dirname(outputPathProd);
fs.mkdirSync(envDir, { recursive: true });
fs.writeFileSync(outputPathProd, lines.join("\n"), { encoding: "utf8" });
fs.writeFileSync(outputPathLocal, lines.join("\n"), { encoding: "utf8" });
console.log(`Wrote ${lines.length} variables to ${outputPathProd} and .env.local`);
