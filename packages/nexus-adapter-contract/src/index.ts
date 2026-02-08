export type EvmAddress = `0x${string}`;

export interface MutableRefLike<T> {
  current: T | null;
}

export interface IntentLike {
  allow: () => void;
  deny: () => void;
  refresh: (args: unknown[]) => Promise<void> | void;
}

export interface BridgeTransactionResult {
  explorerUrl: string;
}

export interface BridgeEvent<TStep = { type?: string }> {
  name: string;
  args: TStep | TStep[] | Record<string, unknown>;
}

export interface NexusBridgeClient<
  TChain extends number = number,
  TToken extends string = string,
  TStep = { type?: string },
> {
  convertTokenReadableAmountToBigInt: (
    amount: string,
    token: TToken,
    chain: TChain,
  ) => bigint;
  bridge: (
    request: {
      token: TToken;
      amount: bigint;
      toChainId: TChain;
      recipient: EvmAddress;
    },
    options: {
      onEvent: (event: BridgeEvent<TStep>) => void;
    },
  ) => Promise<BridgeTransactionResult | null>;
}

export interface BridgeableAsset<TToken extends string = string> {
  symbol: TToken;
}
