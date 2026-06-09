// biome-ignore-all lint: NexusOne registry component from shadcn registry.
"use client";
import {
  CHAIN_METADATA,
  formatTokenBalance,
  type SupportedChainsResult,
  type UserAsset,
} from "@avail-project/nexus-core";
import Decimal from "decimal.js";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  Info,
  Loader2,
  Minus,
  Search,
  X,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { getShortChainName } from "../../common/utils/constant";
import { nexusOneTheme } from "../theme";

const tabularNums: React.CSSProperties = {
  fontFeatureSettings: '"tnum"',
  fontVariantNumeric: "tabular-nums",
};
const theme = nexusOneTheme;

export interface SwapTokenOption {
  balance: string;
  balanceInFiat: string;
  chainId?: number;
  chainLogo?: string;
  chainName?: string;
  contractAddress: string;
  decimals: number;
  isUnified?: boolean;
  logo?: string;
  name: string;
  sourceTokens?: SwapTokenOption[];
  symbol: string;
  unifiedSymbol?: "USDC" | "USDT" | "ETH";
  userAmount?: string;
  userAmountMode?: "token" | "usd";
  userAmountUsd?: string;
}

interface SwapAssetSelectorProps {
  allowSelectedTokenRemoval?: boolean;
  allowUnified?: boolean;
  autoSelectFilterTabs?: boolean;
  editingAssetIndex?: number | null;
  filterTabBehavior?: FilterTabBehavior;
  hideCustomTab?: boolean;
  isMulti?: boolean;
  lockedTokens?: SwapTokenOption[];
  onBack: () => void;
  onClearSelection?: () => void;
  onDone?: () => void;
  onFilterTabSelect?: (tab: Exclude<FilterTab, "custom">) => void;
  onSelect: (token: SwapTokenOption) => void;
  onSelectionChange?: (tokens: SwapTokenOption[]) => void;
  onToggle?: (token: SwapTokenOption) => void;
  preserveSelectedBelowMinimum?: boolean;
  requiredUsd?: string;
  selectedTokens?: SwapTokenOption[];
  staticOptions?: SwapTokenOption[];
  swapBalance: UserAsset[] | null;
  swapSupportedChains?: SupportedChainsResult | null;
  title: string;
}

export function deriveTokenOptions(
  swapBalance: UserAsset[]
): SwapTokenOption[] {
  const tokens: SwapTokenOption[] = [];
  for (const asset of swapBalance) {
    for (const bd of asset.breakdown ?? []) {
      if (Number.parseFloat(bd.balance ?? "0") <= 0) continue;
      const chainMeta = bd.chain?.id ? CHAIN_METADATA[bd.chain.id] : undefined;
      tokens.push({
        contractAddress: bd.contractAddress,
        symbol: bd.symbol ?? asset.symbol,
        name: bd.symbol ?? asset.symbol,
        logo: asset.icon ?? "",
        decimals: bd.decimals ?? asset.decimals ?? 18,
        balance:
          formatTokenBalance(bd.balance, {
            symbol: bd.symbol ?? asset.symbol,
            decimals: bd.decimals ?? asset.decimals ?? 18,
          }) ?? bd.balance,
        balanceInFiat:
          bd.balanceInFiat != null
            ? `$${Number(bd.balanceInFiat).toFixed(2)}`
            : "$0.00",
        chainId: bd.chain?.id,
        chainName: getShortChainName(
          bd.chain?.id,
          chainMeta?.name ?? bd.chain?.name
        ),
        chainLogo: chainMeta?.logo ?? bd.chain?.logo,
      });
    }
  }
  const seen = new Map<string, SwapTokenOption>();
  for (const t of tokens) {
    seen.set(`${t.contractAddress.toLowerCase()}-${t.chainId}`, t);
  }
  return Array.from(seen.values());
}

/* ── Radio dot (circular) ── */
export const RadioDot = ({ selected }: { selected: boolean }) => (
  <div
    style={{
      width: 18,
      height: 18,
      borderRadius: "999px",
      boxSizing: "border-box",
      border: selected
        ? `5px solid ${theme.colors.primary}`
        : `1.5px solid ${theme.colors.border}`,
      backgroundColor: theme.colors.surface,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  />
);

const SelectionControl = ({
  selected,
  indeterminate = false,
  multi,
}: {
  selected: boolean;
  indeterminate?: boolean;
  multi: boolean;
}) => {
  if (!multi) return <RadioDot selected={selected} />;

  const isActive = selected || indeterminate;

  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
        border: isActive ? "none" : `1.5px solid ${theme.colors.border}`,
        borderRadius: "5px",
        boxSizing: "border-box",
        display: "flex",
        flexShrink: 0,
        height: 20,
        justifyContent: "center",
        width: 20,
      }}
    >
      {selected && (
        <Check style={{ color: theme.colors.surface, height: 14, width: 14 }} />
      )}
      {!selected && indeterminate && (
        <Minus style={{ color: theme.colors.surface, height: 14, width: 14 }} />
      )}
    </div>
  );
};

/* ── Chain logo cluster ── */
const ChainLogos = ({ tokens }: { tokens: SwapTokenOption[] }) => {
  const clusterRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);
  const uniqueChains = useMemo(() => {
    const seen = new Set<number>();
    const out: {
      id: number;
      logo?: string;
      name?: string;
      balance?: string;
      balanceInFiat?: string;
    }[] = [];
    for (const t of tokens) {
      if (t.chainId && !seen.has(t.chainId)) {
        seen.add(t.chainId);
        out.push({
          id: t.chainId,
          logo: t.chainLogo,
          name: getShortChainName(t.chainId, t.chainName),
          balance: t.balance,
          balanceInFiat: t.balanceInFiat,
        });
      }
    }
    return out;
  }, [tokens]);

  const maxShow = 3;
  const shown = uniqueChains.slice(0, maxShow);
  const openTooltip = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setTooltipRect(clusterRef.current?.getBoundingClientRect() ?? null);
    setShowTooltip(true);
  };
  const closeTooltip = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setShowTooltip(false);
      closeTimerRef.current = null;
    }, 120);
  };
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);
  const showTooltipAbove = tooltipRect ? tooltipRect.top > 240 : true;
  const tooltip =
    showTooltip && uniqueChains.length > 1 && tooltipRect
      ? createPortal(
          <div
            onMouseEnter={openTooltip}
            onMouseLeave={closeTooltip}
            style={{
              backgroundColor: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 10,
              boxShadow: theme.shadows.tooltip,
              ...tabularNums,
              left: Math.min(
                Math.max(tooltipRect.left - 24, 8),
                Math.max(8, window.innerWidth - 248)
              ),
              maxHeight: 220,
              minWidth: 240,
              overflowY: "auto",
              padding: "10px 12px",
              pointerEvents: "auto",
              position: "fixed",
              top: showTooltipAbove
                ? tooltipRect.top - 12
                : tooltipRect.bottom + 8,
              transform: showTooltipAbove ? "translateY(-100%)" : "none",
              zIndex: 2147483647,
            }}
          >
            <div
              style={{
                alignItems: "center",
                color: theme.colors.muted,
                display: "flex",
                fontFamily: theme.fonts.sans,
                fontSize: 11,
                fontWeight: 700,
                justifyContent: "space-between",
                letterSpacing: "0.06em",
                marginBottom: 8,
                gap: 12,
              }}
            >
              <span>UNIFIED · {uniqueChains.length} CHAINS</span>
              <span
                style={{
                  color: theme.colors.text,
                  fontSize: 12,
                  letterSpacing: 0,
                }}
              >
                {tokens
                  .reduce((sum, token) => sum + getTokenFiatValue(token), 0)
                  .toLocaleString(undefined, {
                    currency: "USD",
                    maximumFractionDigits: 2,
                    style: "currency",
                  })}
              </span>
            </div>
            {uniqueChains.map((chain) => (
              <div
                key={chain.id}
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "4px 0",
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  {chain.logo ? (
                    <img
                      alt=""
                      src={chain.logo}
                      style={{
                        borderRadius: "999px",
                        height: 16,
                        objectFit: "cover",
                        width: 16,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        backgroundColor: theme.colors.border,
                        borderRadius: "999px",
                        height: 16,
                        width: 16,
                      }}
                    />
                  )}
                  <span
                    style={{
                      color: theme.colors.text,
                      fontFamily: theme.fonts.sans,
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {chain.name || "Unknown chain"}
                  </span>
                </div>
                <span
                  style={{
                    color: theme.colors.text,
                    fontFamily: theme.fonts.sans,
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {String(chain.balance || "").replace(/\s+[^\s]+$/, "") ||
                    chain.balanceInFiat ||
                    "0"}
                </span>
              </div>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltip}
      ref={clusterRef}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        position: "relative",
      }}
    >
      {tooltip}
      {shown.map((c, i) =>
        c.logo ? (
          <img
            alt=""
            key={c.id}
            src={c.logo}
            style={{
              width: 14,
              height: 14,
              borderRadius: "999px",
              objectFit: "cover",
              outline: `1px solid ${theme.colors.surface}`,
              marginLeft: i > 0 ? -6 : 0,
            }}
          />
        ) : (
          <div
            key={c.id}
            style={{
              width: 14,
              height: 14,
              borderRadius: "999px",
              backgroundColor: theme.colors.border,
              outline: `1px solid ${theme.colors.surface}`,
              marginLeft: i > 0 ? -6 : 0,
            }}
          />
        )
      )}
      <span
        style={{
          fontFamily: theme.fonts.sans,
          fontSize: 14,
          color: theme.colors.muted,
          lineHeight: "20px",
          marginLeft: shown.length > 0 ? 4 : 0,
        }}
      >
        {uniqueChains.length} chain{uniqueChains.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
};

/* ── Filter tabs ── */
type FilterTab = "all" | "native" | "stables" | "custom";
type FilterTabBehavior = "select-all" | "source-pool";
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "native", label: "Native" },
  { key: "stables", label: "Stables" },
  { key: "custom", label: "Custom" },
];
const STABLE_SYMBOLS = new Set([
  "AUSD",
  "BDO",
  "BRZ",
  "BTCUSD",
  "BUSD",
  "bnbUSD",
  "crvUSD",
  "CUSD",
  "DAI",
  "DAI.e",
  "dEURO",
  "DUSD",
  "EURA",
  "EURC",
  "EURCV",
  "EURe",
  "EURS",
  "EURT",
  "eUSD",
  "frxUSD",
  "GHO",
  "GUSD",
  "JUST",
  "jEUR",
  "JUSD",
  "LUSD",
  "rUSD",
  "RLUSD",
  "sUSD",
  "svJUSD",
  "TUSD",
  "USDC",
  "USDC.e",
  "USDS",
  "USDT",
  "USDT0",
  "USDT.e",
  "ctUSD",
  "PYUSD",
  "USDe",
  "xDAI",
  "USD0",
  "USDM",
]);
const STABLE_SYMBOL_KEYS = new Set(
  Array.from(STABLE_SYMBOLS, (symbol) => symbol.toUpperCase())
);

const isStableToken = (token: SwapTokenOption) =>
  STABLE_SYMBOL_KEYS.has(token.symbol.trim().toUpperCase());

function isNativeToken(t: SwapTokenOption) {
  if (isNativeLikeAddress(t.contractAddress)) return true;

  const sym = t.symbol.toUpperCase();
  const chain = (t.chainName || "").toLowerCase();

  if (sym === "ETH")
    return (
      !chain.includes("bnb") &&
      !chain.includes("bsc") &&
      !chain.includes("polygon") &&
      !chain.includes("monad") &&
      !chain.includes("hyperevm")
    );
  if (sym === "POL" || sym === "MATIC") return chain.includes("polygon");
  if (sym === "HYPE") return chain.includes("hyperevm");
  if (sym === "MON") return chain.includes("monad");
  if (sym === "BNB") return chain.includes("bnb") || chain.includes("bsc");
  if (sym === "AVAX") return chain.includes("avalanche");
  if (sym === "FTM") return chain.includes("fantom");
  if (sym === "CELO") return chain.includes("celo");
  if (sym === "SUI") return chain.includes("sui");
  if (sym === "APT") return chain.includes("aptos");
  if (sym === "SOL") return chain.includes("solana");
  return false;
}

const MIN_FIAT_THRESHOLD = 1;
const CHAIN_SELECTOR_CLOSE_MS = 220;
const MODAL_HEIGHT_TRANSITION_MS = 260;
const modalHeightTransitionStyle = {
  interpolateSize: "allow-keywords",
} as React.CSSProperties;
const modalHeightTransition = `height ${MODAL_HEIGHT_TRANSITION_MS}ms ease, max-height ${MODAL_HEIGHT_TRANSITION_MS}ms ease`;
export const SWAP_CHAIN_DISPLAY_ORDER = [
  1, // Ethereum
  42161, // Arbitrum
  8453, // Base
  137, // Polygon
  10, // OP
  999, // HyperEVM
  56, // BSC
  43114, // Avalanche
  143, // Monad
  4326, // MegaETH
  4114, // Citrea
  8217, // Kaia
] as const;
const SWAP_CHAIN_DISPLAY_ORDER_RANK = new Map<number, number>(
  SWAP_CHAIN_DISPLAY_ORDER.map((chainId, index) => [chainId, index])
);
export const SWAP_CHAIN_DISPLAY_ORDER_SET = new Set<number>(
  SWAP_CHAIN_DISPLAY_ORDER
);
export const sortChainIdsBySwapDisplayOrder = (chainIds: number[]) =>
  [...chainIds].sort((a, b) => {
    const aRank =
      SWAP_CHAIN_DISPLAY_ORDER_RANK.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bRank =
      SWAP_CHAIN_DISPLAY_ORDER_RANK.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;

    const aName = CHAIN_METADATA[a]?.name ?? String(a);
    const bName = CHAIN_METADATA[b]?.name ?? String(b);
    return aName.localeCompare(bName);
  });
export const compareChainsBySwapDisplayOrder = <
  T extends { chainId?: number; chainName?: string },
>(
  a: T,
  b: T
) => {
  const aRank =
    SWAP_CHAIN_DISPLAY_ORDER_RANK.get(a.chainId ?? -1) ??
    Number.MAX_SAFE_INTEGER;
  const bRank =
    SWAP_CHAIN_DISPLAY_ORDER_RANK.get(b.chainId ?? -1) ??
    Number.MAX_SAFE_INTEGER;
  if (aRank !== bRank) return aRank - bRank;
  return (a.chainName ?? "").localeCompare(b.chainName ?? "");
};
const UNIFIED_MAINNET_CHAIN_IDS = new Set([
  1, 10, 56, 137, 143, 999, 4114, 8217, 8453, 42161, 43114, 534352, 4326,
]);

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getTokenFiatValue = (token: Pick<SwapTokenOption, "balanceInFiat">) =>
  Number(String(token.balanceInFiat ?? "").replace(/[^0-9.]/g, "") || 0);

const formatBalanceWithSymbol = (
  token: Pick<SwapTokenOption, "balance" | "symbol">
) => {
  const balance = String(token.balance ?? "").trim();
  const symbol = token.symbol?.trim();
  if (!symbol) return balance || "0";
  if (new RegExp(`(?:^|\\s)${escapeRegExp(symbol)}$`, "i").test(balance)) {
    return balance || `0 ${symbol}`;
  }
  return `${balance || "0"} ${symbol}`;
};

const parseTokenAmount = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (Decimal.isDecimal(value)) return value;
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

export const formatTokenAmountDisplay = (value: unknown) => {
  const amount = parseTokenAmount(value) ?? new Decimal(0);
  const abs = amount.abs();

  if (amount.isZero()) return "0";

  const compactUnits = [
    { suffix: "T", value: new Decimal(1_000_000_000_000) },
    { suffix: "B", value: new Decimal(1_000_000_000) },
    { suffix: "M", value: new Decimal(1_000_000) },
  ];

  for (const unit of compactUnits) {
    if (abs.gte(unit.value)) {
      return `${amount
        .div(unit.value)
        .toDecimalPlaces(4, Decimal.ROUND_DOWN)
        .toFixed()}${unit.suffix}`;
    }
  }

  const minDisplay = new Decimal("0.00001");
  if (amount.gt(0) && amount.lt(minDisplay)) {
    return `>${minDisplay.toFixed()}`;
  }

  return amount.toDecimalPlaces(5, Decimal.ROUND_DOWN).toFixed();
};

const addThousandsSeparators = (value: string) => {
  const [integerPart, decimalPart] = value.split(".");
  const withSeparators = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimalPart === undefined
    ? withSeparators
    : `${withSeparators}.${decimalPart}`;
};

export const formatUsdBalanceLabel = (value: unknown) => {
  const amount = parseTokenAmount(value) ?? new Decimal(0);
  const abs = amount.abs();

  if (amount.isZero()) return "$0.00";
  if (amount.gt(0) && amount.lt(0.01)) return "<$0.01";

  const compactUnits = [
    { suffix: "T", value: new Decimal(1_000_000_000_000) },
    { suffix: "B", value: new Decimal(1_000_000_000) },
    { suffix: "M", value: new Decimal(1_000_000) },
  ];

  for (const unit of compactUnits) {
    if (abs.gte(unit.value)) {
      return `$${amount
        .div(unit.value)
        .toDecimalPlaces(4, Decimal.ROUND_DOWN)
        .toFixed()}${unit.suffix}`;
    }
  }

  return `$${addThousandsSeparators(amount.toDecimalPlaces(2).toFixed(2))}`;
};

export const formatSelectedTokenBalanceLabel = (
  token?: Pick<SwapTokenOption, "balance" | "symbol">
) => {
  if (!token) return "";
  const symbol = token.symbol || "";
  const formatted = formatTokenAmountDisplay(token.balance);
  return symbol ? `${formatted} ${symbol}` : formatted;
};

const getSearchTerms = (query: string) =>
  query.toLowerCase().trim().split(/\s+/).filter(Boolean);

const includesTerm = (value: string | undefined, term: string) =>
  (value ?? "").toLowerCase().includes(term);

const startsWithTerm = (value: string | undefined, term: string) =>
  (value ?? "").toLowerCase().startsWith(term);

const equalsTerm = (value: string | undefined, term: string) =>
  (value ?? "").toLowerCase() === term;

export const getTokenSearchRank = (
  token: Pick<
    SwapTokenOption,
    "symbol" | "name" | "chainName" | "contractAddress"
  >,
  query: string
) => {
  const terms = getSearchTerms(query);
  if (terms.length === 0) return null;

  let matchedTerms = 0;
  let symbolExactTerms = 0;
  let symbolPrefixTerms = 0;
  let symbolIncludeTerms = 0;
  let namePrefixTerms = 0;
  let tokenExactTerms = 0;
  let tokenPrefixTerms = 0;
  let tokenIncludeTerms = 0;
  let chainExactTerms = 0;
  let chainPrefixTerms = 0;
  let chainIncludeTerms = 0;
  let addressTerms = 0;

  for (const term of terms) {
    const symbolExact = equalsTerm(token.symbol, term);
    const symbolPrefix = symbolExact || startsWithTerm(token.symbol, term);
    const symbolInclude = symbolPrefix || includesTerm(token.symbol, term);
    const nameExact = equalsTerm(token.name, term);
    const namePrefix = nameExact || startsWithTerm(token.name, term);
    const nameInclude = namePrefix || includesTerm(token.name, term);
    const tokenExact = symbolExact || nameExact;
    const tokenPrefix = tokenExact || symbolPrefix || namePrefix;
    const tokenInclude = tokenPrefix || symbolInclude || nameInclude;
    const chainExact = equalsTerm(token.chainName, term);
    const chainPrefix = chainExact || startsWithTerm(token.chainName, term);
    const chainInclude = chainPrefix || includesTerm(token.chainName, term);
    const addressMatch = includesTerm(token.contractAddress, term);

    if (tokenInclude || chainInclude || addressMatch) matchedTerms += 1;
    if (symbolExact) symbolExactTerms += 1;
    if (symbolPrefix) symbolPrefixTerms += 1;
    if (symbolInclude) symbolIncludeTerms += 1;
    if (namePrefix) namePrefixTerms += 1;
    if (tokenExact) tokenExactTerms += 1;
    if (tokenPrefix) tokenPrefixTerms += 1;
    if (tokenInclude) tokenIncludeTerms += 1;
    if (chainExact) chainExactTerms += 1;
    if (chainPrefix) chainPrefixTerms += 1;
    if (chainInclude) chainIncludeTerms += 1;
    if (addressMatch) addressTerms += 1;
  }

  const allTermsMatched = matchedTerms === terms.length;
  if (!allTermsMatched) return null;

  if (
    terms.length > 1 &&
    chainIncludeTerms > 0 &&
    symbolIncludeTerms === 0 &&
    addressTerms === 0 &&
    namePrefixTerms === 0
  ) {
    return null;
  }

  const hasTokenMatch = tokenIncludeTerms > 0;
  const hasChainMatch = chainIncludeTerms > 0;
  const isTokenChainMatch = allTermsMatched && hasTokenMatch && hasChainMatch;

  let score = 20;
  if (isTokenChainMatch) {
    if (symbolExactTerms > 0 && chainExactTerms > 0) score = 0;
    else if (symbolExactTerms > 0 && chainPrefixTerms > 0) score = 1;
    else if (symbolExactTerms > 0 && chainIncludeTerms > 0) score = 2;
    else if (symbolPrefixTerms > 0 && chainIncludeTerms > 0) score = 3;
    else if (symbolIncludeTerms > 0 && chainIncludeTerms > 0) score = 4;
    else if (namePrefixTerms > 0 && chainIncludeTerms > 0) score = 5;
    else score = 6;
  } else if (symbolExactTerms > 0) score = 7;
  else if (symbolPrefixTerms > 0) score = 8;
  else if (symbolIncludeTerms > 0) score = 9;
  else if (tokenExactTerms > 0) score = 10;
  else if (tokenPrefixTerms > 0) score = 11;
  else if (tokenIncludeTerms > 0) score = 12;
  else if (chainExactTerms > 0) score = 13;
  else if (chainPrefixTerms > 0) score = 14;
  else if (chainIncludeTerms > 0) score = 15;
  else if (addressTerms > 0) score = 16;

  return {
    allTermsMatched,
    isTokenChainMatch,
    matchedTerms,
    score,
    tokenExactTerms,
    tokenIncludeTerms,
  };
};

const isPrioritySearchMatch = (token: SwapTokenOption, query: string) => {
  const rank = getTokenSearchRank(token, query);
  return Boolean(
    rank &&
      (rank.isTokenChainMatch ||
        rank.tokenExactTerms > 0 ||
        rank.allTermsMatched)
  );
};

const compareTokensBySearch = (
  a: SwapTokenOption,
  b: SwapTokenOption,
  query: string
) => {
  const aRank = getTokenSearchRank(a, query);
  const bRank = getTokenSearchRank(b, query);
  const aScore = aRank?.score ?? Number.MAX_SAFE_INTEGER;
  const bScore = bRank?.score ?? Number.MAX_SAFE_INTEGER;
  if (aScore !== bScore) return aScore - bScore;

  const aMatched = aRank?.matchedTerms ?? 0;
  const bMatched = bRank?.matchedTerms ?? 0;
  if (aMatched !== bMatched) return bMatched - aMatched;

  const aFiat = getTokenFiatValue(a);
  const bFiat = getTokenFiatValue(b);
  if (aFiat !== bFiat) return bFiat - aFiat;

  return `${a.symbol} ${a.chainName}`.localeCompare(
    `${b.symbol} ${b.chainName}`
  );
};

function getUnifiedSymbol(token: Pick<SwapTokenOption, "symbol" | "chainId">) {
  if (token.chainId && !UNIFIED_MAINNET_CHAIN_IDS.has(token.chainId)) {
    return null;
  }

  const symbol = token.symbol.toUpperCase();
  if (symbol.includes("USDC") || symbol === "USDM") return "USDC" as const;
  if (symbol.includes("USDT")) return "USDT" as const;
  if (symbol === "ETH") return "ETH" as const;
  return null;
}

function sameTokenOption(a?: SwapTokenOption, b?: SwapTokenOption) {
  if (!a || !b) return false;
  if (a.isUnified || b.isUnified) {
    return Boolean(
      a.isUnified && b.isUnified && a.unifiedSymbol === b.unifiedSymbol
    );
  }
  return (
    sameContractAddress(a.contractAddress, b.contractAddress) &&
    a.chainId === b.chainId
  );
}

function dedupeTokenOptions(tokens: SwapTokenOption[]) {
  return tokens.reduce<SwapTokenOption[]>((acc, token) => {
    if (!acc.some((item) => sameTokenOption(item, token))) {
      acc.push(token);
    }
    return acc;
  }, []);
}

function mergeTokenOptions(
  base: SwapTokenOption[],
  additions: SwapTokenOption[]
) {
  return dedupeTokenOptions([...base, ...additions]);
}

function removeTokenOptions(
  base: SwapTokenOption[],
  removals: SwapTokenOption[]
) {
  return base.filter(
    (token) => !removals.some((removal) => sameTokenOption(token, removal))
  );
}

function isNativeLikeAddress(address?: string) {
  const normalized = (address ?? "").toLowerCase();
  return (
    normalized === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
    normalized === "0x0000000000000000000000000000000000000000"
  );
}

function addressTail(address?: string) {
  const normalized = (address ?? "").toLowerCase();
  if (!normalized.startsWith("0x")) return normalized;
  return normalized.slice(-40);
}

function sameContractAddress(a?: string, b?: string) {
  const normalizedA = (a ?? "").toLowerCase();
  const normalizedB = (b ?? "").toLowerCase();
  if (!normalizedA || !normalizedB) return normalizedA === normalizedB;
  if (normalizedA === normalizedB) return true;
  if (isNativeLikeAddress(normalizedA) && isNativeLikeAddress(normalizedB)) {
    return true;
  }
  return addressTail(normalizedA) === addressTail(normalizedB);
}

export function SwapAssetSelector({
  title,
  swapBalance,
  swapSupportedChains,
  staticOptions,
  onSelect,
  onBack,
  isMulti,
  selectedTokens = [],
  editingAssetIndex = null,
  onToggle,
  onClearSelection,
  onDone,
  allowUnified = false,
  preserveSelectedBelowMinimum = false,
  allowSelectedTokenRemoval = false,
  hideCustomTab = false,
  autoSelectFilterTabs = false,
  filterTabBehavior = "select-all",
  onFilterTabSelect,
  lockedTokens = [],
  onSelectionChange,
  requiredUsd,
}: SwapAssetSelectorProps) {
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const stableListHeightRef = useRef(0);
  const chainCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [stableListHeight, setStableListHeight] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showBelowMin, setShowBelowMin] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showChainSelector, setShowChainSelector] = useState(false);
  const [isChainSelectorClosing, setIsChainSelectorClosing] = useState(false);
  const [chainQuery, setChainQuery] = useState("");
  const [selectedChainFilter, setSelectedChainFilter] = useState<number | null>(
    null
  );
  const [draftChainFilter, setDraftChainFilter] = useState<number | null>(null);
  const [isChainSearchFocused, setIsChainSearchFocused] = useState(false);
  const lockedSelectedTokens = useMemo(
    () => dedupeTokenOptions(lockedTokens),
    [lockedTokens]
  );
  const isLockedToken = useCallback(
    (token: SwapTokenOption) =>
      lockedSelectedTokens.some((locked) => sameTokenOption(locked, token)),
    [lockedSelectedTokens]
  );
  const [draftSelectedTokens, setDraftSelectedTokens] = useState<
    SwapTokenOption[]
  >(() => mergeTokenOptions(selectedTokens, lockedSelectedTokens));
  useEffect(() => {
    if (!isMulti) return;
    setDraftSelectedTokens(
      mergeTokenOptions(selectedTokens, lockedSelectedTokens)
    );
  }, [isMulti, lockedSelectedTokens, selectedTokens]);
  const activeSelectedTokens = isMulti ? draftSelectedTokens : selectedTokens;
  const emitSelectionChange = useCallback(
    (tokens: SwapTokenOption[]) => {
      const next = mergeTokenOptions(tokens, lockedSelectedTokens);
      if (isMulti) {
        setDraftSelectedTokens(next);
        return;
      }
      onSelectionChange?.(next);
    },
    [isMulti, lockedSelectedTokens, onSelectionChange]
  );
  const visibleFilterTabs = useMemo(
    () =>
      hideCustomTab
        ? FILTER_TABS.filter((tab) => tab.key !== "custom")
        : FILTER_TABS,
    [hideCustomTab]
  );

  useEffect(() => {
    if (hideCustomTab && activeTab === "custom") {
      setActiveTab("all");
    }
  }, [activeTab, hideCustomTab]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [query, activeTab, selectedChainFilter]);

  const preserveListHeight = useCallback(() => {
    const listEl = listRef.current;
    if (!listEl) return;

    const nextHeight = Math.ceil(listEl.getBoundingClientRect().height);
    if (nextHeight <= stableListHeightRef.current) return;

    stableListHeightRef.current = nextHeight;
    setStableListHeight(nextHeight);
  }, []);

  useLayoutEffect(() => {
    preserveListHeight();

    const listEl = listRef.current;
    if (!listEl || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      preserveListHeight();
    });
    observer.observe(listEl);

    return () => observer.disconnect();
  }, [preserveListHeight]);

  const allTokens = useMemo<SwapTokenOption[]>(() => {
    const baseTokens = staticOptions
      ? [...staticOptions]
      : swapBalance
        ? deriveTokenOptions(swapBalance)
        : [];

    if (!preserveSelectedBelowMinimum && lockedSelectedTokens.length === 0) {
      return baseTokens;
    }

    const merged = [...baseTokens];
    const selectedSourceTokens = [
      ...activeSelectedTokens,
      ...lockedSelectedTokens,
    ].flatMap((token) =>
      token.isUnified && token.sourceTokens?.length
        ? token.sourceTokens
        : [token]
    );

    for (const selectedToken of selectedSourceTokens) {
      const alreadyPresent = merged.some((token) =>
        sameTokenOption(token, selectedToken)
      );
      if (!alreadyPresent) {
        merged.push(selectedToken);
      }
    }

    return merged;
  }, [
    lockedSelectedTokens,
    preserveSelectedBelowMinimum,
    activeSelectedTokens,
    swapBalance,
    staticOptions,
  ]);

  const getFilterTabTokens = useCallback(
    (tab: FilterTab) => {
      let result = allTokens;
      if (selectedChainFilter !== null) {
        result = result.filter(
          (token) => token.chainId === selectedChainFilter
        );
      }
      if (tab === "native") result = result.filter(isNativeToken);
      else if (tab === "stables") {
        result = result.filter(isStableToken);
      }

      return mergeTokenOptions(
        result.filter(
          (token) => getTokenFiatValue(token) >= MIN_FIAT_THRESHOLD
        ),
        lockedSelectedTokens.filter(
          (token) => getTokenFiatValue(token) >= MIN_FIAT_THRESHOLD
        )
      );
    },
    [allTokens, lockedSelectedTokens, selectedChainFilter]
  );

  const selectionMatchesFilterTab = useCallback(
    (tab: FilterTab) => {
      if (tab === "custom") return true;
      const expected = getFilterTabTokens(tab);
      const selected = mergeTokenOptions(
        activeSelectedTokens,
        lockedSelectedTokens
      );
      return (
        selected.length === expected.length &&
        selected.every((token) =>
          expected.some((expectedToken) =>
            sameTokenOption(expectedToken, token)
          )
        )
      );
    },
    [activeSelectedTokens, getFilterTabTokens, lockedSelectedTokens]
  );

  useEffect(() => {
    if (
      !autoSelectFilterTabs ||
      filterTabBehavior === "source-pool" ||
      !isMulti ||
      activeTab === "custom"
    )
      return;
    if (activeSelectedTokens.length === 0 && lockedSelectedTokens.length === 0)
      return;
    if (!selectionMatchesFilterTab(activeTab)) {
      setActiveTab("custom");
    }
  }, [
    activeTab,
    activeSelectedTokens.length,
    autoSelectFilterTabs,
    filterTabBehavior,
    isMulti,
    lockedSelectedTokens.length,
    selectionMatchesFilterTab,
  ]);

  /* Search + tab + chain filter */
  const filtered = useMemo(() => {
    let result = allTokens;
    if (selectedChainFilter !== null) {
      result = result.filter((t) => t.chainId === selectedChainFilter);
    }
    if (query.trim()) {
      result = result
        .filter((t) => getTokenSearchRank(t, query) !== null)
        .sort((a, b) => compareTokensBySearch(a, b, query));
    }
    if (activeTab === "native") result = result.filter(isNativeToken);
    else if (activeTab === "stables") result = result.filter(isStableToken);
    else if (activeTab === "custom" && !autoSelectFilterTabs)
      result = result.filter((t) => !isNativeToken(t) && !isStableToken(t));
    return result;
  }, [activeTab, allTokens, autoSelectFilterTabs, query, selectedChainFilter]);

  const isTokenSelectedForVisibility = useCallback(
    (token: SwapTokenOption) => {
      if (!preserveSelectedBelowMinimum) return false;

      return activeSelectedTokens.some(
        (selected) =>
          sameTokenOption(selected, token) ||
          Boolean(
            selected.isUnified &&
              selected.sourceTokens?.some((source) =>
                sameTokenOption(source, token)
              )
          )
      );
    },
    [activeSelectedTokens, preserveSelectedBelowMinimum]
  );

  const isUnifiedSelectedForVisibility = useCallback(
    (symbol: string) =>
      preserveSelectedBelowMinimum &&
      activeSelectedTokens.some(
        (selected) => selected.isUnified && selected.unifiedSymbol === symbol
      ),
    [activeSelectedTokens, preserveSelectedBelowMinimum]
  );

  /* Split into above/below minimum */
  const { aboveMin, belowMin } = useMemo(() => {
    const above: SwapTokenOption[] = [];
    const below: SwapTokenOption[] = [];
    for (const t of filtered) {
      const fiat = getTokenFiatValue(t);
      if (
        fiat >= MIN_FIAT_THRESHOLD ||
        isTokenSelectedForVisibility(t) ||
        isPrioritySearchMatch(t, query)
      )
        above.push(t);
      else below.push(t);
    }
    return { aboveMin: above, belowMin: below };
  }, [filtered, isTokenSelectedForVisibility, query]);

  /* Group by symbol */
  const groupedFiltered = useMemo(() => {
    const groups: Record<string, SwapTokenOption[]> = {};
    for (const token of filtered) {
      const unifiedSym = allowUnified ? getUnifiedSymbol(token) : null;
      if (unifiedSym && getTokenFiatValue(token) < MIN_FIAT_THRESHOLD) {
        continue;
      }
      const key = unifiedSym ?? `${token.contractAddress}-${token.chainId}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(token);
    }
    return Object.values(groups)
      .map((group) => {
        let totalFiatVal = 0;
        let totalBalVal = 0;
        for (const t of group) {
          totalFiatVal += getTokenFiatValue(t);
          totalBalVal += Number(t.balance.replace(/[^0-9.]/g, "") || 0);
        }
        const unifiedSym = allowUnified ? getUnifiedSymbol(group[0]) : null;
        return {
          symbol: unifiedSym ?? group[0].symbol,
          logo: group[0].logo,
          totalFiat: totalFiatVal,
          totalFiatStr: `$${totalFiatVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
          totalBalStr: `${totalBalVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${unifiedSym ?? group[0].symbol}`,
          tokens: group,
          isUnifiedCandidate: Boolean(unifiedSym && group.length > 1),
        };
      })
      .filter((group) => {
        const hasSelectedToken = group.tokens.some(
          isTokenSelectedForVisibility
        );
        const hasSelectedUnified = isUnifiedSelectedForVisibility(group.symbol);
        const hasPrioritySearchMatch = group.tokens.some((token) =>
          isPrioritySearchMatch(token, query)
        );
        if (group.isUnifiedCandidate) {
          return (
            group.totalFiat >= MIN_FIAT_THRESHOLD ||
            hasSelectedToken ||
            hasSelectedUnified ||
            hasPrioritySearchMatch
          );
        }
        return group.tokens.some(
          (token) =>
            getTokenFiatValue(token) >= MIN_FIAT_THRESHOLD ||
            isTokenSelectedForVisibility(token) ||
            isPrioritySearchMatch(token, query)
        );
      })
      .sort((a, b) => {
        if (query.trim()) {
          const aScore = Math.min(
            ...a.tokens.map(
              (token) =>
                getTokenSearchRank(token, query)?.score ??
                Number.MAX_SAFE_INTEGER
            )
          );
          const bScore = Math.min(
            ...b.tokens.map(
              (token) =>
                getTokenSearchRank(token, query)?.score ??
                Number.MAX_SAFE_INTEGER
            )
          );
          if (aScore !== bScore) return aScore - bScore;
        }
        return b.totalFiat - a.totalFiat;
      });
  }, [
    filtered,
    allowUnified,
    isTokenSelectedForVisibility,
    isUnifiedSelectedForVisibility,
    query,
  ]);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };

  const isTokenSelectedInOtherSlot = (token: SwapTokenOption) =>
    !allowSelectedTokenRemoval &&
    activeSelectedTokens.some(
      (st, idx) => idx !== editingAssetIndex && sameTokenOption(st, token)
    );

  const isTokenSelectedInCurrentSlot = (token: SwapTokenOption) => {
    if (isMulti) {
      return activeSelectedTokens.some(
        (st) =>
          sameTokenOption(st, token) ||
          Boolean(
            st.isUnified &&
              st.sourceTokens?.some((source) => sameTokenOption(source, token))
          )
      );
    }
    if (allowSelectedTokenRemoval) {
      return activeSelectedTokens.some(
        (st) =>
          sameTokenOption(st, token) ||
          Boolean(
            st.isUnified &&
              st.sourceTokens?.some((source) => sameTokenOption(source, token))
          )
      );
    }
    if (editingAssetIndex === null) return false;
    const st = activeSelectedTokens[editingAssetIndex];
    return sameTokenOption(st, token);
  };

  const isGroupUnifiedSelectedInOtherSlot = (
    group: (typeof groupedFiltered)[0]
  ) => {
    if (allowSelectedTokenRemoval) return false;
    const relevantTokens = isMulti
      ? activeSelectedTokens
      : activeSelectedTokens.filter((_, idx) => idx !== editingAssetIndex);
    return relevantTokens.some(
      (st) => st.isUnified && st.unifiedSymbol === group.symbol
    );
  };

  const isGroupUnifiedSelectedInCurrentSlot = (
    group: (typeof groupedFiltered)[0]
  ) => {
    if (isMulti) {
      return activeSelectedTokens.some(
        (st) => st.isUnified && st.unifiedSymbol === group.symbol
      );
    }
    if (editingAssetIndex === null) return false;
    const st = activeSelectedTokens[editingAssetIndex];
    return Boolean(st?.isUnified && st.unifiedSymbol === group.symbol);
  };

  const isAnyTokenInGroupSelectedInOtherSlot = (
    group: (typeof groupedFiltered)[0]
  ) => {
    if (allowSelectedTokenRemoval) return false;
    const relevantTokens = isMulti
      ? activeSelectedTokens
      : activeSelectedTokens.filter((_, idx) => idx !== editingAssetIndex);
    return relevantTokens.some(
      (st) =>
        group.tokens.some((gt) => sameTokenOption(gt, st)) ||
        (st.isUnified && st.unifiedSymbol === group.symbol)
    );
  };

  const handleFilterTabClick = (tab: FilterTab) => {
    setActiveTab(tab);
    if (autoSelectFilterTabs && isMulti && tab !== "custom") {
      if (filterTabBehavior === "source-pool") {
        onFilterTabSelect?.(tab);
        return;
      }
      if (!onSelectionChange) return;
      emitSelectionChange(getFilterTabTokens(tab));
    }
  };

  const handleClearSelection = () => {
    if (isMulti && onSelectionChange) {
      setActiveTab("custom");
      emitSelectionChange([]);
      return;
    }
    onClearSelection?.();
  };

  const handleMultiTokenToggle = (token: SwapTokenOption) => {
    if (!autoSelectFilterTabs || !isMulti || !onSelectionChange) {
      onToggle?.(token);
      return;
    }

    setActiveTab("custom");
    const current = mergeTokenOptions(
      activeSelectedTokens,
      lockedSelectedTokens
    );
    const targets =
      token.isUnified && token.sourceTokens?.length
        ? token.sourceTokens
        : [token];
    const unlockedTargets = targets.filter((target) => !isLockedToken(target));
    if (unlockedTargets.length === 0) return;

    const allTargetsSelected = unlockedTargets.every((target) =>
      current.some((item) => sameTokenOption(item, target))
    );
    const next = allTargetsSelected
      ? removeTokenOptions(current, unlockedTargets)
      : mergeTokenOptions(current, unlockedTargets);
    emitSelectionChange(next);
  };

  /* ── Render a single-chain token row ── */
  const renderTokenRow = (
    token: SwapTokenOption,
    indent = false,
    isDisabledByUnified = false
  ) => {
    const selectedInOther = !isMulti && isTokenSelectedInOtherSlot(token);
    if (selectedInOther) return null;

    const selectedInCurrent = isTokenSelectedInCurrentSlot(token);
    const locked = isLockedToken(token);
    const disabled = isDisabledByUnified || locked;
    return (
      <button
        disabled={disabled}
        key={`${token.contractAddress}-${token.chainId}`}
        onClick={() => {
          if (disabled) return;
          if (isMulti) {
            handleMultiTokenToggle(token);
          } else if (
            allowSelectedTokenRemoval &&
            selectedInCurrent &&
            onToggle
          ) {
            onToggle(token);
          } else onSelect(token);
        }}
        style={{
          alignItems: "center",
          backgroundColor: "transparent",
          border: "none",
          borderBottom: `1px solid ${theme.colors.divider}`,
          boxSizing: "border-box",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          gap: "12px",
          justifyContent: "space-between",
          opacity: isDisabledByUnified ? 0.5 : 1,
          padding: "16px",
          paddingLeft: indent ? "44px" : "16px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flex: "1 1 auto",
            gap: "12px",
            minWidth: 0,
          }}
        >
          <SelectionControl
            multi={Boolean(isMulti)}
            selected={selectedInCurrent}
          />
          <div style={{ flexShrink: 0, width: 36, height: 36 }}>
            {token.logo ? (
              <img
                alt={token.symbol}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
                src={token.logo}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "999px",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "999px",
                  backgroundColor: theme.colors.primary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: theme.colors.surface,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {token.symbol.slice(0, 2)}
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "2px",
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontFamily: theme.fonts.sans,
                fontWeight: 500,
                fontSize: 16,
                color: theme.colors.text,
                lineHeight: "24px",
              }}
            >
              {token.symbol}
            </span>
            {token.chainName && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {token.chainLogo && (
                  <img
                    alt=""
                    src={token.chainLogo}
                    style={{
                      borderRadius: "999px",
                      height: 16,
                      objectFit: "cover",
                      width: 16,
                    }}
                  />
                )}
                <span
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: 14,
                    color: theme.colors.muted,
                    lineHeight: "20px",
                  }}
                >
                  {token.chainName}
                </span>
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            flexShrink: 0,
            gap: "2px",
          }}
        >
          <span
            style={{
              fontFamily: theme.fonts.sans,
              fontWeight: 500,
              fontSize: 16,
              color: theme.colors.text,
              lineHeight: "24px",
            }}
          >
            {formatBalanceWithSymbol(token)}
          </span>
          <span
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: 14,
              color: theme.colors.muted,
              lineHeight: "20px",
            }}
          >
            ≈ {token.balanceInFiat}
          </span>
        </div>
      </button>
    );
  };

  /* ── Render a unified (multi-chain) group row ── */
  const renderGroupRow = (group: (typeof groupedFiltered)[0]) => {
    if (!group.isUnifiedCandidate) {
      return group.tokens
        .filter(
          (token) =>
            getTokenFiatValue(token) >= MIN_FIAT_THRESHOLD ||
            isTokenSelectedForVisibility(token) ||
            isPrioritySearchMatch(token, query)
        )
        .map((token) => renderTokenRow(token));
    }

    const unifiedSelectedInOther =
      !isMulti && isGroupUnifiedSelectedInOtherSlot(group);
    if (unifiedSelectedInOther) return null;

    const individualTokens = group.tokens.filter(
      (token) =>
        getTokenFiatValue(token) >= MIN_FIAT_THRESHOLD ||
        isTokenSelectedForVisibility(token) ||
        isPrioritySearchMatch(token, query)
    );
    const hasVisibleUnifiedRow =
      (group.totalFiat >= MIN_FIAT_THRESHOLD ||
        isUnifiedSelectedForVisibility(group.symbol)) &&
      !unifiedSelectedInOther;
    const visibleTokensCount = individualTokens.filter(
      (t) => !isTokenSelectedInOtherSlot(t)
    ).length;
    if (!hasVisibleUnifiedRow && visibleTokensCount === 0) return null;

    const isExpanded = expandedGroups.has(group.symbol);
    const unifiedSelectedInCurrent = isGroupUnifiedSelectedInCurrentSlot(group);
    const anyIndividualSelectedInOther =
      isAnyTokenInGroupSelectedInOtherSlot(group);
    const anyIndividualSelectedInCurrent = group.tokens.some(
      isTokenSelectedInCurrentSlot
    );
    const selectedChildCount = group.tokens.filter(
      isTokenSelectedInCurrentSlot
    ).length;
    const areAllChildrenSelected =
      group.tokens.length > 0 && selectedChildCount === group.tokens.length;
    const isPartiallySelected =
      selectedChildCount > 0 && selectedChildCount < group.tokens.length;
    const shouldHideUnifiedRow =
      !isMulti &&
      (anyIndividualSelectedInOther ||
        anyIndividualSelectedInCurrent ||
        (group.totalFiat < MIN_FIAT_THRESHOLD &&
          !isUnifiedSelectedForVisibility(group.symbol)));
    const shouldHideIndividualRows =
      !isMulti && (unifiedSelectedInOther || unifiedSelectedInCurrent);
    const unifiedToken: SwapTokenOption = {
      ...group.tokens[0],
      balance: group.totalBalStr.split(" ")[0] ?? group.tokens[0].balance,
      balanceInFiat: group.totalFiatStr,
      chainId: undefined,
      chainName: "All Chains",
      chainLogo: "/nexus-one/all-chains.png",
      contractAddress: `${group.symbol}-UNIFIED`,
      isUnified: true,
      name: group.symbol,
      sourceTokens: group.tokens,
      symbol: group.symbol,
      unifiedSymbol: group.symbol as "USDC" | "USDT" | "ETH",
    };

    return (
      <div
        key={group.symbol}
        style={{ display: "flex", flexDirection: "column" }}
      >
        {!shouldHideUnifiedRow && (
          <button
            onClick={(e) => {
              if (isMulti) {
                toggleGroup(group.symbol, e);
                return;
              }
              onSelect(unifiedToken);
            }}
            style={{
              alignItems: "center",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: `1px solid ${theme.colors.divider}`,
              boxSizing: "border-box",
              cursor: "pointer",
              display: "flex",
              gap: "12px",
              justifyContent: "space-between",
              padding: "16px",
              width: "100%",
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                flex: "1 1 auto",
                gap: "12px",
                minWidth: 0,
              }}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMulti) handleMultiTokenToggle(unifiedToken);
                  else onSelect(unifiedToken);
                }}
                style={{ cursor: "pointer" }}
              >
                <SelectionControl
                  indeterminate={isMulti ? isPartiallySelected : false}
                  multi={Boolean(isMulti)}
                  selected={
                    isMulti ? areAllChildrenSelected : unifiedSelectedInCurrent
                  }
                />
              </div>
              <div
                style={{
                  position: "relative",
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                }}
              >
                {group.logo ? (
                  <img
                    alt={group.symbol}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                    src={group.logo}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "999px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "999px",
                      backgroundColor: theme.colors.primary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: theme.colors.surface,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {group.symbol.slice(0, 2)}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "3px",
                  minWidth: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontFamily: theme.fonts.sans,
                      fontWeight: 500,
                      fontSize: 16,
                      color: theme.colors.text,
                      lineHeight: "24px",
                    }}
                  >
                    {group.symbol}
                  </span>
                  <span
                    style={{
                      alignItems: "center",
                      backgroundColor: theme.primitives.badge.backgroundColor,
                      borderRadius: "100px",
                      boxSizing: "border-box",
                      color: theme.colors.primaryText,
                      display: "flex",
                      fontFamily: theme.fonts.sans,
                      fontSize: 9,
                      fontWeight: 600,
                      height: 20,
                      letterSpacing: "0.06em",
                      lineHeight: "12px",
                      paddingBlock: 1,
                      paddingInline: 6,
                      textTransform: "uppercase",
                    }}
                  >
                    UNIFIED
                  </span>
                </div>
                <ChainLogos tokens={group.tokens} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  flexShrink: 0,
                  gap: "2px",
                }}
              >
                <span
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontWeight: 500,
                    fontSize: 16,
                    color: theme.colors.text,
                    lineHeight: "24px",
                  }}
                >
                  {group.totalBalStr}
                </span>
                <span
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: 14,
                    color: theme.colors.muted,
                    lineHeight: "20px",
                  }}
                >
                  ≈ {group.totalFiatStr}
                </span>
              </div>
            </div>
          </button>
        )}
        {isMulti ? (
          <div
            style={{
              display: "grid",
              gridTemplateRows: isExpanded ? "1fr" : "0fr",
              opacity: isExpanded ? 1 : 0,
              transition: "grid-template-rows 0.3s ease, opacity 0.3s ease",
            }}
          >
            <div style={{ overflow: "hidden" }}>
              {group.tokens.map((token) => renderTokenRow(token, true, false))}
            </div>
          </div>
        ) : (
          !shouldHideIndividualRows &&
          individualTokens.map((token) => renderTokenRow(token))
        )}
      </div>
    );
  };

  const isLoading = !staticOptions && swapBalance === null;
  const selectedAssetCount = activeSelectedTokens.length;
  const requiredUsdAmount = parseTokenAmount(requiredUsd);
  const selectedUsdAmount = activeSelectedTokens.reduce((sum, token) => {
    if (token.isUnified && token.sourceTokens?.length) {
      return sum.plus(
        token.sourceTokens.reduce((sourceSum, source) => {
          const value =
            parseTokenAmount(source.balanceInFiat) ?? new Decimal(0);
          return value.gte(MIN_FIAT_THRESHOLD)
            ? sourceSum.plus(value)
            : sourceSum;
        }, new Decimal(0))
      );
    }
    const value = parseTokenAmount(token.balanceInFiat) ?? new Decimal(0);
    return value.gte(MIN_FIAT_THRESHOLD) ? sum.plus(value) : sum;
  }, new Decimal(0));
  const selectionDeficitUsdAmount =
    requiredUsdAmount && selectedUsdAmount.lt(requiredUsdAmount)
      ? requiredUsdAmount.minus(selectedUsdAmount)
      : new Decimal(0);
  const shouldShowSelectionProgress = Boolean(
    isMulti &&
      requiredUsdAmount &&
      requiredUsdAmount.gt(0) &&
      selectionDeficitUsdAmount.gt(0)
  );
  const selectionProgressPercent =
    shouldShowSelectionProgress && requiredUsdAmount
      ? Decimal.min(
          100,
          selectedUsdAmount.div(requiredUsdAmount).mul(100)
        ).toNumber()
      : 0;
  const subtitle = "Select token and chain";

  useEffect(() => {
    setPortalRoot(
      selectorRef.current?.closest(
        "[data-nexus-one-root]"
      ) as HTMLElement | null
    );
  }, []);

  useEffect(() => {
    return () => {
      if (chainCloseTimerRef.current) {
        clearTimeout(chainCloseTimerRef.current);
      }
    };
  }, []);

  const openChainSelector = () => {
    if (chainCloseTimerRef.current) {
      clearTimeout(chainCloseTimerRef.current);
      chainCloseTimerRef.current = null;
    }
    setDraftChainFilter(selectedChainFilter);
    setChainQuery("");
    setIsChainSelectorClosing(false);
    setShowChainSelector(true);
  };

  const closeChainSelector = () => {
    if (chainCloseTimerRef.current) {
      clearTimeout(chainCloseTimerRef.current);
    }
    setIsChainSelectorClosing(true);
    chainCloseTimerRef.current = setTimeout(() => {
      setShowChainSelector(false);
      setIsChainSelectorClosing(false);
      chainCloseTimerRef.current = null;
    }, CHAIN_SELECTOR_CLOSE_MS);
  };

  const chainOptions = useMemo(() => {
    const options = new Map<number, SwapTokenOption>();

    for (const chain of swapSupportedChains ?? []) {
      if (!SWAP_CHAIN_DISPLAY_ORDER_SET.has(chain.id)) continue;
      options.set(chain.id, {
        contractAddress: "",
        symbol: "",
        name: getShortChainName(chain.id, chain.name),
        decimals: 18,
        balance: "0",
        balanceInFiat: "$0.00",
        chainId: chain.id,
        chainName: getShortChainName(chain.id, chain.name),
        chainLogo: chain.logo,
      });
    }

    for (const token of allTokens) {
      if (!token.chainId || !SWAP_CHAIN_DISPLAY_ORDER_SET.has(token.chainId)) {
        continue;
      }
      if (!options.has(token.chainId)) {
        options.set(token.chainId, token);
      }
    }

    return Array.from(options.values()).sort(compareChainsBySwapDisplayOrder);
  }, [allTokens, swapSupportedChains]);

  const selectedChainToken =
    selectedChainFilter === null
      ? undefined
      : chainOptions.find((token) => token.chainId === selectedChainFilter);
  const selectedChainLabel =
    selectedChainFilter === null
      ? "All chains"
      : selectedChainToken?.chainName || "Chain";

  const handleDone = () => {
    if (isMulti && onSelectionChange) {
      onSelectionChange(
        mergeTokenOptions(draftSelectedTokens, lockedSelectedTokens)
      );
    }
    onDone?.();
  };

  return (
    <div
      ref={selectorRef}
      style={{
        ...modalHeightTransitionStyle,
        boxSizing: "border-box",
        display: "flex",
        flex: "0 1 auto",
        flexDirection: "column",
        height: "auto",
        maxHeight: "100%",
        minHeight: 0,
        overflow: "hidden",
        padding: 0,
        transition: modalHeightTransition,
        width: "100%",
        willChange: "height, max-height",
      }}
    >
      {/* Header */}
      <div
        style={{
          alignItems: "center",
          alignSelf: "stretch",
          boxSizing: "border-box",
          display: "flex",
          gap: 12,
          paddingInline: "16px",
          paddingTop: "16px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            alignItems: "center",
            backgroundColor: theme.colors.surface,
            border: "1px solid #0000000A",
            borderRadius: 99,
            boxShadow: theme.shadows.control,
            boxSizing: "border-box",
            cursor: "pointer",
            display: "flex",
            flexShrink: 0,
            height: 32,
            justifyContent: "center",
            width: 32,
          }}
        >
          <ChevronDown
            style={{
              color: theme.colors.icon,
              height: 14,
              transform: "rotate(90deg)",
              width: 14,
            }}
          />
        </button>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            minWidth: 0,
            flex: "1 1 auto",
          }}
        >
          <span
            style={{
              color: theme.colors.text,
              fontFamily: theme.fonts.display,
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: "0.02em",
              lineHeight: "24px",
            }}
          >
            {title}
          </span>
          {subtitle && (
            <span
              style={{
                color: theme.colors.muted,
                fontFamily: theme.fonts.sans,
                fontSize: 14,
                lineHeight: "20px",
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
        {isMulti &&
          selectedAssetCount > 0 &&
          (onClearSelection || onSelectionChange) && (
            <button
              onClick={handleClearSelection}
              style={{
                backgroundColor: "transparent",
                border: "none",
                color: theme.colors.primary,
                cursor: "pointer",
                flexShrink: 0,
                fontFamily: theme.fonts.sans,
                fontSize: 13,
                fontWeight: 500,
                lineHeight: "18px",
                padding: "2px 0",
              }}
            >
              Deselect all
            </button>
          )}
      </div>

      {/* Search */}
      <div style={{ paddingInline: "16px" }}>
        <div
          style={{
            alignItems: "center",
            alignSelf: "stretch",
            backgroundColor: theme.colors.surfaceInset,
            border: "none",
            borderRadius: 14,
            boxShadow: isSearchFocused
              ? `${theme.shadows.inset}, 0 0 0 1px rgba(0,107,244,0.16)`
              : theme.shadows.inset,
            boxSizing: "border-box",
            display: "flex",
            flexShrink: 0,
            gap: 10,
            height: 56,
            paddingLeft: 14,
            paddingRight: 8,
            width: "100%",
          }}
        >
          <Search
            style={{
              width: 18,
              height: 18,
              color: theme.colors.muted,
              flexShrink: 0,
            }}
          />
          <input
            onBlur={() => setIsSearchFocused(false)}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search token, chain or address"
            style={{
              flex: 1,
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              fontFamily: theme.fonts.sans,
              fontSize: 16,
              color: theme.colors.text,
              lineHeight: "24px",
              minWidth: 0,
            }}
            value={query}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <X style={{ width: 16, height: 16, color: theme.colors.muted }} />
            </button>
          )}
          {/* Chain Selector Badge */}
          <button
            onClick={openChainSelector}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              paddingBlock: 6,
              paddingInline: 10,
              borderRadius: 999,
              backgroundColor: theme.colors.surface,
              border: "1px solid #0000000A",
              cursor: "pointer",
              height: 32,
              flexShrink: 0,
              boxShadow: "#3C28640F 0px 1px 2px",
            }}
          >
            {selectedChainFilter === null ? (
              <Globe
                style={{
                  width: 14,
                  height: 14,
                  color: theme.colors.textStrong,
                  flexShrink: 0,
                }}
              />
            ) : (
              <img
                alt={selectedChainLabel}
                src={selectedChainToken?.chainLogo}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "999px",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            )}
            <span
              style={{
                color: theme.colors.text,
                fontFamily: theme.fonts.sans,
                fontSize: "14px",
                fontWeight: 500,
                lineHeight: "20px",
                maxWidth: "96px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {selectedChainLabel}
            </span>
            <ChevronDown
              style={{ width: 12, height: 12, color: theme.colors.muted }}
            />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          alignItems: "center",
          alignSelf: "stretch",
          backgroundColor: theme.colors.segmented,
          borderRadius: 12,
          boxShadow: "#2A388B0F 0px 1px 2px inset",
          boxSizing: "border-box",
          display: "flex",
          marginInline: "16px",
          padding: 4,
        }}
      >
        {visibleFilterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleFilterTabClick(tab.key)}
            style={{
              flex: "1 1 0%",
              height: activeTab === tab.key ? 40 : 32,
              backgroundColor:
                activeTab === tab.key ? theme.colors.surface : "transparent",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: theme.fonts.sans,
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 500,
              color:
                activeTab === tab.key ? theme.colors.text : theme.colors.muted,
              boxShadow:
                activeTab === tab.key ? theme.shadows.segmentedActive : "none",
              lineHeight: "20px",
              transition: "all 0.15s",
            }}
          >
            {autoSelectFilterTabs && tab.key === "all" ? "Any" : tab.label}
          </button>
        ))}
      </div>

      {/* Token list */}
      <div
        ref={listRef}
        style={{
          flex: "1 1 auto",
          minHeight: stableListHeight ? `${stableListHeight}px` : 0,
          overflowY: "auto",
          paddingInline: "16px",
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 0",
              gap: 12,
            }}
          >
            <Loader2
              style={{
                width: 20,
                height: 20,
                color: theme.colors.muted,
                animation: "spin 1s linear infinite",
              }}
            />
            <p
              style={{
                fontFamily: theme.fonts.sans,
                fontSize: 14,
                color: theme.colors.muted,
              }}
            >
              Loading assets…
            </p>
          </div>
        ) : aboveMin.length === 0 && belowMin.length === 0 ? (
          <p
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: 14,
              color: theme.colors.muted,
              textAlign: "center",
              padding: "32px 0",
            }}
          >
            No tokens found
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {groupedFiltered.length > 0 && (
              <div
                style={{
                  border: "none",
                  borderRadius: 12,
                  boxShadow: theme.shadows.card,
                  overflowX: "hidden",
                  overflowY: "visible",
                  backgroundColor: theme.colors.surface,
                }}
              >
                {groupedFiltered.map((group) =>
                  group.tokens.length === 1
                    ? renderTokenRow(group.tokens[0])
                    : renderGroupRow(group)
                )}
              </div>
            )}

            {belowMin.length > 0 && (
              <div
                style={{
                  backgroundColor: theme.colors.surface,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setShowBelowMin((v) => !v)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 12px",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        alignItems: "center",
                        backgroundColor: "#FFF0D6",
                        borderRadius: "999px",
                        display: "flex",
                        flexShrink: 0,
                        height: 22,
                        justifyContent: "center",
                        width: 22,
                      }}
                    >
                      <Info
                        style={{ width: 12, height: 12, color: "#D98A1C" }}
                      />
                    </span>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: theme.fonts.sans,
                          fontWeight: 600,
                          fontSize: 13,
                          color: theme.colors.textStrong,
                          lineHeight: "18px",
                        }}
                      >
                        Tokens below minimum
                      </span>
                      <span
                        style={{
                          fontFamily: theme.fonts.sans,
                          fontSize: 12,
                          color: theme.colors.textSubtle,
                          lineHeight: "16px",
                          textAlign: "left",
                        }}
                      >
                        {showBelowMin
                          ? "Tokens under $1 are unavailable for swaps"
                          : "Hidden to prevent failed swaps"}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    {/* Small token logo cluster */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {belowMin.slice(0, 3).map((t, i) =>
                        t.logo ? (
                          <img
                            alt=""
                            key={`bm-${t.contractAddress}-${t.chainId}`}
                            src={t.logo}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: "999px",
                              objectFit: "cover",
                              marginLeft: i > 0 ? -6 : 0,
                              border: `1.5px solid ${theme.colors.surface}`,
                            }}
                          />
                        ) : (
                          <div
                            key={`bm-${t.contractAddress}-${t.chainId}`}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: "999px",
                              backgroundColor: theme.colors.border,
                              marginLeft: i > 0 ? -6 : 0,
                              border: `1.5px solid ${theme.colors.surface}`,
                            }}
                          />
                        )
                      )}
                      {belowMin.length > 3 && (
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "999px",
                            backgroundColor: theme.colors.textStrong,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 9,
                            fontWeight: 700,
                            color: theme.colors.surface,
                            marginLeft: -6,
                            border: `1.5px solid ${theme.colors.surface}`,
                          }}
                        >
                          +{belowMin.length - 3}
                        </div>
                      )}
                    </div>
                    {showBelowMin ? (
                      <ChevronUp
                        style={{
                          width: 18,
                          height: 18,
                          color: theme.colors.textSubtle,
                        }}
                      />
                    ) : (
                      <ChevronDown
                        style={{
                          width: 18,
                          height: 18,
                          color: theme.colors.textSubtle,
                        }}
                      />
                    )}
                  </div>
                </button>
                <div
                  aria-hidden={!showBelowMin}
                  style={{
                    borderTop: showBelowMin
                      ? "1px solid #F0F0EF"
                      : "0px solid transparent",
                    display: "grid",
                    gridTemplateRows: showBelowMin ? "1fr" : "0fr",
                    opacity: showBelowMin ? 1 : 0,
                    overflow: "hidden",
                    transition:
                      "grid-template-rows 240ms ease, opacity 180ms ease, border-top-width 240ms ease",
                  }}
                >
                  <div style={{ minHeight: 0, overflow: "hidden" }}>
                    {belowMin.map((token, index) => (
                      <div
                        key={`${token.contractAddress}-${token.chainId}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderTop: index === 0 ? "none" : "1px solid #F0F0EF",
                          opacity: 0.58,
                          padding: "8px 12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              position: "relative",
                              width: 22,
                              height: 22,
                              flexShrink: 0,
                            }}
                          >
                            {token.logo ? (
                              <img
                                alt={token.symbol}
                                src={token.logo}
                                style={{
                                  filter: "grayscale(0.2)",
                                  width: 22,
                                  height: 22,
                                  borderRadius: "999px",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: "999px",
                                  backgroundColor: "#C8C8C7",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: theme.colors.surface,
                                  fontSize: 9,
                                  fontWeight: 700,
                                }}
                              >
                                {token.symbol.slice(0, 2)}
                              </div>
                            )}
                            {token.chainLogo && (
                              <img
                                alt=""
                                src={token.chainLogo}
                                style={{
                                  border: `1.5px solid ${theme.colors.surface}`,
                                  borderRadius: "999px",
                                  bottom: -2,
                                  filter: "grayscale(0.2)",
                                  height: 10,
                                  objectFit: "cover",
                                  position: "absolute",
                                  right: -2,
                                  width: 10,
                                }}
                              />
                            )}
                          </div>
                          <span
                            style={{
                              fontFamily: theme.fonts.sans,
                              fontWeight: 500,
                              fontSize: 12,
                              color: theme.colors.textSubtle,
                              lineHeight: "16px",
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {token.symbol} on{" "}
                            {token.chainName || "Unknown chain"}
                          </span>
                        </div>
                        <span
                          style={{
                            fontFamily: theme.fonts.sans,
                            fontSize: 12,
                            color: theme.colors.textSubtle,
                            fontWeight: 500,
                            lineHeight: "16px",
                            flexShrink: 0,
                            marginLeft: 12,
                          }}
                        >
                          {token.balanceInFiat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Done button */}
      {isMulti && (
        <div
          style={{
            marginTop: "auto",
            paddingBottom: "16px",
            paddingInline: "16px",
          }}
        >
          {shouldShowSelectionProgress && requiredUsdAmount && (
            <div
              style={{
                borderTop: `1px solid ${theme.colors.border}`,
                boxSizing: "border-box",
                marginBottom: 12,
                paddingTop: 12,
              }}
            >
              <div
                style={{
                  alignItems: "baseline",
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    color: theme.colors.muted,
                    fontFamily: theme.fonts.sans,
                    fontSize: 13,
                    lineHeight: "18px",
                  }}
                >
                  Required
                </span>
                <span
                  style={{
                    color: theme.colors.muted,
                    fontFamily: theme.fonts.sans,
                    fontSize: 13,
                    lineHeight: "18px",
                  }}
                >
                  <strong style={{ color: theme.colors.text, fontWeight: 600 }}>
                    {formatUsdBalanceLabel(selectionDeficitUsdAmount)}
                  </strong>{" "}
                  more
                </span>
              </div>
              <div
                style={{
                  backgroundColor: theme.colors.segmented,
                  borderRadius: "999px",
                  height: 6,
                  overflow: "hidden",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: "999px",
                    height: "100%",
                    transition: "width 240ms ease",
                    width: `${selectionProgressPercent}%`,
                  }}
                />
              </div>
            </div>
          )}
          {!shouldShowSelectionProgress && (
            <button
              onClick={handleDone}
              style={{
                alignItems: "center",
                backgroundColor: theme.colors.text,
                border: "none",
                borderRadius: 14,
                boxShadow: theme.shadows.primaryButton,
                color: theme.colors.surface,
                cursor: "pointer",
                display: "flex",
                fontFamily: theme.fonts.sans,
                fontSize: 16,
                fontWeight: 500,
                height: 48,
                justifyContent: "center",
                lineHeight: "24px",
                width: "100%",
              }}
            >
              Done
            </button>
          )}
        </div>
      )}

      {/* Chain Selector Modal */}
      {showChainSelector &&
        (() => {
          const chainModal = (
            <div
              style={{
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                left: 0,
                pointerEvents: "none",
                position: "absolute",
                right: 0,
                top: 0,
                zIndex: 50,
              }}
            >
              <div
                onClick={closeChainSelector}
                style={{
                  backgroundColor: "rgba(255,255,255,0.46)",
                  bottom: 0,
                  left: 0,
                  pointerEvents: "auto",
                  position: "absolute",
                  right: 0,
                  top: 0,
                  opacity: isChainSelectorClosing ? 0 : 1,
                  transition: `opacity ${CHAIN_SELECTOR_CLOSE_MS}ms ease`,
                }}
              />
              <div
                className={
                  isChainSelectorClosing
                    ? undefined
                    : "animate-in slide-in-from-bottom-full duration-300"
                }
                data-nexus-one-sheet
                style={{
                  ...modalHeightTransitionStyle,
                  backgroundColor: theme.colors.surface,
                  borderRadius: "20px 20px 0 0",
                  boxShadow: theme.shadows.sheet,
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  height: "90%",
                  maxHeight: "90%",
                  overflow: "hidden",
                  padding: 0,
                  pointerEvents: "auto",
                  position: "relative",
                  transform: isChainSelectorClosing
                    ? "translateY(100%)"
                    : "translateY(0)",
                  transition: `${modalHeightTransition}, transform ${CHAIN_SELECTOR_CLOSE_MS}ms ease, opacity ${CHAIN_SELECTOR_CLOSE_MS}ms ease`,
                  opacity: isChainSelectorClosing ? 0 : 1,
                  willChange: "height, max-height, transform, opacity",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    boxSizing: "border-box",
                    display: "flex",
                    gap: 16,
                    paddingInline: 16,
                    paddingTop: 16,
                  }}
                >
                  <button
                    onClick={closeChainSelector}
                    style={{
                      alignItems: "center",
                      backgroundColor: theme.colors.surface,
                      border: "1px solid #0000000A",
                      borderRadius: 99,
                      boxShadow: theme.shadows.control,
                      boxSizing: "border-box",
                      cursor: "pointer",
                      display: "flex",
                      flexShrink: 0,
                      height: 32,
                      justifyContent: "center",
                      width: 32,
                    }}
                  >
                    <ChevronDown
                      style={{
                        color: theme.colors.icon,
                        width: 14,
                        height: 14,
                        transform: "rotate(90deg)",
                      }}
                    />
                  </button>
                  <span
                    style={{
                      color: theme.colors.text,
                      fontFamily: theme.fonts.display,
                      fontSize: 18,
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                      lineHeight: "24px",
                    }}
                  >
                    Select chain
                  </span>
                </div>

                {/* Search */}
                <div style={{ paddingInline: 16, paddingTop: 16 }}>
                  <div
                    style={{
                      alignItems: "center",
                      backgroundColor: theme.colors.surfaceInset,
                      border: "none",
                      borderRadius: 14,
                      boxShadow: isChainSearchFocused
                        ? `${theme.shadows.inset}, 0 0 0 1px rgba(0,107,244,0.16)`
                        : theme.shadows.inset,
                      boxSizing: "border-box",
                      display: "flex",
                      gap: 10,
                      height: 48,
                      paddingInline: 14,
                    }}
                  >
                    <Search
                      style={{
                        width: 18,
                        height: 18,
                        color: theme.colors.muted,
                        flexShrink: 0,
                      }}
                    />
                    <input
                      onBlur={() => setIsChainSearchFocused(false)}
                      onChange={(e) => setChainQuery(e.target.value)}
                      onFocus={() => setIsChainSearchFocused(true)}
                      placeholder="Search chains"
                      style={{
                        flex: 1,
                        backgroundColor: "transparent",
                        border: "none",
                        outline: "none",
                        fontFamily: theme.fonts.sans,
                        fontSize: 16,
                        color: theme.colors.text,
                        lineHeight: "24px",
                      }}
                      value={chainQuery}
                    />
                  </div>
                </div>

                {/* Chain list */}
                <div
                  style={{
                    flex: "1 1 auto",
                    minHeight: 0,
                    overflowY: "auto",
                    paddingInline: 16,
                    paddingTop: 14,
                  }}
                >
                  <div
                    style={{
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: 12,
                      overflow: "hidden",
                      backgroundColor: theme.colors.surface,
                      boxShadow: "#3C286426 0px 0px 2px, #3C28640A 0px 1px 4px",
                    }}
                  >
                    <button
                      onClick={() => setDraftChainFilter(null)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        paddingBlock: 12,
                        paddingInline: 16,
                        backgroundColor: "transparent",
                        border: "none",
                        borderBottom: `1px solid ${theme.colors.divider}`,
                        cursor: "pointer",
                        boxSizing: "border-box",
                      }}
                    >
                      <RadioDot selected={draftChainFilter === null} />
                      <Globe
                        style={{
                          width: 36,
                          height: 36,
                          color: theme.colors.text,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          color: theme.colors.text,
                          flex: "1 1 auto",
                          fontFamily: theme.fonts.sans,
                          fontSize: 16,
                          lineHeight: "24px",
                          minWidth: 0,
                          textAlign: "left",
                        }}
                      >
                        All Chains
                      </span>
                    </button>

                    {/* Unique chains */}
                    {chainOptions
                      .filter((t) =>
                        (t.chainName || "")
                          .toLowerCase()
                          .includes(chainQuery.toLowerCase())
                      )
                      .map((t) => (
                        <button
                          key={`chain-${t.chainId}`}
                          onClick={() => setDraftChainFilter(t.chainId!)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            paddingBlock: 12,
                            paddingInline: 16,
                            backgroundColor: "transparent",
                            border: "none",
                            borderBottom: `1px solid ${theme.colors.divider}`,
                            cursor: "pointer",
                            boxSizing: "border-box",
                          }}
                        >
                          <RadioDot selected={draftChainFilter === t.chainId} />
                          <img
                            alt={t.chainName}
                            src={t.chainLogo}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "999px",
                              objectFit: "cover",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              color: theme.colors.text,
                              flex: "1 1 auto",
                              fontFamily: theme.fonts.sans,
                              fontSize: 16,
                              lineHeight: "24px",
                              minWidth: 0,
                              textAlign: "left",
                            }}
                          >
                            {t.chainName}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedChainFilter(draftChainFilter);
                    closeChainSelector();
                  }}
                  style={{
                    alignItems: "center",
                    backgroundColor: theme.colors.text,
                    border: "none",
                    borderRadius: 14,
                    boxShadow: theme.shadows.primaryButton,
                    color: theme.colors.surface,
                    cursor: "pointer",
                    display: "flex",
                    flexShrink: 0,
                    fontFamily: theme.fonts.sans,
                    fontSize: 16,
                    fontWeight: 500,
                    height: 48,
                    justifyContent: "center",
                    lineHeight: "24px",
                    margin: "16px",
                    width: "calc(100% - 32px)",
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          );
          return portalRoot ? createPortal(chainModal, portalRoot) : chainModal;
        })()}
    </div>
  );
}
