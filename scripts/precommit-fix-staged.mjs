#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";

const FIXABLE_FILE_PATTERN = /\.(?:[cm]?[jt]sx?|jsonc?|css|scss|mdx?)$/i;

function getStagedFiles() {
  const output = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
    { encoding: "utf8" }
  );

  return output
    .split("\0")
    .filter(Boolean)
    .filter((file) => FIXABLE_FILE_PATTERN.test(file));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const files = getStagedFiles();

if (files.length === 0) {
  process.exit(0);
}

run("pnpm", ["ultracite", "fix", ...files]);
run("git", ["add", "--", ...files], { shell: false });
