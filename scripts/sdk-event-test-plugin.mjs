import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const SDK_TEST_IMPORT = /^@fastbridge-test\/nexus-sdk$/;
const ALL_FILES = /.*/;

function findMapper(ast, alias, marker) {
  const matches = [];
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.initializer?.getText(ast).includes(marker)) {
        matches.push(declaration.name.getText(ast));
      }
    }
  }
  if (matches.length !== 1) {
    throw new Error(
      `Nexus event mapper changed (${alias}); audit the installed SDK before updating this test adapter.`
    );
  }
  return `${matches[0]} as ${alias}`;
}

/** Test-only exports from the installed SDK, with no copied implementation. */
export function sdkEventTestPlugin() {
  return {
    name: "installed-nexus-event-mappers",
    setup(builder) {
      builder.onResolve({ filter: SDK_TEST_IMPORT }, () => ({
        path: join(
          dirname(require.resolve("@avail-project/nexus-core")),
          "index.esm.js"
        ),
        namespace: "sdk-event-test",
      }));
      builder.onLoad(
        { filter: ALL_FILES, namespace: "sdk-event-test" },
        async ({ path }) => {
          const source = await readFile(path, "utf8");
          const ast = ts.createSourceFile(
            path,
            source,
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.JS
          );
          const markers = {
            bridgeEmitter: "BridgeEventEmitFailed",
            swapEmitter: "Swap plan not initialized before progress emission",
          };
          const exports = Object.entries(markers).map(([alias, marker]) =>
            findMapper(ast, alias, marker)
          );
          return {
            contents: `${source}\nexport { ${exports.join(", ")} };`,
            loader: "js",
            resolveDir: dirname(path),
          };
        }
      );
    },
  };
}
