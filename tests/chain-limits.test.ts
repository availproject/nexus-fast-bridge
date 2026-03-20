import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveUsdLimitForDestination } from "../packages/fast-bridge-app/src/components/common/utils/transfer-limits";
import type {
  AppConfig,
  ChainFeatures,
} from "../packages/fast-bridge-app/src/types/runtime";

interface ChainRegistryEntry {
  appDir: string;
  slug: string;
}

interface ChainRuntimeModule {
  appConfig: AppConfig;
  chainFeatures: ChainFeatures;
}

interface ChainLimitExpectation {
  defaultMaxBridgeAmount: number;
  overrideByDestinationChainId?: Record<number, number>;
}

const workspaceRoot = resolve(import.meta.dirname, "..");
const NON_OVERRIDE_DESTINATION_CHAIN_ID = -1;
const chainRegistry = JSON.parse(
  readFileSync(resolve(workspaceRoot, "chains.config.json"), "utf8")
) as ChainRegistryEntry[];

const loadChainRuntimeModule = async (
  appDir: string
): Promise<ChainRuntimeModule> => {
  const runtimeModuleUrl = pathToFileURL(
    resolve(workspaceRoot, appDir, "src/runtime.ts")
  ).href;

  return (await import(runtimeModuleUrl)) as ChainRuntimeModule;
};

const chainRuntimeModules = Object.fromEntries(
  await Promise.all(
    chainRegistry.map(async ({ appDir, slug }) => {
      return [slug, await loadChainRuntimeModule(appDir)] as const;
    })
  )
) as Record<string, ChainRuntimeModule>;

const EXPECTED_LIMITS_BY_SLUG: Record<string, ChainLimitExpectation> = {
  citrea: {
    defaultMaxBridgeAmount: 550,
  },
  megaeth: {
    defaultMaxBridgeAmount: 550,
    overrideByDestinationChainId: {
      4326: 5000,
    },
  },
  monad: {
    defaultMaxBridgeAmount: 550,
  },
};

describe("chain transfer limits", () => {
  it("keeps explicit expectations in sync with the chain registry", () => {
    const configuredSlugs = chainRegistry
      .map(({ slug }) => slug)
      .toSorted((left, right) => left.localeCompare(right));
    const expectedSlugs = Object.keys(EXPECTED_LIMITS_BY_SLUG).toSorted(
      (left, right) => left.localeCompare(right)
    );

    expect(expectedSlugs).toEqual(configuredSlugs);
  });

  for (const { slug } of chainRegistry) {
    describe(slug, () => {
      const runtimeModule = chainRuntimeModules[slug];
      const expectation = EXPECTED_LIMITS_BY_SLUG[slug];

      it("has an explicit transfer limit expectation", () => {
        expect(expectation).toBeDefined();
      });

      it("resolves the expected default limit through shared limit logic", () => {
        expect(
          resolveUsdLimitForDestination({
            defaultMaxAmount: runtimeModule.chainFeatures.maxBridgeAmount,
            destinationChainId: NON_OVERRIDE_DESTINATION_CHAIN_ID,
            maxAmountByDestinationChainId:
              runtimeModule.chainFeatures.maxBridgeAmountByDestinationChainId,
          })
        ).toBe(expectation?.defaultMaxBridgeAmount);
      });

      it("resolves the expected destination-specific overrides", () => {
        const expectedDestinationOverrides =
          expectation?.overrideByDestinationChainId;
        const actualDestinationOverrides =
          runtimeModule.chainFeatures.maxBridgeAmountByDestinationChainId;

        if (expectedDestinationOverrides === undefined) {
          expect(actualDestinationOverrides).toBeUndefined();
          expect(
            resolveUsdLimitForDestination({
              defaultMaxAmount: runtimeModule.chainFeatures.maxBridgeAmount,
              destinationChainId: NON_OVERRIDE_DESTINATION_CHAIN_ID,
              maxAmountByDestinationChainId: actualDestinationOverrides,
            })
          ).toBe(expectation?.defaultMaxBridgeAmount);
          return;
        }

        expect(actualDestinationOverrides).toEqual(
          expectedDestinationOverrides
        );

        for (const [destinationChainId, expectedUsdLimit] of Object.entries(
          expectedDestinationOverrides
        )) {
          expect(
            resolveUsdLimitForDestination({
              defaultMaxAmount: runtimeModule.chainFeatures.maxBridgeAmount,
              destinationChainId: Number(destinationChainId),
              maxAmountByDestinationChainId: actualDestinationOverrides,
            })
          ).toBe(expectedUsdLimit);
        }

        expect(Object.keys(actualDestinationOverrides ?? {})).toHaveLength(
          Object.keys(expectedDestinationOverrides).length
        );
      });
    });
  }
});
