// biome-ignore-all lint: NexusOne registry component from shadcn registry.

"use client";
import type { SupportedChainsAndTokensResult } from "@avail-project/nexus-core";
import { formatTokenBalance } from "@avail-project/nexus-core/utils";
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
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  CHAIN_METADATA,
  getSdkSwapSupportedChainIds,
  getShortChainName,
  isSwapSupportedBySdkChainList,
} from "../../common/utils/constant";
import type { UserAsset } from "../../nexus/nexus-provider";

const tabularNums: React.CSSProperties = {
  fontFeatureSettings: '"tnum"',
  fontVariantNumeric: "tabular-nums",
};

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
  priceUSD?: number | string;
  selectedPct?: number | null;
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
  excludedTokens?: SwapTokenOption[];
  filterTabBehavior?: FilterTabBehavior;
  hideCustomTab?: boolean;
  initialFilterTab?: FilterTab;
  isLoadingBalances?: boolean;
  isMulti?: boolean;
  lockedTokens?: SwapTokenOption[];
  onBack: () => void;
  onClearSelection?: () => void;
  onDone?: (tokens?: SwapTokenOption[]) => void;
  onFilterTabSelect?: (tab: Exclude<FilterTab, "custom">) => void;
  onRestoreAuto?: () => void;
  onSelect: (token: SwapTokenOption) => void;
  onSelectionChange?: (tokens: SwapTokenOption[]) => void;
  onToggle?: (token: SwapTokenOption) => void;
  preserveSelectedBelowMinimum?: boolean;
  requiredUsd?: string;
  restoreAutoTokens?: SwapTokenOption[];
  selectedTokens?: SwapTokenOption[];
  showBelowMinimumInline?: boolean;
  showRestoreAuto?: boolean;
  staticOptions?: SwapTokenOption[];
  swapBalance: UserAsset[] | null;
  swapSupportedChains?: SupportedChainsAndTokensResult | null;
  title: string;
}

export function deriveTokenOptions(
  swapBalance: UserAsset[],
  swapSupportedChains?: SupportedChainsAndTokensResult | null
): SwapTokenOption[] {
  const tokens: SwapTokenOption[] = [];
  for (const asset of swapBalance) {
    for (const bd of asset.breakdown ?? []) {
      if (!isSwapSupportedBySdkChainList(bd.chain?.id, swapSupportedChains)) {
        continue;
      }
      if (Number.parseFloat(bd.balance ?? "0") <= 0) continue;
      const chainMeta = bd.chain?.id ? CHAIN_METADATA[bd.chain.id] : undefined;
      tokens.push({
        contractAddress: bd.contractAddress,
        symbol: bd.symbol ?? asset.symbol,
        name: bd.symbol ?? asset.symbol,
        logo: asset.logo ?? "",
        decimals: bd.decimals ?? asset.decimals ?? 18,
        balance: bd.balance,
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
      backgroundColor: "#FFFFFE",
      border: selected ? "5px solid #006BF4" : "1.5px solid #E8E8E7",
      borderRadius: "23px",
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      width: 18,
      height: 18,
    }}
  />
);

export const SelectionControl = ({
  selected,
  indeterminate = false,
}: {
  selected: boolean;
  indeterminate?: boolean;
  multi?: boolean;
}) => {
  const isActive = selected || indeterminate;

  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: isActive ? "#006BF4" : "#FFFFFE",
        border: isActive ? "none" : "1.5px solid #E8E8E7",
        borderRadius: "23px",
        boxSizing: "border-box",
        display: "flex",
        flexShrink: 0,
        height: 18,
        justifyContent: "center",
        width: 18,
      }}
    >
      {selected && (
        <Check
          style={{ color: "#FFFFFE", height: 11, strokeWidth: 3, width: 11 }}
        />
      )}
      {!selected && indeterminate && (
        <Minus
          style={{ color: "#FFFFFE", height: 11, strokeWidth: 3, width: 11 }}
        />
      )}
    </div>
  );
};

function TokenLogo({
  backgroundColor = "#006BF4",
  color = "#fff",
  fontSize = 14,
  size = 40,
  src,
  style,
  symbol,
}: {
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  size?: number;
  src?: string;
  style?: React.CSSProperties;
  symbol: string;
}) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  const fallbackLabel = symbol.trim().slice(0, 2).toUpperCase() || "?";
  const baseStyle: React.CSSProperties = {
    borderRadius: "999px",
    flexShrink: 0,
    height: size,
    width: size,
    ...style,
  };

  if (!failed && src) {
    return (
      <img
        alt={symbol}
        onError={() => setFailed(true)}
        src={src}
        style={{
          ...baseStyle,
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <div
      aria-label={symbol}
      role="img"
      style={{
        ...baseStyle,
        alignItems: "center",
        backgroundColor,
        color,
        display: "flex",
        fontSize,
        fontWeight: 700,
        justifyContent: "center",
      }}
    >
      {fallbackLabel}
    </div>
  );
}

/* ── Chain logo cluster ── */
const ChainLogos = ({
  tokens,
  isDesktop = true,
}: {
  tokens: SwapTokenOption[];
  isDesktop?: boolean;
}) => {
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
      balanceValue: number;
      fiatValue: number;
    }[] = [];
    for (const t of tokens) {
      if (t.chainId && !seen.has(t.chainId)) {
        const balanceValue = Number(
          String(t.balance ?? "").replace(/[^0-9.]/g, "") || 0
        );
        seen.add(t.chainId);
        out.push({
          id: t.chainId,
          logo: t.chainLogo,
          name: getShortChainName(t.chainId, t.chainName),
          balance: t.balance,
          balanceInFiat: t.balanceInFiat,
          balanceValue:
            Number.isNaN(balanceValue) || !Number.isFinite(balanceValue)
              ? 0
              : balanceValue,
          fiatValue: getTokenFiatValue(t),
        });
      }
    }
    return out.sort((a, b) => {
      if (a.fiatValue !== b.fiatValue) return b.fiatValue - a.fiatValue;
      if (a.balanceValue !== b.balanceValue) {
        return b.balanceValue - a.balanceValue;
      }
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
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
              backgroundColor: "#FFFFFE",
              border: "1px solid #E8E8E7",
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(22,22,21,0.12)",
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
                color: "#848483",
                display: "flex",
                fontFamily: '"Geist", system-ui, sans-serif',
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
                style={{ color: "#161615", fontSize: 12, letterSpacing: 0 }}
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
                        backgroundColor: "#E8E8E7",
                        borderRadius: "999px",
                        height: 16,
                        width: 16,
                      }}
                    />
                  )}
                  <span
                    style={{
                      color: "#363635",
                      fontFamily: '"Geist", system-ui, sans-serif',
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
                    color: "#161615",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {chain.balance
                    ? formatTokenAmountDisplay(
                        String(chain.balance).replace(/\s+[^\s]+$/, "")
                      )
                    : chain.balanceInFiat || "0"}
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
        gap: 2,
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
              width: isDesktop ? 16 : 13,
              height: isDesktop ? 16 : 13,
              borderRadius: "999px",
              objectFit: "cover",
              border: "1px solid #fff",
            }}
          />
        ) : (
          <div
            key={c.id}
            style={{
              width: isDesktop ? 16 : 13,
              height: isDesktop ? 16 : 13,
              borderRadius: "999px",
              backgroundColor: "#E8E8E7",
            }}
          />
        )
      )}
      <span
        style={{
          fontFamily: '"Geist", system-ui, sans-serif',
          fontSize: isDesktop ? 12 : 11,
          color: "#848483",
          marginLeft: 2,
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
const normalizeTokenGroupSymbol = (symbol: string) =>
  symbol
    .trim()
    .toUpperCase()
    .replaceAll("₮", "T")
    .replaceAll(/[^A-Z0-9]/g, "");
const STABLE_SYMBOL_KEYS = new Set(
  Array.from(STABLE_SYMBOLS, normalizeTokenGroupSymbol)
);

const isStableToken = (token: SwapTokenOption) =>
  STABLE_SYMBOL_KEYS.has(normalizeTokenGroupSymbol(token.symbol));

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
  534352, // Scroll
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

const getTokenFiatValue = (token: Pick<SwapTokenOption, "balanceInFiat">) => {
  const parsed = Number(
    String(token.balanceInFiat ?? "").replace(/[^0-9.]/g, "") || 0
  );
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
};

const formatBalanceWithSymbol = (
  token: Pick<SwapTokenOption, "balance" | "symbol">
) => {
  const symbol = token.symbol?.trim() || "";
  const balanceStr = String(token.balance ?? "").trim();
  let cleanBalance = balanceStr;
  if (symbol) {
    cleanBalance = balanceStr.replace(
      new RegExp(`\\s*${escapeRegExp(symbol)}$`, "i"),
      ""
    );
  }
  const formatted = formatTokenAmountDisplay(cleanBalance);
  return symbol ? `${formatted} ${symbol}` : formatted;
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

const compareTokensByUsdBalance = (a: SwapTokenOption, b: SwapTokenOption) => {
  const fiatDelta = getTokenFiatValue(b) - getTokenFiatValue(a);
  if (fiatDelta !== 0) return fiatDelta;

  const aBalance = parseTokenAmount(a.balance) ?? new Decimal(0);
  const bBalance = parseTokenAmount(b.balance) ?? new Decimal(0);
  const balanceDelta = bBalance.cmp(aBalance);
  if (balanceDelta !== 0) return balanceDelta;

  const chainDelta = compareChainsBySwapDisplayOrder(a, b);
  if (chainDelta !== 0) return chainDelta;

  return `${a.symbol} ${a.chainName}`.localeCompare(
    `${b.symbol} ${b.chainName}`
  );
};

const sortTokensByUsdBalance = (tokens: SwapTokenOption[]) =>
  [...tokens].sort(compareTokensByUsdBalance);

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

  const minDisplay = new Decimal("0.0001");
  if (amount.gt(0) && amount.lt(minDisplay)) {
    return `<${minDisplay.toFixed()}`;
  }

  return amount.toDecimalPlaces(4, Decimal.ROUND_DOWN).toFixed();
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

  const symbol = normalizeTokenGroupSymbol(token.symbol);
  if (symbol.includes("USDC") || symbol === "USDM") return "USDC" as const;
  if (symbol.includes("USDT")) return "USDT" as const;
  if (symbol === "ETH") return "ETH" as const;
  return null;
}

export function isSameTokenChainPair(a?: SwapTokenOption, b?: SwapTokenOption) {
  if (!a || !b) return false;
  if (a.isUnified || b.isUnified) return false;
  return (
    sameContractAddress(a.contractAddress, b.contractAddress) &&
    a.chainId === b.chainId
  );
}

function sameTokenOption(a?: SwapTokenOption, b?: SwapTokenOption) {
  if (!a || !b) return false;
  if (a.isUnified || b.isUnified) {
    return Boolean(
      a.isUnified && b.isUnified && a.unifiedSymbol === b.unifiedSymbol
    );
  }
  return isSameTokenChainPair(a, b);
}

function getTokenOptionSelectionKey(token: SwapTokenOption) {
  if (token.isUnified) return `unified:${token.unifiedSymbol ?? token.symbol}`;
  const address = isNativeLikeAddress(token.contractAddress)
    ? "native"
    : token.contractAddress.toLowerCase();
  return `${token.chainId ?? "unknown"}:${address}`;
}

function getTokenOptionsSelectionKey(tokens: SwapTokenOption[]) {
  return tokens.map(getTokenOptionSelectionKey).sort().join("|");
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
  excludedTokens = [],
  onToggle,
  onClearSelection,
  onDone,
  allowUnified = false,
  preserveSelectedBelowMinimum = false,
  showBelowMinimumInline = false,
  allowSelectedTokenRemoval = false,
  hideCustomTab = false,
  autoSelectFilterTabs = false,
  initialFilterTab = "all",
  filterTabBehavior = "select-all",
  onFilterTabSelect,
  onRestoreAuto,
  lockedTokens = [],
  onSelectionChange,
  requiredUsd,
  restoreAutoTokens,
  showRestoreAuto = false,
  isLoadingBalances = false,
  needsWalletConnection = false,
}: SwapAssetSelectorProps) {
  const isBalanceLoading =
    !needsWalletConnection &&
    (isLoadingBalances || swapBalance === null || swapBalance === undefined);
  const sdkSwapSupportedChainIds = useMemo(
    () => getSdkSwapSupportedChainIds(swapSupportedChains),
    [swapSupportedChains]
  );
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const chainCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const normalizedInitialFilterTab =
    hideCustomTab && initialFilterTab === "custom" ? "all" : initialFilterTab;
  const [activeTab, setActiveTab] = useState<FilterTab>(
    normalizedInitialFilterTab
  );
  const [showBelowMin, setShowBelowMin] = useState(false);
  const [showChainSelector, setShowChainSelector] = useState(false);
  const [isChainSelectorClosing, setIsChainSelectorClosing] = useState(false);
  const [chainQuery, setChainQuery] = useState("");
  const [selectedChainFilter, setSelectedChainFilter] = useState<number | null>(
    null
  );
  const [isChainSearchFocused, setIsChainSearchFocused] = useState(false);
  const lockedSelectedTokens = useMemo(
    () => dedupeTokenOptions(lockedTokens),
    [lockedTokens]
  );
  const excludedTokenOptions = useMemo(
    () => dedupeTokenOptions(excludedTokens),
    [excludedTokens]
  );
  const isExcludedToken = useCallback(
    (token: SwapTokenOption) =>
      excludedTokenOptions.some((excluded) => sameTokenOption(excluded, token)),
    [excludedTokenOptions]
  );
  const isLockedToken = useCallback(
    (token: SwapTokenOption) =>
      lockedSelectedTokens.some((locked) => sameTokenOption(locked, token)),
    [lockedSelectedTokens]
  );
  const [draftSelectedTokens, setDraftSelectedTokens] = useState<
    SwapTokenOption[]
  >(() => mergeTokenOptions(selectedTokens, lockedSelectedTokens));
  const selectedTokensSelectionKey =
    getTokenOptionsSelectionKey(selectedTokens);
  const lockedTokensSelectionKey =
    getTokenOptionsSelectionKey(lockedSelectedTokens);
  const selectedTokensRef = useRef(selectedTokens);
  const lockedSelectedTokensRef = useRef(lockedSelectedTokens);
  selectedTokensRef.current = selectedTokens;
  lockedSelectedTokensRef.current = lockedSelectedTokens;
  useEffect(() => {
    setDraftSelectedTokens(
      mergeTokenOptions(
        selectedTokensRef.current,
        lockedSelectedTokensRef.current
      )
    );
  }, [lockedTokensSelectionKey, selectedTokensSelectionKey]);
  const activeSelectedTokens = draftSelectedTokens;
  const emitSelectionChange = useCallback(
    (tokens: SwapTokenOption[]) => {
      const next = mergeTokenOptions(tokens, lockedSelectedTokens);
      if (isMulti) {
        setDraftSelectedTokens(next);
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
    setActiveTab((current) =>
      current === normalizedInitialFilterTab
        ? current
        : normalizedInitialFilterTab
    );
  }, [normalizedInitialFilterTab]);

  const allTokens = useMemo<SwapTokenOption[]>(() => {
    const isSwapSupportedToken = (token: SwapTokenOption) =>
      isSwapSupportedBySdkChainList(token.chainId, swapSupportedChains);

    const baseTokens = (
      staticOptions
        ? staticOptions.filter(isSwapSupportedToken)
        : swapBalance
          ? deriveTokenOptions(swapBalance, swapSupportedChains)
          : []
    ).filter((token) => !isExcludedToken(token));

    if (!preserveSelectedBelowMinimum && lockedSelectedTokens.length === 0) {
      return sortTokensByUsdBalance(baseTokens);
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
      if (isExcludedToken(selectedToken)) continue;
      const alreadyPresent = merged.some((token) =>
        sameTokenOption(token, selectedToken)
      );
      if (!alreadyPresent) {
        merged.push(selectedToken);
      }
    }

    return sortTokensByUsdBalance(merged.filter(isSwapSupportedToken));
  }, [
    lockedSelectedTokens,
    preserveSelectedBelowMinimum,
    activeSelectedTokens,
    isExcludedToken,
    swapBalance,
    swapSupportedChains,
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

      if (showBelowMinimumInline) {
        return mergeTokenOptions(result, lockedSelectedTokens);
      }

      return mergeTokenOptions(
        result.filter(
          (token) => getTokenFiatValue(token) >= MIN_FIAT_THRESHOLD
        ),
        lockedSelectedTokens
      );
    },
    [
      allTokens,
      lockedSelectedTokens,
      selectedChainFilter,
      showBelowMinimumInline,
    ]
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
      activeTab === "custom" ||
      (activeTab === "all" && Boolean(onFilterTabSelect))
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
    onFilterTabSelect,
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
      if (
        lockedSelectedTokens.some((locked) => sameTokenOption(locked, token))
      ) {
        return true;
      }
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
    [activeSelectedTokens, lockedSelectedTokens, preserveSelectedBelowMinimum]
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
        showBelowMinimumInline ||
        fiat >= MIN_FIAT_THRESHOLD ||
        isTokenSelectedForVisibility(t) ||
        isPrioritySearchMatch(t, query)
      )
        above.push(t);
      else below.push(t);
    }
    return { aboveMin: above, belowMin: below };
  }, [filtered, isTokenSelectedForVisibility, query, showBelowMinimumInline]);

  /* Group by symbol */
  const groupedFiltered = useMemo(() => {
    const groups: Record<string, SwapTokenOption[]> = {};
    for (const token of filtered) {
      const unifiedSym = allowUnified ? getUnifiedSymbol(token) : null;
      if (
        !showBelowMinimumInline &&
        unifiedSym &&
        getTokenFiatValue(token) < MIN_FIAT_THRESHOLD &&
        !isTokenSelectedForVisibility(token)
      ) {
        continue;
      }
      const key = unifiedSym ?? `${token.contractAddress}-${token.chainId}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(token);
    }
    return Object.values(groups)
      .map((group) => {
        const sortedGroup = sortTokensByUsdBalance(group);
        let totalFiatVal = 0;
        let totalBalVal = 0;
        for (const t of sortedGroup) {
          const fiatVal = getTokenFiatValue(t);
          totalFiatVal += isNaN(fiatVal) || !isFinite(fiatVal) ? 0 : fiatVal;
          const balStr = String(t.balance ?? "").replace(/[^0-9.]/g, "");
          const balVal = Number(balStr || 0);
          totalBalVal += isNaN(balVal) || !isFinite(balVal) ? 0 : balVal;
        }
        const unifiedSym = allowUnified
          ? getUnifiedSymbol(sortedGroup[0])
          : null;
        const symbol = unifiedSym ?? sortedGroup[0].symbol;
        const isStable = ["USDC", "USDT", "DAI", "USDM", "CTUSD"].includes(
          symbol.toUpperCase()
        );
        const maxDigits = isStable ? 2 : 6;
        const formattedBal = totalBalVal.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: maxDigits,
        });

        return {
          symbol,
          logo: sortedGroup[0].logo,
          totalFiat: totalFiatVal,
          totalFiatStr: `$${totalFiatVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
          totalBalStr: `${formattedBal} ${symbol}`,
          totalBalRaw: totalBalVal,
          tokens: sortedGroup,
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
        if (showBelowMinimumInline) {
          return true;
        }
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
    showBelowMinimumInline,
  ]);

  const INITIAL_BATCH_SIZE = 40;
  const BATCH_INCREMENT = 40;
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);

  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [query, activeTab, selectedChainFilter]);

  // Progressive background batch rendering without blocking the UI
  useEffect(() => {
    if (visibleCount >= groupedFiltered.length) return;

    let timerId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const scheduleNextBatch = () => {
      setVisibleCount((prev) =>
        Math.min(groupedFiltered.length, prev + BATCH_INCREMENT)
      );
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = (
        window as unknown as {
          requestIdleCallback: (
            cb: () => void,
            opts?: { timeout: number }
          ) => number;
        }
      ).requestIdleCallback(scheduleNextBatch, { timeout: 150 });
    } else {
      timerId = setTimeout(scheduleNextBatch, 50);
    }

    return () => {
      if (
        idleId !== null &&
        typeof window !== "undefined" &&
        "cancelIdleCallback" in window
      ) {
        (
          window as unknown as { cancelIdleCallback: (id: number) => void }
        ).cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, [visibleCount, groupedFiltered.length]);

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
      if (tab === "all" && onFilterTabSelect) {
        onFilterTabSelect(tab);
        return;
      }
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
    if (onToggle) {
      onToggle(token);
      return;
    }

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
    const handleTokenSelection = () => {
      if (disabled) return;
      if (isMulti) {
        handleMultiTokenToggle(token);
      } else if (allowSelectedTokenRemoval && selectedInCurrent && onToggle) {
        onToggle(token);
      } else {
        setDraftSelectedTokens([token]);
      }
    };

    if (indent) {
      return (
        <button
          disabled={disabled}
          key={`${token.contractAddress}-${token.chainId}`}
          onClick={handleTokenSelection}
          style={{
            alignItems: "center",
            backgroundColor: "transparent",
            border: "none",
            boxSizing: "border-box",
            cursor: disabled ? "not-allowed" : "pointer",
            display: "flex",
            justifyContent: "space-between",
            minHeight: "42px",
            opacity: isDisabledByUnified ? 0.5 : 1,
            padding: "8px 0",
            width: "100%",
          }}
        >
          <span
            style={{
              alignItems: "center",
              display: "flex",
              gap: "12px",
              minWidth: 0,
            }}
          >
            <SelectionControl
              multi={Boolean(isMulti)}
              selected={selectedInCurrent}
            />
            <TokenLogo
              backgroundColor="#F0F0EF"
              color="#5B5B5A"
              fontSize={8}
              size={18}
              src={token.chainLogo}
              symbol={token.chainName || token.symbol}
            />
            <span
              style={{
                color: "#1F1F1F",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "14px",
                fontWeight: 500,
                lineHeight: "20px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {token.chainName || "Unknown chain"}
            </span>
          </span>
          {!needsWalletConnection && (
            <span
              style={{
                color: "#1F1F1F",
                flexShrink: 0,
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "14px",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 500,
                lineHeight: "20px",
              }}
            >
              {formatTokenAmountDisplay(token.balance)}
            </span>
          )}
        </button>
      );
    }

    return (
      <button
        className="nexus-asset-row"
        disabled={disabled}
        key={`${token.contractAddress}-${token.chainId}`}
        onClick={handleTokenSelection}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isDesktop ? "10px 14px" : "8px 10px",
          paddingLeft: isDesktop ? "14px" : "10px",
          backgroundColor: "transparent",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          borderBottom: "1px solid #F0F0EF",
          boxSizing: "border-box",
          opacity: isDisabledByUnified ? 0.5 : 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isDesktop ? 12 : 8,
          }}
        >
          <SelectionControl
            multi={Boolean(isMulti)}
            selected={selectedInCurrent}
          />
          <div
            style={{
              flexShrink: 0,
              height: isDesktop ? 40 : 30,
              width: isDesktop ? 40 : 30,
            }}
          >
            <TokenLogo
              size={isDesktop ? 40 : 30}
              src={token.logo}
              symbol={token.symbol}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <span
              style={{
                fontFamily: '"Geist", system-ui, sans-serif',
                fontWeight: 500,
                fontSize: isDesktop ? 15 : 13,
                color: "#161615",
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
                      height: isDesktop ? 14 : 12,
                      objectFit: "cover",
                      width: isDesktop ? 14 : 12,
                    }}
                  />
                )}
                <span
                  style={{
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: isDesktop ? 13 : 11,
                    color: "#848483",
                  }}
                >
                  {token.chainName}
                </span>
              </div>
            )}
          </div>
        </div>
        {needsWalletConnection ? null : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            {isBalanceLoading ? (
              <div
                style={{
                  alignItems: "flex-end",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  className="nexus-balance-skeleton"
                  style={{
                    animation:
                      "nexusSwapSkeletonShimmer 1.2s ease-in-out infinite",
                    backgroundColor: "#E8E8E7",
                    borderRadius: 4,
                    height: 14,
                    width: 55,
                  }}
                />
                <div
                  className="nexus-balance-skeleton"
                  style={{
                    animation:
                      "nexusSwapSkeletonShimmer 1.2s ease-in-out infinite",
                    backgroundColor: "#F0F0EF",
                    borderRadius: 4,
                    height: 12,
                    width: 35,
                  }}
                />
              </div>
            ) : (
              <>
                <span
                  style={{
                    color: "#161615",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: isDesktop ? 14 : 12,
                    fontWeight: 500,
                  }}
                >
                  {formatBalanceWithSymbol(token)}
                </span>
                <span
                  style={{
                    color: "#848483",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: isDesktop ? 13 : 11,
                  }}
                >
                  ≈ {token.balanceInFiat}
                </span>
              </>
            )}
          </div>
        )}
      </button>
    );
  };

  const getVisibleIndividualTokens = (group: (typeof groupedFiltered)[0]) =>
    group.tokens.filter(
      (token) =>
        showBelowMinimumInline ||
        getTokenFiatValue(token) >= MIN_FIAT_THRESHOLD ||
        isTokenSelectedForVisibility(token) ||
        isPrioritySearchMatch(token, query)
    );

  const getUnifiedGroupDisplayState = (group: (typeof groupedFiltered)[0]) => {
    const unifiedSelectedInOther =
      !isMulti && isGroupUnifiedSelectedInOtherSlot(group);
    const individualTokens = getVisibleIndividualTokens(group);
    const hasVisibleUnifiedRow =
      (showBelowMinimumInline ||
        group.totalFiat >= MIN_FIAT_THRESHOLD ||
        isUnifiedSelectedForVisibility(group.symbol)) &&
      !unifiedSelectedInOther;
    const visibleTokensCount = individualTokens.filter(
      (t) => !isTokenSelectedInOtherSlot(t)
    ).length;
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
    const isAnyIndividualSelectedInGroup = group.tokens.some((t) =>
      activeSelectedTokens.some((st) => !st.isUnified && sameTokenOption(st, t))
    );
    const isUnifiedSelectedInGroup = activeSelectedTokens.some(
      (st) => st.isUnified && st.unifiedSymbol === group.symbol
    );
    const shouldHideUnifiedRow =
      !isMulti &&
      (isAnyIndividualSelectedInGroup ||
        anyIndividualSelectedInOther ||
        anyIndividualSelectedInCurrent ||
        (!showBelowMinimumInline &&
          group.totalFiat < MIN_FIAT_THRESHOLD &&
          !isUnifiedSelectedForVisibility(group.symbol)));
    const shouldHideIndividualRows =
      isUnifiedSelectedInGroup ||
      (!isMulti && (unifiedSelectedInOther || unifiedSelectedInCurrent));
    const unifiedToken: SwapTokenOption = {
      ...group.tokens[0],
      balance: String(group.totalBalRaw),
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

    return {
      areAllChildrenSelected,
      hasVisibleRows:
        !unifiedSelectedInOther &&
        (hasVisibleUnifiedRow || visibleTokensCount > 0),
      individualTokens,
      isExpanded,
      isPartiallySelected,
      isUnifiedSelectedInGroup,
      shouldHideIndividualRows,
      shouldHideUnifiedRow,
      unifiedSelectedInCurrent,
      unifiedToken,
      visibleTokensCount,
    };
  };

  /* ── Render a unified (multi-chain) group row ── */
  const renderGroupRow = (group: (typeof groupedFiltered)[0]) => {
    if (!group.isUnifiedCandidate) {
      return getVisibleIndividualTokens(group).map((token) =>
        renderTokenRow(token)
      );
    }

    const groupState = getUnifiedGroupDisplayState(group);
    if (!groupState.hasVisibleRows) return null;

    const isGroupSelected = isMulti
      ? groupState.areAllChildrenSelected
      : groupState.unifiedSelectedInCurrent;
    const isGroupIndeterminate = isMulti
      ? groupState.isPartiallySelected
      : !groupState.unifiedSelectedInCurrent &&
        group.tokens.some(isTokenSelectedInCurrentSlot);

    return (
      <div
        key={group.symbol}
        style={{ display: "flex", flexDirection: "column" }}
      >
        <button
          className="nexus-asset-row"
          onClick={(e) => {
            toggleGroup(group.symbol, e);
          }}
          style={{
            alignItems: "center",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: groupState.isExpanded ? "none" : "1px solid #F0F0EF",
            boxSizing: "border-box",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 14px",
            width: "100%",
          }}
          type="button"
        >
          <div style={{ alignItems: "center", display: "flex", gap: 12 }}>
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (isMulti) {
                  handleMultiTokenToggle(groupState.unifiedToken);
                } else if (groupState.unifiedToken) {
                  setDraftSelectedTokens([groupState.unifiedToken]);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <SelectionControl
                indeterminate={isGroupIndeterminate}
                selected={isGroupSelected}
              />
            </div>
            <div
              style={{
                flexShrink: 0,
                height: isDesktop ? 40 : 30,
                position: "relative",
                width: isDesktop ? 40 : 30,
              }}
            >
              <TokenLogo
                size={isDesktop ? 40 : 30}
                src={group.logo}
                symbol={group.symbol}
              />
            </div>
            <div
              style={{
                alignItems: "flex-start",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: isDesktop ? 8 : 6,
                }}
              >
                <span
                  style={{
                    color: "#161615",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: isDesktop ? 15 : 13,
                    fontWeight: 500,
                  }}
                >
                  {group.symbol}
                </span>
                <span
                  style={{
                    backgroundColor: "#E8F0FF",
                    borderRadius: 4,
                    color: "#006BF4",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: isDesktop ? 11 : 9.5,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    lineHeight: isDesktop ? "18px" : "14px",
                    padding: isDesktop ? "2px 8px" : "1px 5px",
                  }}
                >
                  UNIFIED
                </span>
              </div>
              <ChainLogos isDesktop={isDesktop} tokens={group.tokens} />
            </div>
          </div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: isDesktop ? 8 : 6,
            }}
          >
            {!needsWalletConnection && (
              <div
                style={{
                  alignItems: "flex-end",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span
                  style={{
                    color: "#161615",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: isDesktop ? 14 : 12,
                    fontWeight: 500,
                  }}
                >
                  {group.totalBalStr}
                </span>
                <span
                  style={{
                    color: "#848483",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: isDesktop ? 13 : 11,
                  }}
                >
                  ≈ {group.totalFiatStr}
                </span>
              </div>
            )}
            <div
              onClick={(e) => {
                toggleGroup(group.symbol, e);
              }}
              style={{
                alignItems: "center",
                cursor: "pointer",
                display: "flex",
                padding: "4px",
              }}
            >
              <ChevronDown
                aria-hidden="true"
                style={{
                  color: "#848483",
                  height: 15,
                  transform: groupState.isExpanded
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 180ms ease",
                  width: 15,
                }}
              />
            </div>
          </div>
        </button>

        {/* Collapsible Children */}
        <div
          style={{
            borderBottom: groupState.isExpanded ? "1px solid #F0F0EF" : "none",
            display: "grid",
            gridTemplateRows: groupState.isExpanded ? "1fr" : "0fr",
            opacity: groupState.isExpanded ? 1 : 0,
            transition: "grid-template-rows 0.3s ease, opacity 0.3s ease",
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              overflow: "hidden",
              padding: groupState.isExpanded
                ? "4px 16px 10px 46px"
                : "0 16px 0 46px",
              transition: "padding 0.3s ease",
            }}
          >
            {group.tokens.map((token) => renderTokenRow(token, true, false))}
          </div>
        </div>
      </div>
    );
  };

  type VisibleAssetRow =
    | {
        group: (typeof groupedFiltered)[0];
        key: string;
        kind: "group";
        sortFiat: number;
        sortLabel: string;
      }
    | {
        key: string;
        kind: "token";
        sortFiat: number;
        sortLabel: string;
        token: SwapTokenOption;
      };

  const visibleAssetRows = isMulti
    ? []
    : groupedFiltered
        .flatMap<VisibleAssetRow>((group) => {
          if (!group.isUnifiedCandidate) {
            return getVisibleIndividualTokens(group).map((token) => ({
              key: `token-${token.contractAddress}-${token.chainId}`,
              kind: "token",
              sortFiat: getTokenFiatValue(token),
              sortLabel: `${token.symbol} ${token.chainName ?? ""}`,
              token,
            }));
          }

          const groupState = getUnifiedGroupDisplayState(group);
          if (!groupState.hasVisibleRows) return [];

          const rows: VisibleAssetRow[] = [];
          if (!groupState.shouldHideUnifiedRow) {
            rows.push({
              group,
              key: `unified-${group.symbol}`,
              kind: "group",
              sortFiat: group.totalFiat,
              sortLabel: `${group.symbol} Unified`,
            });
          }
          if (!groupState.shouldHideIndividualRows) {
            for (const token of groupState.individualTokens) {
              rows.push({
                key: `token-${token.contractAddress}-${token.chainId}`,
                kind: "token",
                sortFiat: getTokenFiatValue(token),
                sortLabel: `${token.symbol} ${token.chainName ?? ""}`,
                token,
              });
            }
          }
          return rows;
        })
        .sort((a, b) => {
          if (query.trim()) {
            const getRowSearchScore = (row: VisibleAssetRow) => {
              if (row.kind === "token") {
                return (
                  getTokenSearchRank(row.token, query)?.score ??
                  Number.MAX_SAFE_INTEGER
                );
              }
              return Math.min(
                ...row.group.tokens.map(
                  (token) =>
                    getTokenSearchRank(token, query)?.score ??
                    Number.MAX_SAFE_INTEGER
                )
              );
            };
            const scoreDelta = getRowSearchScore(a) - getRowSearchScore(b);
            if (scoreDelta !== 0) return scoreDelta;
          }
          if (a.sortFiat !== b.sortFiat) return b.sortFiat - a.sortFiat;
          return a.sortLabel.localeCompare(b.sortLabel);
        });

  const isLoading = !staticOptions && swapBalance === null;
  const selectedAssetCount = activeSelectedTokens.length;
  const requiredUsdAmount = parseTokenAmount(requiredUsd);
  const shouldCountSelectedUsd = (token: SwapTokenOption, value: Decimal) =>
    value.gt(0) &&
    (lockedSelectedTokens.some((locked) => sameTokenOption(locked, token)) ||
      value.gte(MIN_FIAT_THRESHOLD));
  const selectedUsdAmount = activeSelectedTokens.reduce((sum, token) => {
    if (token.isUnified && token.sourceTokens?.length) {
      return sum.plus(
        token.sourceTokens.reduce((sourceSum, source) => {
          const value =
            parseTokenAmount(source.balanceInFiat) ?? new Decimal(0);
          return shouldCountSelectedUsd(source, value)
            ? sourceSum.plus(value)
            : sourceSum;
        }, new Decimal(0))
      );
    }
    const value = parseTokenAmount(token.balanceInFiat) ?? new Decimal(0);
    return shouldCountSelectedUsd(token, value) ? sum.plus(value) : sum;
  }, new Decimal(0));
  const selectionDeficitUsdAmount =
    requiredUsdAmount && selectedUsdAmount.lt(requiredUsdAmount)
      ? requiredUsdAmount.minus(selectedUsdAmount)
      : new Decimal(0);
  const hasSelectionShortfall = Boolean(
    requiredUsdAmount &&
      requiredUsdAmount.gt(0) &&
      selectionDeficitUsdAmount.gt(0)
  );
  const shouldShowSelectionProgress = Boolean(isMulti && hasSelectionShortfall);
  const selectionProgressPercent =
    shouldShowSelectionProgress && requiredUsdAmount
      ? Decimal.min(
          100,
          selectedUsdAmount.div(requiredUsdAmount).mul(100)
        ).toNumber()
      : 0;
  const subtitle = isMulti ? "Select token and chain" : "";

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
      if (
        !sdkSwapSupportedChainIds &&
        !SWAP_CHAIN_DISPLAY_ORDER_SET.has(chain.id)
      ) {
        continue;
      }
      if (!isSwapSupportedBySdkChainList(chain.id, swapSupportedChains)) {
        continue;
      }
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
      if (
        !token.chainId ||
        (!sdkSwapSupportedChainIds &&
          !SWAP_CHAIN_DISPLAY_ORDER_SET.has(token.chainId)) ||
        !isSwapSupportedBySdkChainList(token.chainId, swapSupportedChains)
      ) {
        continue;
      }
      if (!options.has(token.chainId)) {
        options.set(token.chainId, token);
      }
    }

    return Array.from(options.values()).sort(compareChainsBySwapDisplayOrder);
  }, [allTokens, sdkSwapSupportedChainIds, swapSupportedChains]);

  const selectedChainToken =
    selectedChainFilter === null
      ? undefined
      : chainOptions.find((token) => token.chainId === selectedChainFilter);
  const selectedChainLabel =
    selectedChainFilter === null
      ? "All chains"
      : selectedChainToken?.chainName || "Chain";

  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const filteredChainOptions = useMemo(() => {
    if (!chainQuery.trim()) return chainOptions;
    const q = chainQuery.toLowerCase().trim();
    return chainOptions.filter((c) =>
      (c.chainName || "").toLowerCase().includes(q)
    );
  }, [chainOptions, chainQuery]);

  const defaultTitle = isMulti ? "Select Send Tokens" : "Select tokens";
  const defaultSubtitle = isMulti
    ? "You can select multiple assets at once to swap from"
    : undefined;
  const displayTitle = title || defaultTitle;
  const displaySubtitle = subtitle || defaultSubtitle;

  const handleDone = () => {
    if (hasSelectionShortfall) return;
    if (isMulti) {
      onDone?.(mergeTokenOptions(draftSelectedTokens, lockedSelectedTokens));
    } else {
      if (draftSelectedTokens.length > 0 && draftSelectedTokens[0]) {
        onSelect(draftSelectedTokens[0]);
      }
      onDone?.();
    }
  };

  const handleRestoreAuto = () => {
    if (isMulti && restoreAutoTokens) {
      setActiveTab("all");
      setDraftSelectedTokens(
        mergeTokenOptions(restoreAutoTokens, lockedSelectedTokens)
      );
      onRestoreAuto?.();
      return;
    }
    onRestoreAuto?.();
  };

  return (
    <div
      ref={selectorRef}
      style={{
        boxSizing: "border-box",
        display: "flex",
        flex: "1 1 auto",
        flexDirection: "column",
        height: "100%",
        maxHeight: "90vh",
        minHeight: 0,
        overflow: "hidden",
        width: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          alignItems: "center",
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "space-between",
          padding: "20px 24px 16px 24px",
          width: "100%",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            minWidth: 0,
          }}
        >
          <span
            style={{
              color: "#1F1F1F",
              fontFamily: '"Delight", "Geist", system-ui, sans-serif',
              fontSize: "20px",
              fontStyle: "normal",
              fontWeight: 500,
              lineHeight: "24px",
            }}
          >
            {displayTitle}
          </span>
          {displaySubtitle && (
            <span
              style={{
                color: "#8E8E89",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "13px",
                fontStyle: "normal",
                fontWeight: 400,
                lineHeight: "18px",
              }}
            >
              {displaySubtitle}
            </span>
          )}
        </div>
        <button
          aria-label="Close"
          onClick={onBack}
          style={{
            alignItems: "center",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexShrink: 0,
            height: "32px",
            justifyContent: "center",
            padding: 0,
            width: "32px",
          }}
          type="button"
        >
          <X style={{ color: "#1F1F1F", height: 20, width: 20 }} />
        </button>
      </div>

      {/* Main Body (Chains panel + Tokens panel) */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "hidden",
          width: "100%",
        }}
      >
        {/* Left Column: Chains Panel (desktop) */}
        {isDesktop && (
          <div
            style={{
              alignItems: "flex-start",
              borderRight: "1px solid #F5F5F5",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              maxWidth: "100%",
              overflowY: "auto",
              padding: "0 16px 16px 16px",
              width: "280px",
              flexShrink: 0,
            }}
          >
            {/* Search Chains */}
            <div
              style={{
                alignItems: "center",
                alignSelf: "stretch",
                background: "#FBFBFB",
                border: "1px solid #F5F5F5",
                borderRadius: "12px",
                boxSizing: "border-box",
                color: "#9E9E9C",
                display: "flex",
                flexShrink: 0,
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "13px",
                fontStyle: "normal",
                fontWeight: 400,
                gap: "8px",
                height: "40px",
                maxHeight: "40px",
                minHeight: "40px",
                padding: "0 12px",
                width: "100%",
              }}
            >
              <Search
                style={{
                  color: "#9E9E9C",
                  flexShrink: 0,
                  height: 16,
                  width: 16,
                }}
              />
              <input
                onChange={(e) => setChainQuery(e.target.value)}
                placeholder="Search Chains"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#1F1F1F",
                  flex: 1,
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "13px",
                  minWidth: 0,
                  outline: "none",
                }}
                value={chainQuery}
              />
              {chainQuery && (
                <button
                  onClick={() => setChainQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  type="button"
                >
                  <X style={{ color: "#9E9E9C", height: 14, width: 14 }} />
                </button>
              )}
            </div>

            {/* "All" Chain Option */}
            <button
              onClick={() => setSelectedChainFilter(null)}
              style={{
                alignItems: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                gap: "10px",
                padding: "6px 0",
                textAlign: "left",
                width: "100%",
              }}
              type="button"
            >
              <RadioDot selected={selectedChainFilter === null} />
              <div
                style={{
                  alignItems: "center",
                  backgroundColor: "#161615",
                  borderRadius: "999px",
                  display: "flex",
                  flexShrink: 0,
                  height: 24,
                  justifyContent: "center",
                  width: 24,
                }}
              >
                <Globe style={{ color: "#FFF", height: 14, width: 14 }} />
              </div>
              <span
                style={{
                  color: "#1F1F1F",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "14px",
                  fontWeight: selectedChainFilter === null ? 600 : 500,
                }}
              >
                All
              </span>
            </button>

            {/* Section Header */}
            <div
              style={{
                color: "#8E8E89",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "12px",
                fontWeight: 500,
                marginTop: "4px",
              }}
            >
              Popular Chains
            </div>

            {/* Chains List */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                width: "100%",
              }}
            >
              {filteredChainOptions.map((chain) => {
                const isSelected = selectedChainFilter === chain.chainId;
                return (
                  <button
                    key={chain.chainId}
                    onClick={() =>
                      setSelectedChainFilter(
                        isSelected ? null : (chain.chainId ?? null)
                      )
                    }
                    style={{
                      alignItems: "center",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      gap: "10px",
                      padding: "6px 0",
                      textAlign: "left",
                      width: "100%",
                    }}
                    type="button"
                  >
                    <RadioDot selected={isSelected} />
                    {chain.chainLogo ? (
                      <img
                        alt={chain.chainName}
                        src={chain.chainLogo}
                        style={{
                          borderRadius: "999px",
                          flexShrink: 0,
                          height: 24,
                          objectFit: "cover",
                          width: 24,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          backgroundColor: "#E5E5EB",
                          borderRadius: "999px",
                          flexShrink: 0,
                          height: 24,
                          width: 24,
                        }}
                      />
                    )}
                    <span
                      style={{
                        color: "#1F1F1F",
                        fontFamily: '"Geist", system-ui, sans-serif',
                        fontSize: "14px",
                        fontWeight: isSelected ? 600 : 500,
                      }}
                    >
                      {chain.chainName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Right Column: Tokens Panel */}
        <div
          style={{
            alignItems: "stretch",
            boxSizing: "border-box",
            display: "flex",
            flex: "1 1 auto",
            flexDirection: "column",
            gap: "18px",
            minWidth: 0,
            overflowY: "auto",
            padding: "0 24px 16px 24px",
            width: isDesktop ? "calc(100% - 280px)" : "100%",
          }}
        >
          {/* Search bar */}
          <div
            style={{
              alignItems: "center",
              alignSelf: "stretch",
              background: "#FBFBFB",
              border: "1px solid #F5F5F5",
              borderRadius: "12px",
              boxSizing: "border-box",
              color: "#9E9E9C",
              display: "flex",
              flexShrink: 0,
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "13px",
              fontStyle: "normal",
              fontWeight: 400,
              gap: "8px",
              height: "40px",
              maxHeight: "40px",
              minHeight: "40px",
              padding: "0 12px",
              width: "100%",
            }}
          >
            <Search
              style={{ color: "#9E9E9C", flexShrink: 0, height: 16, width: 16 }}
            />
            <input
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Tokens"
              style={{
                background: "transparent",
                border: "none",
                color: "#1F1F1F",
                flex: 1,
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "13px",
                minWidth: 0,
                outline: "none",
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
                type="button"
              >
                <X style={{ color: "#9E9E9C", height: 14, width: 14 }} />
              </button>
            )}
            {/* Mobile / Narrow Screen Chain Filter Trigger */}
            {!isDesktop && (
              <button
                onClick={openChainSelector}
                style={{
                  alignItems: "center",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E8E8E7",
                  borderRadius: 999,
                  cursor: "pointer",
                  display: "flex",
                  flexShrink: 0,
                  gap: 6,
                  height: 28,
                  padding: "4px 8px",
                }}
                type="button"
              >
                {selectedChainFilter === null ? (
                  <Globe
                    style={{
                      color: "#161615",
                      flexShrink: 0,
                      height: 14,
                      width: 14,
                    }}
                  />
                ) : (
                  <img
                    alt={selectedChainLabel}
                    src={selectedChainToken?.chainLogo}
                    style={{
                      borderRadius: "999px",
                      flexShrink: 0,
                      height: 16,
                      objectFit: "cover",
                      width: 16,
                    }}
                  />
                )}
                <span
                  style={{
                    color: "#161615",
                    fontSize: "12px",
                    fontWeight: 500,
                    maxWidth: "70px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedChainLabel}
                </span>
                <ChevronDown
                  style={{ color: "#848483", height: 10, width: 10 }}
                />
              </button>
            )}
          </div>

          {/* Filter tabs with sliding indicator */}
          {(() => {
            const activeIndex = Math.max(
              0,
              visibleFilterTabs.findIndex((t) => t.key === activeTab)
            );
            const tabCount = visibleFilterTabs.length || 1;

            return (
              <div
                style={{
                  alignItems: "center",
                  alignSelf: "stretch",
                  background: "#FBFBFB",
                  border: "1px solid #F5F5F5",
                  borderRadius: "12px",
                  boxSizing: "border-box",
                  display: "flex",
                  flexShrink: 0,
                  gap: "4px",
                  height: "40px",
                  maxHeight: "40px",
                  minHeight: "40px",
                  padding: "4px",
                  position: "relative",
                  width: "100%",
                }}
              >
                {/* Sliding active background pill */}
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    bottom: 4,
                    boxShadow:
                      "0 2px 6px 0 rgba(60, 40, 100, 0.06), 0 1px 2px 0 rgba(60, 40, 100, 0.08), 0 1px 0 0 rgba(255, 255, 255, 0.90) inset",
                    left: 4,
                    pointerEvents: "none",
                    position: "absolute",
                    top: 4,
                    transform: `translateX(calc(${activeIndex} * (100% + 4px)))`,
                    transition:
                      "transform 240ms cubic-bezier(0.2, 0, 0, 1), width 240ms ease",
                    width: `calc((100% - 8px - ${(tabCount - 1) * 4}px) / ${tabCount})`,
                    zIndex: 1,
                  }}
                />

                {visibleFilterTabs.map((tab) => {
                  const isSelected = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => handleFilterTabClick(tab.key)}
                      style={{
                        alignItems: "center",
                        backgroundColor: "transparent",
                        border: "none",
                        borderRadius: "8px",
                        color: isSelected ? "#1F1F1F" : "#8E8E89",
                        cursor: "pointer",
                        display: "flex",
                        flex: 1,
                        fontFamily: '"Geist", system-ui, sans-serif',
                        fontSize: "14px",
                        fontStyle: "normal",
                        fontWeight: isSelected ? 600 : 500,
                        height: "32px",
                        justifyContent: "center",
                        lineHeight: "20px",
                        padding: "6px 0",
                        position: "relative",
                        transition: "color 180ms ease, font-weight 180ms ease",
                        zIndex: 2,
                      }}
                      type="button"
                    >
                      {autoSelectFilterTabs && tab.key === "all"
                        ? "All"
                        : tab.label}
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* Token list */}
          <div
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
              if (scrollHeight - scrollTop - clientHeight < 300) {
                setVisibleCount((prev) =>
                  Math.min(groupedFiltered.length, prev + BATCH_INCREMENT)
                );
              }
            }}
            ref={listRef}
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
              paddingBottom: 6,
              width: "100%",
            }}
          >
            {isLoading ? (
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  justifyContent: "center",
                  padding: "40px 0",
                }}
              >
                <Loader2
                  style={{
                    animation: "spin 1s linear infinite",
                    color: "#848483",
                    height: 20,
                    width: 20,
                  }}
                />
                <p
                  style={{
                    color: "#848483",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: 14,
                  }}
                >
                  Loading assets…
                </p>
              </div>
            ) : aboveMin.length === 0 && belowMin.length === 0 ? (
              <p
                style={{
                  color: "#848483",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: 14,
                  padding: "32px 0",
                  textAlign: "center",
                }}
              >
                No tokens found
              </p>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {(isMulti
                  ? groupedFiltered.length > 0
                  : visibleAssetRows.length > 0) && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      width: "100%",
                    }}
                  >
                    {groupedFiltered
                      .slice(0, visibleCount)
                      .map((group) =>
                        group.tokens.length === 1
                          ? renderTokenRow(group.tokens[0])
                          : renderGroupRow(group)
                      )}
                  </div>
                )}

                {belowMin.length > 0 && (
                  <div
                    style={{
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      width: "100%",
                    }}
                  >
                    <button
                      onClick={() => setShowBelowMin((v) => !v)}
                      style={{
                        alignItems: "center",
                        backgroundColor: "transparent",
                        border: "none",
                        boxSizing: "border-box",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        width: "100%",
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
                        <span
                          style={{
                            alignItems: "center",
                            backgroundColor: "#FFF1E0",
                            borderRadius: "999px",
                            display: "flex",
                            flexShrink: 0,
                            height: 30,
                            justifyContent: "center",
                            width: 30,
                          }}
                        >
                          <Info
                            style={{ color: "#B87709", height: 12, width: 12 }}
                          />
                        </span>
                        <span
                          style={{
                            color: "#1F1F1F",
                            fontFamily: '"Geist", system-ui, sans-serif',
                            fontSize: 14,
                            fontWeight: 500,
                            lineHeight: "16px",
                            minWidth: 0,
                          }}
                        >
                          Tokens below minimum
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center" }}>
                          {belowMin.slice(0, 3).map((t, i) => (
                            <TokenLogo
                              backgroundColor="#E8E8E7"
                              color="#848483"
                              fontSize={6}
                              key={`bm-${t.contractAddress}-${t.chainId}`}
                              size={16}
                              src={t.logo}
                              style={{
                                border: "1.5px solid #fff",
                                marginLeft: i > 0 ? -4 : 0,
                              }}
                              symbol={t.symbol}
                            />
                          ))}
                          {belowMin.length > 3 && (
                            <div
                              style={{
                                alignItems: "center",
                                backgroundColor: "#161615",
                                border: "1.5px solid #fff",
                                borderRadius: "999px",
                                color: "#8E8E89",
                                display: "flex",
                                fontSize: 7,
                                fontWeight: 600,
                                height: 16,
                                justifyContent: "center",
                                marginLeft: -4,
                                width: 16,
                              }}
                            >
                              +{belowMin.length - 3}
                            </div>
                          )}
                        </div>
                        {showBelowMin ? (
                          <ChevronUp
                            style={{ color: "#848483", height: 12, width: 12 }}
                          />
                        ) : (
                          <ChevronDown
                            style={{ color: "#848483", height: 12, width: 12 }}
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
                              alignItems: "center",
                              borderTop:
                                index === 0 ? "none" : "1px solid #F0F0EF",
                              display: "flex",
                              justifyContent: "space-between",
                              opacity: 0.58,
                              padding: "8px 12px",
                            }}
                          >
                            <div
                              style={{
                                alignItems: "center",
                                display: "flex",
                                gap: 9,
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  flexShrink: 0,
                                  height: 22,
                                  position: "relative",
                                  width: 22,
                                }}
                              >
                                <TokenLogo
                                  backgroundColor="#C8C8C7"
                                  fontSize={9}
                                  size={22}
                                  src={token.logo}
                                  style={{ filter: "grayscale(0.2)" }}
                                  symbol={token.symbol}
                                />
                                {token.chainLogo && (
                                  <img
                                    alt=""
                                    src={token.chainLogo}
                                    style={{
                                      border: "1.5px solid #FFFFFE",
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
                                  color: "#848483",
                                  fontFamily: '"Geist", system-ui, sans-serif',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  lineHeight: "18px",
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
                                color: "#848483",
                                flexShrink: 0,
                                fontFamily: '"Geist", system-ui, sans-serif',
                                fontSize: 12,
                                fontWeight: 500,
                                lineHeight: "18px",
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
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          alignItems: "center",
          backgroundColor: "#FFF",
          borderTop: "1px solid #F5F5F5",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          gap: "12px",
          justifyContent: "center",
          padding: isDesktop ? "16px 24px" : "12px 16px",
          width: "100%",
        }}
      >
        {/* Left: Progress loader & Restore Auto on ExactOut / Shortfall */}
        {shouldShowSelectionProgress &&
          requiredUsdAmount &&
          requiredUsdAmount > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                width: "100%",
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    color: "#1F1F1F",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  Selected
                  <span style={{ color: "#8E8E89", fontWeight: 400 }}>
                    /Required
                  </span>
                </span>
                <span
                  style={{
                    color: "#1F1F1F",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  {formatUsdBalanceLabel(selectedUsdAmount)}{" "}
                  <span style={{ color: "#8E8E89", fontWeight: 400 }}>
                    / {formatUsdBalanceLabel(requiredUsdAmount)}
                  </span>
                </span>
              </div>
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    color: "#8E8E89",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: "12px",
                    fontWeight: 400,
                  }}
                >
                  Manually-selected · covers{" "}
                  {formatUsdBalanceLabel(selectedUsdAmount)}
                </span>
                {showRestoreAuto && onRestoreAuto && (
                  <button
                    onClick={handleRestoreAuto}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#006BF4",
                      cursor: "pointer",
                      fontFamily: '"Geist", system-ui, sans-serif',
                      fontSize: "13px",
                      fontWeight: 500,
                      padding: 0,
                      textDecoration: "none",
                    }}
                    type="button"
                  >
                    Restore Auto
                  </button>
                )}
              </div>
              <div
                style={{
                  backgroundColor: "#E5E7EB",
                  borderRadius: "999px",
                  height: "4px",
                  overflow: "hidden",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#006BF4",
                    borderRadius: "999px",
                    height: "100%",
                    transition: "width 0.2s ease",
                    width: `${Math.min(100, Math.max(0, (selectedUsdAmount / requiredUsdAmount) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

        {/* Done button */}
        <button
          disabled={hasSelectionShortfall}
          onClick={handleDone}
          style={{
            alignItems: "center",
            alignSelf: "flex-end",
            backgroundColor: hasSelectionShortfall ? "#CBCBCB" : "#1F1F1F",
            border: "none",
            borderRadius: "999px",
            boxSizing: "border-box",
            color: hasSelectionShortfall ? "#8E8E89" : "#FFFFFE",
            cursor: hasSelectionShortfall ? "not-allowed" : "pointer",
            display: "flex",
            flexShrink: 0,
            fontFamily: '"Geist", system-ui, sans-serif',
            fontSize: "15px",
            fontWeight: 500,
            height: "44px",
            justifyContent: "center",
            lineHeight: "20px",
            minWidth: "130px",
            opacity: hasSelectionShortfall ? 0.6 : 1,
            padding: "10px 28px",
            textAlign: "center",
            transition: "all 0.15s ease",
            userSelect: "none",
            WebkitUserSelect: "none",
            width: "auto",
          }}
          type="button"
        >
          Done
        </button>
      </div>

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
                  backgroundColor: "rgba(0,0,0,0.22)",
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
                  backgroundColor: "#FFFFFE",
                  borderRadius: "24px 24px 0 0",
                  boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  height: "90%",
                  maxHeight: "90%",
                  overflow: "hidden",
                  padding: "12px",
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
                    display: "flex",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <button
                    onClick={closeChainSelector}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      border: "1px solid #E8E8E7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#FFFFFE",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <ChevronDown
                      style={{
                        width: 15,
                        height: 15,
                        transform: "rotate(90deg)",
                      }}
                    />
                  </button>
                  <span
                    style={{
                      color: "#161615",
                      fontFamily: '"Geist", system-ui, sans-serif',
                      fontSize: 17,
                      fontWeight: 600,
                    }}
                  >
                    Select chain
                  </span>
                </div>

                {/* Search */}
                <div style={{ paddingBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      height: 38,
                      gap: 8,
                      borderRadius: 11,
                      border: `1px solid ${isChainSearchFocused ? "#A8C9FF" : "#E8E8E7"}`,
                      padding: "0 12px",
                      backgroundColor: "#FFFFFE",
                      boxShadow: isChainSearchFocused
                        ? "0 0 0 1px rgba(0,107,244,0.16)"
                        : "none",
                    }}
                  >
                    <Search
                      style={{
                        width: 18,
                        height: 18,
                        color: "#848483",
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
                        fontFamily: '"Geist", system-ui, sans-serif',
                        fontSize: 13,
                        color: "#161615",
                      }}
                      value={chainQuery}
                    />
                  </div>
                </div>

                {/* Chain list */}
                <div
                  style={{
                    flex: "1 1 auto",
                    marginBottom: 10,
                    minHeight: 0,
                    overflowY: "auto",
                  }}
                >
                  <div
                    style={{
                      border: "1px solid #E8E8E7",
                      borderRadius: 12,
                      overflow: "hidden",
                      backgroundColor: "#FFFFFE",
                    }}
                  >
                    <button
                      onClick={() => {
                        setSelectedChainFilter(null);
                        closeChainSelector();
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        padding: "8px 14px",
                        backgroundColor: "transparent",
                        border: "none",
                        borderBottom: "1px solid #F0F0EF",
                        cursor: "pointer",
                        boxSizing: "border-box",
                      }}
                    >
                      <RadioDot selected={selectedChainFilter === null} />
                      <Globe
                        style={{
                          marginLeft: 10,
                          width: 28,
                          height: 28,
                          color: "#161615",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: '"Geist", system-ui, sans-serif',
                          fontSize: 14,
                          fontWeight: 500,
                          marginLeft: 10,
                          color: "#161615",
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
                          onClick={() => {
                            setSelectedChainFilter(t.chainId!);
                            closeChainSelector();
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            padding: "8px 14px",
                            backgroundColor: "transparent",
                            border: "none",
                            borderBottom: "1px solid #F0F0EF",
                            cursor: "pointer",
                            boxSizing: "border-box",
                          }}
                        >
                          <RadioDot
                            selected={selectedChainFilter === t.chainId}
                          />
                          <img
                            alt={t.chainName}
                            src={t.chainLogo}
                            style={{
                              marginLeft: 10,
                              width: 28,
                              height: 28,
                              borderRadius: "999px",
                              objectFit: "cover",
                            }}
                          />
                          <span
                            style={{
                              fontFamily: '"Geist", system-ui, sans-serif',
                              fontSize: 14,
                              fontWeight: 500,
                              marginLeft: 10,
                              color: "#161615",
                            }}
                          >
                            {t.chainName}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          );
          return portalRoot ? createPortal(chainModal, portalRoot) : chainModal;
        })()}
    </div>
  );
}
