import {
  createUseBridge,
  type FastBridgeState as CoreFastBridgeState,
} from "@fastbridge/fast-bridge-core";
import { getChainRuntimeConfig } from "@fastbridge/chain-runtime-config";
import {
  type BridgeStepType,
  NEXUS_EVENTS,
  type NexusSDK,
  type OnAllowanceHookData,
  type OnIntentHookData,
  type SUPPORTED_CHAINS_IDS,
  type SUPPORTED_TOKENS,
} from "@fastbridge/nexus-adapter-citrea";
import { useNexusError, usePolling, useStopwatch, useTransactionSteps } from "../../common";
import config from "../../../../config";
import { trackBridgeSubmit } from "../../../lib/posthog";
import { SHORT_CHAIN_NAME } from "../../common/utils/constant";

export type FastBridgeState = CoreFastBridgeState<
  SUPPORTED_CHAINS_IDS,
  SUPPORTED_TOKENS
>;

const runtimeConfig = getChainRuntimeConfig("citrea");

const useBridge = createUseBridge<
  SUPPORTED_CHAINS_IDS,
  SUPPORTED_TOKENS,
  BridgeStepType,
  NexusSDK,
  OnIntentHookData,
  OnAllowanceHookData
>({
  bridgeConfig: {
    chainId: config.chainId as SUPPORTED_CHAINS_IDS,
    defaultToken: (config.nexusPrimaryToken || "USDC") as SUPPORTED_TOKENS,
    maxBridgeAmount: runtimeConfig.fastBridge.maxBridgeAmount,
    fastBridgeTag: runtimeConfig.fastBridge.analyticsTag,
    logStepEvents: runtimeConfig.fastBridge.logStepEvents,
  },
  events: {
    stepsList: NEXUS_EVENTS.STEPS_LIST,
    stepComplete: NEXUS_EVENTS.STEP_COMPLETE,
    intentHashSignedStepType: "INTENT_HASH_SIGNED",
  },
  allowedTokens: ["USDC", "USDT", "USDM"] as SUPPORTED_TOKENS[],
  shortChainName: SHORT_CHAIN_NAME,
  trackBridgeSubmit,
  useStopwatch,
  usePolling,
  useNexusError,
  useTransactionSteps: () => useTransactionSteps<BridgeStepType>(),
});

export default useBridge;
