// biome-ignore-all lint: NexusOne registry component from shadcn registry.
import type { Address } from "viem";

export type NexusOneMode = "swap" | "send" | "deposit";

/** Exact In: user specifies the "from" amount. Exact Out: user specifies the "to" amount. */
export type SwapType = "exactIn" | "exactOut";

/**
 * A single DeFi yield/deposit opportunity that can be listed in the deposit widget.
 * Devs pass an array of these so users can pick which protocol to deposit into.
 */
export interface DepositOpportunity {
  /** Optional APY string shown in the card, e.g. "4.2%" */
  apy?: string;
  chainId: number;
  /** Short description shown in the card */
  description?: string;
  /** Parameters for sdk.swapAndExecute */
  execute?:
    | {
        to: `0x${string}`;
        data?: `0x${string}`;
        value?: bigint;
        gas: bigint;
        gasPrice?: "low" | "medium" | "high";
        tokenApproval?: {
          token: `0x${string}`;
          amount: bigint;
          spender: `0x${string}`;
        };
      }
    | ((
        amount: bigint,
        connectedAddress: `0x${string}`
      ) => {
        to: `0x${string}`;
        data?: `0x${string}`;
        value?: bigint;
        gas: bigint;
        gasPrice?: "low" | "medium" | "high";
        tokenApproval?: {
          token: `0x${string}`;
          amount: bigint;
          spender: `0x${string}`;
        };
      });
  id: string;
  /** Display label, e.g. "Aave USDC on Polygon" */
  label?: string;
  /** Optional URL to a protocol/token logo */
  logo?: string;
  /** Protocol name, e.g. "Aave" */
  protocol: string;
  /** New subtitle for UI (e.g. "Deposit USDC on Arbitrum") */
  subtitle?: string;
  /** New title for UI (e.g. "Aave") */
  title?: string;
  tokenAddress: Address;
  /** Optional custom token logo provided by developer */
  tokenLogo?: string;
  tokenSymbol: string;
}

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
  mode: NexusOneMode;
  /** For deposit mode: list of DeFi opportunities the user can pick from */
  opportunities?: DepositOpportunity[];
  prefill?: NexusOnePrefill;
}

export interface NexusOneProps {
  config: NexusOneConfig;
  connectedAddress?: Address;
  embed?: boolean;
  onClose?: () => void;
  onComplete?: (explorerUrl?: string) => void;
  onError?: (message: string) => void;
  onReceiveAssetChange?: (asset: {
    chainId?: number;
    contractAddress: string;
    symbol: string;
  }) => void;
  onStart?: () => void;
}
