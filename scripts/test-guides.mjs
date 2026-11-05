import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("vite"))("esbuild");
const directory = await mkdtemp(join(tmpdir(), "fastbridge-guides-"));
try {
  await build({
    entryPoints: ["tests/guides.test.ts"],
    outdir: directory,
    outExtension: { ".js": ".mjs" },
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
    tsconfig: "packages/fast-bridge-app/tsconfig.json",
  });
  const result = spawnSync(
    process.execPath,
    ["--test", join(directory, "guides.test.mjs")],
    { stdio: "inherit" }
  );
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
