import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chainFeatures as citreaFeatures } from "../apps/citrea/src/runtime";
import { chainFeatures as megaethFeatures } from "../apps/megaeth/src/runtime";

vi.mock(
  "../packages/fast-bridge-app/src/components/common/hooks/use-debounced-callback",
  () => ({
    useDebouncedCallback: <TArgs extends unknown[]>(
      callback: (...args: TArgs) => Promise<void>
    ) => {
      const debounced = (...args: TArgs) => {
        callback(...args).catch(() => undefined);
      };
      debounced.cancel = vi.fn();
      return debounced;
    },
  })
);

vi.mock(
  "../packages/fast-bridge-app/src/components/common/hooks/use-nexus-error",
  () => ({
    useNexusError: () => vi.fn(),
  })
);

vi.mock(
  "../packages/fast-bridge-app/src/components/common/hooks/use-polling",
  () => ({
    usePolling: vi.fn(),
  })
);

vi.mock(
  "../packages/fast-bridge-app/src/components/common/hooks/use-stopwatch",
  () => ({
    useStopwatch: () => ({
      reset: vi.fn(),
      seconds: 0,
      stop: vi.fn(),
    }),
  })
);

vi.mock(
  "../packages/fast-bridge-app/src/components/common/hooks/use-transaction-execution",
  () => ({
    useTransactionExecution: () => ({
      commitAmount: vi.fn(),
      handleTransaction: vi.fn(),
      invalidatePendingExecution: vi.fn(),
      refreshIntent: vi.fn(),
      reset: vi.fn(),
      startTransaction: vi.fn(),
    }),
  })
);

vi.mock(
  "../packages/fast-bridge-app/src/components/common/tx/use-transaction-steps",
  () => ({
    useTransactionSteps: () => ({
      onStepComplete: vi.fn(),
      onStepsList: vi.fn(),
      reset: vi.fn(),
      steps: [],
    }),
  })
);

const { useTransactionFlow } = await import(
  "../packages/fast-bridge-app/src/components/common/hooks/use-transaction-flow"
);

const TEST_ADDRESS = "0x0000000000000000000000000000000000000001";
const TOKEN_SCALE = BigInt(1_000_000);
const TRAILING_ZEROES_REGEX = /0+$/;
const originalConsoleError = console.error;

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

const parseReadableAmount = (value: string): bigint => {
  const [wholePart, fractionalPart = ""] = value.split(".");
  const normalizedFraction = `${fractionalPart}000000`.slice(0, 6);
  return (
    BigInt(wholePart || "0") * TOKEN_SCALE + BigInt(normalizedFraction || "0")
  );
};

const formatReadableAmount = (value: bigint): string => {
  const wholePart = value / TOKEN_SCALE;
  const fractionalPart = (value % TOKEN_SCALE).toString().padStart(6, "0");
  const normalizedFractionalPart = fractionalPart.replace(
    TRAILING_ZEROES_REGEX,
    ""
  );

  return normalizedFractionalPart
    ? `${wholePart.toString()}.${normalizedFractionalPart}`
    : wholePart.toString();
};

const createNexusSdk = (maxBridgeAmount: string) => {
  return {
    calculateMaxForBridge: vi.fn(async () => ({
      amount: maxBridgeAmount,
    })),
    convertTokenReadableAmountToBigInt: (amount: string) =>
      parseReadableAmount(amount),
    utils: {
      formatUnits: (amount: bigint) => formatReadableAmount(amount),
      parseUnits: (amount: string) => parseReadableAmount(amount),
    },
  };
};

const createHookProps = ({
  chainId,
  chainRuntimeFeatures,
  maxBridgeAmount,
}: {
  chainId: number;
  chainRuntimeFeatures: {
    maxBridgeAmount: number;
    maxBridgeAmountByDestinationChainId?: Record<number, number>;
  };
  maxBridgeAmount: string;
}) => ({
  allowance: { current: null },
  bridgableBalance: [
    {
      breakdown: [
        {
          balance: "10000",
          chain: {
            id: 1,
          },
        },
      ],
      decimals: 6,
      symbol: "USDC",
    },
  ],
  connectedAddress: TEST_ADDRESS,
  executeTransaction: vi.fn(),
  fetchBalance: vi.fn(() => Promise.resolve()),
  intent: { current: null },
  maxAmount: chainRuntimeFeatures.maxBridgeAmount,
  maxAmountByDestinationChainId:
    chainRuntimeFeatures.maxBridgeAmountByDestinationChainId,
  network: "mainnet" as const,
  nexusSDK: createNexusSdk(maxBridgeAmount),
  prefill: {
    amount: maxBridgeAmount,
    chainId,
    recipient: TEST_ADDRESS,
    token: "USDC" as const,
  },
  type: "bridge" as const,
});

const renderHook = async <TResult>(
  hook: () => TResult
): Promise<{
  result: () => TResult;
  unmount: () => void;
}> => {
  let latestResult: TResult;
  let renderer: ReactTestRenderer | undefined;

  const TestComponent = () => {
    latestResult = hook();
    return null;
  };

  await act(async () => {
    renderer = create(React.createElement(TestComponent));
    await Promise.resolve();
    await Promise.resolve();
  });

  return {
    result: () => latestResult,
    unmount: () => {
      if (!renderer) {
        return;
      }
      act(() => {
        renderer.unmount();
      });
    },
  };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation((message, ...args) => {
    if (
      typeof message === "string" &&
      (message.includes("react-test-renderer is deprecated") ||
        message.includes(
          "The current testing environment is not configured to support act"
        ))
    ) {
      return;
    }

    originalConsoleError(message, ...args);
  });
});

describe("transfer limit enforcement", () => {
  it("clamps selected-source max amount to the default shared limit", async () => {
    const { result, unmount } = await renderHook(() =>
      useTransactionFlow(
        createHookProps({
          chainId: 999_999,
          chainRuntimeFeatures: citreaFeatures,
          maxBridgeAmount: "600",
        })
      )
    );

    expect(result().maxAvailableAmount).toBe("550");
    unmount();
  });

  it("clamps selected-source max amount to the destination override when present", async () => {
    const megaethDestinationChainId = Number(
      Object.keys(megaethFeatures.maxBridgeAmountByDestinationChainId ?? {})[0]
    );
    const { result, unmount } = await renderHook(() =>
      useTransactionFlow(
        createHookProps({
          chainId: megaethDestinationChainId,
          chainRuntimeFeatures: megaethFeatures,
          maxBridgeAmount: "6000",
        })
      )
    );

    expect(result().maxAvailableAmount).toBe("5000");
    unmount();
  });
});
