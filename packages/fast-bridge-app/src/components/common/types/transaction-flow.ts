import type {
  NexusSDK,
  SUPPORTED_CHAINS_IDS,
  SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import type { Address } from "viem";

export type TransactionFlowType = "bridge" | "transfer";

export interface TransactionFlowInputs {
  amount?: string;
  chain: SUPPORTED_CHAINS_IDS;
  recipient?: `0x${string}`;
  token: SUPPORTED_TOKENS;
}

export interface TransactionFlowPrefill {
  amount?: string;
  chainId: number;
  recipient?: Address;
  token: string;
}

type BridgeOptions = NonNullable<Parameters<NexusSDK["bridge"]>[1]>;

export type TransactionFlowEvent =
  NonNullable<BridgeOptions["onEvent"]> extends (event: infer E) => void
    ? E
    : never;

export type TransactionFlowOnEvent = NonNullable<BridgeOptions["onEvent"]>;

export interface TransactionFlowExecuteParams {
  amount: bigint;
  amountReadable?: string;
  onEvent: TransactionFlowOnEvent;
  recipient: `0x${string}`;
  sourceChains?: number[];
  toChainId: SUPPORTED_CHAINS_IDS;
  token: SUPPORTED_TOKENS;
}

export type TransactionFlowExecutor = (
  params: TransactionFlowExecuteParams
) => Promise<{ explorerUrl: string } | null>;

export type SourceCoverageState = "healthy" | "warning" | "error";

export interface SourceSelectionValidation {
  coverageState: SourceCoverageState;
  isBelowRequired: boolean;
  missingToProceed: string;
  missingToSafety: string;
}
