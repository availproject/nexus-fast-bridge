import type { Address } from "viem";
import type { LegacyPlanEvent } from "../../nexus/better-intent-compat";

export type TransactionFlowType = "bridge" | "transfer";

export interface BridgeStepType {
  completed?: boolean;
  type: string;
  typeID: string;
  [key: string]: unknown;
}

export interface SwapStepType {
  completed?: boolean;
  type: string;
  typeID: string;
  [key: string]: unknown;
}

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

export type TransactionFlowEvent = LegacyPlanEvent;

export type TransactionFlowOnEvent = (event: LegacyPlanEvent) => void;

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
