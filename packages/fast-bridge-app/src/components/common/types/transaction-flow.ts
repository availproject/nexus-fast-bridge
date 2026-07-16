import type { BridgeEvent } from "@avail-project/nexus-core";
import type { Address } from "viem";

export type TransactionFlowType = "bridge" | "transfer";

export type BridgeStepType = {
  type: string;
  typeID: string;
  completed?: boolean;
  [key: string]: unknown;
};

export type SwapStepType = {
  type: string;
  typeID: string;
  completed?: boolean;
  [key: string]: unknown;
};

export interface TransactionFlowInputs {
  amount?: string;
  chain: number;
  recipient?: `0x${string}`;
  token: string;
}

export interface TransactionFlowPrefill {
  amount?: string;
  chainId: number;
  recipient?: Address;
  token: string;
}

export type TransactionFlowEvent = BridgeEvent;

export type TransactionFlowOnEvent = (event: BridgeEvent) => void;

export interface TransactionFlowExecuteParams {
  amount: bigint;
  onEvent: TransactionFlowOnEvent;
  recipient: `0x${string}`;
  sourceChains?: number[];
  toChainId: number;
  token: string;
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
