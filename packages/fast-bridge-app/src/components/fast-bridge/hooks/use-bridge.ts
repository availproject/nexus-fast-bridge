import type {
  NexusNetwork,
  NexusSDK,
  OnAllowanceHookData,
  OnIntentHookData,
  SUPPORTED_CHAINS_IDS,
  SUPPORTED_TOKENS,
  UserAsset,
} from "@avail-project/nexus-core";
import { appConfig, chainFeatures } from "@fastbridge/runtime";
import { type RefObject, useCallback } from "react";
import { type Address, isAddress } from "viem";
import { trackBridgeSubmit } from "../../../lib/posthog";
import { useTransactionFlow } from "../../common/hooks/use-transaction-flow";
import type {
  TransactionFlowExecuteParams,
  TransactionFlowInputs,
  TransactionFlowPrefill,
} from "../../common/types/transaction-flow";
import { SHORT_CHAIN_NAME } from "../../common/utils/constant";
import { notifyIntentHistoryRefresh } from "../../view-history/history-events";

export type FastBridgeState = TransactionFlowInputs;

const ALLOWED_TOKENS = new Set(["USDC", "USDT", "USDM"]);
const DECIMAL_PREFILL_AMOUNT_REGEX = /^\d*\.?\d*$/;

interface UseBridgeProps {
  allowance: RefObject<OnAllowanceHookData | null>;
  bridgableBalance: UserAsset[] | null;
  connectedAddress?: Address;
  fetchBalance: () => Promise<void>;
  intent: RefObject<OnIntentHookData | null>;
  isSourceMenuOpen?: boolean;
  maxAmount?: string | number;
  network: NexusNetwork;
  nexusSDK: NexusSDK | null;
  onComplete?: (explorerUrl?: string) => void | Promise<void>;
  onError?: (message: string) => void;
  onStart?: () => void;
  prefill?: {
    token?: SUPPORTED_TOKENS;
    chainId?: SUPPORTED_CHAINS_IDS;
    amount?: string;
    recipient?: Address;
  };
}

const sanitizePrefill = (
  prefill: UseBridgeProps["prefill"],
  connectedAddress?: Address
): TransactionFlowPrefill => {
  const tokenCandidate = (
    prefill?.token ??
    appConfig.nexusPrimaryToken ??
    "USDC"
  ).toUpperCase();
  const token = ALLOWED_TOKENS.has(tokenCandidate)
    ? tokenCandidate
    : appConfig.nexusPrimaryToken || "USDC";

  const amount = prefill?.amount
    ? (() => {
        const value = prefill.amount.trim();
        if (
          !value ||
          value === "." ||
          !DECIMAL_PREFILL_AMOUNT_REGEX.test(value)
        ) {
          return undefined;
        }
        const parsed = Number.parseFloat(value);
        if (Number.isNaN(parsed) || parsed <= 0 || parsed > 1e9) {
          return undefined;
        }
        return value;
      })()
    : undefined;

  let recipient = connectedAddress;
  if (prefill?.recipient) {
    recipient = isAddress(prefill.recipient)
      ? prefill.recipient
      : connectedAddress;
  }

  return {
    token,
    chainId: appConfig.chainId,
    amount,
    recipient,
  };
};

const useBridge = ({
  network,
  connectedAddress,
  nexusSDK,
  intent,
  bridgableBalance,
  prefill,
  onComplete,
  onStart,
  onError,
  fetchBalance,
  allowance,
  maxAmount,
  isSourceMenuOpen = false,
}: UseBridgeProps) => {
  const executeTransaction = useCallback(
    ({
      token,
      amount,
      amountReadable,
      toChainId,
      recipient,
      sourceChains,
      onEvent,
    }: TransactionFlowExecuteParams) => {
      if (!nexusSDK) {
        return Promise.resolve(null);
      }

      trackBridgeSubmit({
        chain: toChainId,
        chainName: SHORT_CHAIN_NAME[toChainId] || `Chain ${toChainId}`,
        tokenSymbol: token,
        amount: amountReadable ?? amount.toString(),
        fast_bridge: chainFeatures.analyticsFastBridgeKey,
      });

      return nexusSDK.bridge(
        {
          token,
          amount,
          toChainId,
          recipient: recipient ?? connectedAddress,
          sourceChains,
        },
        { onEvent }
      );
    },
    [connectedAddress, nexusSDK]
  );

  const flow = useTransactionFlow({
    type: "bridge",
    network,
    connectedAddress,
    nexusSDK,
    intent,
    bridgableBalance,
    prefill: sanitizePrefill(prefill, connectedAddress),
    onComplete,
    onStart,
    onError,
    fetchBalance,
    allowance,
    maxAmount: maxAmount ?? chainFeatures.maxBridgeAmount,
    maxAmountByDestinationChainId:
      chainFeatures.maxBridgeAmountByDestinationChainId,
    maxAmountByTokenAndChain: chainFeatures.maxBridgeAmountByTokenAndChain,

    isSourceMenuOpen,
    notifyHistoryRefresh: notifyIntentHistoryRefresh,
    mapUsdmToUsdcBalance: chainFeatures.mapUsdmToUsdcBalance ?? false,
    denyIntentOnReset: chainFeatures.denyIntentOnReset ?? true,
    executeTransaction,
  });

  return {
    ...flow,
    inputs: flow.inputs as FastBridgeState,
    setInputs: flow.setInputs as (
      next: FastBridgeState | Partial<FastBridgeState>
    ) => void,
    areInputsValid: flow.isInputsValid,
  };
};

export default useBridge;
