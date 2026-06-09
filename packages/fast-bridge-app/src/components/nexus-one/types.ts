// biome-ignore-all lint: NexusOne registry component from shadcn registry.

import {
  type ExecuteParams,
  type SUPPORTED_CHAINS_IDS,
} from "@avail-project/nexus-core";
import { type Address } from "viem";

export type NexusOneMode = "swap" | "send" | "deposit";

/** Exact In: user specifies the "from" amount. Exact Out: user specifies the "to" amount. */
export type SwapType = "exactIn" | "exactOut";

export type DepositExecuteConfig = Omit<ExecuteParams, "toChainId">;

export interface NexusOneDepositConfig {
  apy?: string;
  chainId: SUPPORTED_CHAINS_IDS;
  depositTargetLogo?: string;
  description?: string;
  estimatedTime?: string;
  executeDeposit: (
    tokenSymbol: string,
    tokenAddress: Address,
    amount: bigint,
    chainId: number,
    user: Address
  ) => DepositExecuteConfig;
  explorerUrl?: string;
  gasTokenSymbol?: string;
  label?: string;
  logo?: string;

  /** Optional labels used by Nexus One history/progress copy. */
  protocol?: string;
  subtitle?: string;
  title?: string;
  tokenAddress: Address;
  tokenDecimals: number;
  tokenLogo?: string;
  tokenSymbol: string;
}

export type NexusOneDepositMetadata = Omit<
  NexusOneDepositConfig,
  "executeDeposit"
>;

export interface NexusOnePrefill {
  amount?: string;
  chain?: number;
  destination?: {
    token: Address;
    chain: number;
  };
  recipient?: Address;
  source?: {
    token: Address;
    chain: number;
  };
  token?: Address;
}

export interface NexusOneConfig {
  allowedDestinationPairs?: {
    token: Address;
    chain: number;
  }[];
  allowedSourcePairs?: {
    token: Address;
    chain: number;
  }[];
  /** Required for deposit mode. Describes the single destination and app call. */
  deposit?: NexusOneDepositConfig;
  mode: NexusOneMode;
  prefill?: NexusOnePrefill;
}

export interface NexusOneProps {
  className?: string;
  config: NexusOneConfig;
  connectedAddress?: Address;
  defaultOpen?: boolean;
  embed?: boolean;
  onClose?: () => void;
  onComplete?: (explorerUrl?: string) => void;
  onError?: (message: string) => void;
  onOpenChange?: (open: boolean) => void;
  onReceiveAssetChange?: (asset: {
    chainId?: number;
    chainName?: string;
    contractAddress: string;
    symbol: string;
  }) => void;
  onStart?: () => void;
  open?: boolean;
}
