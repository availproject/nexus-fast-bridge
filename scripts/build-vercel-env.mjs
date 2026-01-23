#!/usr/bin/env node
// Aggregate per-chain env files (e.g. .env.monad, .env.megaeth) into
// Vercel-ready variables with the required <SLUG>_ prefix.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function parseArgs(argv) {
  let outputPath;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--output" || arg === "-o") {
      outputPath = argv[i + 1];
      i++;
    }
  }
  return { outputPath };
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
    const value = line.slice(eqIndex + 1);
    if (!key) {
      console.warn(`Skipping line ${i + 1} in ${sourceLabel}: empty key`);
      continue;
    }
    entries.push([key, value]);
  }

  return entries;
}

async function readEnvForChain(chain) {
  const slug = chain.slug.toLowerCase();
  const envFileName = `.env.${slug}`;
  const candidates = [
    path.join(rootDir, chain.appDir, envFileName),
    path.join(rootDir, envFileName)
  ];

  for (const candidate of candidates) {
    try {
      const contents = await fs.readFile(candidate, "utf8");
      return { entries: parseEnvFile(contents, candidate), source: candidate };
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }
  }

  console.warn(
    `No ${envFileName} found for ${slug} (looked in app dir and repo root).`
  );
  return null;
}

async function main() {
  const { outputPath } = parseArgs(process.argv.slice(2));
  const chainsRaw = await fs.readFile(
    path.join(rootDir, "chains.config.json"),
    "utf8"
  );
  const chains = JSON.parse(chainsRaw);

  const outputLines = [];

  for (const chain of chains) {
    const env = await readEnvForChain(chain);
    if (!env) {
      continue;
    }

    const prefix = chain.slug.toUpperCase();
    for (const [key, value] of env.entries) {
      outputLines.push(`${prefix}_${key}=${value}`);
    }
    console.error(`Read ${env.entries.length} vars from ${env.source}`);
  }

  if (!outputLines.length) {
    console.warn("No environment variables found. Nothing to write.");
    return;
  }

  const outputContents = outputLines.join("\n");

  if (outputPath) {
    const targetPath = path.resolve(rootDir, outputPath);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, outputContents, "utf8");
    console.log(`Wrote ${outputLines.length} variables to ${outputPath}`);
  } else {
    process.stdout.write(`${outputContents}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
