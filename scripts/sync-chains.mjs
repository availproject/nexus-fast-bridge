#!/usr/bin/env node
// Sync helper after editing chains.config.json:
// - ensures root devDependencies include each chain workspace package
// - adds prefixed env keys from .env.<slug> files into turbo.json globalEnv
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const chainsPath = path.join(rootDir, "chains.config.json");
const rootPkgPath = path.join(rootDir, "apps", "root", "package.json");
const turboPath = path.join(rootDir, "turbo.json");

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function parseEnvFile(contents, sourceLabel) {
  const entries = [];
  const lines = contents.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) {
      console.warn(`Skipping line ${i + 1} in ${sourceLabel}: missing "="`);
      continue;
    }
    const key = line.slice(0, eqIndex).trim();
    if (!key) {
      console.warn(`Skipping line ${i + 1} in ${sourceLabel}: empty key`);
      continue;
    }
    entries.push(key);
  }
  return entries;
}

async function readEnvKeysForChain(chain) {
  const slug = chain.slug.toLowerCase();
  const slugPrefix = slug.toUpperCase();
  const envFileName = `.env.${slug}`;
  const candidates = [
    path.join(rootDir, chain.appDir, envFileName),
    path.join(rootDir, envFileName)
  ];

  for (const candidate of candidates) {
    try {
      const contents = await fs.readFile(candidate, "utf8");
      const keys = parseEnvFile(contents, candidate);
      return keys.map((key) => `${slugPrefix}_${key}`);
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }
  }

  console.warn(
    `No ${envFileName} found for ${slug}; skipping env key sync for this chain.`
  );
  return [];
}

async function syncRootDeps(chains) {
  const pkg = await readJson(rootPkgPath);
  pkg.devDependencies ??= {};

  let touched = false;
  for (const chain of chains) {
    const pkgName = `@fastbridge/${chain.slug}`;
    if (!pkg.devDependencies[pkgName]) {
      pkg.devDependencies[pkgName] = "workspace:*";
      touched = true;
      console.log(`Added root devDependency: ${pkgName}`);
    }
  }

  if (touched) {
    const sorted = Object.keys(pkg.devDependencies)
      .sort()
      .reduce((acc, key) => {
        acc[key] = pkg.devDependencies[key];
        return acc;
      }, {});
    pkg.devDependencies = sorted;
    await fs.writeFile(rootPkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
    console.log("Updated apps/root/package.json");
  } else {
    console.log("apps/root/package.json already includes chain workspace deps.");
  }
}

async function syncTurboEnv(chains) {
  const turbo = await readJson(turboPath);
  turbo.globalEnv ??= [];
  const envSet = new Set(turbo.globalEnv);

  for (const chain of chains) {
    const keys = await readEnvKeysForChain(chain);
    keys.forEach((key) => envSet.add(key));
  }

  const nextEnv = Array.from(envSet);
  nextEnv.sort();

  const changed =
    turbo.globalEnv.length !== nextEnv.length ||
    turbo.globalEnv.some((val, idx) => val !== nextEnv[idx]);

  if (changed) {
    turbo.globalEnv = nextEnv;
    await fs.writeFile(turboPath, `${JSON.stringify(turbo, null, 2)}\n`, "utf8");
    console.log(`Updated turbo.json globalEnv (${nextEnv.length} entries).`);
  } else {
    console.log("turbo.json globalEnv already up to date.");
  }
}

async function main() {
  const chains = await readJson(chainsPath);
  await syncRootDeps(chains);
  await syncTurboEnv(chains);
  console.log("Done. Next: run `pnpm vercel:env` to refresh env output, then deploy.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
