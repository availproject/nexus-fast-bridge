import { readFileSync, realpathSync } from "node:fs";
import { builtinModules } from "node:module";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

interface ChainRegistryEntry {
  appDir: string;
}

interface ChainResolutionContext {
  appRootWithSep: string;
  availPackageNodeModulesRoot: string;
  nexusCoreAliasPathWithSep: string;
  nexusCoreRealPathWithSep: string;
}

const workspaceRoot = import.meta.dirname;
const chainRegistry = JSON.parse(
  readFileSync(resolve(workspaceRoot, "chains.config.json"), "utf8")
) as ChainRegistryEntry[];
const sharedSourceRoot = resolve(workspaceRoot, "packages/fast-bridge-app/src");
const sharedPackageNodeModulesRoot = resolve(
  workspaceRoot,
  "packages/fast-bridge-app/node_modules"
);
const nodeBuiltinModules = new Set(
  builtinModules.map((builtinModule) =>
    builtinModule.startsWith("node:")
      ? builtinModule.slice("node:".length)
      : builtinModule
  )
);
const chainResolutionContexts: ChainResolutionContext[] = chainRegistry.map(
  ({ appDir }) => {
    const appRoot = resolve(workspaceRoot, appDir);
    const nexusCoreAliasPath = resolve(
      workspaceRoot,
      appDir,
      "node_modules/@avail-project/nexus-core"
    );
    const nexusCoreRealPath = realpathSync(nexusCoreAliasPath);

    return {
      appRootWithSep: `${appRoot}${sep}`,
      availPackageNodeModulesRoot: resolve(nexusCoreRealPath, "..", ".."),
      nexusCoreAliasPathWithSep: `${nexusCoreAliasPath}${sep}`,
      nexusCoreRealPathWithSep: `${nexusCoreRealPath}${sep}`,
    };
  }
);

const normalizeImporterPath = (id: string): string => {
  return id.startsWith("file://") ? fileURLToPath(id) : id;
};

const nonBareImportPrefixes = [".", "/", "file:", "\0"] as const;

const isBarePackageImport = (source: string): boolean => {
  return !nonBareImportPrefixes.some((prefix) => source.startsWith(prefix));
};

const resolveChainNodeModulesRoot = (importer?: string): string | null => {
  if (!importer) {
    return null;
  }

  const importerPath = normalizeImporterPath(importer);
  for (const context of chainResolutionContexts) {
    if (
      importerPath.startsWith(context.appRootWithSep) ||
      importerPath.startsWith(context.nexusCoreAliasPathWithSep) ||
      importerPath.startsWith(context.nexusCoreRealPathWithSep)
    ) {
      return context.availPackageNodeModulesRoot;
    }
  }

  return null;
};

export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      name: "chain-local-nexus-core-resolver",
      resolveId(source, importer) {
        if (
          !isBarePackageImport(source) ||
          source.startsWith("node:") ||
          nodeBuiltinModules.has(source)
        ) {
          return null;
        }

        const nodeModulesRoot = resolveChainNodeModulesRoot(importer);
        if (!nodeModulesRoot) {
          return null;
        }

        return resolve(nodeModulesRoot, source.replaceAll("/", `${sep}`));
      },
    },
  ],
  resolve: {
    alias: {
      "@/": `${sharedSourceRoot}/`,
      react: resolve(sharedPackageNodeModulesRoot, "react"),
      "react-dom": resolve(sharedPackageNodeModulesRoot, "react-dom"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
