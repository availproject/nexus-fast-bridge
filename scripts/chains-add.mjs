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
const appsDir = path.join(rootDir, "apps");

function usage() {
  console.log(
    "Usage: node scripts/chains-add.mjs <slug> [options]\n\nOptions:\n  --name <name>             Display name (default: title-cased slug)\n  --description <text>      Card description\n  --base-path <path>        Base path (default: /<slug>/)\n  --primary <hex>           Primary color (default: #836ef9)\n  --secondary <hex>         Secondary color (default: #ffffff)\n  --logo-url <url>          Optional logo URL for root card\n  --icon-url <url>          Optional icon URL for root card\n  --template <slug>         Template app to clone (default: monad)\n"
  );
}

function parseArgs(argv) {
  const [first, ...rest] = argv;
  if (!first || first === "-h" || first === "--help") {
    return { help: true };
  }

  const options = {
    slug: first,
    template: "monad",
  };

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    const next = rest[i + 1];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    switch (arg) {
      case "--name":
        options.name = next;
        i += 1;
        break;
      case "--description":
        options.description = next;
        i += 1;
        break;
      case "--base-path":
        options.basePath = next;
        i += 1;
        break;
      case "--primary":
        options.primaryColor = next;
        i += 1;
        break;
      case "--secondary":
        options.secondaryColor = next;
        i += 1;
        break;
      case "--logo-url":
        options.logoUrl = next;
        i += 1;
        break;
      case "--icon-url":
        options.iconUrl = next;
        i += 1;
        break;
      case "--template":
        options.template = next;
        i += 1;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function titleCaseFromSlug(slug) {
  return slug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeBasePath(basePath, slug) {
  const value = (basePath || `/${slug}/`).trim();
  const prefixed = value.startsWith("/") ? value : `/${value}`;
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function updateFallbackLiteral(source, field, nextLiteral) {
  const regex = new RegExp(`(${field}\\s*:\\s*[^\\n]*\\|\\|\\s*)"[^"]*"`);
  return source.replace(regex, `$1"${nextLiteral}"`);
}

function updateHeroFallback(source, nextLiteral) {
  return source.replace(
    /heroText:\s*[\s\S]*?\|\|\s*"[^"]*",/,
    `heroText:\n            env.VITE_CONFIG_CHAIN_HERO_TEXT ||\n            "${nextLiteral}",`
  );
}

function inferUsedPorts(packageJsonObjects) {
  const ports = new Set();
  for (const pkg of packageJsonObjects) {
    const devScript = pkg?.scripts?.dev;
    if (typeof devScript !== "string") {
      continue;
    }
    const match = devScript.match(/--port\s+(\d+)/);
    if (match) {
      ports.add(Number(match[1]));
    }
  }
  return ports;
}

function pickNextPort(usedPorts, start = 5173) {
  let port = start;
  while (usedPorts.has(port)) {
    port += 1;
  }
  return port;
}

async function runScript(scriptPath) {
  await new Promise((resolve, reject) => {
    const child = spawn("node", [scriptPath], {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`${path.basename(scriptPath)} failed with code ${code}`)
        );
      }
    });
    child.on("error", reject);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const slug = args.slug.toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(
      `Invalid slug: ${slug}. Use lowercase letters, numbers, and dashes.`
    );
  }

  const name = args.name?.trim() || titleCaseFromSlug(slug);
  const description =
    args.description?.trim() ||
    `Bridge from any chain to ${name}, in real time.`;
  const primaryColor = args.primaryColor?.trim() || "#836ef9";
  const secondaryColor = args.secondaryColor?.trim() || "#ffffff";
  const basePath = normalizeBasePath(args.basePath, slug);
  const templateSlug = (args.template || "monad").toLowerCase();

  const templateAppDir = path.join(appsDir, templateSlug);
  const targetAppDir = path.join(appsDir, slug);

  const chains = await readJson(chainsPath);
  if (!Array.isArray(chains)) {
    throw new Error("chains.config.json must be an array.");
  }

  if (chains.some((chain) => chain.slug === slug)) {
    throw new Error(`Chain '${slug}' already exists in chains.config.json.`);
  }

  if (!(await pathExists(templateAppDir))) {
    throw new Error(
      `Template app '${templateSlug}' does not exist at ${templateAppDir}.`
    );
  }

  if (await pathExists(targetAppDir)) {
    throw new Error(`Target app directory already exists: ${targetAppDir}`);
  }

  await fs.cp(templateAppDir, targetAppDir, { recursive: true });
  await fs.rm(path.join(targetAppDir, "dist"), {
    recursive: true,
    force: true,
  });
  await fs.rm(path.join(targetAppDir, "node_modules"), {
    recursive: true,
    force: true,
  });
  await fs.rm(path.join(targetAppDir, ".turbo"), {
    recursive: true,
    force: true,
  });
  await fs.rm(path.join(targetAppDir, ".env.local"), { force: true });
  await fs.rm(path.join(targetAppDir, ".env.production"), { force: true });

  const templateEnvPath = path.join(targetAppDir, `.env.${templateSlug}`);
  const targetEnvPath = path.join(targetAppDir, `.env.${slug}`);
  if (await pathExists(templateEnvPath)) {
    await fs.rename(templateEnvPath, targetEnvPath);
  }

  const usedPorts = inferUsedPorts(
    await Promise.all(
      chains.map(async (chain) => {
        const packagePath = path.join(rootDir, chain.appDir, "package.json");
        return readJson(packagePath);
      })
    )
  );

  const nextPort = pickNextPort(usedPorts);

  const packagePath = path.join(targetAppDir, "package.json");
  const targetPkg = await readJson(packagePath);
  targetPkg.name = `@fastbridge/${slug}`;
  targetPkg.scripts = targetPkg.scripts || {};
  targetPkg.scripts.dev = `node ../../scripts/prepare-env.mjs ${slug} && vite --host --port ${nextPort}`;
  targetPkg.scripts.build = `node ../../scripts/prepare-env.mjs ${slug} && vite build`;
  await writeJson(packagePath, targetPkg);

  const vitePath = path.join(targetAppDir, "vite.config.ts");
  const viteRaw = await fs.readFile(vitePath, "utf8");
  const viteNext = viteRaw.replace(
    /const rawBase = env\.VITE_APP_BASE_PATH \|\| "[^"]+";/,
    `const rawBase = env.VITE_APP_BASE_PATH || "${basePath}";`
  );
  await fs.writeFile(vitePath, viteNext, "utf8");

  const getConfigPath = path.join(targetAppDir, "getConfig.ts");
  const getConfigRaw = await fs.readFile(getConfigPath, "utf8");
  let getConfigNext = getConfigRaw;
  getConfigNext = updateFallbackLiteral(getConfigNext, "chainName", name);
  getConfigNext = updateHeroFallback(
    getConfigNext,
    `Bridge from any chain to ${name}, in real time.`
  );
  getConfigNext = updateFallbackLiteral(
    getConfigNext,
    "appTitle",
    `${name} Fast Bridge`
  );
  getConfigNext = updateFallbackLiteral(
    getConfigNext,
    "appDescription",
    `Bridge from any chain to ${name}, in real time.`
  );
  getConfigNext = updateFallbackLiteral(
    getConfigNext,
    "primaryColor",
    primaryColor
  );
  getConfigNext = updateFallbackLiteral(
    getConfigNext,
    "secondaryColor",
    secondaryColor
  );
  getConfigNext = updateFallbackLiteral(
    getConfigNext,
    "title",
    `${name} Fast Bridge - Powered by Avail Nexus`
  );
  getConfigNext = updateFallbackLiteral(
    getConfigNext,
    "description",
    `Bridge from any chain to ${name}, in real time.`
  );
  await fs.writeFile(getConfigPath, getConfigNext, "utf8");

  const runtimePath = path.join(targetAppDir, "src", "runtime.ts");
  const runtimeRaw = await fs.readFile(runtimePath, "utf8");
  const runtimeNext = runtimeRaw
    .replace(/slug:\s*"[^"]+"/, `slug: "${slug}"`)
    .replace(
      /analyticsFastBridgeKey:\s*"[^"]+"/,
      `analyticsFastBridgeKey: "${slug}"`
    );
  await fs.writeFile(runtimePath, runtimeNext, "utf8");

  const newChain = {
    slug,
    name,
    description,
    primaryColor,
    secondaryColor,
    basePath,
    appDir: `apps/${slug}`,
    ...(args.logoUrl ? { logoUrl: args.logoUrl } : {}),
    ...(args.iconUrl ? { iconUrl: args.iconUrl } : {}),
  };

  const nextChains = [...chains, newChain].sort((a, b) =>
    a.slug.localeCompare(b.slug)
  );
  await writeJson(chainsPath, nextChains);

  await runScript(path.join(rootDir, "scripts", "sync-chains.mjs"));

  console.log(`\nScaffolded chain '${slug}' at apps/${slug}`);
  console.log("Next steps:");
  console.log(`1. Update apps/${slug}/.env.${slug} values`);
  console.log(`2. Run pnpm --filter @fastbridge/${slug} dev`);
  console.log("3. Run pnpm vercel:env and sync deployment env vars");
}

main().catch((error) => {
  console.error(error.message || error);
  usage();
  process.exit(1);
});
