import Decimal from "decimal.js";

export const SWAP_CHAIN_DISPLAY_ORDER = [
  4114, // Citrea
  4663, // Robinhood
  1, // Ethereum
  5042, // Arc
  42_161, // Arbitrum
  8453, // Base
  137, // Polygon
  10, // OP
  999, // HyperEVM
  56, // BSC
  43_114, // Avalanche
  143, // Monad
  4326, // MegaETH
  534_352, // Scroll
] as const;

export const SWAP_CHAIN_DISPLAY_ORDER_RANK = new Map<number, number>(
  SWAP_CHAIN_DISPLAY_ORDER.map((chainId, index) => [chainId, index])
);

export interface SortableTokenOption {
  balance?: string;
  balanceInFiat?: number | string;
  chainId?: number;
  chainName?: string;
  hasBalance?: boolean;
  name?: string;
  symbol?: string;
  totalBalance?: string;
  totalBalanceInFiat?: number | string;
  verified?: boolean;
}

export const getTotalBalanceInFiat = (
  token?: Pick<SortableTokenOption, "balanceInFiat" | "totalBalanceInFiat">
): number | string => token?.totalBalanceInFiat ?? token?.balanceInFiat ?? 0;

export const getTokenFiatValue = (
  token: Pick<SortableTokenOption, "balanceInFiat" | "totalBalanceInFiat">
) => {
  const parsed = Number(
    String(getTotalBalanceInFiat(token)).replace(/[^0-9.]/g, "") || 0
  );
  return Number.isNaN(parsed) || !Number.isFinite(parsed) ? 0 : parsed;
};

export const parseTokenAmount = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (Decimal.isDecimal(value)) {
    return value;
  }
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") {
    return undefined;
  }
  try {
    const parsed = new Decimal(cleaned);
    return parsed.isFinite() ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const tokenHasBalance = (token: SortableTokenOption): boolean => {
  if (token.hasBalance !== undefined) {
    return token.hasBalance;
  }
  if (getTokenFiatValue(token) > 0) {
    return true;
  }
  const bal = parseTokenAmount(token.totalBalance ?? token.balance);
  return bal !== undefined && bal.gt(0);
};

export const sortTokensWithBalancesFirst = <T extends SortableTokenOption>(
  tokens: T[]
): T[] => {
  if (tokens.length <= 1) {
    return tokens;
  }

  const decorated = new Array(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const hasBal =
      t.hasBalance !== undefined ? t.hasBalance : tokenHasBalance(t);
    const fiat = hasBal ? getTokenFiatValue(t) : 0;
    const balNum = hasBal
      ? Number(
          String(t.totalBalance ?? t.balance ?? "").replace(/[^0-9.]/g, "") || 0
        )
      : 0;
    // Tier 0: Verified balances (verified !== false)
    // Tier 1: Unverified balances (verified === false)
    // Tier 2: 0 balance tokens
    const tier = hasBal ? (t.verified !== false ? 0 : 1) : 2;
    const chainRank =
      SWAP_CHAIN_DISPLAY_ORDER_RANK.get(t.chainId ?? -1) ?? 999_999;
    const name = `${t.symbol || ""} ${t.chainName || ""}`.toLowerCase();
    decorated[i] = {
      balNum,
      chainRank,
      fiat,
      idx: i,
      name,
      tier,
      token: t,
    };
  }

  decorated.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }
    if (a.tier === 0 || a.tier === 1) {
      if (b.fiat !== a.fiat) {
        return b.fiat - a.fiat;
      }
      if (b.balNum !== a.balNum) {
        return b.balNum - a.balNum;
      }
    }
    if (a.chainRank !== b.chainRank) {
      return a.chainRank - b.chainRank;
    }
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return a.idx - b.idx;
  });

  const result = new Array(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    result[i] = decorated[i].token;
  }
  return result;
};

export const sortTokensByUsdBalance = sortTokensWithBalancesFirst;
