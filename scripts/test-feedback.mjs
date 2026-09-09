import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sdkEventTestPlugin } from "./sdk-event-test-plugin.mjs";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("vite"))("esbuild");
const directory = await mkdtemp(join(tmpdir(), "fastbridge-feedback-"));
try {
  const suites = [
    "balances",
    "user-facing-error",
    "sdk-event-emission",
    "token-selection",
    "progress-status",
  ];
  await build({
    entryPoints: suites.map((name) => `tests/${name}.test.ts`),
    outdir: directory,
    outExtension: { ".js": ".mjs" },
    plugins: [sdkEventTestPlugin()],
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
    tsconfig: "packages/fast-bridge-app/tsconfig.json",
    banner: {
      js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
    },
  });
  const result = spawnSync(
    process.execPath,
    ["--test", ...suites.map((name) => join(directory, `${name}.test.mjs`))],
    { stdio: "inherit" }
  );
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
