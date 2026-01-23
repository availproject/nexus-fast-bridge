#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const chainsPath = path.join(rootDir, "chains.config.json");
const rootPublicDir = path.join(rootDir, "apps", "root", "public");

async function readChains() {
  const raw = await fs.readFile(chainsPath, "utf8");
  return JSON.parse(raw);
}

async function copyDist(source, destination) {
  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(source, destination, { recursive: true });
}

async function main() {
  const chains = await readChains();
  await fs.mkdir(rootPublicDir, { recursive: true });

  for (const chain of chains) {
    const distDir = path.resolve(rootDir, chain.appDir, "dist");
    const targetDir = path.join(rootPublicDir, chain.slug);

    try {
      await fs.access(distDir);
    } catch {
      console.warn(`Missing dist for ${chain.slug} at ${distDir}. Build the chain app first.`);
      continue;
    }

    await copyDist(distDir, targetDir);
    console.log(`Copied ${chain.slug} dist -> ${path.relative(rootDir, targetDir)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
