import {
  type NexusNetwork,
  NexusSDK,
  type OnAllowanceHookData,
  type OnIntentHookData,
  type SUPPORTED_CHAINS_IDS,
  type SUPPORTED_TOKENS,
  type UserAsset,
} from "@avail-project/nexus-core";
import { useCallback, type RefObject } from "react";
import { type Address, isAddress } from "viem";
import config from "../../../../config";
import { trackBridgeSubmit } from "../../../lib/posthog";
import {
  type TransactionFlowExecuteParams,
  type TransactionFlowInputs,
  type TransactionFlowPrefill,
  useTransactionFlow,
} from "../../common";
import { SHORT_CHAIN_NAME } from "../../common/utils/constant";
import { notifyIntentHistoryRefresh } from "../../view-history/history-events";

export type FastBridgeState = TransactionFlowInputs;

const MAX_BRIDGE_AMOUNT = 5000;
const ALLOWED_TOKENS = new Set(["USDC", "USDT", "USDM"]);

interface UseBridgeProps {
  network: NexusNetwork;
  connectedAddress?: Address;
  nexusSDK: NexusSDK | null;
  intent: RefObject<OnIntentHookData | null>;
  allowance: RefObject<OnAllowanceHookData | null>;
  bridgableBalance: UserAsset[] | null;
  prefill?: {
    token: SUPPORTED_TOKENS;
    chainId: SUPPORTED_CHAINS_IDS;
    amount?: string;
    recipient?: Address;
  };
  onComplete?: () => void;
  onStart?: () => void;
  onError?: (message: string) => void;
  fetchBalance: () => Promise<void>;
  maxAmount?: string | number;
  isSourceMenuOpen?: boolean;
}

const sanitizePrefill = (
  prefill: UseBridgeProps["prefill"],
  connectedAddress?: Address,
): TransactionFlowPrefill => {
  const tokenCandidate = (
    prefill?.token ??
    config.nexusPrimaryToken ??
    "USDC"
  ).toUpperCase();
  const token = ALLOWED_TOKENS.has(tokenCandidate)
    ? tokenCandidate
    : config.nexusPrimaryToken || "USDC";

  const amount = prefill?.amount
    ? (() => {
        const value = prefill.amount.trim();
        if (!value || value === "." || !/^\d*\.?\d*$/.test(value)) {
          return undefined;
        }
        const parsed = Number.parseFloat(value);
        if (Number.isNaN(parsed) || parsed <= 0 || parsed > 1e9) {
          return undefined;
        }
        return value;
      })()
    : undefined;

  const recipient = prefill?.recipient
    ? isAddress(prefill.recipient)
      ? prefill.recipient
      : connectedAddress
    : connectedAddress;

  return {
    token,
    chainId: config.chainId,
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
    async ({
      token,
      amount,
      amountReadable,
      toChainId,
      recipient,
      sourceChains,
      onEvent,
    }: TransactionFlowExecuteParams) => {
      if (!nexusSDK) return null;

      trackBridgeSubmit({
        chain: toChainId,
        chainName: SHORT_CHAIN_NAME[toChainId] || `Chain ${toChainId}`,
        tokenSymbol: token,
        amount: amountReadable ?? amount.toString(),
        fast_bridge: "megaeth",
      });

      return nexusSDK.bridge(
        {
          token,
          amount,
          toChainId,
          recipient: recipient ?? connectedAddress,
          sourceChains,
        },
        { onEvent },
      );
    },
    [connectedAddress, nexusSDK],
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
    maxAmount: maxAmount ?? MAX_BRIDGE_AMOUNT,
    isSourceMenuOpen,
    notifyHistoryRefresh: notifyIntentHistoryRefresh,
    mapUsdmToUsdcBalance: true,
    denyIntentOnReset: false,
    executeTransaction,
  });

  return {
    ...flow,
    inputs: flow.inputs as FastBridgeState,
    setInputs: flow.setInputs as (
      next: FastBridgeState | Partial<FastBridgeState>,
    ) => void,
    areInputsValid: flow.isInputsValid,
  };
};

export default useBridge;
