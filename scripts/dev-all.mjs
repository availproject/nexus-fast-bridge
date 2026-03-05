#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const chainsPath = path.join(rootDir, "chains.config.json");

async function main() {
  const chainsRaw = await fs.readFile(chainsPath, "utf8");
  const chains = JSON.parse(chainsRaw);
  const filters = chains.flatMap((chain) => [
    "--filter",
    `@fastbridge/${chain.slug}`,
  ]);

  const child = spawn(
    "pnpm",
    ["turbo", "run", "dev", "--parallel", ...filters, "--filter", "root"],
    {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    }
  );

  child.on("exit", (code) => {
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
