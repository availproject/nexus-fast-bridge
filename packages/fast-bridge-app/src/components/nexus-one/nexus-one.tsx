// biome-ignore-all lint: NexusOne registry component from shadcn registry.
"use client";

import { ERROR_CODES, type EthereumProvider } from "@avail-project/nexus-core";
import Decimal from "decimal.js";
import { AlertCircle, ArrowLeft, ChevronDown, Loader2 } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";
import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  http,
  isAddress,
  parseUnits,
  zeroAddress,
} from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import {
  useAccount,
  useConnect,
  useConnectorClient,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { reportConnectWalletConversion } from "@/lib/google-tag";
import { readSwapParam, writeSwapParam } from "@/lib/url-params";
import { useRuntime } from "@/providers/runtime-context";
import { ErrorBoundary } from "../common/components/error-boundary";
import { useTransactionSteps } from "../common/tx/use-transaction-steps";
import type {
  BridgeStepType,
  SwapStepType,
} from "../common/types/transaction-flow";
import {
  CHAIN_METADATA,
  getShortChainName,
  isSwapSupportedBySdkChainList,
  SUPPORTED_CHAINS,
  TOKEN_CONTRACT_ADDRESSES,
  TOKEN_METADATA,
} from "../common/utils/constant";
import {
  adaptIntentEvent,
  adaptIntentHook,
} from "../nexus/better-intent-compat";
import { type UserAsset, useNexus } from "../nexus/nexus-provider";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { AddressIdenticon } from "./components/address-identicon";
import { DepositIdleForm } from "./components/deposit-idle-form";
import { EstimatedFeesDisclosure } from "./components/estimated-fees-disclosure";
import { ExactOutSwapIdleForm } from "./components/exact-out-swap-idle-form";
import {
  type NexusOneProgressEvent,
  NexusOneProgressScreen,
} from "./components/nexus-one-progress-screen";
import {
  getAllReceiveTokenOptions,
  getCachedReceiveTokenMatch,
  preloadReceiveTokens,
  ReceiveAssetSelector,
} from "./components/receive-asset-selector";
import { RecipientInput } from "./components/recipient-input";
import { SendIdleForm } from "./components/send-idle-form";
import { StatusAlert } from "./components/status-alerts";
import {
  deriveTokenOptions,
  isSameTokenChainPair,
  SwapAssetSelector,
  type SwapTokenOption,
} from "./components/swap-asset-selector";
import { SwapIdleForm } from "./components/swap-idle-form";
import {
  type BridgeProvider,
  type SwapIntentData,
  type SwapIntentDestination,
  SwapIntentPreview,
  type SwapIntentSource,
} from "./components/swap-intent-preview";

import { nexusOneTheme } from "./theme";
import {
  type NexusOneDepositConfig,
  type NexusOneDepositMetadata,
  type NexusOneMode,
  type NexusOneProps,
  type SwapType,
} from "./types";
import { findCitreaReceiveToken } from "./utils/citrea-tokens";
import {
  type DepositSourceFilter,
  getDepositSourceId,
  resolveDepositSourceSelection,
} from "./utils/deposit-source-selection";
import {
  resolveTokenVisuals,
  type TokenVisualSources,
} from "./utils/token-visuals";

// ---------------------------------------------------------------------------
// Types for swap step machine
// ---------------------------------------------------------------------------

type SwapStep =
  | "idle" // main screen
  | "choose-swap-asset" // pick source token
  | "choose-receive-asset" // pick receive token
  | "enter-recipient" // pick recipient (send mode)
  | "preview-intent" // intent preview card
  | "progress" // transaction in flight
  | "success" // completed seamlessly
  | "failed" // failed swap receipt
  | "history"; // transaction history

type SourceFilterTab = "all" | "native" | "stables";

type SwapHistoryStatus =
  | "pending"
  | "fulfilled"
  | "failed"
  | "timeout"
  | "refund-initiated";

interface SwapHistoryEntry {
  autoRefundAvailable?: boolean;
  createdAt: number;
  durationSeconds?: number;
  endedAt?: number;
  error?: string;
  failedStepType?: string;
  failureDescription?: string;
  failureMessage?: string;
  feeUsd?: string;
  finalExplorerUrl?: string | null;
  fromTokens: SwapTokenOption[];
  id: string;
  intentData: SwapIntentData | null;
  intentExplorerUrl?: string | null;
  intentId?: number;
  mode: NexusOneMode;
  opportunity?: NexusOneDepositMetadata;
  recipientAddress?: string;
  requestedToAmount?: string;
  requestedToValue?: string;
  sourceExplorerUrl?: string | null;
  startedAt: number;
  status: SwapHistoryStatus;
  swapType?: SwapType;
  toToken?: SwapTokenOption;
}

type HistorySourceRow = {
  amount: string;
  chainId?: number;
  chainLogo?: string;
  chainName: string;
  contractAddress?: string;
  key: string;
  symbol: string;
  tokenLogo?: string;
  value?: unknown;
};

type SwapQuoteIssue = {
  type: "insufficientSources";
  message: string;
  missingUsd?: string;
};

type ReceiveAmountIssue = {
  ctaLabel: string;
  message: string;
  type:
    | "receiveLimitExceeded"
    | "sourceLimitExceeded"
    | "unpricedReceiveToken"
    | "unpricedSourceToken";
};

type CachedMaxSwapQuote = {
  decimals: number;
  maxTokenAmount: Decimal;
  maxUsdAmount?: Decimal;
  symbol: string;
};

type CachedIntentUsdRate = {
  amount: string;
  rate: string;
  updatedAt: number;
  value: string;
};

type PredictiveQuote = {
  key: string;
  mode: "exactIn" | "exactOut";
  sources?: SwapTokenOption[];
  toAmount?: string;
  toUsd?: string;
  missingUsd?: string;
};

type PredictiveQuoteBaseline = {
  destinationUsdRate: string;
  exactInDestinationAmountPerSourceUsd?: string;
  exactOutSourceUsdPerDestinationUsd?: string;
  updatedAt: number;
};

const DESTINATION_RECEIVE_LIMIT_USD_BY_CHAIN_ID: Record<number, number> = {
  [SUPPORTED_CHAINS.MEGAETH]: 5000,
  [SUPPORTED_CHAINS.CITREA]: 2000,
  [SUPPORTED_CHAINS.SCROLL]: 500,
};

const SOURCE_SEND_LIMIT_USD_BY_CHAIN_ID: Record<number, number> = {
  [SUPPORTED_CHAINS.MEGAETH]: 500,
  [SUPPORTED_CHAINS.CITREA]: 500,
  [SUPPORTED_CHAINS.SCROLL]: 500,
};

const SCIENTIFIC_DECIMAL_REGEX = /^-?(?:\d+\.?\d*|\.\d+)e[+-]?\d+$/i;
const QUOTE_REFRESH_INTERVAL_MS = 30000;
const EXACT_OUT_INPUT_DEBOUNCE_MS = 500;
const DRAWER_CLOSE_MS = 220;
const BALANCE_REFRESH_AFTER_TERMINAL_MS = 5000;
const MODAL_HEIGHT_TRANSITION_MS = 280;
const ROOT_HEIGHT_TRANSITION_MS = 280;
const ASSET_SELECTOR_DRAWER_HEIGHT = "calc(100% - 72px)";
const NEXUS_ONE_LIST_MIN_HEIGHT = "min(560px, 90dvh)";
const BASIS_POINTS = 10000;
const PREDICTIVE_EXACT_IN_DISCOUNT_BPS = 50;
const PREDICTIVE_EXACT_OUT_SLIPPAGE_BPS = 20; // 0.2% slippage
const PREDICTIVE_QUOTE_DISPLAY_DECIMALS = 8;
const ETHEREUM_MAINNET_CHAIN_ID = 1;
const SDK_EXACT_OUT_STABLE_SYMBOLS = new Set([
  "USDC",
  "USDT",
  "DAI",
  "BUSD",
  "TUSD",
  "FRAX",
  "LUSD",
  "USDD",
  "USDP",
  "GUSD",
]);
const SWAP_HISTORY_STORAGE_KEY_PREFIX = "nexus-one-transaction-history-v1";
const TIMEOUT_LABEL = "Timed Out";
const PROGRESS_EVENT_NAMES = {
  BRIDGE_PLAN_LIST: "bridge_plan_list",
  BRIDGE_PLAN_PROGRESS: "bridge_plan_progress",
  SWAP_PLAN_LIST: "swap_plan_list",
  SWAP_PLAN_PROGRESS: "swap_plan_progress",
} as const;
const PLAN_FINAL_STATES = new Set(["completed", "confirmed", "success"]);
const PLAN_STEP_FUNDS_MOVED_STATES = new Set([
  "completed",
  "confirmed",
  "submitted",
]);
const waitForNextPaint = () =>
  new Promise<void>((resolve) => {
    if (typeof window === "undefined" || !window.requestAnimationFrame) {
      resolve();
      return;
    }
    window.requestAnimationFrame(() => {
      window.setTimeout(() => resolve(), 0);
    });
  });
const theme = nexusOneTheme;
const tooltipSurface = theme.colors.surface;
const tooltipText = theme.colors.textStrong;
const tooltipBorder = theme.colors.border;
const uiFont = theme.fonts.sans;

const normalizeSdkExactOutStableSymbol = (symbol?: string) =>
  (symbol ?? "")
    .trim()
    .toUpperCase()
    .replaceAll("₮", "T")
    .replaceAll(/[^A-Z0-9]/g, "");

const isSdkExactOutStableSymbol = (symbol?: string) =>
  SDK_EXACT_OUT_STABLE_SYMBOLS.has(normalizeSdkExactOutStableSymbol(symbol));

const getPredictiveExactOutSourceTargetUsd = (
  destinationUsdNeedingSources: Decimal,
  cachedSourceUsdRatio?: Decimal
) => {
  if (destinationUsdNeedingSources.lte(0)) return new Decimal(0);
  if (cachedSourceUsdRatio?.gt(0)) {
    return destinationUsdNeedingSources.mul(cachedSourceUsdRatio);
  }

  return destinationUsdNeedingSources
    .mul(BASIS_POINTS + PREDICTIVE_EXACT_OUT_SLIPPAGE_BPS)
    .div(BASIS_POINTS);
};
const modalHeightTransitionStyle = {
  interpolateSize: "allow-keywords",
} as React.CSSProperties;
const modalHeightTransition = `height ${MODAL_HEIGHT_TRANSITION_MS}ms ease, max-height ${MODAL_HEIGHT_TRANSITION_MS}ms ease`;

const getSwapHistoryStorageKey = (ownerAddress?: string) =>
  `${SWAP_HISTORY_STORAGE_KEY_PREFIX}:${ownerAddress?.toLowerCase() || "anonymous"}`;

const getTokenSelectionKey = (token?: SwapTokenOption | null) => {
  if (!token) return "";
  if (token.isUnified) {
    return `unified:${token.unifiedSymbol ?? token.symbol}`;
  }
  return `${token.chainId ?? "unknown"}:${token.contractAddress.toLowerCase()}`;
};

const getTokenQuoteKey = (token?: SwapTokenOption | null) => {
  if (!token) return "";
  return [
    getTokenSelectionKey(token),
    token.symbol ?? "",
    token.decimals ?? "",
  ].join(":");
};

const getSourceTokensQuoteKey = (tokens: SwapTokenOption[]) =>
  tokens
    .filter((token) => {
      const amt = token.userAmount ?? "";
      const cleaned = amt.replaceAll(/[^0-9.]/g, "");
      const num = Number.parseFloat(cleaned);
      return !Number.isNaN(num) && num > 0;
    })
    .map((token) =>
      [
        getTokenSelectionKey(token),
        token.symbol ?? "",
        token.decimals ?? "",
        token.userAmount ?? "",
        token.userAmountUsd ?? "",
        token.userAmountMode ?? "",
      ].join(":")
    )
    .join("|");

const isSameTokenSelection = (
  a?: SwapTokenOption | null,
  b?: SwapTokenOption | null
) => Boolean(a && b && getTokenSelectionKey(a) === getTokenSelectionKey(b));

const sourceSelectionIncludesTokenChainPair = (
  source: SwapTokenOption,
  token: SwapTokenOption
) =>
  source.isUnified && source.sourceTokens?.length
    ? source.sourceTokens.some((sourceToken) =>
        isSameTokenChainPair(sourceToken, token)
      )
    : isSameTokenChainPair(source, token);

const removeTokenChainPairFromSources = (
  sources: SwapTokenOption[],
  token: SwapTokenOption
) => {
  let removed = false;
  const remainingSources: SwapTokenOption[] = [];

  for (const source of sources) {
    if (source.isUnified && source.sourceTokens?.length) {
      const remainingSourceTokens = source.sourceTokens.filter(
        (sourceToken) => !isSameTokenChainPair(sourceToken, token)
      );
      if (remainingSourceTokens.length === source.sourceTokens.length) {
        remainingSources.push(source);
        continue;
      }

      removed = true;
      if (remainingSourceTokens.length > 0) {
        remainingSources.push({
          ...source,
          sourceTokens: remainingSourceTokens,
        });
      }
      continue;
    }

    if (isSameTokenChainPair(source, token)) {
      removed = true;
    } else {
      remainingSources.push(source);
    }
  }

  return {
    removed,
    sources: removed ? remainingSources : sources,
  };
};

const getDepositConfigIdentity = (deposit?: NexusOneDepositMetadata | null) => {
  if (!deposit) return "";
  return [
    deposit.chainId,
    deposit.tokenAddress.toLowerCase(),
    deposit.tokenSymbol,
    deposit.tokenDecimals,
    deposit.protocol ?? "",
    deposit.title ?? "",
  ].join(":");
};

const isSameDepositConfig = (
  a?: NexusOneDepositConfig | null,
  b?: NexusOneDepositConfig | null
) => {
  if (!a || !b) return false;
  return getDepositConfigIdentity(a) === getDepositConfigIdentity(b);
};

const getConfiguredDeposit = (
  config: NexusOneProps["config"]
): NexusOneDepositConfig | undefined => config.deposit;

const sanitizeOpportunityForHistory = (
  opportunity?: NexusOneDepositMetadata
): NexusOneDepositMetadata | undefined => {
  if (!opportunity) return undefined;
  return {
    label: opportunity.label,
    protocol: opportunity.protocol,
    logo: opportunity.logo,
    title: opportunity.title,
    subtitle: opportunity.subtitle,
    chainId: opportunity.chainId,
    tokenSymbol: opportunity.tokenSymbol,
    tokenDecimals: opportunity.tokenDecimals,
    tokenLogo: opportunity.tokenLogo,
    tokenAddress: opportunity.tokenAddress,
    apy: opportunity.apy,
    description: opportunity.description,
  };
};

const sanitizeHistoryEntry = (entry: SwapHistoryEntry): SwapHistoryEntry => ({
  ...entry,
  createdAt: entry.createdAt ?? entry.startedAt ?? Date.now(),
  failureMessage:
    entry.status === "timeout" ? TIMEOUT_LABEL : entry.failureMessage,
  opportunity: sanitizeOpportunityForHistory(entry.opportunity),
});

const sortSwapHistoryEntries = (entries: SwapHistoryEntry[]) =>
  [...entries].sort(
    (a, b) =>
      (b.createdAt ?? b.startedAt ?? 0) - (a.createdAt ?? a.startedAt ?? 0)
  );

const isStoredHistoryStatus = (value: unknown): value is SwapHistoryStatus =>
  value === "pending" ||
  value === "fulfilled" ||
  value === "failed" ||
  value === "timeout" ||
  value === "refund-initiated";

const isStoredMode = (value: unknown): value is NexusOneMode =>
  value === "swap" || value === "deposit" || value === "send";

const normalizeStoredHistoryEntry = (
  value: unknown
): SwapHistoryEntry | null => {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<SwapHistoryEntry>;
  const startedAt =
    typeof entry.startedAt === "number" && Number.isFinite(entry.startedAt)
      ? entry.startedAt
      : undefined;
  const createdAt =
    typeof entry.createdAt === "number" && Number.isFinite(entry.createdAt)
      ? entry.createdAt
      : startedAt;

  if (
    !entry.id ||
    typeof entry.id !== "string" ||
    !isStoredMode(entry.mode) ||
    !isStoredHistoryStatus(entry.status) ||
    !createdAt ||
    !startedAt
  ) {
    return null;
  }

  return {
    ...entry,
    id: entry.id,
    mode: entry.mode,
    status: entry.status,
    createdAt,
    startedAt,
    failureMessage:
      entry.status === "timeout" ? TIMEOUT_LABEL : entry.failureMessage,
    intentData: entry.intentData ?? null,
    fromTokens: Array.isArray(entry.fromTokens) ? entry.fromTokens : [],
    opportunity: sanitizeOpportunityForHistory(entry.opportunity),
  } as SwapHistoryEntry;
};

const readSwapHistoryFromStorage = (storageKey: string): SwapHistoryEntry[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortSwapHistoryEntries(
      parsed
        .map(normalizeStoredHistoryEntry)
        .filter((entry): entry is SwapHistoryEntry => Boolean(entry))
    );
  } catch {
    return [];
  }
};

const writeSwapHistoryToStorage = (
  storageKey: string,
  entries: SwapHistoryEntry[]
) => {
  if (typeof window === "undefined") return;

  try {
    const persistableEntries =
      sortSwapHistoryEntries(entries).map(sanitizeHistoryEntry);
    window.localStorage.setItem(
      storageKey,
      JSON.stringify(persistableEntries, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );
  } catch {
    // localStorage can be unavailable or full; in-memory history still works.
  }
};

const MULTI_ASSET_MODE_STORAGE_KEY = "nexus_swap_asset_mode";

const readMultiAssetModeFromStorage = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(MULTI_ASSET_MODE_STORAGE_KEY);
    if (stored === "multi") return true;
    if (stored === "single") return false;
    window.localStorage.setItem(MULTI_ASSET_MODE_STORAGE_KEY, "single");
    return false;
  } catch {
    return false;
  }
};

const writeMultiAssetModeToStorage = (isMulti: boolean) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      MULTI_ASSET_MODE_STORAGE_KEY,
      isMulti ? "multi" : "single"
    );
  } catch {
    // ignore
  }
};

function QuoteRefreshCountdown({
  progress,
  isRefreshing,
  secondsRemaining,
}: {
  progress: number;
  isRefreshing: boolean;
  secondsRemaining: number;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const tooltipLabel = isRefreshing
    ? "Refreshing quotes..."
    : `Refreshing quotes in ${Math.max(0, secondsRemaining)} second${
        secondsRemaining === 1 ? "" : "s"
      }`;

  return (
    <div
      aria-label={tooltipLabel}
      onBlur={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        alignItems: "center",
        backgroundColor: "#FFFFFE",
        borderRadius: "999px",
        boxSizing: "border-box",
        display: "flex",
        flexShrink: 0,
        height: "22px",
        justifyContent: "center",
        outline: "1px solid #E8E8E7",
        position: "relative",
        width: "22px",
      }}
      tabIndex={0}
    >
      {showTooltip && (
        <div
          role="tooltip"
          style={{
            background: tooltipSurface,
            border: `1px solid ${tooltipBorder}`,
            boxShadow: "0 6px 18px rgba(22,22,21,0.10)",
            color: tooltipText,
            fontFamily: uiFont,
            fontSize: "13px",
            fontWeight: 500,
            maxWidth: "190px",
            lineHeight: "17px",
            padding: "7px 9px",
            pointerEvents: "none",
            position: "absolute",
            right: 0,
            textAlign: "center",
            top: "calc(100% + 8px)",
            whiteSpace: "normal",
            width: "max-content",
            zIndex: 10000,
          }}
        >
          {tooltipLabel}
        </div>
      )}
      <svg
        fill="none"
        height="16"
        style={{
          opacity: isRefreshing ? 0.55 : 1,
          transform: "rotate(-90deg)",
          transition: "opacity 0.18s ease-out",
        }}
        viewBox="0 0 18 18"
        width="16"
      >
        <circle cx="9" cy="9" r={radius} stroke="#E8E8E7" strokeWidth="2" />
        <circle
          cx="9"
          cy="9"
          r={radius}
          stroke="#006BF4"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clampedProgress)}
          strokeLinecap="round"
          strokeWidth="2"
          style={{ transition: "stroke-dashoffset 0.25s linear" }}
        />
      </svg>
    </div>
  );
}

const parseDecimalLoose = (value: unknown) => {
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

const formatDecimalDisplay = (
  value: unknown,
  options: { min?: number; max?: number } = {}
) => {
  const amount = parseDecimalLoose(value) ?? new Decimal(0);
  const max = options.max ?? 2;
  return amount.toDecimalPlaces(max).toFixed();
};

const formatUsdDisplay = (value: unknown) => {
  const amount = parseDecimalLoose(value) ?? new Decimal(0);
  if (amount.gt(0) && amount.lt(0.01)) return "<$0.01";
  return `$${formatDecimalDisplay(amount, { min: 2, max: 2 })}`;
};

const formatTokenDisplay = (value: unknown) => {
  const amount = parseDecimalLoose(value) ?? new Decimal(0);
  return formatDecimalDisplay(amount, { max: 8 });
};

const getSwapTokenUsdValue = (token: SwapTokenOption) =>
  parseDecimalLoose(token.userAmountUsd) ??
  parseDecimalLoose(token.balanceInFiat) ??
  new Decimal(0);

const getSwapTokenBalanceUsdValue = (token: SwapTokenOption) =>
  parseDecimalLoose(token.balanceInFiat) ?? new Decimal(0);

const getDisplaySourceTokenKey = (token?: SwapTokenOption | null) => {
  if (!token) return "";
  const chainId = token.chainId ?? "unknown";
  const address = token.contractAddress?.toLowerCase();
  return address
    ? `${chainId}:${address}`
    : `${chainId}:symbol:${token.symbol.toUpperCase()}`;
};

const sumDecimalStrings = (left?: string, right?: string) => {
  const leftAmount = parseDecimalLoose(left) ?? new Decimal(0);
  const rightAmount = parseDecimalLoose(right) ?? new Decimal(0);
  const sum = leftAmount.plus(rightAmount);
  return sum.gt(0) ? sum.toFixed() : undefined;
};

const mergeDisplaySourceTokens = (tokens: SwapTokenOption[]) => {
  const merged = new Map<string, SwapTokenOption>();

  for (const token of tokens) {
    const key = getDisplaySourceTokenKey(token);
    if (!key) continue;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, token);
      continue;
    }

    const userAmount = sumDecimalStrings(
      existing.userAmount || existing.balance,
      token.userAmount || token.balance
    );
    const userAmountUsd = sumDecimalStrings(
      existing.userAmountUsd || existing.balanceInFiat,
      token.userAmountUsd || token.balanceInFiat
    );

    merged.set(key, {
      ...existing,
      balance: userAmount ?? existing.balance,
      balanceInFiat: userAmountUsd ?? existing.balanceInFiat,
      chainLogo: existing.chainLogo || token.chainLogo,
      logo: existing.logo || token.logo,
      userAmount: userAmount ?? existing.userAmount,
      userAmountUsd: userAmountUsd ?? existing.userAmountUsd,
    });
  }

  return Array.from(merged.values());
};

const sortSwapTokensByUsdDesc = (tokens: SwapTokenOption[]) =>
  [...tokens].sort((a, b) => {
    const usdDelta = getSwapTokenUsdValue(b).cmp(getSwapTokenUsdValue(a));
    if (usdDelta !== 0) return usdDelta;
    return (a.symbol ?? "").localeCompare(b.symbol ?? "");
  });

const sortDisplaySourcesByBalanceUsdDesc = (tokens: SwapTokenOption[]) =>
  [...tokens].sort((a, b) => {
    const balanceUsdDelta = getSwapTokenBalanceUsdValue(b).cmp(
      getSwapTokenBalanceUsdValue(a)
    );
    if (balanceUsdDelta !== 0) return balanceUsdDelta;

    const spendUsdDelta = getSwapTokenUsdValue(b).cmp(getSwapTokenUsdValue(a));
    if (spendUsdDelta !== 0) return spendUsdDelta;

    return `${a.symbol ?? ""} ${a.chainName ?? ""}`.localeCompare(
      `${b.symbol ?? ""} ${b.chainName ?? ""}`
    );
  });

const getIntentSourceUsdValue = (source: SwapIntentData["sources"][number]) =>
  parseDecimalLoose(source.value) ?? new Decimal(0);

const sortIntentSourcesByUsdDesc = (sources: SwapIntentData["sources"]) =>
  [...sources].sort((a, b) => {
    const usdDelta = getIntentSourceUsdValue(b).cmp(getIntentSourceUsdValue(a));
    if (usdDelta !== 0) return usdDelta;
    return (a.token?.symbol ?? "").localeCompare(b.token?.symbol ?? "");
  });

const extractIntentIdFromUrl = (url?: string | null) => {
  if (!url) return undefined;
  const match = url.match(/(\d+)(?:\/)?$/);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const getNonEmptyString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
};

const isHttpUrl = (value?: string | null): value is string =>
  Boolean(value && /^https?:\/\//i.test(value));

const hasValidIntentExplorer = (
  entry: Pick<SwapHistoryEntry, "intentExplorerUrl">
) => isHttpUrl(entry.intentExplorerUrl);

const getHistoryExplorerUrl = (
  entry: Pick<
    SwapHistoryEntry,
    "finalExplorerUrl" | "intentExplorerUrl" | "sourceExplorerUrl"
  >
) =>
  [
    entry.intentExplorerUrl,
    entry.finalExplorerUrl,
    entry.sourceExplorerUrl,
  ].find(isHttpUrl) ?? null;

const getFiniteNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const getObjectChainId = (value: any) =>
  getFiniteNumber(
    value?.chainId,
    value?.chain?.id,
    value?.chain?.chainId,
    value?.toChainId,
    value?.destinationChainId,
    value?.data?.chainId,
    value?.data?.chain?.id,
    value?.data?.chain?.chainId,
    value?.data?.toChainId,
    value?.data?.destinationChainId,
    value?.result?.chainId,
    value?.result?.chain?.id
  );

const getExplorerBaseUrl = (chainId?: number, ...candidates: unknown[]) => {
  const directCandidates = candidates.flatMap((candidate: any) => [
    candidate?.blockExplorerUrl,
    candidate?.blockExplorerURL,
    candidate?.chainBlockExplorerUrl,
    candidate?.explorerBaseUrl,
    candidate?.explorerUrlBase,
    candidate?.blockExplorerUrls?.[0],
    candidate?.blockExplorers?.default?.url,
    candidate?.chain?.blockExplorerUrl,
    candidate?.chain?.blockExplorerURL,
    candidate?.chain?.chainBlockExplorerUrl,
    candidate?.chain?.explorerBaseUrl,
    candidate?.chain?.explorerUrlBase,
    candidate?.chain?.blockExplorerUrls?.[0],
    candidate?.chain?.blockExplorers?.default?.url,
    candidate?.data?.blockExplorerUrl,
    candidate?.data?.blockExplorerURL,
    candidate?.data?.chainBlockExplorerUrl,
    candidate?.data?.blockExplorerUrls?.[0],
    candidate?.data?.blockExplorers?.default?.url,
    candidate?.data?.chain?.blockExplorerUrl,
    candidate?.data?.chain?.blockExplorerURL,
    candidate?.data?.chain?.chainBlockExplorerUrl,
    candidate?.data?.chain?.blockExplorerUrls?.[0],
    candidate?.data?.chain?.blockExplorers?.default?.url,
  ]);
  return getNonEmptyString(
    ...directCandidates,
    chainId ? CHAIN_METADATA[chainId]?.blockExplorerUrls?.[0] : undefined,
    chainId
      ? (CHAIN_METADATA[chainId] as any)?.blockExplorers?.default?.url
      : undefined
  );
};

const getTransactionHash = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) return trimmed;
  }
  return null;
};

const getIntentHash = (...values: unknown[]) => getTransactionHash(...values);

const getObjectIntentHash = (value: any) =>
  getIntentHash(
    value?.intentHash,
    value?.intent_hash,
    value?.intent?.hash,
    value?.intent?.intentHash,
    value?.intent?.intent_hash,
    value?.requestHash,
    value?.request_hash,
    value?.request?.hash,
    value?.request?.requestHash,
    value?.rffHash,
    value?.rff_hash,
    value?.rff?.hash,
    value?.data?.intentHash,
    value?.data?.intent_hash,
    value?.data?.intent?.hash,
    value?.data?.intent?.intentHash,
    value?.data?.intent?.intent_hash,
    value?.data?.requestHash,
    value?.data?.request_hash,
    value?.data?.request?.hash,
    value?.data?.request?.requestHash,
    value?.data?.rffHash,
    value?.data?.rff_hash,
    value?.data?.rff?.hash,
    value?.result?.intentHash,
    value?.result?.intent_hash,
    value?.result?.intent?.hash,
    value?.result?.requestHash,
    value?.result?.request_hash,
    value?.result?.rffHash,
    value?.result?.rff_hash
  );

const getNexusExplorerNetwork = (network?: unknown) => {
  const normalized =
    typeof network === "string" ? network.trim().toLowerCase() : "";
  if (normalized === "canary" || normalized === "testnet") return normalized;
  return "mainnet";
};

const getRffExplorerUrl = (network: unknown, intentHash?: string | null) =>
  intentHash
    ? `https://nexus-v2.${getNexusExplorerNetwork(network)}.avail.so/rff/${intentHash}`
    : null;

const getObjectTransactionHash = (value: any) =>
  getTransactionHash(
    value?.txHash,
    value?.transactionHash,
    value?.executeTxHash,
    value?.executeTransactionHash,
    value?.transferTransactionHash,
    value?.receipt?.transactionHash,
    value?.tx?.hash,
    value?.transaction?.hash,
    value?.data?.txHash,
    value?.data?.transactionHash,
    value?.data?.executeTxHash,
    value?.data?.executeTransactionHash,
    value?.data?.transferTransactionHash,
    value?.data?.receipt?.transactionHash,
    value?.data?.tx?.hash,
    value?.data?.transaction?.hash,
    value?.result?.txHash,
    value?.result?.transactionHash,
    value?.result?.receipt?.transactionHash
  );

const getExplorerTxUrl = (
  chainId?: number,
  txHash?: string | null,
  ...candidates: unknown[]
) => {
  if (!chainId || !txHash) return null;
  const baseUrl = getExplorerBaseUrl(chainId, ...candidates);
  return baseUrl ? `${String(baseUrl).replace(/\/$/, "")}/tx/${txHash}` : null;
};

const getSdkSwapResult = (result: any) => {
  const candidate = result?.swapResult ?? result?.result;
  return candidate && typeof candidate === "object" ? candidate : null;
};

const getSdkTransactionHash = (result: any) =>
  getObjectTransactionHash(result) ||
  getObjectTransactionHash(result?.executeResponse) ||
  getObjectTransactionHash(result?.execute) ||
  getObjectTransactionHash(result?.transfer) ||
  getObjectTransactionHash(result?.swapResult) ||
  getObjectTransactionHash(result?.result) ||
  null;

const getSdkExplorerUrl = (result: any) =>
  getNonEmptyString(
    result?.explorerUrl,
    result?.explorerURL,
    result?.txExplorerUrl,
    result?.transactionExplorerUrl,
    result?.execute?.explorerUrl,
    result?.execute?.explorerURL,
    result?.execute?.txExplorerUrl,
    result?.execute?.transactionExplorerUrl,
    result?.executeResponse?.explorerUrl,
    result?.executeResponse?.explorerURL,
    result?.executeResponse?.txExplorerUrl,
    result?.executeResponse?.transactionExplorerUrl,
    result?.executeExplorerUrl,
    result?.transferExplorerUrl,
    result?.swapResult?.explorerUrl,
    result?.swapResult?.explorerURL,
    result?.swapResult?.txExplorerUrl,
    result?.swapResult?.transactionExplorerUrl,
    result?.result?.explorerUrl,
    result?.result?.explorerURL,
    result?.result?.txExplorerUrl,
    result?.result?.transactionExplorerUrl
  );

const getSdkIntentExplorerUrl = (result: any, swapResult?: any) =>
  getNonEmptyString(
    swapResult?.intentExplorerUrl,
    swapResult?.intentExplorerURL,
    swapResult?.intentUrl,
    swapResult?.intentURL,
    swapResult?.rffUrl,
    swapResult?.rffURL,
    swapResult?.rffExplorerUrl,
    swapResult?.rffExplorerURL,
    swapResult?.explorerUrl,
    swapResult?.explorerURL,
    result?.intentExplorerUrl,
    result?.intentExplorerURL,
    result?.intentUrl,
    result?.intentURL,
    result?.rffUrl,
    result?.rffURL,
    result?.rffExplorerUrl,
    result?.rffExplorerURL,
    result?.swapResult?.intentExplorerUrl,
    result?.swapResult?.intentExplorerURL,
    result?.swapResult?.intentUrl,
    result?.swapResult?.intentURL,
    result?.swapResult?.rffUrl,
    result?.swapResult?.rffURL,
    result?.swapResult?.rffExplorerUrl,
    result?.swapResult?.rffExplorerURL,
    result?.swapResult?.explorerUrl,
    result?.swapResult?.explorerURL,
    result?.result?.intentExplorerUrl,
    result?.result?.intentExplorerURL,
    result?.result?.intentUrl,
    result?.result?.intentURL,
    result?.result?.rffUrl,
    result?.result?.rffURL,
    result?.result?.rffExplorerUrl,
    result?.result?.rffExplorerURL,
    result?.result?.explorerUrl,
    result?.result?.explorerURL
  );

const getSdkIntentExplorerUrlForNetwork = (
  network: unknown,
  result: any,
  swapResult?: any
) =>
  getSdkIntentExplorerUrl(result, swapResult) ||
  getRffExplorerUrl(
    network,
    getObjectIntentHash(swapResult) || getObjectIntentHash(result)
  );

function MiniLogo({
  src,
  label,
  size = 30,
  fontSize = 13,
  outline,
  style,
}: {
  src?: string;
  label?: string;
  size?: number;
  fontSize?: number;
  outline?: string;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  if (!failed && src) {
    return (
      <img
        alt={label || ""}
        onError={() => setFailed(true)}
        src={src}
        style={{
          background: "#FFFFFE",
          borderRadius: "999px",
          height: size,
          objectFit: "cover",
          outline,
          width: size,
          ...style,
        }}
      />
    );
  }

  return (
    <div
      style={{
        alignItems: "center",
        background: "#E8F0FF",
        borderRadius: "999px",
        color: "#006BF4",
        display: "flex",
        fontFamily: uiFont,
        fontSize,
        fontWeight: 700,
        height: size,
        justifyContent: "center",
        outline,
        width: size,
        ...style,
      }}
    >
      {(label || "?").trim().slice(0, 1).toUpperCase()}
    </div>
  );
}

function TokenLogoPair({
  tokenLogo,
  chainLogo,
  tokenSymbol,
  chainName,
  tokenOutline,
  size = 34,
}: {
  tokenLogo?: string;
  chainLogo?: string;
  tokenSymbol?: string;
  chainName?: string;
  tokenOutline?: string;
  size?: number;
}) {
  return (
    <div
      style={{ flexShrink: 0, height: size, position: "relative", width: size }}
    >
      <MiniLogo
        fontSize={14}
        label={tokenSymbol}
        outline={tokenOutline}
        size={size}
        src={tokenLogo}
      />
      {chainLogo && (
        <MiniLogo
          fontSize={6}
          label={chainName}
          outline="1px solid #FFFFFE"
          size={Math.round(size * 0.44)}
          src={chainLogo}
          style={{ bottom: -2, position: "absolute", right: -2 }}
        />
      )}
    </div>
  );
}

function SourceLogoStack({
  sources,
  size = 24,
  maxVisible = 3,
}: {
  sources: HistorySourceRow[];
  size?: number;
  maxVisible?: number;
}) {
  const visibleSources = sources.slice(0, maxVisible);
  const hiddenCount = Math.max(0, sources.length - visibleSources.length);

  return (
    <div
      aria-label={`${sources.length} source asset${sources.length === 1 ? "" : "s"}`}
      style={{
        alignItems: "center",
        display: "flex",
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      {visibleSources.map((source, index) => (
        <div
          key={source.key}
          style={{
            marginLeft: index === 0 ? 0 : -7,
            position: "relative",
            zIndex: visibleSources.length - index,
          }}
        >
          <TokenLogoPair
            chainLogo={source.chainLogo}
            chainName={source.chainName}
            size={size}
            tokenLogo={source.tokenLogo}
            tokenOutline={
              index < visibleSources.length - 1
                ? "1px solid #FFFFFE"
                : undefined
            }
            tokenSymbol={source.symbol}
          />
        </div>
      ))}
      {hiddenCount > 0 && (
        <span
          style={{
            color: "#848483",
            flexShrink: 0,
            fontFamily: uiFont,
            fontSize: size <= 21 ? "12px" : "14px",
            fontWeight: 600,
            marginLeft: "3px",
          }}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

function TruncatedAddress({
  address,
  color = "#006BF4",
}: {
  address: string;
  color?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const label =
    address.length > 12
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address;

  return (
    <span
      onBlur={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        alignItems: "center",
        color,
        display: "inline-flex",
        fontFamily: uiFont,
        fontSize: "15px",
        gap: "6px",
        fontWeight: 500,
        lineHeight: "20px",
        outline: "none",
        position: "relative",
      }}
      tabIndex={0}
    >
      <AddressIdenticon address={address} size={16} />
      {label}
      {showTooltip && (
        <span
          role="tooltip"
          style={{
            background: "#FFFFFE",
            border: "1px solid #E8E8E7",
            boxShadow: "0 6px 18px rgba(22,22,21,0.10)",
            color: "#161615",
            fontFamily: uiFont,
            fontSize: "13px",
            fontWeight: 500,
            lineHeight: "17px",
            padding: "7px 9px",
            pointerEvents: "none",
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            whiteSpace: "nowrap",
            zIndex: 10000,
          }}
        >
          {address}
        </span>
      )}
    </span>
  );
}

const getEntryVisualSources = (
  entry: SwapHistoryEntry,
  visualSources: TokenVisualSources = {}
): TokenVisualSources => ({
  balanceAssets: visualSources.balanceAssets,
  tokens: [
    ...(entry.toToken ? [entry.toToken] : []),
    ...entry.fromTokens,
    ...(visualSources.tokens ?? []),
  ],
});

const getDestinationVisuals = (
  entry: SwapHistoryEntry,
  visualSources?: TokenVisualSources
) => {
  const destination = entry.intentData?.destination;
  return resolveTokenVisuals(
    {
      chainId: destination?.chain.id ?? entry.toToken?.chainId,
      chainLogo: destination?.chain.logo || entry.toToken?.chainLogo,
      chainName: destination?.chain.name || entry.toToken?.chainName,
      contractAddress:
        destination?.token.contractAddress ?? entry.toToken?.contractAddress,
      decimals: destination?.token.decimals ?? entry.toToken?.decimals,
      name: entry.toToken?.name ?? destination?.token.symbol,
      symbol: destination?.token.symbol || entry.toToken?.symbol,
      tokenLogo: (destination?.token as any)?.logo || entry.toToken?.logo,
    },
    getEntryVisualSources(entry, visualSources)
  );
};

const getDisplayDestinationSourceRow = (
  entry: SwapHistoryEntry,
  visualSources?: TokenVisualSources
): HistorySourceRow | null => {
  if (entry.mode !== "deposit" && entry.mode !== "send") {
    return null;
  }
  if (!entry.toToken || !entry.requestedToAmount) return null;

  const requestedAmount = parseDecimalLoose(entry.requestedToAmount);
  const intentDestinationAmount = parseDecimalLoose(
    entry.intentData?.destination.amount
  );
  const destinationBalanceAmount = parseDecimalLoose(
    entry.toToken.balance?.replace(entry.toToken.symbol, "")
  );
  if (
    !requestedAmount ||
    !destinationBalanceAmount ||
    requestedAmount.lte(0) ||
    destinationBalanceAmount.lte(0)
  ) {
    return null;
  }

  const intentCoversAmount = intentDestinationAmount ?? new Decimal(0);
  const displayAmount = Decimal.min(
    destinationBalanceAmount,
    Decimal.max(0, requestedAmount.minus(intentCoversAmount))
  );
  if (displayAmount.lte(0)) return null;

  const destinationVisuals = getDestinationVisuals(entry, visualSources);
  const symbol = destinationVisuals.symbol || entry.toToken.symbol;
  const chainName =
    destinationVisuals.chainName ||
    getShortChainName(entry.toToken.chainId, entry.toToken.chainName);
  const requestedValue = parseDecimalLoose(entry.requestedToValue);
  const destinationValue = parseDecimalLoose(
    entry.intentData?.destination.value
  );
  const rate =
    requestedValue && requestedAmount.gt(0)
      ? requestedValue.div(requestedAmount)
      : destinationValue && intentCoversAmount.gt(0)
        ? destinationValue.div(intentCoversAmount)
        : undefined;

  return {
    key: `destination-balance-${entry.toToken.chainId}-${entry.toToken.contractAddress}`,
    chainId: entry.toToken.chainId,
    contractAddress: entry.toToken.contractAddress,
    tokenLogo: destinationVisuals.tokenLogo,
    chainLogo: destinationVisuals.chainLogo,
    symbol,
    chainName,
    amount: displayAmount
      .toDecimalPlaces(
        Math.max(
          0,
          destinationVisuals.decimals ?? entry.toToken.decimals ?? 18
        ),
        Decimal.ROUND_DOWN
      )
      .toFixed(),
    value: rate
      ? displayAmount.mul(rate).toFixed()
      : entry.toToken.balanceInFiat,
  };
};

const isNativeHistorySourceAddress = (address?: string) => {
  const normalizedAddress = (address ?? "").toLowerCase();
  return (
    !normalizedAddress ||
    normalizedAddress === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
    normalizedAddress === "0x0000000000000000000000000000000000000000"
  );
};

const isSwapExactOutDestinationHistorySource = (
  entry: SwapHistoryEntry,
  source: {
    chainId?: number;
    contractAddress?: string;
    symbol?: string;
  }
) => {
  const isSwapExactOutEntry =
    entry.mode === "swap" &&
    (entry.swapType === "exactOut" || Boolean(entry.requestedToAmount));
  if (!isSwapExactOutEntry) return false;

  const destination = entry.intentData?.destination;
  const destinationChainId = destination?.chain.id ?? entry.toToken?.chainId;
  if (!source.chainId || source.chainId !== destinationChainId) return false;

  const destinationAddress =
    destination?.token.contractAddress ?? entry.toToken?.contractAddress;
  const sourceAddress = source.contractAddress?.toLowerCase();
  const normalizedDestinationAddress = destinationAddress?.toLowerCase();
  if (
    sourceAddress &&
    normalizedDestinationAddress &&
    sourceAddress === normalizedDestinationAddress
  ) {
    return true;
  }
  if (
    isNativeHistorySourceAddress(source.contractAddress) &&
    isNativeHistorySourceAddress(destinationAddress)
  ) {
    return true;
  }

  const destinationSymbol = destination?.token.symbol ?? entry.toToken?.symbol;
  return Boolean(
    (!sourceAddress || !normalizedDestinationAddress) &&
      source.symbol &&
      destinationSymbol &&
      source.symbol.toUpperCase() === destinationSymbol.toUpperCase()
  );
};

const getHistorySourceRowMergeKey = (row: HistorySourceRow) => {
  const chainKey = row.chainId ?? row.chainName;
  const address = row.contractAddress?.toLowerCase();
  return address
    ? `${chainKey}:${address}`
    : `${chainKey}:symbol:${row.symbol.toUpperCase()}`;
};

const mergeHistorySourceRows = (rows: HistorySourceRow[]) => {
  const merged = new Map<string, HistorySourceRow>();

  for (const row of rows) {
    const key = getHistorySourceRowMergeKey(row);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, row);
      continue;
    }

    merged.set(key, {
      ...existing,
      amount: sumDecimalStrings(existing.amount, row.amount) ?? existing.amount,
      chainLogo: existing.chainLogo || row.chainLogo,
      key: existing.key,
      tokenLogo: existing.tokenLogo || row.tokenLogo,
      value: sumDecimalStrings(
        String(existing.value ?? ""),
        String(row.value ?? "")
      ),
    });
  }

  return Array.from(merged.values());
};

const getProgressStepType = (step?: SwapStepType | BridgeStepType | null) =>
  String((step as any)?.type ?? (step as any)?.typeID ?? "").toUpperCase();

const isBridgeRefundStepType = (type: string) =>
  type.includes("BRIDGE_INTENT_SUBMISSION") || type.includes("BRIDGE_DEPOSIT");

const isSwapSkippedStepType = (type: string) => type.includes("SWAP_SKIPPED");

const isAutoRefundAvailableProgressEvent = (event?: NexusOneProgressEvent) =>
  event?.name === PROGRESS_EVENT_NAMES.SWAP_PLAN_PROGRESS &&
  isBridgeRefundStepType(getProgressStepType(event.step));

const normalizeBridgeProvider = (
  value: unknown
): BridgeProvider | undefined => {
  if (value === "nexus" || value === "mayan" || value === null) {
    return value;
  }
  return undefined;
};

const normalizeSdkIntentString = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined;
  return String(value);
};

const normalizeSdkIntentAmount = (value: unknown, fallback: string = "0") =>
  normalizeSdkIntentString(value) ?? fallback;

const getLogoFromMetadata = (metadata: any) =>
  metadata?.logo ??
  metadata?.logoURI ??
  metadata?.logoUri ??
  metadata?.logoUrl ??
  metadata?.icon ??
  "";

const normalizeSdkIntentChain = (chain: any) => {
  const id = Number(chain?.id ?? chain?.chainId);
  if (!Number.isFinite(id)) return undefined;
  const chainMeta = CHAIN_METADATA[id];
  return {
    id,
    logo: getLogoFromMetadata(chain) || chainMeta?.logo || "",
    name: chain?.name ?? chainMeta?.name ?? "",
  };
};

const normalizeSdkIntentToken = (token: any, chainId?: number) => {
  const chainMeta = chainId ? CHAIN_METADATA[chainId] : undefined;
  const decimals = Number(
    token?.decimals ?? chainMeta?.nativeCurrency.decimals
  );
  return {
    contractAddress:
      token?.contractAddress ??
      token?.address ??
      token?.tokenAddress ??
      zeroAddress,
    decimals: Number.isFinite(decimals) ? decimals : 18,
    logo: getLogoFromMetadata(token) || undefined,
    symbol: token?.symbol ?? token?.tokenSymbol ?? "",
  };
};

const normalizeSdkIntentGas = (
  gas: any,
  chainId?: number
): SwapIntentDestination["gas"] => ({
  amount: normalizeSdkIntentAmount(gas?.amount),
  value: normalizeSdkIntentString(gas?.value),
  token: normalizeSdkIntentToken(gas?.token ?? gas, chainId),
});

const normalizeSdkIntentSource = (
  source: any
): SwapIntentSource | undefined => {
  const chain = normalizeSdkIntentChain(source?.chain);
  if (!chain) return undefined;
  return {
    ...source,
    amount: normalizeSdkIntentAmount(source?.amount),
    chain,
    token: normalizeSdkIntentToken(source?.token, chain.id),
    value: normalizeSdkIntentString(source?.value),
  };
};

const normalizeSdkIntentDestination = (
  destination: any
): SwapIntentDestination | undefined => {
  const chain = normalizeSdkIntentChain(destination?.chain);
  if (!chain) return undefined;
  return {
    ...destination,
    amount: normalizeSdkIntentAmount(destination?.amount),
    chain,
    gas: normalizeSdkIntentGas(destination?.gas, chain.id),
    token: normalizeSdkIntentToken(destination?.token, chain.id),
    value: normalizeSdkIntentString(destination?.value),
  };
};

const normalizeSwapIntentData = (intent: any): SwapIntentData | null => {
  const destination = normalizeSdkIntentDestination(intent?.destination);
  if (!destination) return null;

  return {
    ...intent,
    destination,
    sources: Array.isArray(intent?.sources)
      ? intent.sources
          .map(normalizeSdkIntentSource)
          .filter(
            (
              source: SwapIntentSource | undefined
            ): source is SwapIntentSource => Boolean(source)
          )
      : [],
  };
};

const normalizeSwapAndExecuteRequirementIntent = (
  intent: any
): SwapIntentData | null => {
  const requirement =
    intent?.executeRequirement ?? intent?.executionRequirement;
  if (!requirement) return null;
  const destination = normalizeSdkIntentDestination({
    amount: requirement?.token?.amount,
    chain: requirement?.chain,
    gas: requirement?.gas,
    token: requirement?.token,
    value: requirement?.token?.value,
  });
  if (!destination) return null;

  return {
    ...intent,
    bridgeProvider: normalizeBridgeProvider(intent?.bridgeProvider),
    destination,
    feesAndBuffer: intent?.feesAndBuffer,
    sources: [],
  };
};

const normalizeRenderableSwapIntentData = (
  rawIntent: any,
  bridgeProvider?: BridgeProvider
): SwapIntentData | null => {
  const direct = normalizeSwapIntentData(rawIntent);
  const normalizedIntent = direct
    ? null
    : normalizeSwapIntentData(rawIntent?.normalizedIntent);
  const nestedSwap =
    direct || normalizedIntent
      ? null
      : normalizeSwapIntentData(rawIntent?.swap);
  const requirement =
    direct || normalizedIntent || nestedSwap
      ? null
      : normalizeSwapAndExecuteRequirementIntent(rawIntent);
  const normalized = direct ?? normalizedIntent ?? nestedSwap ?? requirement;
  if (!normalized) return null;

  return bridgeProvider === undefined
    ? normalized
    : { ...normalized, bridgeProvider };
};

const normalizePlanStepType = (stepType: unknown, state?: unknown) => {
  const normalized = String(stepType ?? "").toLowerCase();
  const normalizedState = String(state ?? "").toLowerCase();

  if (normalized === "execute_transaction") {
    return normalizedState === "confirmed" || normalizedState === "completed"
      ? "TRANSACTION_CONFIRMED"
      : "TRANSACTION_SENT";
  }

  const mapped: Record<string, string> = {
    allowance_approval: "APPROVAL",
    bridge_deposit: "BRIDGE_DEPOSIT",
    bridge_fill: "BRIDGE_FILL",
    bridge_intent_submission: "BRIDGE_INTENT_SUBMISSION",
    destination_swap: "DESTINATION_SWAP",
    eoa_to_ephemeral_transfer: "EOA_TO_EPHEMERAL_TRANSFER",
    execute_approval: "APPROVAL",
    request_signing: "REQUEST_SIGNING",
    request_submission: "REQUEST_SUBMISSION",
    source_swap: "SOURCE_SWAP",
    vault_deposit: "BRIDGE_DEPOSIT",
  };

  return mapped[normalized] ?? normalized.toUpperCase();
};

const normalizePlanStep = (
  stepLike: unknown,
  fallbackStepType?: unknown,
  state?: unknown,
  completed?: boolean
): SwapStepType | BridgeStepType => {
  const source =
    stepLike && typeof stepLike === "object" ? (stepLike as any) : {};
  const rawStepType = fallbackStepType ?? source.stepType ?? source.type;
  const progressType = normalizePlanStepType(
    rawStepType ?? source.typeID,
    state
  );
  const progressKey =
    source.id ?? source.stepId ?? source.typeID ?? progressType;

  return {
    ...source,
    completed,
    rawType: rawStepType,
    type: progressType,
    typeID: String(progressKey),
  } as SwapStepType | BridgeStepType;
};

const getPlanStepChainId = (event: any, step: any) =>
  getObjectChainId(event) ?? getObjectChainId(step);

const getPlanStepTransactionHash = (event: any, step: any) =>
  getObjectTransactionHash(event) ?? getObjectTransactionHash(step);

const getPlanStepExplorerUrl = (event: any, step: any) => {
  const directExplorerUrl = getNonEmptyString(
    event?.explorerUrl,
    event?.explorerURL,
    event?.txExplorerUrl,
    event?.transactionExplorerUrl,
    step?.explorerUrl,
    step?.explorerURL,
    step?.txExplorerUrl,
    step?.transactionExplorerUrl,
    step?.data?.explorerUrl,
    step?.data?.explorerURL,
    step?.data?.txExplorerUrl,
    step?.data?.transactionExplorerUrl
  );
  if (directExplorerUrl) return directExplorerUrl;

  return getExplorerTxUrl(
    getPlanStepChainId(event, step),
    getPlanStepTransactionHash(event, step),
    event,
    step
  );
};

const getPlanStepIntentExplorerUrl = (event: any, step: any) =>
  getNonEmptyString(
    event?.intentExplorerUrl,
    event?.intentExplorerURL,
    event?.intentUrl,
    event?.intentURL,
    event?.rffUrl,
    event?.rffURL,
    event?.rffExplorerUrl,
    event?.rffExplorerURL,
    step?.intentExplorerUrl,
    step?.intentExplorerURL,
    step?.intentUrl,
    step?.intentURL,
    step?.rffUrl,
    step?.rffURL,
    step?.rffExplorerUrl,
    step?.rffExplorerURL,
    step?.data?.intentExplorerUrl,
    step?.data?.intentExplorerURL,
    step?.data?.intentUrl,
    step?.data?.intentURL,
    step?.data?.rffUrl,
    step?.data?.rffURL,
    step?.data?.rffExplorerUrl,
    step?.data?.rffExplorerURL
  );

const isIntentSubmissionLikeEvent = (event: any, step?: any) => {
  const text = [
    event?.type,
    event?.event,
    event?.name,
    event?.status,
    event?.stepType,
    step?.type,
    step?.typeID,
    step?.rawType,
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("intent") ||
    text.includes("request_submission") ||
    text.includes("rff")
  );
};

const getGenericEventHash = (event: any, step?: any) =>
  getTransactionHash(
    event?.hash,
    event?.data?.hash,
    event?.result?.hash,
    step?.hash,
    step?.data?.hash,
    step?.result?.hash
  );

const getEventIntentExplorerUrl = (
  network: unknown,
  event: any,
  step?: any
) => {
  const directUrl = step
    ? getPlanStepIntentExplorerUrl(event, step)
    : getNonEmptyString(
        event?.intentExplorerUrl,
        event?.intentExplorerURL,
        event?.intentUrl,
        event?.intentURL,
        event?.rffUrl,
        event?.rffURL,
        event?.rffExplorerUrl,
        event?.rffExplorerURL,
        event?.data?.intentExplorerUrl,
        event?.data?.intentExplorerURL,
        event?.data?.intentUrl,
        event?.data?.intentURL,
        event?.data?.rffUrl,
        event?.data?.rffURL,
        event?.data?.rffExplorerUrl,
        event?.data?.rffExplorerURL
      );
  if (directUrl) return directUrl;

  return getRffExplorerUrl(
    network,
    getObjectIntentHash(event) ||
      getObjectIntentHash(step) ||
      (isIntentSubmissionLikeEvent(event, step)
        ? getGenericEventHash(event, step)
        : null)
  );
};

const isTimeoutLikeError = (error: unknown) => {
  const err = error as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
    shortMessage?: unknown;
  };
  const text = [
    err?.code,
    err?.name,
    err?.message,
    err?.shortMessage,
    typeof error === "string" ? error : undefined,
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(" ");

  return /timeout|timed out|time out|deadline exceeded|expired while waiting|wait.*expired|poll.*expired/i.test(
    text
  );
};

const getSdkEventType = (event: any) =>
  event?.type ?? event?.name ?? event?.event ?? "unknown";

const summarizeSdkProgressStep = (
  step: SwapStepType | BridgeStepType | null | undefined,
  index?: number
) => ({
  completed: (step as any)?.completed,
  index,
  rawType: (step as any)?.rawType ?? (step as any)?.stepType,
  state: (step as any)?.state,
  type: getProgressStepType(step),
});

const logSdkSwapEvent = (
  label: string,
  event: any,
  meta?: Record<string, unknown>
) => {
  if (label === "onEvent" && event?.state === "wallet_prompted") {
    console.log("[NEXUS WALLET PROMPTED]", event);
  }
  console.log(`[NexusOne SDK][swap] ${label}`, {
    event,
    eventType: getSdkEventType(event),
    ...meta,
  });
};

const logSdkIntentEvent = (
  label: string,
  data: any,
  meta?: Record<string, unknown>
) => {
  console.log(`[NexusOne SDK][intent] ${label}`, {
    hasAllow: typeof data?.allow === "function",
    hasDeny: typeof data?.deny === "function",
    hasRefresh: typeof data?.refresh === "function",
    intent: data?.intent,
    raw: data,
    ...meta,
  });
};

const logSwapPlanSteps = (
  eventType: "plan_preview" | "plan_confirmed",
  stepList: Array<SwapStepType | BridgeStepType>,
  rawSteps: unknown
) => {
  console.log(`[NexusOne SDK][swap] ${eventType} step list`, {
    count: stepList.length,
    eventType,
    rawSteps,
    steps: stepList.map((step, index) => summarizeSdkProgressStep(step, index)),
  });
};

const logSwapPlanProgress = (
  event: any,
  step: SwapStepType | BridgeStepType,
  eventName: string,
  completed: boolean
) => {
  console.log("[NexusOne SDK][swap] plan_progress", {
    completed,
    eventName,
    eventType: getSdkEventType(event),
    normalizedStep: summarizeSdkProgressStep(step),
    rawEvent: event,
    rawStep: event?.step,
    state: event?.state,
    stepType: event?.stepType,
  });
};

const getFailureMessageForProgressStep = (
  step: SwapStepType | BridgeStepType | null | undefined,
  mode: NexusOneMode,
  autoRefundAvailable = false
) => {
  if (autoRefundAvailable) {
    return "Swap Failed. Refund Initiated";
  }

  const type = getProgressStepType(step);
  if (
    type.includes("CREATE_PERMIT_FOR_SOURCE_SWAP") ||
    type.includes("CREATE_PERMIT_EOA_TO_EPHEMERAL") ||
    type.includes("EOA_EXECUTE_CALL") ||
    type.includes("SOURCE_SWAP") ||
    type.includes("COLLECTION")
  ) {
    return "Collection Failed";
  }
  if (type.includes("DESTINATION_SWAP") || type.includes("FULFIL")) {
    return "Destination Swap Failed";
  }
  if (
    type.includes("TRANSACTION") ||
    type.includes("APPROVAL") ||
    type.includes("DEPOSIT")
  ) {
    return mode === "send"
      ? "Send failed. Funds are in your wallet"
      : mode === "deposit"
        ? "Deposit failed. Funds are in your wallet"
        : "Swap Failed";
  }
  if (
    type.includes("SWAP") ||
    type.includes("BRIDGE") ||
    type.includes("INTENT") ||
    type.includes("DETERMINING")
  ) {
    return "Swap Failed";
  }
  return mode === "send"
    ? "Send failed. Funds are in your wallet"
    : mode === "deposit"
      ? "Deposit failed. Funds are in your wallet"
      : "Swap Failed";
};

const getBridgeTokenSymbolForProgressStep = (
  step: SwapStepType | BridgeStepType | null | undefined
) => {
  const rawStep = step as any;
  return (
    getNonEmptyString(
      rawStep?.bridgeToken?.symbol,
      rawStep?.data?.bridgeToken?.symbol,
      rawStep?.bridgeTokenSymbol,
      rawStep?.data?.bridgeTokenSymbol,
      rawStep?.swaps?.[0]?.input?.symbol,
      rawStep?.data?.swaps?.[0]?.input?.symbol,
      rawStep?.input?.symbol,
      rawStep?.data?.input?.symbol,
      rawStep?.asset?.symbol,
      rawStep?.data?.asset?.symbol
    ) ?? "USDC"
  );
};

const getFailureDescriptionForProgressStep = (
  step: SwapStepType | BridgeStepType | null | undefined,
  autoRefundAvailable = false
) => {
  if (autoRefundAvailable) return undefined;
  const type = getProgressStepType(step);
  if (!type.includes("DESTINATION_SWAP")) return undefined;
  const bridgeTokenSymbol = getBridgeTokenSymbolForProgressStep(step);
  return `${bridgeTokenSymbol} has been bridged and you have those funds in your wallet.`;
};

const getSourceRows = (
  entry: SwapHistoryEntry,
  visualSources?: TokenVisualSources
): HistorySourceRow[] => {
  const sources = (entry.intentData?.sources ?? []).filter(
    (source) =>
      !isSwapExactOutDestinationHistorySource(entry, {
        chainId: source.chain.id,
        contractAddress: source.token.contractAddress,
        symbol: source.token.symbol,
      })
  );
  const fallbackSourceTokens = entry.fromTokens.filter(
    (token) =>
      !isSwapExactOutDestinationHistorySource(entry, {
        chainId: token.chainId,
        contractAddress: token.contractAddress,
        symbol: token.symbol,
      })
  );
  const entryVisualSources = getEntryVisualSources(entry, visualSources);
  const displayDestinationSourceRow = getDisplayDestinationSourceRow(
    entry,
    visualSources
  );
  if (sources.length > 0) {
    const sourceRows = sources.map((source, index) => {
      const fallback = fallbackSourceTokens.find(
        (token) =>
          token.chainId === source.chain.id &&
          (token.contractAddress?.toLowerCase() ===
            source.token.contractAddress?.toLowerCase() ||
            token.symbol === source.token.symbol)
      );
      const sourceVisuals = resolveTokenVisuals(
        {
          chainId: source.chain.id,
          chainLogo: source.chain.logo || fallback?.chainLogo,
          chainName: source.chain.name || fallback?.chainName,
          contractAddress:
            source.token.contractAddress || fallback?.contractAddress,
          decimals: source.token.decimals ?? fallback?.decimals,
          name: fallback?.name ?? source.token.symbol,
          symbol: source.token.symbol || fallback?.symbol,
          tokenLogo: (source.token as any)?.logo || fallback?.logo,
        },
        entryVisualSources
      );

      return {
        key: `${source.chain.id}-${source.token.contractAddress}-${index}`,
        chainId: source.chain.id,
        contractAddress: source.token.contractAddress,
        tokenLogo: sourceVisuals.tokenLogo,
        chainLogo: sourceVisuals.chainLogo,
        symbol: sourceVisuals.symbol || source.token.symbol,
        chainName:
          sourceVisuals.chainName ||
          getShortChainName(source.chain.id, source.chain.name),
        amount: source.amount,
        value: source.value,
      };
    });

    return mergeHistorySourceRows(
      displayDestinationSourceRow
        ? [displayDestinationSourceRow, ...sourceRows]
        : sourceRows
    );
  }

  const fallbackRows = fallbackSourceTokens.map((token, index) => {
    const tokenVisuals = resolveTokenVisuals(
      {
        chainId: token.chainId,
        chainLogo: token.chainLogo,
        chainName: token.chainName,
        contractAddress: token.contractAddress,
        decimals: token.decimals,
        name: token.name,
        symbol: token.symbol,
        tokenLogo: token.logo,
      },
      entryVisualSources
    );

    return {
      key: `${token.chainId}-${token.contractAddress}-${index}`,
      chainId: token.chainId,
      contractAddress: token.contractAddress,
      tokenLogo: tokenVisuals.tokenLogo,
      chainLogo: tokenVisuals.chainLogo,
      symbol: tokenVisuals.symbol || token.symbol,
      chainName:
        tokenVisuals.chainName ||
        getShortChainName(token.chainId, token.chainName),
      amount: token.userAmount || "0",
      value: token.balanceInFiat,
    };
  });

  return mergeHistorySourceRows(
    displayDestinationSourceRow
      ? [displayDestinationSourceRow, ...fallbackRows]
      : fallbackRows
  );
};

function SourceRowsList({
  entry,
  maxHeight = 236,
  borderTopFirst = true,
  scrollAfterRows = 4,
  visualSources,
}: {
  entry: SwapHistoryEntry;
  maxHeight?: number;
  borderTopFirst?: boolean;
  scrollAfterRows?: number;
  visualSources?: TokenVisualSources;
}) {
  const rows = getSourceRows(entry, visualSources);
  const shouldScroll = rows.length > scrollAfterRows;
  const scrollRef = useRef<HTMLDivElement | null>(null);

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={scrollRef}
        style={{
          maxHeight: shouldScroll ? maxHeight : undefined,
          overflowY: shouldScroll ? "auto" : undefined,
        }}
      >
        {rows.map((row, index) => (
          <div
            key={row.key}
            style={{
              alignItems: "center",
              borderTop:
                borderTopFirst || index > 0 ? "1px solid #E8E8E7" : "none",
              display: "flex",
              justifyContent: "space-between",
              minHeight: "64px",
              padding: "10px 20px",
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                gap: "10px",
                minWidth: 0,
              }}
            >
              <TokenLogoPair
                chainLogo={row.chainLogo}
                chainName={row.chainName}
                tokenLogo={row.tokenLogo}
                tokenSymbol={row.symbol}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span
                  style={{
                    color: "#161615",
                    fontFamily: uiFont,
                    fontSize: "15px",
                    fontWeight: 600,
                  }}
                >
                  {row.symbol}
                </span>
                <span
                  style={{
                    color: "#848483",
                    fontFamily: uiFont,
                    fontSize: "14px",
                  }}
                >
                  on {row.chainName || "Unknown chain"}
                </span>
              </div>
            </div>
            <div
              style={{
                alignItems: "flex-end",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                textAlign: "right",
              }}
            >
              <span
                style={{
                  color: "#161615",
                  fontFamily: uiFont,
                  fontSize: "15px",
                }}
              >
                {formatTokenDisplay(row.amount)} {row.symbol}
              </span>
              <span
                style={{
                  color: "#848483",
                  fontFamily: uiFont,
                  fontSize: "14px",
                }}
              >
                {formatUsdDisplay(row.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
      {shouldScroll && (
        <button
          aria-label="Scroll source assets"
          onClick={() =>
            scrollRef.current?.scrollBy({ top: 72, behavior: "smooth" })
          }
          style={{
            alignItems: "center",
            background: "#FFFFFE",
            border: "1px solid #E8E8E7",
            borderRadius: "999px",
            bottom: "6px",
            boxShadow: "0 2px 8px rgba(22,22,21,0.08)",
            display: "flex",
            height: "22px",
            justifyContent: "center",
            left: "50%",
            padding: 0,
            position: "absolute",
            transform: "translateX(-50%)",
            width: "22px",
          }}
          type="button"
        >
          <ChevronDown color="#848483" size={14} />
        </button>
      )}
    </div>
  );
}

function SwapReceiptPanel({
  entry,
  onDone,
  visualSources,
}: {
  entry: SwapHistoryEntry;
  onDone: () => void;
  visualSources?: TokenVisualSources;
}) {
  const [showSourceDetails, setShowSourceDetails] = useState(false);
  const destination = entry.intentData?.destination;
  const destinationVisuals = getDestinationVisuals(entry, visualSources);
  const isFailed = entry.status === "failed";
  const isTimeout = entry.status === "timeout";
  const isDeposit = entry.mode === "deposit";
  const isSend = entry.mode === "send";
  const isExactOut = isDeposit || isSend || entry.swapType === "exactOut";
  const isRecipientTransfer = isSend || Boolean(entry.recipientAddress);
  const tokenSymbol =
    destinationVisuals.symbol ||
    destination?.token.symbol ||
    entry.toToken?.symbol ||
    "";
  const chainName =
    destinationVisuals.chainName ||
    getShortChainName(
      destination?.chain.id ?? entry.toToken?.chainId,
      destination?.chain.name || entry.toToken?.chainName || ""
    );
  const depositVenue =
    entry.opportunity?.title || entry.opportunity?.protocol || chainName;
  const amount = destination?.amount || "";
  const requestedExactOutAmount =
    isExactOut && entry.requestedToAmount ? entry.requestedToAmount : undefined;
  const requestedExactOutValue =
    isExactOut && entry.requestedToValue ? entry.requestedToValue : undefined;
  const value = requestedExactOutValue || destination?.value;
  const displayAmount = requestedExactOutAmount || amount;
  const showIntentExplorer = hasValidIntentExplorer(entry);
  const intentLabel = entry.intentId
    ? `Intent #${entry.intentId}`
    : "View Explorer";
  const sourceRows = getSourceRows(entry, visualSources);
  const sourceCount = sourceRows.length;
  const sourceTotalUsd = sourceRows.reduce(
    (sum, source) => sum.plus(parseDecimalLoose(source.value) ?? 0),
    new Decimal(0)
  );
  const defaultSwapFailureHeadline = entry.autoRefundAvailable
    ? "Swap Failed. Refund Initiated"
    : "Swap Failed";
  const entryFailureMessage =
    entry.status === "timeout" ? TIMEOUT_LABEL : entry.failureMessage;
  const storedFailureMessage =
    !entry.autoRefundAvailable && entryFailureMessage?.includes("Refund")
      ? undefined
      : entryFailureMessage;
  const failureHeadline =
    storedFailureMessage ||
    (isDeposit
      ? "Deposit failed. Funds are in your wallet"
      : isRecipientTransfer
        ? "Send failed. Funds are in your wallet"
        : defaultSwapFailureHeadline);
  const failureDescription = isFailed ? entry.failureDescription : undefined;
  const timeoutHeadline = TIMEOUT_LABEL;
  const timeoutDescription = isTimeout
    ? entry.failureDescription ||
      "This transaction is still pending. Check the intent explorer for the latest status."
    : undefined;
  const receiptLocation = isDeposit ? depositVenue : chainName;
  const receiptSummary = receiptLocation ? `on ${receiptLocation}` : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
      }}
    >
      <div
        style={{
          background: isFailed
            ? "linear-gradient(0deg, #FFFFFE 0%, #FFF0F2 100%)"
            : isTimeout
              ? "linear-gradient(0deg, #FFFFFE 0%, #FFFBF0 100%)"
              : "linear-gradient(0deg, #FFFFFE 0%, #F0FFF3 100%)",
          border: "1px solid #F5F5F5",
          borderRadius: "24px 24px 12px 12px",
          padding: "20px 16px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            marginBottom: "10px",
            position: "relative",
          }}
        >
          <MiniLogo
            fontSize={17}
            label={tokenSymbol}
            size={45}
            src={
              isDeposit
                ? entry.opportunity?.logo || destinationVisuals.tokenLogo
                : destinationVisuals.tokenLogo
            }
          />
          <div
            style={{
              alignItems: "center",
              background: isFailed
                ? "#E92C2C"
                : isTimeout
                  ? "#B7791F"
                  : "#006BF4",
              border: "2px solid #FFFFFE",
              borderRadius: "999px",
              bottom: -2,
              color: "#FFFFFE",
              display: "flex",
              fontFamily: uiFont,
              fontSize: "14px",
              fontWeight: 700,
              height: "18px",
              justifyContent: "center",
              position: "absolute",
              right: -4,
              width: "18px",
            }}
          >
            {isFailed ? "x" : isTimeout ? "!" : "✓"}
          </div>
        </div>
        <div style={{ color: "#848483", fontFamily: uiFont, fontSize: "14px" }}>
          {isTimeout
            ? timeoutHeadline
            : isFailed
              ? failureHeadline
              : isDeposit
                ? "You deposited"
                : isRecipientTransfer
                  ? "You sent"
                  : "You received"}
        </div>
        {(failureDescription || timeoutDescription) && (
          <div
            style={{
              color: "#848483",
              fontFamily: uiFont,
              fontSize: "13px",
              lineHeight: "18px",
              margin: "6px auto 0",
              maxWidth: "260px",
            }}
          >
            {failureDescription || timeoutDescription}
          </div>
        )}
        <div
          style={{
            alignItems: "baseline",
            color: "#161615",
            display: "flex",
            fontFamily: '"Delight-Medium", "Delight", system-ui, sans-serif',
            fontSize: "36px",
            fontWeight: 500,
            gap: "7px",
            justifyContent: "center",
            lineHeight: "40px",
            marginTop: "5px",
          }}
        >
          {displayAmount ? formatTokenDisplay(displayAmount) : "--"}
          <span
            style={{ fontFamily: uiFont, fontSize: "14px", fontWeight: 600 }}
          >
            {tokenSymbol}
          </span>
        </div>
        <div style={{ color: "#848483", fontFamily: uiFont, fontSize: "14px" }}>
          ≈ {formatUsdDisplay(value)}
        </div>
        {receiptSummary && (
          <div
            style={{
              color: "#848483",
              fontFamily: uiFont,
              fontSize: "14px",
              marginTop: "8px",
            }}
          >
            {receiptSummary}
          </div>
        )}
      </div>

      <div
        style={{
          background: "#FFFFFE",
          border: "1px solid #F5F5F5",
          borderRadius: "12px 12px 24px 24px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            padding: "16px",
          }}
        >
          <span
            style={{ color: "#848483", fontFamily: uiFont, fontSize: "14px" }}
          >
            {isDeposit || isSend ? "You Paid" : "You Swapped"}
          </span>
          <div
            style={{
              alignItems: "flex-end",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              textAlign: "right",
            }}
          >
            <div
              style={{
                color: "#161615",
                fontFamily: uiFont,
                fontSize: "16px",
                fontWeight: 500,
              }}
            >
              {formatUsdDisplay(sourceTotalUsd)}
            </div>
            <button
              onClick={() => setShowSourceDetails((current) => !current)}
              style={{
                alignItems: "center",
                background: "transparent",
                border: "none",
                color: "#006BF4",
                cursor: "pointer",
                display: "inline-flex",
                fontFamily: uiFont,
                fontSize: "14px",
                gap: "4px",
                padding: 0,
              }}
              type="button"
            >
              {showSourceDetails
                ? "Hide Details"
                : `${sourceCount} asset${sourceCount === 1 ? "" : "s"}`}
              <ChevronDown
                size={14}
                style={{
                  transform: showSourceDetails
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 180ms ease",
                }}
              />
            </button>
          </div>
        </div>
        <div
          aria-hidden={!showSourceDetails}
          style={{
            borderTop: showSourceDetails ? "1px solid #F5F5F5" : 0,
            display: "grid",
            gridTemplateRows: showSourceDetails ? "1fr" : "0fr",
            opacity: showSourceDetails ? 1 : 0,
            overflow: "hidden",
            transition:
              "grid-template-rows 220ms ease, opacity 180ms ease, border-top-width 220ms ease",
          }}
        >
          <div style={{ minHeight: 0, overflow: "hidden" }}>
            <SourceRowsList
              borderTopFirst={false}
              entry={entry}
              maxHeight={isDeposit ? 184 : 212}
              scrollAfterRows={isDeposit ? 3 : 4}
              visualSources={visualSources}
            />
          </div>
        </div>
        {isRecipientTransfer && entry.recipientAddress && (
          <div
            style={{
              alignItems: "center",
              borderTop: "1px solid #F5F5F5",
              display: "flex",
              justifyContent: "space-between",
              padding: "13px 16px",
            }}
          >
            <span
              style={{ color: "#848483", fontFamily: uiFont, fontSize: "14px" }}
            >
              Recipient
            </span>
            <TruncatedAddress address={entry.recipientAddress} />
          </div>
        )}
        {showIntentExplorer && (
          <div
            style={{
              alignItems: "center",
              borderTop: "1px solid #F5F5F5",
              display: "flex",
              justifyContent: "space-between",
              padding: "13px 16px",
            }}
          >
            <span
              style={{ color: "#848483", fontFamily: uiFont, fontSize: "14px" }}
            >
              Intent Explorer
            </span>
            <a
              href={entry.intentExplorerUrl ?? undefined}
              rel="noopener noreferrer"
              style={{ color: "#006BF4", fontFamily: uiFont, fontSize: "14px" }}
              target="_blank"
            >
              {intentLabel} ↗
            </a>
          </div>
        )}
        {entry.finalExplorerUrl && (
          <div
            style={{
              alignItems: "center",
              borderTop: "1px solid #F5F5F5",
              display: "flex",
              justifyContent: "space-between",
              padding: "13px 16px",
            }}
          >
            <span
              style={{ color: "#848483", fontFamily: uiFont, fontSize: "14px" }}
            >
              Final Transaction
            </span>
            <a
              href={entry.finalExplorerUrl}
              rel="noopener noreferrer"
              style={{ color: "#006BF4", fontFamily: uiFont, fontSize: "14px" }}
              target="_blank"
            >
              View Explorer ↗
            </a>
          </div>
        )}
        <div
          style={{
            alignItems: "center",
            borderTop: "1px solid #F5F5F5",
            display: "flex",
            justifyContent: "space-between",
            padding: "13px 16px",
          }}
        >
          <span
            style={{ color: "#848483", fontFamily: uiFont, fontSize: "14px" }}
          >
            Total Fees
          </span>
          <span
            style={{ color: "#161615", fontFamily: uiFont, fontSize: "14px" }}
          >
            {formatUsdDisplay(entry.feeUsd)}
          </span>
        </div>
      </div>

      <button
        onClick={onDone}
        style={{
          alignItems: "center",
          background: "#1F1F1F",
          border: "none",
          borderRadius: "999px",
          color: "#FFFFFE",
          cursor: "pointer",
          display: "flex",
          fontFamily: uiFont,
          fontSize: "16px",
          fontWeight: 500,
          height: "48px",
          justifyContent: "center",
          lineHeight: "20px",
          paddingInline: "20px",
          userSelect: "none",
          WebkitUserSelect: "none",
          width: "100%",
        }}
      >
        Done
      </button>
    </div>
  );
}

const getRelativeTime = (time: number, now: number) => {
  const seconds = Math.max(1, Math.floor((now - time) / 1000));
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

function HistoryStatusPill({ status }: { status: SwapHistoryStatus }) {
  const config =
    status === "fulfilled"
      ? { label: "Fulfilled", bg: "#E8F6EF", fg: "#168A47" }
      : status === "pending"
        ? { label: "Pending", bg: "#FFF3DE", fg: "#B7791F" }
        : status === "timeout"
          ? { label: TIMEOUT_LABEL, bg: "#FFF3DE", fg: "#B7791F" }
          : status === "refund-initiated"
            ? { label: "Refund Initiated", bg: "#FFF3DE", fg: "#B7791F" }
            : { label: "Failed", bg: "#FFE6EA", fg: "#E92C2C" };

  return (
    <span
      style={{
        background: config.bg,
        borderRadius: "999px",
        color: config.fg,
        fontFamily: uiFont,
        fontSize: "12px",
        fontWeight: 600,
        lineHeight: "16px",
        padding: "3px 8px",
      }}
    >
      {config.label}
    </span>
  );
}

function SwapHistoryPanel({
  entries,
  now,
  visualSources,
}: {
  entries: SwapHistoryEntry[];
  now: number;
  visualSources?: TokenVisualSources;
}) {
  if (entries.length === 0) {
    return (
      <div
        style={{
          alignItems: "center",
          backgroundColor: "#FFFFFE",
          border: "1px solid #E8E8E7",
          borderRadius: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          justifyContent: "center",
          padding: "48px 24px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            backgroundColor: "#F4F4F3",
            borderRadius: "999px",
            display: "flex",
            height: "48px",
            justifyContent: "center",
            width: "48px",
          }}
        >
          <span
            style={{ color: "#848483", fontFamily: uiFont, fontSize: "25px" }}
          >
            ↻
          </span>
        </div>
        <div
          style={{
            color: "#161615",
            fontFamily: uiFont,
            fontSize: "16px",
            fontWeight: 500,
          }}
        >
          No transactions yet
        </div>
        <div
          style={{
            color: "#848483",
            fontFamily: uiFont,
            fontSize: "13px",
            lineHeight: "17px",
            maxWidth: "280px",
            textAlign: "center",
          }}
        >
          Your transaction history will appear here once you make your first
          swap, deposit, or send.
        </div>
      </div>
    );
  }

  const sortedEntries = sortSwapHistoryEntries(entries);
  const shouldScroll = sortedEntries.length > 5;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        maxHeight: shouldScroll ? "660px" : undefined,
        overflowY: shouldScroll ? "auto" : undefined,
        paddingRight: shouldScroll ? "4px" : undefined,
        width: "100%",
      }}
    >
      {sortedEntries.map((entry) => {
        const destination = entry.intentData?.destination;
        const destinationVisuals = getDestinationVisuals(entry, visualSources);
        const destinationLogo = destinationVisuals.tokenLogo;
        const destinationChainLogo = destinationVisuals.chainLogo || "";
        const destinationChainName =
          destinationVisuals.chainName ||
          getShortChainName(
            destination?.chain.id ?? entry.toToken?.chainId,
            destination?.chain.name || entry.toToken?.chainName || ""
          );
        const destinationSymbol =
          destinationVisuals.symbol ||
          destination?.token.symbol ||
          entry.toToken?.symbol ||
          "";
        const isExactOutEntry =
          entry.mode === "deposit" ||
          entry.mode === "send" ||
          entry.swapType === "exactOut";
        const destinationValue =
          isExactOutEntry && entry.requestedToValue
            ? entry.requestedToValue
            : destination?.value;
        const destinationAmount =
          isExactOutEntry && entry.requestedToAmount
            ? entry.requestedToAmount
            : destination?.amount || "";
        const canShowRefund =
          entry.status === "failed" && Boolean(entry.autoRefundAvailable);
        const status = canShowRefund ? "refund-initiated" : entry.status;
        const sourceRows = getSourceRows(entry, visualSources);
        const historyExplorerUrl = getHistoryExplorerUrl(entry);

        return (
          <div
            key={entry.id}
            style={{
              background: "#FFFFFE",
              border: "1px solid #E8E8E7",
              borderRadius: "10px",
              boxShadow: "0px 1px 12px 0px #5B5B5B0D",
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{ alignItems: "center", display: "flex", gap: "12px" }}
              >
                <TokenLogoPair
                  chainLogo={destinationChainLogo}
                  chainName={destinationChainName}
                  size={34}
                  tokenLogo={destinationLogo}
                  tokenSymbol={destinationSymbol}
                />
                <div>
                  <div
                    style={{
                      alignItems: "baseline",
                      color: "#161615",
                      display: "flex",
                      fontFamily: uiFont,
                      fontSize: "17px",
                      fontWeight: 700,
                      gap: "6px",
                      lineHeight: "22px",
                    }}
                  >
                    {destinationAmount
                      ? formatTokenDisplay(destinationAmount)
                      : "--"}
                    <span
                      style={{
                        color: "#848483",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      {destinationSymbol}
                    </span>
                  </div>
                  <div
                    style={{
                      color: "#848483",
                      fontFamily: uiFont,
                      fontSize: "13px",
                      lineHeight: "17px",
                    }}
                  >
                    ≈ {formatUsdDisplay(destinationValue)}
                  </div>
                </div>
              </div>
              <div
                style={{
                  alignItems: "flex-end",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <HistoryStatusPill status={status} />
                <span
                  style={{
                    color: "#848483",
                    fontFamily: uiFont,
                    fontSize: "12px",
                    lineHeight: "16px",
                  }}
                >
                  {getRelativeTime(entry.createdAt ?? entry.startedAt, now)}
                </span>
              </div>
            </div>

            {canShowRefund && (
              <div
                style={{
                  alignItems: "center",
                  background: "#FFF3F3",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "12px",
                  padding: "8px 10px",
                }}
              >
                <span
                  style={{
                    color: "#161615",
                    fontFamily: uiFont,
                    fontSize: "13px",
                  }}
                >
                  Refund Initiated
                </span>
              </div>
            )}

            <div
              style={{
                alignItems: "center",
                borderTop: "1px solid #E8E8E7",
                display: "flex",
                justifyContent: "space-between",
                marginTop: "12px",
                paddingTop: "10px",
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: "8px",
                  minWidth: 0,
                }}
              >
                {sourceRows.length > 0 && (
                  <SourceLogoStack size={21} sources={sourceRows} />
                )}
                <span
                  style={{
                    color: "#848483",
                    fontFamily: uiFont,
                    fontSize: "13px",
                  }}
                >
                  →
                </span>
                <TokenLogoPair
                  chainLogo={destinationChainLogo}
                  chainName={destinationChainName}
                  size={21}
                  tokenLogo={destinationLogo}
                  tokenSymbol={destinationSymbol}
                />
              </div>
              {historyExplorerUrl && (
                <a
                  aria-label="View transaction"
                  href={historyExplorerUrl}
                  rel="noopener noreferrer"
                  style={{
                    alignItems: "center",
                    boxSizing: "border-box",
                    color: "#006BF4",
                    display: "inline-flex",
                    fontSize: "12px",
                    fontSynthesis: "none",
                    lineHeight: "16px",
                    MozOsxFontSmoothing: "grayscale",
                    textDecoration: "none",
                    WebkitFontSmoothing: "antialiased",
                  }}
                  target="_blank"
                >
                  <span
                    style={{
                      boxSizing: "border-box",
                      color: "#006BF4",
                      fontFamily: uiFont,
                      fontSize: "12px",
                      fontWeight: 500,
                      lineHeight: "20px",
                      whiteSpace: "pre",
                    }}
                  >
                    View
                  </span>
                  <svg
                    height="11"
                    style={{
                      flexShrink: 0,
                      height: "auto",
                      width: "13px",
                    }}
                    viewBox="0 0 14 14"
                    width="11"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 5H9V9"
                      fill="none"
                      stroke="#006BF4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.4"
                    />
                    <path
                      d="M5 9L9 5"
                      fill="none"
                      stroke="#006BF4"
                      strokeLinecap="round"
                      strokeWidth="1.4"
                    />
                  </svg>
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NexusOne
// ---------------------------------------------------------------------------

export function NexusOne(props: NexusOneProps) {
  return (
    <ErrorBoundary
      fallback={
        <div
          style={{
            alignItems: "center",
            backgroundColor: "#FFFFFE",
            borderColor: "#E8E8E7",
            borderRadius: "12px",
            borderStyle: "solid",
            borderWidth: "1px",
            boxShadow: "#1616150A 0px 1px 2px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
            minHeight: "300px",
            maxWidth: "460px",
            margin: "0 auto",
            fontFamily: '"Geist", system-ui, sans-serif',
          }}
        >
          <div style={{ color: "#D32F2F", fontSize: "18px", fontWeight: 600 }}>
            Something went wrong
          </div>
          <div
            style={{ color: "#848483", fontSize: "15px", lineHeight: "20px" }}
          >
            An unexpected error occurred. Please refresh the page or try
            resetting the widget.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#006BF4",
              border: "none",
              borderRadius: "8px",
              color: "#FFFFFE",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: 500,
              padding: "8px 16px",
              transition: "background-color 0.15s ease-out",
            }}
            type="button"
          >
            Reload Page
          </button>
        </div>
      }
    >
      <NexusOneInner {...props} />
    </ErrorBoundary>
  );
}

function NexusOneInner({
  config,
  embed = true,
  className,
  connectedAddress,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  onComplete,
  onStart,
  onError,
  onReceiveAssetChange,
  onClose,
  onConnectWallet,
}: NexusOneProps) {
  const { appConfig, chainFeatures } = useRuntime();
  const {
    nexusSDK,
    nexusInitError,
    bridgableBalance,
    swapBalance,
    getFiatValue,
    resolveTokenUsdRate,
    swapSupportedChainsAndTokens,
    supportedChainsAndTokens,
    fetchSwapBalance,
    handleInit,
    swapIntent: providerSwapIntent,
    loading: nexusLoading,
  } = useNexus();

  // Mode is a single value, not an array
  const activeMode = config.mode;
  const configuredDeposit = getConfiguredDeposit(config);
  const configuredDepositIdentity = getDepositConfigIdentity(configuredDeposit);
  if (activeMode === "deposit" && !configuredDeposit) {
    throw new Error("NexusOne deposit mode requires config.deposit.");
  }
  const showCloseButton = !embed && Boolean(onClose);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlledOpen = controlledOpen !== undefined;
  const isModalOpen = isControlledOpen ? controlledOpen : internalOpen;

  // Preload receive tokens once SDK is available
  useEffect(() => {
    if (nexusSDK) {
      preloadReceiveTokens();
    }
  }, [nexusSDK]);

  const { connector, status: walletStatus } = useAccount();
  const {
    connectors,
    connectAsync,
    isPending: isWalletConnectPending,
  } = useConnect();
  const { data: walletClient } = useWalletClient();
  const { data: connectorClient } = useConnectorClient();
  const publicClient = usePublicClient();
  const walletClientAddress = walletClient?.account?.address;
  const ownerAddress =
    connectedAddress &&
    isAddress(connectedAddress) &&
    connectedAddress.toLowerCase() !== zeroAddress
      ? connectedAddress
      : walletClientAddress &&
          isAddress(walletClientAddress) &&
          walletClientAddress.toLowerCase() !== zeroAddress
        ? walletClientAddress
        : undefined;
  const historyStorageKey = getSwapHistoryStorageKey(ownerAddress);

  // Global form state
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isRecipientUserEdited, setIsRecipientUserEdited] = useState(false);
  const [editingAssetIndex, setEditingAssetIndex] = useState<number | null>(
    null
  );
  const [txError, setTxError] = useState<string | null>(null);
  const [walletActionPending, setWalletActionPending] = useState(false);
  const defaultRecipientAddress = ownerAddress ?? "";
  const effectiveRecipientAddress =
    activeMode === "swap"
      ? recipientAddress || defaultRecipientAddress
      : recipientAddress;
  const hasSameOwnerSendRecipient =
    activeMode === "send" &&
    Boolean(
      ownerAddress &&
        recipientAddress &&
        isAddress(recipientAddress) &&
        recipientAddress.toLowerCase() === ownerAddress.toLowerCase()
    );
  const hasCustomSwapRecipient =
    activeMode === "swap" &&
    Boolean(
      recipientAddress &&
        (!defaultRecipientAddress ||
          recipientAddress.toLowerCase() !==
            defaultRecipientAddress.toLowerCase())
    );
  const transferRecipientAddress =
    activeMode === "send"
      ? recipientAddress
      : hasCustomSwapRecipient
        ? recipientAddress
        : undefined;
  const previousDefaultRecipientRef = useRef(defaultRecipientAddress);

  // Swap-specific
  const [swapType, setSwapType] = useState<SwapType>(() =>
    activeMode === "swap" && readSwapParam() === "out" ? "exactOut" : "exactIn"
  );
  const isSwapExactOut = activeMode === "swap" && swapType === "exactOut";
  const isExactOutPaymentFlow =
    activeMode === "deposit" || activeMode === "send" || isSwapExactOut;
  const [swapStep, setSwapStep] = useState<SwapStep>("idle");
  const drawerCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const terminalBalanceRefreshTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [closingDrawerStep, setClosingDrawerStep] = useState<SwapStep | null>(
    null
  );
  const rootContentRef = useRef<HTMLDivElement | null>(null);
  const [rootContentHeight, setRootContentHeight] = useState<number | null>(
    null
  );
  const rootContentHeightRef = useRef<number | null>(null);
  const [hasMeasuredRootContent, setHasMeasuredRootContent] = useState(false);
  const [shouldAnimateRootHeight, setShouldAnimateRootHeight] = useState(false);
  const [isRootHeightLockedForTransition, setIsRootHeightLockedForTransition] =
    useState(false);
  const [isPreviewTransitioning, setIsPreviewTransitioning] = useState(false);
  const rootHeightTransitionTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [isMultiAssetMode, setIsMultiAssetMode] = useState<boolean>(
    readMultiAssetModeFromStorage
  );

  useEffect(() => {
    writeMultiAssetModeToStorage(isMultiAssetMode);
  }, [isMultiAssetMode]);
  const [fromTokens, setFromTokens] = useState<SwapTokenOption[]>([]);
  const [sourceSelectionTouched, setSourceSelectionTouched] = useState(false);
  const [sourceSelectionRevision, setSourceSelectionRevision] = useState(0);
  const [sourcePickerDraftTokens, setSourcePickerDraftTokens] = useState<
    SwapTokenOption[] | null
  >(null);
  const [sourcePickerDraftTouched, setSourcePickerDraftTouched] =
    useState(false);
  const sourcePickerDraftTokensRef = useRef<SwapTokenOption[] | null>(null);
  const sourcePickerDraftDepositFilterRef = useRef<DepositSourceFilter>("all");
  const sourcePickerDraftTouchedRef = useRef(false);
  const sourcePickerDraftModeRef = useRef<"all" | "selected">("all");
  const [exactOutQuoteSourceMode, setExactOutQuoteSourceMode] = useState<
    "all" | "selected"
  >("all");
  const exactOutQuoteSourceModeRef = useRef<"all" | "selected">("all");
  const [toToken, setToToken] = useState<SwapTokenOption | undefined>(
    undefined
  );
  const [disconnectedAvailableTokens, setDisconnectedAvailableTokens] =
    useState<SwapTokenOption[]>([]);
  useEffect(() => {
    let active = true;
    void getAllReceiveTokenOptions(swapSupportedChainsAndTokens).then(
      (tokens) => {
        if (active && tokens.length > 0) {
          const isNativeAddr = (address?: string) =>
            !address ||
            address.toLowerCase() ===
              "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
            address.toLowerCase() ===
              "0x0000000000000000000000000000000000000000";
          const filtered = tokens.filter((token) => {
            const sym = token.symbol.toUpperCase();
            const isUsdc = sym === "USDC" || sym === "USDC.E";
            const isUsdt = sym === "USDT";
            const isNative = isNativeAddr(token.contractAddress);
            return isUsdc || isUsdt || isNative;
          });
          setDisconnectedAvailableTokens(filtered);
        }
      }
    );
    return () => {
      active = false;
    };
  }, [swapSupportedChainsAndTokens]);

  const previousOwnerAddressRef = useRef<string | undefined>(ownerAddress);

  useEffect(() => {
    const prevOwner = previousOwnerAddressRef.current;
    previousOwnerAddressRef.current = ownerAddress;

    if (!prevOwner && ownerAddress) {
      setFromTokens([]);
      setAmount("");
      clearPendingSwapIntent();
      setSwapQuoteIssue(null);
      setReceiveAmountIssue(null);
      setPredictiveQuote(null);
    }
  }, [ownerAddress]);

  const toTokenQuoteKey = getTokenQuoteKey(toToken);
  const appliedTokenPrefillRef = useRef<string | null>(null);

  useEffect(() => {
    if (!toToken?.chainId || !toToken.contractAddress) return;

    let active = true;
    const selectedTokenKey = getTokenSelectionKey(toToken);
    const applyLoadedReceiveToken = () => {
      if (!active) return;
      const loadedToken = getCachedReceiveTokenMatch(toToken);
      if (!loadedToken) return;

      setToToken((current) => {
        if (!current || getTokenSelectionKey(current) !== selectedTokenKey) {
          return current;
        }

        const chainMeta = current.chainId
          ? CHAIN_METADATA[current.chainId]
          : undefined;
        const next = {
          ...current,
          chainLogo:
            loadedToken.chainLogo || current.chainLogo || chainMeta?.logo,
          chainName: getShortChainName(
            current.chainId,
            loadedToken.chainName || current.chainName || chainMeta?.name
          ),
          decimals: loadedToken.decimals ?? current.decimals,
          logo: loadedToken.logo || current.logo,
          name: loadedToken.name || current.name,
          priceUSD: loadedToken.priceUSD ?? current.priceUSD,
          symbol: loadedToken.symbol || current.symbol,
        };

        if (
          current.decimals === next.decimals &&
          current.chainLogo === next.chainLogo &&
          current.chainName === next.chainName &&
          current.logo === next.logo &&
          current.name === next.name &&
          current.priceUSD === next.priceUSD &&
          current.symbol === next.symbol
        ) {
          return current;
        }

        return next;
      });
    };

    applyLoadedReceiveToken();
    const receiveTokensPromise = preloadReceiveTokens();
    receiveTokensPromise?.then(applyLoadedReceiveToken).catch((error) => {
      if (active) {
        console.warn("Unable to refresh receive token metadata", error);
      }
    });

    return () => {
      active = false;
    };
  }, [
    toToken?.chainId,
    toToken?.contractAddress,
    toToken?.decimals,
    toToken?.symbol,
  ]);

  const setExactOutQuoteSourceModeValue = useCallback(
    (mode: "all" | "selected") => {
      exactOutQuoteSourceModeRef.current = mode;
      setExactOutQuoteSourceMode(mode);
    },
    []
  );

  useEffect(() => {
    if (!nexusSDK) return;
    void fetchSwapBalance();
  }, [fetchSwapBalance, nexusSDK]);

  useEffect(() => {
    setSourceSelectionTouched(false);
    setExactOutQuoteSourceModeValue("all");
  }, [activeMode, setExactOutQuoteSourceModeValue]);

  useEffect(() => {
    if (activeMode !== "swap" || !defaultRecipientAddress) return;

    const previousDefault = previousDefaultRecipientRef.current;
    previousDefaultRecipientRef.current = defaultRecipientAddress;

    if (isRecipientUserEdited) return;

    setRecipientAddress((current) => {
      if (
        !current ||
        (previousDefault &&
          current.toLowerCase() === previousDefault.toLowerCase())
      ) {
        return defaultRecipientAddress;
      }
      return current;
    });
  }, [activeMode, defaultRecipientAddress, isRecipientUserEdited]);

  const {
    steps,
    seed,
    onStepsList,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps<SwapStepType>();
  const [progressEvents, setProgressEvents] = useState<NexusOneProgressEvent[]>(
    []
  );
  const progressEventsRef = useRef<NexusOneProgressEvent[]>([]);
  const [rawPlanSteps, setRawPlanSteps] = useState<unknown[]>([]);
  const rawPlanStepsRef = useRef<unknown[]>([]);
  const swapStepsListRef = useRef<SwapStepType[]>([]);
  const [failedProgressStep, setFailedProgressStep] = useState<
    SwapStepType | BridgeStepType | null
  >(null);
  const [explorerUrls, setExplorerUrls] = useState<{
    sourceExplorerUrl: string | null;
    destinationExplorerUrl: string | null;
  }>({ sourceExplorerUrl: null, destinationExplorerUrl: null });
  const swapRunIdRef = useRef(0);

  const widgetSessionIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const widgetAttemptIdRef = useRef<string | null>(null);
  const widgetOpenedTsRef = useRef<number>(Date.now());
  const previewViewedTsRef = useRef<number | null>(null);
  const previewConfirmedTsRef = useRef<number | null>(null);
  const attemptCountRef = useRef(0);
  const fundsMovedRef = useRef(false);
  const intentUrlRef = useRef<string | null>(null);
  const hadSimulationSuccessRef = useRef(false);
  const hadPreviewViewedRef = useRef(false);
  const widgetOpenedFiredRef = useRef(false);
  const reachedTerminalRef = useRef(false);
  const lastIntentSourceTokensRef = useRef<SwapTokenOption[]>([]);
  const lastAutoIntentSourceTokensRef = useRef<SwapTokenOption[]>([]);
  const immediateQuoteAfterSourceEditRef = useRef(false);
  const amountEnteredLastValueRef = useRef<string>("");
  const lastInputMethodRef = useRef<
    "typed" | "percent_20" | "percent_50" | "percent_max"
  >("typed");
  const prevSourceTouchedRef = useRef(false);
  const previousAutoSourceCountRef = useRef(0);
  const analyticsRef = useRef<{
    track: (event: string, properties?: Record<string, unknown>) => void;
  } | null>(null);
  const selectedOpportunityRef = useRef<NexusOneDepositConfig | undefined>(
    undefined
  );

  const newAttemptId = useCallback(() => {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }, []);

  const rotateAttempt = useCallback(() => {
    widgetAttemptIdRef.current = newAttemptId();
    previewViewedTsRef.current = null;
    previewConfirmedTsRef.current = null;
    fundsMovedRef.current = false;
    intentUrlRef.current = null;
    hadSimulationSuccessRef.current = false;
    hadPreviewViewedRef.current = false;
    reachedTerminalRef.current = false;
  }, [newAttemptId]);
  const [intentToAmount, setIntentToAmount] = useState<string | undefined>(
    undefined
  );
  const [intentFeeUsd, setIntentFeeUsd] = useState<string | undefined>(
    undefined
  );
  const [intentLoading, setIntentLoading] = useState(false);
  const [quoteRefreshing, setQuoteRefreshing] = useState(false);
  const [receiveMaxCalculating, setReceiveMaxCalculating] = useState(false);
  const [maxCalculationPercent, setMaxCalculationPercent] = useState<
    number | null
  >(null);
  const maxSwapQuoteCacheRef = useRef<Record<string, CachedMaxSwapQuote>>({});
  const intentDestinationUsdRateCacheRef = useRef<
    Record<string, CachedIntentUsdRate>
  >({});
  const intentSymbolUsdRateCacheRef = useRef<
    Record<string, CachedIntentUsdRate>
  >({});
  const predictiveQuoteCacheRef = useRef<
    Record<string, PredictiveQuoteBaseline>
  >({});
  const predictiveQuoteRunRef = useRef(0);
  const [predictiveQuote, setPredictiveQuote] =
    useState<PredictiveQuote | null>(null);
  const maxPercentRunRef = useRef(0);
  const [previewQuoteRefreshing, setPreviewQuoteRefreshing] = useState(false);
  const [quoteRefreshProgress, setQuoteRefreshProgress] = useState(0);
  const [quoteRefreshSecondsRemaining, setQuoteRefreshSecondsRemaining] =
    useState(0);
  const [intentData, setIntentData] = useState<SwapIntentData | null>(null);
  const [swapQuoteIssue, setSwapQuoteIssue] = useState<SwapQuoteIssue | null>(
    null
  );
  const [receiveAmountIssue, setReceiveAmountIssue] =
    useState<ReceiveAmountIssue | null>(null);
  const receiveAmountIssueRef = useRef<ReceiveAmountIssue | null>(null);
  const receiveAmountIssueKeyRef = useRef("");
  const [transferExplorerUrl, setTransferExplorerUrl] = useState<string | null>(
    null
  );
  const swapStepRef = useRef<SwapStep>(swapStep);
  const syncingIntentSourcesRef = useRef(false);
  const lastSwapIntentRefreshAtRef = useRef(0);
  const [destinationBalance, setDestinationBalance] = useState<string | null>(
    null
  );
  const [swapHistory, setSwapHistory] = useState<SwapHistoryEntry[]>(() =>
    readSwapHistoryFromStorage(historyStorageKey)
  );
  const [currentSwapId, setCurrentSwapId] = useState<string | null>(null);
  const [historyNow, setHistoryNow] = useState(() => Date.now());
  const currentSwapIdRef = useRef<string | null>(null);
  const currentSwapStartedAtRef = useRef(0);
  const historyStorageKeyRef = useRef(historyStorageKey);
  const skipNextHistoryPersistRef = useRef(false);
  const explorerUrlsRef = useRef<{
    sourceExplorerUrl: string | null;
    destinationExplorerUrl: string | null;
  }>({ sourceExplorerUrl: null, destinationExplorerUrl: null });
  const activeQuoteInputKeyRef = useRef("");

  // Ref to store swap intent hook allow/deny callbacks
  const swapIntentRef = useRef<{
    intent?: SwapIntentData;
    allow: () => void;
    deny: () => void;
    refresh: () => Promise<any>;
    runId?: number;
    quoteInputKey?: string;
  } | null>(null);

  useEffect(() => {
    swapStepRef.current = swapStep;
  }, [swapStep]);

  useEffect(() => {
    return () => {
      if (drawerCloseTimerRef.current) {
        clearTimeout(drawerCloseTimerRef.current);
      }
      if (terminalBalanceRefreshTimerRef.current) {
        clearTimeout(terminalBalanceRefreshTimerRef.current);
      }
      if (rootHeightTransitionTimerRef.current) {
        clearTimeout(rootHeightTransitionTimerRef.current);
      }
    };
  }, []);

  const isQuoteEditLocked = useCallback(
    () => swapStepRef.current === "choose-swap-asset",
    []
  );

  const getQuoteRequestDelay = useCallback(() => {
    if (immediateQuoteAfterSourceEditRef.current) {
      immediateQuoteAfterSourceEditRef.current = false;
      return 0;
    }
    return EXACT_OUT_INPUT_DEBOUNCE_MS;
  }, []);

  const closeDrawerToIdle = useCallback(() => {
    const isDrawerStep =
      swapStep === "choose-swap-asset" ||
      swapStep === "choose-receive-asset" ||
      swapStep === "enter-recipient";

    if (!isDrawerStep) {
      swapStepRef.current = "idle";
      setSwapStep("idle");
      return;
    }

    if (drawerCloseTimerRef.current) {
      clearTimeout(drawerCloseTimerRef.current);
    }

    setClosingDrawerStep(swapStep);
    drawerCloseTimerRef.current = setTimeout(() => {
      swapStepRef.current = "idle";
      setSwapStep("idle");
      setClosingDrawerStep(null);
      drawerCloseTimerRef.current = null;
    }, DRAWER_CLOSE_MS);
  }, [swapStep]);

  const openDrawerStep = useCallback((nextStep: SwapStep) => {
    if (drawerCloseTimerRef.current) {
      clearTimeout(drawerCloseTimerRef.current);
      drawerCloseTimerRef.current = null;
    }
    setClosingDrawerStep(null);
    swapStepRef.current = nextStep;
    setSwapStep(nextStep);
  }, []);

  const syncRootContentHeight = useCallback((animate = false) => {
    const element = rootContentRef.current;
    if (!element) return;

    const nextHeight = Math.ceil(
      Math.max(element.getBoundingClientRect().height, element.scrollHeight)
    );
    if (nextHeight <= 0) return;

    if (rootContentHeightRef.current === nextHeight) {
      setHasMeasuredRootContent(true);
      if (animate) {
        setShouldAnimateRootHeight(true);
        if (rootHeightTransitionTimerRef.current) {
          clearTimeout(rootHeightTransitionTimerRef.current);
          rootHeightTransitionTimerRef.current = null;
        }
        rootHeightTransitionTimerRef.current = setTimeout(() => {
          setShouldAnimateRootHeight(false);
          setIsRootHeightLockedForTransition(false);
          rootHeightTransitionTimerRef.current = null;
        }, ROOT_HEIGHT_TRANSITION_MS);
      }
      return;
    }

    rootContentHeightRef.current = nextHeight;
    setShouldAnimateRootHeight(animate);
    if (rootHeightTransitionTimerRef.current) {
      clearTimeout(rootHeightTransitionTimerRef.current);
      rootHeightTransitionTimerRef.current = null;
    }
    if (animate) {
      rootHeightTransitionTimerRef.current = setTimeout(() => {
        setShouldAnimateRootHeight(false);
        setIsRootHeightLockedForTransition(false);
        rootHeightTransitionTimerRef.current = null;
      }, ROOT_HEIGHT_TRANSITION_MS);
    }
    setRootContentHeight(nextHeight);
    setHasMeasuredRootContent(true);
  }, []);

  useLayoutEffect(() => {
    syncRootContentHeight(true);

    const element = rootContentRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      frame = window.requestAnimationFrame(() => {
        syncRootContentHeight(true);
      });
    });

    observer.observe(element);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      observer.disconnect();
    };
  }, [activeMode, swapStep, isMultiAssetMode, syncRootContentHeight]);

  useEffect(() => {
    currentSwapIdRef.current = currentSwapId;
  }, [currentSwapId]);

  useEffect(() => {
    if (historyStorageKeyRef.current === historyStorageKey) return;
    historyStorageKeyRef.current = historyStorageKey;
    skipNextHistoryPersistRef.current = true;
    setSwapHistory(readSwapHistoryFromStorage(historyStorageKey));
  }, [historyStorageKey]);

  useEffect(() => {
    if (skipNextHistoryPersistRef.current) {
      skipNextHistoryPersistRef.current = false;
      return;
    }

    writeSwapHistoryToStorage(historyStorageKey, swapHistory);
  }, [historyStorageKey, swapHistory]);

  useEffect(() => {
    if (swapStep !== "history") return;
    const timer = window.setInterval(() => setHistoryNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [swapStep]);

  const normalizeAddress = (value?: string | null) =>
    (value ?? "").toLowerCase();

  const buildIntentSourceToken = (
    source: SwapIntentData["sources"][number]
  ): SwapTokenOption => {
    let matchedAsset: any;
    let matchedBreakdown: any;
    const sourceAddress = normalizeAddress(source.token.contractAddress);

    for (const asset of swapBalance ?? []) {
      for (const breakdown of asset.breakdown ?? []) {
        const addressMatches =
          normalizeAddress(breakdown.contractAddress) === sourceAddress;
        const symbolMatches =
          breakdown.symbol === source.token.symbol ||
          asset.symbol === source.token.symbol;
        if (
          breakdown.chain?.id === source.chain.id &&
          (addressMatches || symbolMatches)
        ) {
          matchedAsset = asset;
          matchedBreakdown = breakdown;
          break;
        }
      }
      if (matchedBreakdown) break;
    }

    const chainMeta = CHAIN_METADATA[source.chain.id];
    const sourceValue = Number((source as any).value ?? 0);
    const isNativeSource = isNativeTokenAddress(source.token.contractAddress);
    const nativeCurrency = chainMeta?.nativeCurrency;
    const sourceSymbol =
      isNativeSource && (!source.token.symbol || !matchedAsset?.logo)
        ? nativeCurrency?.symbol || source.token.symbol
        : source.token.symbol || nativeCurrency?.symbol || "";
    const sourceDecimals =
      isNativeSource && nativeCurrency?.decimals !== undefined
        ? nativeCurrency.decimals
        : source.token.decimals;
    const sourceLogo =
      matchedAsset?.logo ?? (isNativeSource ? chainMeta?.logo : "");

    return {
      contractAddress: source.token.contractAddress,
      symbol: sourceSymbol,
      name: sourceSymbol,
      logo: sourceLogo ?? "",
      decimals: sourceDecimals,
      balance: matchedBreakdown?.balance
        ? `${matchedBreakdown.balance} ${sourceSymbol}`
        : `${source.amount} ${sourceSymbol}`,
      balanceInFiat:
        matchedBreakdown?.balanceInFiat != null
          ? `$${Number(matchedBreakdown.balanceInFiat).toFixed(2)}`
          : Number.isFinite(sourceValue)
            ? `$${sourceValue.toFixed(2)}`
            : "$0.00",
      chainId: source.chain.id,
      chainName: getShortChainName(
        source.chain.id,
        chainMeta?.name ?? source.chain.name
      ),
      chainLogo: chainMeta?.logo ?? source.chain.logo,
      userAmount: source.amount,
      userAmountUsd: Number.isFinite(sourceValue) ? source.value : undefined,
      userAmountMode: "token",
    };
  };

  const clearPendingSwapIntent = (
    clearQuote = true,
    options: { keepQuoteRefreshing?: boolean } = {}
  ) => {
    swapRunIdRef.current += 1;
    swapIntentRef.current?.deny();
    swapIntentRef.current = null;
    setIntentLoading(false);
    setTxError(null);
    if (!options.keepQuoteRefreshing) {
      setQuoteRefreshing(false);
    }
    setReceiveMaxCalculating(false);
    setPreviewQuoteRefreshing(false);
    setSwapQuoteIssue(null);
    resetProgressEvents();
    if (swapStepsListRef.current.length > 0 || steps.length > 0) {
      swapStepsListRef.current = [];
      resetSteps();
    } else {
      swapStepsListRef.current = [];
    }
    if (clearQuote) {
      setIntentToAmount(undefined);
      setIntentFeeUsd(undefined);
      setIntentData(null);
      if (!options.keepQuoteRefreshing) {
        setPredictiveQuote(null);
      }
    }
  };

  const clearSelectedSources = () => {
    setFromTokens((current) => (current.length === 0 ? current : []));
    setSourceSelectionTouched(false);
    setDepositSourceFilter("all");
    setExactOutQuoteSourceModeValue("all");
  };

  const resetExactOutSourcesToAuto = () => {
    setFromTokens((current) => (current.length === 0 ? current : []));
    setSourceSelectionTouched(false);
    setDepositSourceFilter("all");
    setExactOutQuoteSourceModeValue("all");
    setSourceSelectionRevision((current) => current + 1);
  };

  const getSourceAmountInput = (tokens: SwapTokenOption[]) => {
    const total = tokens.reduce(
      (sum, token) => sum + Number(token.userAmount || 0),
      0
    );
    return total > 0 ? String(total) : "";
  };

  const isNativeTokenAddress = (address?: string) =>
    !address ||
    address.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
    address.toLowerCase() === "0x0000000000000000000000000000000000000000";

  const parseFiatNumber = (value: unknown) => {
    if (value === null || value === undefined || value === "") return undefined;
    if (Decimal.isDecimal(value)) return value;
    const raw = String(value).trim();
    const cleaned = SCIENTIFIC_DECIMAL_REGEX.test(raw)
      ? raw
      : raw.replace(/[^0-9.-]/g, "");
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

  const toViemDecimalString = (value: unknown, decimals: number) => {
    const parsed = parseFiatNumber(value);
    if (!parsed || parsed.lte(0)) return "0";
    return parsed
      .toDecimalPlaces(Math.max(0, decimals), Decimal.ROUND_DOWN)
      .toFixed();
  };

  const minimumSourceUsd = new Decimal(0);
  const hasMinimumSourceUsdValue = (value: unknown) =>
    (parseFiatNumber(value) ?? new Decimal(0)).gte(minimumSourceUsd);
  const hasMinimumSourceUsdBalance = (
    token: Pick<SwapTokenOption, "balanceInFiat">
  ) => hasMinimumSourceUsdValue(token.balanceInFiat);
  const filterMinimumSourceUsdTokens = (tokens: SwapTokenOption[]) => tokens;

  const getTokenUsdRateCacheKeyFromParts = (
    chainId?: number,
    contractAddress?: string,
    symbol?: string
  ) => {
    if (!chainId || !symbol) return "";
    return [
      chainId,
      (contractAddress || zeroAddress).toLowerCase(),
      symbol.toUpperCase(),
    ].join(":");
  };

  const getTokenUsdRateCacheKey = (
    token?: Pick<SwapTokenOption, "chainId" | "contractAddress" | "symbol">
  ) =>
    getTokenUsdRateCacheKeyFromParts(
      token?.chainId,
      token?.contractAddress,
      token?.symbol
    );

  const getSymbolUsdRateCacheKey = (symbol?: string) =>
    symbol ? symbol.trim().toUpperCase() : "";

  const getCachedIntentUsdRate = (
    token?: Pick<SwapTokenOption, "chainId" | "contractAddress" | "symbol">
  ) => {
    const tokenKey = getTokenUsdRateCacheKey(token);
    const cached = tokenKey
      ? intentDestinationUsdRateCacheRef.current[tokenKey]
      : undefined;
    const rate = parseFiatNumber(cached?.rate);
    return rate && rate.gt(0) ? rate : undefined;
  };

  const cacheDestinationUsdRateFromIntent = (
    intent?: SwapIntentData | null
  ) => {
    const destination = intent?.destination;
    const amount = parseFiatNumber(destination?.amount);
    const value = parseFiatNumber(destination?.value);
    const chainId = destination?.chain?.id;
    const symbol = destination?.token?.symbol;

    if (
      !amount ||
      !value ||
      amount.lte(0) ||
      value.lte(0) ||
      !chainId ||
      !symbol
    ) {
      return;
    }

    const rate = value.div(amount);
    if (!rate.isFinite() || rate.lte(0)) return;

    const cached: CachedIntentUsdRate = {
      amount: amount.toFixed(),
      rate: rate.toDecimalPlaces(18).toFixed(),
      updatedAt: Date.now(),
      value: value.toFixed(),
    };
    const tokenKey = getTokenUsdRateCacheKeyFromParts(
      chainId,
      destination?.token?.contractAddress,
      symbol
    );
    if (tokenKey) {
      intentDestinationUsdRateCacheRef.current[tokenKey] = cached;
    }

    const symbolKey = getSymbolUsdRateCacheKey(symbol);
    if (symbolKey) {
      intentSymbolUsdRateCacheRef.current[symbolKey] = cached;
    }
  };

  const getSwapBalanceTotalUsd = () =>
    (swapBalance ?? []).reduce((sum, asset) => {
      const breakdown = asset.breakdown ?? [];
      if (breakdown.length > 0) {
        return sum.plus(
          breakdown.reduce((breakdownSum, item) => {
            const value = parseFiatNumber(item.balanceInFiat) ?? new Decimal(0);
            return value.gte(minimumSourceUsd)
              ? breakdownSum.plus(value)
              : breakdownSum;
          }, new Decimal(0))
        );
      }

      const value = parseFiatNumber(asset.balanceInFiat) ?? new Decimal(0);
      return value.gte(minimumSourceUsd) ? sum.plus(value) : sum;
    }, new Decimal(0));

  const getTokenUsdRateFromSupportedChains = (
    chains: any[] | null | undefined,
    chainId?: number,
    contractAddress?: string,
    symbol?: string
  ) => {
    if (!chainId) return undefined;
    const chain = chains?.find(
      (item: any) => Number(item?.id ?? item?.chainId) === chainId
    );
    if (!chain) return undefined;
    const tokens = chain?.tokens ?? chain?.assets ?? [];
    const lookupAddress = contractAddress
      ? getFeeTokenLookupAddress(contractAddress)
      : undefined;
    const lookupSymbol = symbol?.toUpperCase();
    const matchedToken = tokens.find((token: any) => {
      const tokenAddress = getFeeTokenLookupAddress(
        token?.contractAddress ?? token?.address ?? token?.tokenAddress
      );
      const tokenSymbol = (token?.symbol ?? token?.tokenSymbol ?? "")
        .toString()
        .toUpperCase();

      if (lookupSymbol) {
        if (tokenSymbol !== lookupSymbol) return false;
        if (lookupAddress && tokenAddress && tokenAddress !== zeroAddress) {
          return tokenAddress === lookupAddress;
        }
        return true;
      }

      return Boolean(lookupAddress) && tokenAddress === lookupAddress;
    });
    const priceUsd = parseFiatNumber(
      matchedToken?.priceUSD ??
        matchedToken?.priceUsd ??
        matchedToken?.usdPrice ??
        matchedToken?.price
    );
    return priceUsd && priceUsd.gt(0) ? priceUsd : undefined;
  };

  const getDisconnectedUsdRate = (
    token?: Partial<SwapTokenOption> | null
  ): Decimal => {
    if (!token) return new Decimal(0);
    const symbolUpper = (token.symbol ?? "").toUpperCase().trim();
    const chainId = token.chainId;
    const contractAddr = (token.contractAddress ?? "").toLowerCase().trim();

    // 1) ETH / WETH / native ETH variants -> ETH (zero address) on Ethereum (Chain ID 1)
    if (
      symbolUpper === "ETH" ||
      symbolUpper === "WETH" ||
      symbolUpper.endsWith("ETH")
    ) {
      const ethRate =
        getTokenUsdRateFromSupportedChains(
          supportedChainsAndTokens,
          1,
          zeroAddress,
          "ETH"
        ) ??
        getTokenUsdRateFromSupportedChains(
          swapSupportedChainsAndTokens,
          1,
          zeroAddress,
          "ETH"
        ) ??
        getUsdRateForSymbol("ETH");
      if (ethRate && ethRate.gt(0)) return ethRate;
    }

    // 2) USDT / USDT.e -> USDT (0xdAC17F958D2ee523a2206206994597C13D831ec7) on Ethereum (Chain ID 1)
    if (symbolUpper.startsWith("USDT")) {
      const usdtAddr = "0xdac17f958d2ee523a2206206994597c13d831ec7";
      const usdtRate =
        getTokenUsdRateFromSupportedChains(
          supportedChainsAndTokens,
          1,
          usdtAddr,
          "USDT"
        ) ??
        getTokenUsdRateFromSupportedChains(
          swapSupportedChainsAndTokens,
          1,
          usdtAddr,
          "USDT"
        ) ??
        getUsdRateForSymbol("USDT");
      if (usdtRate && usdtRate.gt(0)) return usdtRate;
      return new Decimal(1);
    }

    // 3) USDC / USDC.e -> USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) on Ethereum (Chain ID 1)
    if (symbolUpper.startsWith("USDC")) {
      const usdcAddr = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
      const usdcRate =
        getTokenUsdRateFromSupportedChains(
          supportedChainsAndTokens,
          1,
          usdcAddr,
          "USDC"
        ) ??
        getTokenUsdRateFromSupportedChains(
          swapSupportedChainsAndTokens,
          1,
          usdcAddr,
          "USDC"
        ) ??
        getUsdRateForSymbol("USDC");
      if (usdcRate && usdcRate.gt(0)) return usdcRate;
      return new Decimal(1);
    }

    // 4) BTC / BTC.b / CBTC / WBTC / tBTC -> WBTC (0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599) on Ethereum (Chain ID 1)
    if (
      symbolUpper.startsWith("BTC") ||
      symbolUpper.includes("BTC") ||
      symbolUpper === "CBTC" ||
      symbolUpper === "WBTC"
    ) {
      const wbtcAddr = "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599";
      const wbtcRate =
        getTokenUsdRateFromSupportedChains(
          supportedChainsAndTokens,
          1,
          wbtcAddr,
          "WBTC"
        ) ??
        getTokenUsdRateFromSupportedChains(
          swapSupportedChainsAndTokens,
          1,
          wbtcAddr,
          "WBTC"
        ) ??
        getUsdRateForSymbol("WBTC") ??
        getUsdRateForSymbol("BTC");
      if (wbtcRate && wbtcRate.gt(0)) return wbtcRate;
    }

    // 5) POL / MATIC -> zero address on Polygon (137)
    if (
      symbolUpper.startsWith("POL") ||
      symbolUpper.startsWith("MATIC") ||
      chainId === 137
    ) {
      const polRate =
        getTokenUsdRateFromSupportedChains(
          supportedChainsAndTokens,
          137,
          zeroAddress,
          "POL"
        ) ??
        getTokenUsdRateFromSupportedChains(
          supportedChainsAndTokens,
          137,
          zeroAddress,
          "MATIC"
        ) ??
        getTokenUsdRateFromSupportedChains(
          swapSupportedChainsAndTokens,
          137,
          zeroAddress,
          "POL"
        ) ??
        getUsdRateForSymbol("POL") ??
        getUsdRateForSymbol("MATIC");
      if (polRate && polRate.gt(0)) return polRate;
    }

    // 6) AVAX -> zero address on Avalanche (43114)
    if (symbolUpper.startsWith("AVAX") || chainId === 43114) {
      const avaxRate =
        getTokenUsdRateFromSupportedChains(
          supportedChainsAndTokens,
          43114,
          zeroAddress,
          "AVAX"
        ) ??
        getTokenUsdRateFromSupportedChains(
          swapSupportedChainsAndTokens,
          43114,
          zeroAddress,
          "AVAX"
        ) ??
        getUsdRateForSymbol("AVAX");
      if (avaxRate && avaxRate.gt(0)) return avaxRate;
    }

    // 7) BNB -> zero address on BSC (56)
    if (symbolUpper.startsWith("BNB") || chainId === 56) {
      const bnbRate =
        getTokenUsdRateFromSupportedChains(
          supportedChainsAndTokens,
          56,
          zeroAddress,
          "BNB"
        ) ??
        getTokenUsdRateFromSupportedChains(
          swapSupportedChainsAndTokens,
          56,
          zeroAddress,
          "BNB"
        ) ??
        getUsdRateForSymbol("BNB");
      if (bnbRate && bnbRate.gt(0)) return bnbRate;
    }

    // 8) HYPE -> zero address on HyperEVM
    if (symbolUpper.startsWith("HYPE")) {
      const targetChainId = chainId ?? 998;
      const hypeRate =
        getTokenUsdRateFromSupportedChains(
          supportedChainsAndTokens,
          targetChainId,
          zeroAddress,
          "HYPE"
        ) ??
        getTokenUsdRateFromSupportedChains(
          swapSupportedChainsAndTokens,
          targetChainId,
          zeroAddress,
          "HYPE"
        ) ??
        getUsdRateForSymbol("HYPE");
      if (hypeRate && hypeRate.gt(0)) return hypeRate;
    }

    // 9) MON -> zero address on Monad
    if (symbolUpper.startsWith("MON")) {
      const targetChainId = chainId ?? 10143;
      const monRate =
        getTokenUsdRateFromSupportedChains(
          supportedChainsAndTokens,
          targetChainId,
          zeroAddress,
          "MON"
        ) ??
        getTokenUsdRateFromSupportedChains(
          swapSupportedChainsAndTokens,
          targetChainId,
          zeroAddress,
          "MON"
        ) ??
        getUsdRateForSymbol("MON");
      if (monRate && monRate.gt(0)) return monRate;
    }

    // Fallback
    const targetChainId = chainId ?? 1;
    const directRate =
      getTokenUsdRateFromSupportedChains(
        supportedChainsAndTokens,
        targetChainId,
        contractAddr,
        symbolUpper
      ) ??
      getTokenUsdRateFromSupportedChains(
        swapSupportedChainsAndTokens,
        targetChainId,
        contractAddr,
        symbolUpper
      ) ??
      getUsdRateForSymbol(symbolUpper);
    return directRate && directRate.gt(0) ? directRate : new Decimal(0);
  };

  const getTokenUsdRate = (token: SwapTokenOption) => {
    const directPrice = parseFiatNumber(token.priceUSD);
    if (directPrice && directPrice.gt(0)) {
      return directPrice;
    }
    const tokenBalance = parseFiatNumber(token.balance) ?? new Decimal(0);
    const fiatBalance = parseFiatNumber(token.balanceInFiat) ?? new Decimal(0);
    if (tokenBalance.gt(0) && fiatBalance.gt(0)) {
      return fiatBalance.div(tokenBalance);
    }
    if (tokenBalance.gt(0) && fiatBalance.lte(0)) {
      return new Decimal(0);
    }

    const cached = getCachedIntentUsdRate(token);
    if (cached && cached.gt(0)) return cached;

    const supportedRate = getTokenUsdRateFromSupportedChains(
      swapSupportedChainsAndTokens,
      token.chainId,
      token.contractAddress,
      token.symbol
    );
    if (supportedRate && supportedRate.gt(0)) return supportedRate;

    return new Decimal(0);
  };
  const getUsdRateForSymbol = (symbol?: string) => {
    if (!symbol) return new Decimal(0);
    const fiat = getFiatValue(1, symbol);
    if (Number.isFinite(fiat) && fiat > 0) {
      return new Decimal(fiat);
    }

    const cached =
      intentSymbolUsdRateCacheRef.current[getSymbolUsdRateCacheKey(symbol)];
    const rate = parseFiatNumber(cached?.rate);
    return rate && rate.gt(0) ? rate : new Decimal(0);
  };

  const getFeeTokenLookupAddress = (value?: string | null) => {
    const lower = (value ?? "").toLowerCase();
    if (!lower || lower === "0x" || isNativeTokenAddress(lower)) {
      return zeroAddress;
    }
    return lower;
  };

  const getTokenUsdRateFromBalances = (
    chainId?: number,
    contractAddress?: string,
    symbol?: string
  ) => {
    if (!chainId) return undefined;
    const lookupAddress = getFeeTokenLookupAddress(contractAddress);
    const lookupSymbol = symbol?.toUpperCase();

    for (const asset of swapBalance ?? []) {
      for (const breakdown of asset.breakdown ?? []) {
        if (breakdown.chain?.id !== chainId) continue;
        const breakdownAddress = getFeeTokenLookupAddress(
          breakdown.contractAddress
        );
        const addressMatches =
          Boolean(lookupAddress) && breakdownAddress === lookupAddress;
        const symbolMatches =
          Boolean(lookupSymbol) &&
          [breakdown.symbol, asset.symbol]
            .filter(Boolean)
            .some((candidate) => candidate?.toUpperCase() === lookupSymbol);
        if (!addressMatches && !symbolMatches) continue;

        const balance = parseFiatNumber(breakdown.balance);
        const fiatBalance = parseFiatNumber(breakdown.balanceInFiat);
        if (balance && fiatBalance && balance.gt(0) && fiatBalance.gt(0)) {
          return fiatBalance.div(balance);
        }
      }
    }

    return undefined;
  };

  const getIntentDestinationGasUsdValue = (intent?: SwapIntentData | null) => {
    const gas = intent?.destination?.gas;
    const explicitValue = parseFiatNumber(gas?.value);
    if (explicitValue && explicitValue.gt(0)) return explicitValue;

    const gasAmount = parseFiatNumber(gas?.amount);
    if (!gasAmount || gasAmount.lte(0)) return undefined;

    const chainId = intent?.destination?.chain?.id;
    const contractAddress = gas?.token?.contractAddress;
    const symbol = gas?.token?.symbol;
    const rate =
      getTokenUsdRateFromBalances(chainId, contractAddress, symbol) ??
      getTokenUsdRateFromSupportedChains(
        swapSupportedChainsAndTokens,
        chainId,
        contractAddress,
        symbol
      ) ??
      getTokenUsdRateFromSupportedChains(
        supportedChainsAndTokens,
        chainId,
        contractAddress,
        symbol
      ) ??
      getUsdRateForSymbol(symbol);

    return rate.gt(0) ? gasAmount.mul(rate) : undefined;
  };
  const getActiveTotalBalanceUsd = () =>
    isExactOutPaymentFlow
      ? getExactOutTotalSourceBalanceUsd()
      : getSwapBalanceTotalUsd();
  const getTotalBalancePercentUsdAmount = (pct: number) => {
    const ratio =
      isExactOutPaymentFlow && pct === 100
        ? receiveMaxSafetyMultiplier
        : new Decimal(pct).div(100);
    return getActiveTotalBalanceUsd().mul(ratio);
  };
  const getExactOutPercentAmountFromBalance = (
    token: SwapTokenOption,
    pct: number
  ) => {
    const usdAmount = getTotalBalancePercentUsdAmount(pct);
    if (usdAmount.lte(0)) return undefined;

    const rate = getTokenUsdRate(token);
    if (rate.lte(0)) return undefined;

    return usdAmount
      .div(rate)
      .toDecimalPlaces(
        Math.min(Math.max(0, token.decimals ?? 18), 8),
        Decimal.ROUND_DOWN
      )
      .toFixed();
  };
  const formatTokenAmountFromUsd = (
    usdAmount: Decimal,
    token: Pick<SwapTokenOption, "symbol" | "decimals">
  ) => {
    const rate = getUsdRateForSymbol(token.symbol);
    if (rate.lte(0)) return undefined;
    return usdAmount
      .div(rate)
      .toDecimalPlaces(Math.max(0, token.decimals ?? 18), Decimal.ROUND_DOWN)
      .toFixed();
  };

  const getMaxSwapQuoteCacheKey = (token?: SwapTokenOption) => {
    if (!token?.chainId) return "";
    return [
      token.chainId,
      (token.contractAddress || zeroAddress).toLowerCase(),
      token.symbol.toUpperCase(),
    ].join(":");
  };

  const getCachedMaxSwapQuote = (token?: SwapTokenOption) => {
    const key = getMaxSwapQuoteCacheKey(token);
    return key ? maxSwapQuoteCacheRef.current[key] : undefined;
  };

  const getCachedDestinationUsdRate = (token?: SwapTokenOption) => {
    const intentCachedRate = getCachedIntentUsdRate(token);
    if (intentCachedRate && intentCachedRate.gt(0)) {
      return intentCachedRate;
    }

    const cached = getCachedMaxSwapQuote(token);
    if (
      !cached ||
      !cached.maxUsdAmount ||
      cached.maxUsdAmount.lte(0) ||
      cached.maxTokenAmount.lte(0)
    ) {
      return undefined;
    }
    return cached.maxUsdAmount.div(cached.maxTokenAmount);
  };

  const resolveUsdRateForSymbol = async (symbol?: string) => {
    if (!symbol) return new Decimal(0);

    const localRate = getUsdRateForSymbol(symbol);
    if (localRate.gt(0)) return localRate;

    try {
      const resolvedRate = await resolveTokenUsdRate(symbol);
      return resolvedRate && resolvedRate > 0
        ? new Decimal(resolvedRate)
        : new Decimal(0);
    } catch {
      return new Decimal(0);
    }
  };

  const resolveMaxSwapQuote = async (token: SwapTokenOption) => {
    const key = getMaxSwapQuoteCacheKey(token);
    if (!key) return undefined;

    const cached = maxSwapQuoteCacheRef.current[key];
    if (cached) return cached;

    const destinationRate = await resolveUsdRateForSymbol(token.symbol);
    const walletUsd = getActiveTotalBalanceUsd();
    if (destinationRate.lte(0) || walletUsd.lte(0)) return undefined;

    // Better Intent deliberately does not expose the old routing-based max API.
    // This is a conservative display estimate; the quote remains authoritative.
    const maxUsdAmount = walletUsd.mul(receiveMaxSafetyMultiplier);
    const safeMaxAmount = maxUsdAmount.div(destinationRate);
    const decimals = token.decimals || 18;

    const quote: CachedMaxSwapQuote = {
      decimals,
      maxTokenAmount: safeMaxAmount,
      maxUsdAmount,
      symbol: token.symbol,
    };
    maxSwapQuoteCacheRef.current[key] = quote;
    return quote;
  };

  const getPercentAmountFromMaxQuote = async (
    token: SwapTokenOption,
    pct: number,
    preferUsd: boolean
  ) => {
    const maxQuote = await resolveMaxSwapQuote(token);
    if (!maxQuote) return undefined;

    const ratio = new Decimal(pct).div(100);
    if (preferUsd && maxQuote.maxUsdAmount && maxQuote.maxUsdAmount.gt(0)) {
      return {
        amount: maxQuote.maxUsdAmount
          .mul(ratio)
          .toDecimalPlaces(2, Decimal.ROUND_DOWN)
          .toFixed(),
        mode: "usd" as const,
      };
    }

    return {
      amount: maxQuote.maxTokenAmount
        .mul(ratio)
        .toDecimalPlaces(Math.max(0, maxQuote.decimals), Decimal.ROUND_DOWN)
        .toFixed(),
      mode: "token" as const,
    };
  };

  const getTokenUsdValue = (
    token: SwapTokenOption,
    fallbackAmount?: string
  ) => {
    const amountNumber =
      parseFiatNumber(token.userAmount || fallbackAmount) ?? new Decimal(0);
    if (amountNumber.lte(0)) return new Decimal(0);
    const quotedUsd = parseFiatNumber(token.userAmountUsd);
    if (quotedUsd && quotedUsd.gte(0)) return quotedUsd;
    if (token.userAmountMode === "usd") return amountNumber;

    const rate = getTokenUsdRate(token);
    return rate.gt(0) ? amountNumber.mul(rate) : new Decimal(0);
  };

  const getTokenBalanceAmount = (token: SwapTokenOption) =>
    parseFiatNumber(token.balance) ?? new Decimal(0);

  const getTokenBalanceUsd = (token: SwapTokenOption) => {
    const fromFiat = parseFiatNumber(token.balanceInFiat);
    if (fromFiat !== undefined && fromFiat.gte(0)) {
      return fromFiat;
    }
    const balance = parseFiatNumber(token.balance);
    const priceUsd = parseFiatNumber(token.priceUSD);
    if (balance && balance.gt(0) && priceUsd && priceUsd.gt(0)) {
      return balance.mul(priceUsd);
    }
    return new Decimal(0);
  };

  const getSdkExactOutSourcePriority = (
    token: SwapTokenOption,
    dstChainId?: number,
    dstTokenAddress?: string
  ) => {
    const usd = getTokenBalanceUsd(token);
    if (usd.lte(0)) return 99;

    const isSameChain = Boolean(dstChainId && token.chainId === dstChainId);
    const isSameTokenAddress = Boolean(
      dstTokenAddress &&
        token.contractAddress &&
        token.contractAddress.toLowerCase() === dstTokenAddress.toLowerCase()
    );
    const isStable = isSdkExactOutStableSymbol(token.symbol);
    const isNative =
      token.contractAddress === zeroAddress ||
      token.contractAddress?.toLowerCase() ===
        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
      isNativeTokenAddress(token.contractAddress);
    const isEthereum = token.chainId === ETHEREUM_MAINNET_CHAIN_ID;

    // Destination chain (Tier 1-4)
    if (isSameChain) {
      if (isSameTokenAddress) return 1;
      if (isStable) return 2;
      if (isNative) return 3;
      return 4;
    }

    // Ethereum Mainnet (Tier 8-11)
    if (isEthereum) {
      if (isSameTokenAddress) return 8;
      if (isStable) return 9;
      if (isNative) return 10;
      return 11;
    }

    // Non-Ethereum other chains (Tier 5-7)
    if (isSameTokenAddress) return 5;
    if (isStable) return 6;
    if (isNative) return 7;
    return 7;
  };

  const sortExactOutSourcesBySdkPriority = (
    tokens: SwapTokenOption[],
    dstChainId?: number,
    dstTokenAddress?: string
  ) => {
    const targetChainId = dstChainId ?? toToken?.chainId;
    const targetAddress = dstTokenAddress ?? toToken?.contractAddress;

    return [...tokens].sort((left, right) => {
      const priorityDifference =
        getSdkExactOutSourcePriority(left, targetChainId, targetAddress) -
        getSdkExactOutSourcePriority(right, targetChainId, targetAddress);
      if (priorityDifference !== 0) return priorityDifference;

      const usdDifference = getTokenBalanceUsd(right).cmp(
        getTokenBalanceUsd(left)
      );
      if (usdDifference !== 0) return usdDifference;

      return `${left.symbol} ${left.chainName ?? ""}`.localeCompare(
        `${right.symbol} ${right.chainName ?? ""}`
      );
    });
  };

  const getTokenAmountForUsd = (token: SwapTokenOption, usdAmount: Decimal) => {
    const rate = getTokenUsdRate(token);
    if (rate.lte(0) || usdAmount.lte(0)) return new Decimal(0);
    return usdAmount.div(rate);
  };

  const getUsdForTokenAmount = (
    token: SwapTokenOption,
    tokenAmount: Decimal
  ) => {
    const rate = getTokenUsdRate(token);
    if (rate.lte(0) || tokenAmount.lte(0)) return new Decimal(0);
    return tokenAmount.mul(rate);
  };

  const getExactOutDestinationBalanceCoverage = ({
    requestedAmount,
    requestedUsd,
    producedAmount,
    producedUsd,
    token = toToken,
  }: {
    requestedAmount?: Decimal;
    requestedUsd?: Decimal;
    producedAmount?: Decimal;
    producedUsd?: Decimal;
    token?: SwapTokenOption;
  }) => {
    if (
      (activeMode !== "deposit" && activeMode !== "send") ||
      !token ||
      !requestedAmount ||
      requestedAmount.lte(0)
    ) {
      return null;
    }

    const balanceAmount =
      parseFiatNumber(destinationBalance) ??
      parseFiatNumber(token.balance) ??
      new Decimal(0);
    if (balanceAmount.lte(0)) return null;

    const externalAmount =
      producedAmount && producedAmount.gt(0) ? producedAmount : new Decimal(0);
    const uncoveredAmount = Decimal.max(
      requestedAmount.minus(externalAmount),
      new Decimal(0)
    );
    const coveredAmount = Decimal.min(balanceAmount, uncoveredAmount);
    if (coveredAmount.lte(0)) return null;

    const requestedRate =
      requestedUsd && requestedUsd.gt(0)
        ? requestedUsd.div(requestedAmount)
        : undefined;
    const producedRate =
      producedUsd && producedUsd.gt(0) && producedAmount && producedAmount.gt(0)
        ? producedUsd.div(producedAmount)
        : undefined;
    const fallbackRate = getTokenUsdRate(token);
    const usdRate =
      requestedRate && requestedRate.gt(0)
        ? requestedRate
        : producedRate && producedRate.gt(0)
          ? producedRate
          : fallbackRate.gt(0)
            ? fallbackRate
            : undefined;

    return {
      amount: coveredAmount,
      usd: usdRate ? coveredAmount.mul(usdRate) : undefined,
    };
  };

  const buildDestinationBalanceDisplayToken = (
    coverage: ReturnType<typeof getExactOutDestinationBalanceCoverage>,
    token?: SwapTokenOption
  ): SwapTokenOption | null => {
    if (!coverage || !token || coverage.amount.lte(0)) return null;

    const amount = coverage.amount
      .toDecimalPlaces(Math.max(0, token.decimals ?? 18), Decimal.ROUND_DOWN)
      .toFixed();
    const usd = coverage.usd?.toDecimalPlaces(6, Decimal.ROUND_DOWN).toFixed();
    const balanceUsd = coverage.usd
      ? `$${coverage.usd.toDecimalPlaces(2, Decimal.ROUND_DOWN).toFixed()}`
      : token.balanceInFiat || "$0.00";

    return {
      ...token,
      balance: `${amount} ${token.symbol}`,
      balanceInFiat: balanceUsd,
      userAmount: amount,
      userAmountMode: "token",
      userAmountUsd: usd,
    };
  };

  const cacheSymbolUsdRate = (symbol: string | undefined, rate: Decimal) => {
    const symbolKey = getSymbolUsdRateCacheKey(symbol);
    if (!symbolKey || rate.lte(0)) return;

    intentSymbolUsdRateCacheRef.current[symbolKey] = {
      amount: "1",
      rate: rate.toDecimalPlaces(18).toFixed(),
      updatedAt: Date.now(),
      value: rate.toFixed(),
    };
  };

  const getPredictiveDestinationKey = (token?: SwapTokenOption) => {
    const tokenKey = getTokenUsdRateCacheKey(token);
    return tokenKey ? `destination:${tokenKey}` : "";
  };

  const getPredictiveSourceKey = (token: SwapTokenOption) =>
    [
      token.chainId ?? "unknown",
      (token.contractAddress || zeroAddress).toLowerCase(),
      token.symbol.toUpperCase(),
    ].join(":");

  const getPredictiveQuoteCacheKey = (
    mode = activeMode,
    type = swapType,
    destination = toToken,
    sources = fromTokens
  ) => {
    const destinationKey = getPredictiveDestinationKey(destination);
    if (!destinationKey) return "";
    const sourceKey = getExpandedSourceTokens(sources)
      .map(getPredictiveSourceKey)
      .sort()
      .join("+");
    if (mode === "swap" && type === "exactIn") {
      return sourceKey ? `exactIn:${sourceKey}->${destinationKey}` : "";
    }
    const modeKey = isMultiAssetMode ? "multi" : "single";
    return sourceKey
      ? `exactOut:${modeKey}:${sourceKey}->${destinationKey}`
      : `exactOut:${modeKey}:auto->${destinationKey}`;
  };

  const getPredictiveDisplayAmount = (
    amount: Decimal,
    token?: Pick<SwapTokenOption, "decimals">
  ) => {
    const decimals = Math.min(
      PREDICTIVE_QUOTE_DISPLAY_DECIMALS,
      Math.max(0, token?.decimals ?? 18)
    );
    return amount.toDecimalPlaces(decimals, Decimal.ROUND_DOWN).toFixed();
  };

  const resolveUsdRateForToken = async (token?: SwapTokenOption) => {
    if (!token?.symbol) return new Decimal(0);

    const localRate = getTokenUsdRate(token);
    if (localRate.gt(0)) return localRate;

    const resolvedRate = await resolveUsdRateForSymbol(token.symbol);
    if (resolvedRate.gt(0)) {
      cacheSymbolUsdRate(token.symbol, resolvedRate);
    }
    return resolvedRate;
  };

  const getDestinationReceiveLimitUsd = (token?: SwapTokenOption) => {
    if (!token?.chainId) return undefined;
    const featureLimit =
      chainFeatures.maxBridgeAmountByDestinationChainId?.[token.chainId];
    const defaultLimit =
      DESTINATION_RECEIVE_LIMIT_USD_BY_CHAIN_ID[token.chainId];
    const limit = featureLimit ?? defaultLimit;
    return limit ? new Decimal(limit) : undefined;
  };

  const getSourceSendLimitUsd = (chainId?: number) => {
    if (!chainId) return undefined;
    const limit = SOURCE_SEND_LIMIT_USD_BY_CHAIN_ID[chainId];
    return limit ? new Decimal(limit) : undefined;
  };

  const sortUnifiedSourceTokens = (tokens: SwapTokenOption[]) =>
    [...tokens].sort((a, b) => {
      const fiatDiff = getTokenBalanceUsd(b).cmp(getTokenBalanceUsd(a));
      if (fiatDiff !== 0) return fiatDiff;
      return getTokenBalanceAmount(b).cmp(getTokenBalanceAmount(a));
    });

  const allocateUnifiedExactInToken = (
    token: SwapTokenOption,
    fallbackAmount?: string
  ) => {
    if (!token.isUnified || !token.sourceTokens?.length) return [token];

    const rawAmount =
      parseFiatNumber(token.userAmount || fallbackAmount) ?? new Decimal(0);
    if (rawAmount.lte(0)) return [];

    const sortedSources = sortUnifiedSourceTokens(token.sourceTokens).filter(
      (source) =>
        source.chainId &&
        source.contractAddress &&
        getTokenBalanceAmount(source).gt(0)
    );
    const allocated: SwapTokenOption[] = [];

    if (token.userAmountMode === "usd") {
      let remainingUsd = rawAmount;

      for (const source of sortedSources) {
        if (remainingUsd.lte(0)) break;

        const availableUsd = getTokenBalanceUsd(source);
        if (availableUsd.lte(0)) continue;

        const targetUsd = Decimal.min(remainingUsd, availableUsd);
        const tokenAmount = getTokenAmountForUsd(
          source,
          targetUsd
        ).toDecimalPlaces(
          Math.max(0, source.decimals || 18),
          Decimal.ROUND_DOWN
        );
        if (tokenAmount.lte(0)) continue;

        const actualUsd = getUsdForTokenAmount(source, tokenAmount);
        allocated.push({
          ...source,
          userAmount: tokenAmount.toFixed(),
          userAmountMode: "token",
          userAmountUsd: actualUsd
            .toDecimalPlaces(6, Decimal.ROUND_DOWN)
            .toFixed(),
        });
        remainingUsd = remainingUsd.minus(targetUsd);
      }

      return allocated;
    }

    let remainingTokenAmount = rawAmount;

    for (const source of sortedSources) {
      if (remainingTokenAmount.lte(0)) break;

      const availableTokenAmount = getTokenBalanceAmount(source);
      if (availableTokenAmount.lte(0)) continue;

      const tokenAmount = Decimal.min(
        remainingTokenAmount,
        availableTokenAmount
      ).toDecimalPlaces(Math.max(0, source.decimals || 18), Decimal.ROUND_DOWN);
      if (tokenAmount.lte(0)) continue;

      const actualUsd = getUsdForTokenAmount(source, tokenAmount);
      allocated.push({
        ...source,
        userAmount: tokenAmount.toFixed(),
        userAmountMode: "token",
        userAmountUsd: actualUsd
          .toDecimalPlaces(6, Decimal.ROUND_DOWN)
          .toFixed(),
      });
      remainingTokenAmount = remainingTokenAmount.minus(tokenAmount);
    }

    return allocated;
  };

  const getExactInSourceTokens = (
    tokens: SwapTokenOption[],
    fallbackAmount?: string
  ) =>
    tokens.flatMap((token) =>
      token.isUnified
        ? allocateUnifiedExactInToken(token, fallbackAmount)
        : [token]
    );

  const getImmediateDestinationReceiveUsdRate = (token?: SwapTokenOption) => {
    const priceUsd = parseFiatNumber(token?.priceUSD);
    if (priceUsd && priceUsd.gt(0)) return priceUsd;

    const cachedRate = getCachedDestinationUsdRate(token);
    if (cachedRate && cachedRate.gt(0)) return cachedRate;

    if (!token) return undefined;
    const localRate = getTokenUsdRate(token);
    return localRate.gt(0) ? localRate : undefined;
  };

  const getExactInSourceUsdForReceiveLimit = (
    sourceTokens: SwapTokenOption[],
    inputAmount: string
  ) => {
    if (sourceTokens.length === 0) return undefined;
    let hasPositiveSourceAmount = false;
    let totalUsd = new Decimal(0);

    for (const token of sourceTokens) {
      const fallbackAmount =
        sourceTokens.length === 1 ? inputAmount : undefined;
      const sourceAmount = parseFiatNumber(token.userAmount || fallbackAmount);
      if (!sourceAmount || sourceAmount.lte(0)) continue;

      hasPositiveSourceAmount = true;
      const sourceUsd = getTokenUsdValue(token, fallbackAmount);
      if (sourceUsd.lte(0)) return undefined;
      totalUsd = totalUsd.plus(sourceUsd);
    }

    return hasPositiveSourceAmount ? totalUsd : undefined;
  };

  const buildReceiveAmountIssue = ({
    destinationRate,
    destinationToken = toToken,
    inputAmount = amount,
    mode = activeMode,
    receiveQuoteAmount = idleReceiveQuoteAmount,
    sourceTokens = fromTokens,
    type = swapType,
  }: {
    destinationRate?: Decimal;
    destinationToken?: SwapTokenOption;
    inputAmount?: string;
    mode?: NexusOneMode;
    receiveQuoteAmount?: string;
    sourceTokens?: SwapTokenOption[];
    type?: SwapType;
  } = {}): ReceiveAmountIssue | null => {
    // 1. Check Source (Send/Swap) Limits
    if (mode === "swap" && type === "exactIn") {
      const fallbackAmount =
        sourceTokens.length === 1 ? inputAmount : undefined;
      const candidateTokens: SwapTokenOption[] = [];
      for (const token of sourceTokens) {
        if (token.isUnified && token.sourceTokens?.length) {
          candidateTokens.push(
            ...allocateUnifiedExactInToken(token, fallbackAmount)
          );
        } else {
          candidateTokens.push(token);
        }
      }

      const chainUsdTotals = new Map<
        number,
        { chainName: string; totalUsd: Decimal }
      >();

      for (const token of candidateTokens) {
        const tokenAmount = parseFiatNumber(token.userAmount || fallbackAmount);
        if (!tokenAmount || tokenAmount.lte(0)) continue;
        const chainId = token.chainId;
        if (!chainId) continue;

        const limit = getSourceSendLimitUsd(chainId);
        if (!limit) continue;

        const chainName = getShortChainName(chainId, token.chainName);
        const tokenUsd = getTokenUsdValue(token, fallbackAmount);

        if (tokenUsd.lte(0)) {
          return {
            ctaLabel: "Price unavailable",
            message: `Unable to price ${token.symbol} on ${chainName}. Select another source token.`,
            type: "unpricedSourceToken",
          };
        }

        const existing = chainUsdTotals.get(chainId) ?? {
          chainName,
          totalUsd: new Decimal(0),
        };
        existing.totalUsd = existing.totalUsd.plus(tokenUsd);
        chainUsdTotals.set(chainId, existing);
      }

      for (const [
        chainId,
        { chainName, totalUsd },
      ] of chainUsdTotals.entries()) {
        const limit = getSourceSendLimitUsd(chainId);
        if (limit && totalUsd.gt(limit)) {
          return {
            ctaLabel: "Swap limit exceeded",
            message: `Maximum swap amount from ${chainName} is ${formatUsdDisplay(limit)}.`,
            type: "sourceLimitExceeded",
          };
        }
      }
    } else if (mode === "send") {
      const fallbackAmount =
        sourceTokens.length === 1 ? inputAmount : undefined;
      const candidateTokens: SwapTokenOption[] = [];
      for (const token of sourceTokens) {
        if (token.isUnified && token.sourceTokens?.length) {
          candidateTokens.push(
            ...allocateUnifiedExactInToken(token, fallbackAmount)
          );
        } else {
          candidateTokens.push(token);
        }
      }

      const chainUsdTotals = new Map<
        number,
        { chainName: string; totalUsd: Decimal }
      >();

      for (const token of candidateTokens) {
        const tokenAmount = parseFiatNumber(token.userAmount || fallbackAmount);
        if (!tokenAmount || tokenAmount.lte(0)) continue;
        const chainId = token.chainId;
        if (!chainId) continue;

        const limit = getSourceSendLimitUsd(chainId);
        if (!limit) continue;

        const chainName = getShortChainName(chainId, token.chainName);
        const tokenUsd = getTokenUsdValue(token, fallbackAmount);

        if (tokenUsd.lte(0)) {
          return {
            ctaLabel: "Price unavailable",
            message: `Unable to price ${token.symbol} on ${chainName}. Select another source token.`,
            type: "unpricedSourceToken",
          };
        }

        const existing = chainUsdTotals.get(chainId) ?? {
          chainName,
          totalUsd: new Decimal(0),
        };
        existing.totalUsd = existing.totalUsd.plus(tokenUsd);
        chainUsdTotals.set(chainId, existing);
      }

      for (const [
        chainId,
        { chainName, totalUsd },
      ] of chainUsdTotals.entries()) {
        const limit = getSourceSendLimitUsd(chainId);
        if (limit && totalUsd.gt(limit)) {
          return {
            ctaLabel: "Send limit exceeded",
            message: `Maximum send amount from ${chainName} is ${formatUsdDisplay(limit)}.`,
            type: "sourceLimitExceeded",
          };
        }
      }
    } else {
      // Exact-Out flows
      if (intentData?.sources && intentData.sources.length > 0) {
        const chainUsdTotals = new Map<
          number,
          { chainName: string; totalUsd: Decimal }
        >();
        for (const source of intentData.sources) {
          const chainId = source.chain?.id;
          if (!chainId) continue;
          const limit = getSourceSendLimitUsd(chainId);
          if (!limit) continue;

          const sourceUsd = parseFiatNumber(source.value);
          if (!sourceUsd || sourceUsd.lte(0)) continue;

          const chainName = getShortChainName(chainId, source.chain?.name);
          const existing = chainUsdTotals.get(chainId) ?? {
            chainName,
            totalUsd: new Decimal(0),
          };
          existing.totalUsd = existing.totalUsd.plus(sourceUsd);
          chainUsdTotals.set(chainId, existing);
        }

        for (const [
          chainId,
          { chainName, totalUsd },
        ] of chainUsdTotals.entries()) {
          const limit = getSourceSendLimitUsd(chainId);
          if (limit && totalUsd.gt(limit)) {
            return {
              ctaLabel:
                mode === "swap" ? "Swap limit exceeded" : "Send limit exceeded",
              message: `Maximum ${mode === "swap" ? "swap" : "send"} amount from ${chainName} is ${formatUsdDisplay(limit)}.`,
              type: "sourceLimitExceeded",
            };
          }
        }
      } else if (sourceTokens.length === 1 && sourceTokens[0]?.chainId) {
        const token = sourceTokens[0];
        const chainId = token.chainId;
        const limit = getSourceSendLimitUsd(chainId);
        if (limit) {
          const chainName = getShortChainName(chainId, token.chainName);
          const parsedAmount = parseFiatNumber(inputAmount);
          if (parsedAmount && parsedAmount.gt(0)) {
            let estimatedSourceUsd: Decimal | undefined;
            if (toToken) {
              const rate =
                destinationRate ??
                getImmediateDestinationReceiveUsdRate(toToken);
              if (rate && rate.gt(0)) {
                estimatedSourceUsd = parsedAmount.mul(rate);
              }
            }
            if (estimatedSourceUsd && estimatedSourceUsd.gt(limit)) {
              return {
                ctaLabel:
                  mode === "swap"
                    ? "Swap limit exceeded"
                    : "Send limit exceeded",
                message: `Maximum ${mode === "swap" ? "swap" : "send"} amount from ${chainName} is ${formatUsdDisplay(limit)}.`,
                type: "sourceLimitExceeded",
              };
            }
          }
        }
      }
    }

    // 2. Check Destination (Receive) Limits (UNCHANGED)
    if (!destinationToken) return null;
    const limit = getDestinationReceiveLimitUsd(destinationToken);
    const parsedAmount = parseFiatNumber(inputAmount);
    if (!parsedAmount || parsedAmount.lte(0)) return null;

    const chainName = getShortChainName(
      destinationToken.chainId,
      destinationToken.chainName
    );
    if (limit && parsedAmount.gt(limit)) {
      return {
        ctaLabel: "Receive limit exceeded",
        message: `Maximum receive amount on ${chainName} is ${formatUsdDisplay(limit)}.`,
        type: "receiveLimitExceeded",
      };
    }

    if (mode === "swap" && type === "exactIn" && sourceTokens.length === 0) {
      return null;
    }

    // In Exact Out single-asset mode, check if the selected asset or wallet can cover the requested amount
    if (ownerAddress && mode === "swap" && type === "exactOut") {
      const rate = destinationRate ?? getTokenUsdRate(destinationToken);
      const requestedReceiveUsd = rate.gt(0)
        ? parsedAmount.times(rate)
        : parsedAmount;

      if (requestedReceiveUsd.gt(0)) {
        if (!isMultiAssetMode) {
          const explicitToken =
            sourceTokens[0] ??
            (sourceSelectionTouched ? fromTokens[0] : undefined);
          let singleToken = explicitToken;
          if (!singleToken) {
            const rawPool = getExpandedSourceTokens(
              excludeSwapExactOutDestinationTokens(
                swapBalance && swapSupportedChainsAndTokens
                  ? deriveTokenOptions(
                      swapBalance,
                      swapSupportedChainsAndTokens
                    )
                  : []
              )
            ).filter(
              (t) =>
                getTokenSelectionKey(t) !==
                getTokenSelectionKey(destinationToken)
            );
            const pool = sortExactOutSourcesBySdkPriority(
              rawPool,
              destinationToken?.chainId,
              destinationToken?.contractAddress
            );
            const capable = pool.find((token) => {
              const fullAvailableUsd = getTokenBalanceUsd(token);
              const rate = getTokenUsdRate(token);
              if (fullAvailableUsd.lte(0) || rate.lte(0)) return false;
              return fullAvailableUsd.gte(requestedReceiveUsd);
            });
            singleToken =
              capable ?? pool.find((token) => getTokenBalanceUsd(token).gt(0));
          }
          if (singleToken) {
            const fullAvailableUsd = getTokenBalanceUsd(singleToken);
            if (fullAvailableUsd.lt(requestedReceiveUsd)) {
              const shortfall = requestedReceiveUsd.minus(fullAvailableUsd);
              const missingUsd = shortfall.toDecimalPlaces(2).toFixed();
              return {
                ctaLabel: "Insufficient balance",
                message: `You're $${missingUsd} short. Switch to Multi-assets Mode`,
                missingUsd,
                type: "insufficientSources" as any,
              };
            }
          }
          return null;
        }

        const availableTokens = getExpandedSourceTokens(
          excludeSwapExactOutDestinationTokens(
            swapBalance && swapSupportedChainsAndTokens
              ? deriveTokenOptions(swapBalance, swapSupportedChainsAndTokens)
              : []
          )
        ).filter(
          (t) =>
            getTokenSelectionKey(t) !== getTokenSelectionKey(destinationToken)
        );
        let totalWalletUsd = new Decimal(0);
        for (const token of availableTokens) {
          const usd = getTokenBalanceUsd(token);
          totalWalletUsd = totalWalletUsd.plus(usd);
        }
        if (totalWalletUsd.lt(requestedReceiveUsd)) {
          const maxSwapDisplay = `$${totalWalletUsd.toFixed(2)}`;
          return {
            ctaLabel: "Cannot Fulfill Amount",
            message: `Cannot fulfill the amount. The maximum your wallet can swap is ${maxSwapDisplay} at the moment.`,
            missingUsd: requestedReceiveUsd
              .minus(totalWalletUsd)
              .toDecimalPlaces(2)
              .toFixed(),
            type: "insufficientSources" as any,
          };
        }
      }
    }

    return null;
  };

  const applyReceiveAmountIssue = (issue: ReceiveAmountIssue | null) => {
    const key = issue ? `${issue.type}:${issue.message}` : "";
    receiveAmountIssueRef.current = issue;
    if (receiveAmountIssueKeyRef.current !== key) {
      receiveAmountIssueKeyRef.current = key;
      setReceiveAmountIssue(issue);
    }
    if (!issue) return;

    clearPendingSwapIntent(true);
    setQuoteRefreshing(false);
    setIntentLoading(false);
    setReceiveMaxCalculating(false);
    setPreviewQuoteRefreshing(false);
    setTxError(null);
  };

  const getPredictiveExactInSourceTokens = () => {
    const expanded = getExpandedSourceTokens(fromTokens);
    if (expanded.length === 0) return [];

    return expanded
      .map((token) => {
        const userAmount =
          token.userAmount ||
          (expanded.length === 1 && hasPositiveDecimalInput(amount)
            ? amount
            : "");
        return { ...token, userAmount };
      })
      .filter((token) => hasPositiveDecimalInput(token.userAmount));
  };

  const hasPositiveDecimalInput = (value: unknown) =>
    Boolean(parseFiatNumber(value)?.gt(0));

  const getReadyExactInSourceTokens = (tokens: SwapTokenOption[]) =>
    getExactInSourceTokens(tokens).filter(
      (token) =>
        Boolean(token.chainId && token.contractAddress) &&
        hasPositiveDecimalInput(token.userAmount)
    );

  const hasReadyExactInSwapInput = (
    tokens: SwapTokenOption[],
    destination?: SwapTokenOption
  ) => {
    if (!destination?.chainId || !destination.contractAddress) return false;
    if (tokens.length === 0) return false;
    return getReadyExactInSourceTokens(tokens).length > 0;
  };

  const getExpandedSourceTokens = (tokens: SwapTokenOption[]) => {
    const expanded = tokens.flatMap((token) => {
      if (token.isUnified) {
        if (token.sourceTokens?.length) {
          return token.sourceTokens;
        }
        const symbol = (
          token.unifiedSymbol ??
          token.symbol ??
          ""
        ).toUpperCase();
        const userTokens: SwapTokenOption[] = [];
        for (const asset of swapBalance ?? []) {
          for (const breakdown of asset.breakdown ?? []) {
            const chainId = breakdown.chain?.id;
            const contractAddress = breakdown.contractAddress;
            const bSymbol = breakdown.symbol ?? asset.symbol;
            if (!chainId || !contractAddress) continue;
            if (bSymbol.toUpperCase() !== symbol) continue;
            const chainMeta = CHAIN_METADATA[chainId];
            userTokens.push({
              chainId,
              chainLogo: chainMeta?.logo ?? breakdown.chain?.logo,
              chainName: getShortChainName(
                chainId,
                chainMeta?.name ?? breakdown.chain?.name
              ),
              contractAddress,
              decimals: breakdown.decimals ?? asset.decimals ?? 18,
              logo: asset.logo ?? "",
              name: bSymbol,
              symbol: bSymbol,
              balance: `${breakdown.balance} ${bSymbol}`,
              balanceInFiat: breakdown.balanceInFiat
                ? `$${parseFiatNumber(breakdown.balanceInFiat)?.toDecimalPlaces(2).toFixed() ?? "0.00"}`
                : "$0.00",
            });
          }
        }
        return userTokens.length > 0 ? userTokens : [token];
      }
      return [token];
    });
    const seen = new Set<string>();
    return expanded.filter((token) => {
      if (!token.chainId || !token.contractAddress) return false;
      if (
        !isSwapSupportedBySdkChainList(
          token.chainId,
          swapSupportedChainsAndTokens
        )
      ) {
        return false;
      }
      const key = `${token.chainId}-${token.contractAddress.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const isSwapExactOutDestinationToken = (token?: SwapTokenOption) =>
    Boolean(
      isSwapExactOut &&
        token &&
        toToken &&
        token.chainId === toToken.chainId &&
        (isSameTokenSelection(token, toToken) ||
          (isNativeTokenAddress(token.contractAddress) &&
            isNativeTokenAddress(toToken.contractAddress)))
    );

  const excludeSwapExactOutDestinationTokens = (
    tokens: SwapTokenOption[]
  ): SwapTokenOption[] => {
    if (!isSwapExactOut || !toToken) return tokens;

    return tokens.flatMap((token) => {
      if (token.isUnified && token.sourceTokens?.length) {
        const sourceTokens = token.sourceTokens.filter(
          (source) => !isSwapExactOutDestinationToken(source)
        );
        return sourceTokens.length > 0 ? [{ ...token, sourceTokens }] : [];
      }
      return isSwapExactOutDestinationToken(token) ? [] : [token];
    });
  };

  const isSwapExactOutDestinationIntentSource = (
    source: NonNullable<SwapIntentData["sources"]>[number]
  ) => isSwapExactOutDestinationToken(buildIntentSourceToken(source));

  const getNativeGasBalanceForChain = (chainId: number) => {
    const nativeSymbol =
      CHAIN_METADATA[chainId]?.nativeCurrency?.symbol?.toUpperCase();
    let balance = new Decimal(0);

    for (const asset of swapBalance ?? []) {
      for (const breakdown of asset.breakdown ?? []) {
        if (breakdown.chain?.id !== chainId) continue;
        const breakdownSymbol = (
          breakdown.symbol ??
          asset.symbol ??
          ""
        ).toUpperCase();
        const assetSymbol = (asset.symbol ?? "").toUpperCase();
        const isNativeBalance =
          isNativeTokenAddress(breakdown.contractAddress) ||
          Boolean(
            nativeSymbol &&
              (breakdownSymbol === nativeSymbol || assetSymbol === nativeSymbol)
          );

        if (!isNativeBalance) continue;
        balance = balance.plus(
          parseFiatNumber(breakdown.balance) ?? new Decimal(0)
        );
      }
    }

    return balance;
  };

  const hasGasForSource = (token: SwapTokenOption) => {
    if (!token.chainId || !token.contractAddress) return false;
    const tokenBalance = parseFiatNumber(token.balance) ?? new Decimal(0);
    if (tokenBalance.lte(0)) return false;
    if (isNativeTokenAddress(token.contractAddress)) return true;
    return getNativeGasBalanceForChain(token.chainId).gt(0);
  };

  const getGasCapableBalanceSourceTokens = () => {
    const tokens: SwapTokenOption[] = [];

    for (const asset of swapBalance ?? []) {
      for (const breakdown of asset.breakdown ?? []) {
        const chainId = breakdown.chain?.id;
        const contractAddress = breakdown.contractAddress;
        const balance = parseFiatNumber(breakdown.balance) ?? new Decimal(0);
        const fiatBalance = parseFiatNumber(breakdown.balanceInFiat);
        if (
          !chainId ||
          !contractAddress ||
          balance.lte(0) ||
          !fiatBalance ||
          fiatBalance.lt(minimumSourceUsd)
        )
          continue;

        const chainMeta = CHAIN_METADATA[chainId];
        const symbol = breakdown.symbol ?? asset.symbol;
        tokens.push({
          chainId,
          chainLogo: chainMeta?.logo ?? breakdown.chain?.logo,
          chainName: getShortChainName(
            chainId,
            chainMeta?.name ?? breakdown.chain?.name
          ),
          contractAddress,
          decimals: breakdown.decimals ?? asset.decimals ?? 18,
          logo: asset.logo ?? "",
          name: symbol,
          symbol,
          balance: `${breakdown.balance} ${symbol}`,
          balanceInFiat:
            fiatBalance !== undefined
              ? `$${fiatBalance.toDecimalPlaces(2).toFixed()}`
              : "$0.00",
        });
      }
    }

    return sortExactOutSourcesBySdkPriority(getExpandedSourceTokens(tokens));
  };

  const getMinimumBalanceSourceTokens = () =>
    filterMinimumSourceUsdTokens(
      getExpandedSourceTokens(
        swapBalance
          ? deriveTokenOptions(swapBalance, swapSupportedChainsAndTokens)
          : []
      )
    );

  const getHeldDestinationTokenOption = () => {
    if (!toToken?.chainId || !toToken.contractAddress) return undefined;

    for (const asset of swapBalance ?? []) {
      for (const breakdown of asset.breakdown ?? []) {
        const chainId = breakdown.chain?.id;
        if (chainId !== toToken.chainId) continue;

        const breakdownAddress = breakdown.contractAddress;
        const addressMatches =
          breakdownAddress &&
          (breakdownAddress.toLowerCase() ===
            toToken.contractAddress.toLowerCase() ||
            (isNativeTokenAddress(breakdownAddress) &&
              isNativeTokenAddress(toToken.contractAddress)));
        const symbolMatches =
          (breakdown.symbol ?? asset.symbol ?? "").toUpperCase() ===
          toToken.symbol.toUpperCase();
        if (!addressMatches && !symbolMatches) continue;

        const balanceAmount = parseFiatNumber(breakdown.balance);
        if (!balanceAmount || balanceAmount.lte(0)) continue;

        const chainMeta = CHAIN_METADATA[chainId];
        const symbol = breakdown.symbol ?? asset.symbol ?? toToken.symbol;
        const fiatBalance = parseFiatNumber(breakdown.balanceInFiat);
        return {
          balance: `${breakdown.balance} ${symbol}`,
          balanceInFiat: fiatBalance
            ? `$${fiatBalance.toDecimalPlaces(2).toFixed()}`
            : "$0.00",
          chainId,
          chainLogo:
            chainMeta?.logo ?? breakdown.chain?.logo ?? toToken.chainLogo,
          chainName: getShortChainName(
            chainId,
            chainMeta?.name ?? breakdown.chain?.name ?? toToken.chainName
          ),
          contractAddress: breakdown.contractAddress ?? toToken.contractAddress,
          decimals:
            breakdown.decimals ?? asset.decimals ?? toToken.decimals ?? 18,
          logo: asset.logo ?? toToken.logo,
          name: symbol,
          symbol,
        } satisfies SwapTokenOption;
      }
    }

    return undefined;
  };

  const getDepositDestinationForSourceSelection = () => {
    const destination =
      activeMode === "deposit" ? selectedOpportunity : toToken;
    const chainId = destination?.chainId;
    const tokenAddress =
      activeMode === "deposit"
        ? selectedOpportunity?.tokenAddress
        : toToken?.contractAddress;
    const tokenSymbol =
      activeMode === "deposit"
        ? selectedOpportunity?.tokenSymbol
        : toToken?.symbol;

    if (!chainId || !tokenAddress || !tokenSymbol) return undefined;

    return {
      chainId,
      tokenAddress: tokenAddress as `0x${string}`,
      tokenSymbol,
    };
  };
  const getDestinationSourceIdForDeposit = () => {
    const destination = getDepositDestinationForSourceSelection();
    return destination
      ? getDepositSourceId(destination.tokenAddress, destination.chainId)
      : undefined;
  };
  const getDepositSourceTargetUsd = () => {
    if (activeMode !== "deposit") return undefined;
    const requestedUsd = depositUsdDecimal;
    if (!requestedUsd || requestedUsd.lte(0)) return undefined;

    const coverage = getExactOutDestinationBalanceCoverage({
      requestedAmount: depositTokenAmountForQuote,
      requestedUsd,
      token: toToken,
    });
    return Decimal.max(
      requestedUsd.minus(coverage?.usd ?? new Decimal(0)),
      new Decimal(0)
    );
  };

  const getDepositSourceIdsFromTokens = (tokens: SwapTokenOption[]) =>
    getExpandedSourceTokens(tokens)
      .filter((token) => token.chainId && token.contractAddress)
      .map((token) =>
        getDepositSourceId(token.contractAddress, token.chainId!)
      );

  const getDepositTokenOptionsBySourceId = () => {
    const map = new Map<string, SwapTokenOption>();
    const sourceTokens = [
      ...(swapBalance
        ? deriveTokenOptions(swapBalance, swapSupportedChainsAndTokens)
        : []),
      ...fromTokens,
    ];

    for (const token of getExpandedSourceTokens(sourceTokens)) {
      if (!token.chainId || !token.contractAddress) continue;
      const id = getDepositSourceId(token.contractAddress, token.chainId);
      if (!map.has(id)) {
        map.set(id, {
          ...token,
          userAmount: "",
        });
      }
    }

    return map;
  };

  const getDepositSourceTokensForIds = (sourceIds: string[]) => {
    const tokenBySourceId = getDepositTokenOptionsBySourceId();
    return sourceIds
      .map((sourceId) => tokenBySourceId.get(sourceId))
      .filter((token): token is SwapTokenOption => Boolean(token))
      .map((token) => ({ ...token, userAmount: "" }));
  };

  const getResolvedDepositSourceSelection = (options?: {
    filter?: DepositSourceFilter;
    selectedTokens?: SwapTokenOption[];
    isManualSelection?: boolean;
    targetAmountUsd?: Decimal;
  }) => {
    const destination = getDepositDestinationForSourceSelection();
    if (!destination) {
      return { sourcePoolIds: [], selectedSourceIds: [], fromSources: [] };
    }

    const manualSelection =
      options?.isManualSelection ?? sourceSelectionTouched;
    const selectedTokensForResolution = options?.selectedTokens ?? fromTokens;
    const selectedSourceIds = getDepositSourceIdsFromTokens(
      selectedTokensForResolution
    );
    const destinationSourceId = getDestinationSourceIdForDeposit();
    const targetAmountUsd =
      options?.targetAmountUsd ??
      (activeMode === "deposit"
        ? getDepositSourceTargetUsd()
        : activeMode === "send"
          ? new Decimal(sendAmountUsd || 0)
          : undefined);

    return resolveDepositSourceSelection({
      swapBalance,
      destination,
      filter: manualSelection
        ? "custom"
        : (options?.filter ?? depositSourceFilter),
      selectedSourceIds,
      isManualSelection: manualSelection,
      minimumBalanceUsd: minimumSourceUsd.toNumber(),
      targetAmountUsd: targetAmountUsd?.toNumber(),
      excludedSourceIds: destinationSourceId ? [destinationSourceId] : [],
    });
  };

  const getExactOutSourceTokens = (
    mode: "all" | "selected" = exactOutQuoteSourceModeRef.current,
    targetAmountUsd?: Decimal
  ) => {
    if (activeMode === "deposit") {
      const selection = getResolvedDepositSourceSelection({ targetAmountUsd });
      return getDepositSourceTokensForIds(
        mode === "all" ? selection.sourcePoolIds : selection.selectedSourceIds
      );
    }

    if (
      (mode === "selected" || sourceSelectionTouched) &&
      fromTokens.length > 0
    ) {
      // A committed manual selection must be forwarded exactly as chosen.
      // The SDK owns source-chain gas handling for explicit sources; applying
      // the automatic gas-capability filter here silently drops valid assets.
      return filterMinimumSourceUsdTokens(
        getExpandedSourceTokens(
          excludeSwapExactOutDestinationTokens(fromTokens)
        )
      );
    }

    if (!ownerAddress || !swapBalance || swapBalance.length === 0) {
      const synthetic = getSyntheticDisconnectedSourceTokens(
        disconnectedAvailableTokens
      );
      if (mode === "selected" && fromTokens.length > 0) {
        const selectedKeys = new Set(fromTokens.map(getTokenSelectionKey));
        return synthetic.filter((t) =>
          selectedKeys.has(getTokenSelectionKey(t))
        );
      }
      return excludeSwapExactOutDestinationTokens(synthetic);
    }

    return excludeSwapExactOutDestinationTokens(
      getGasCapableBalanceSourceTokens()
    );
  };

  const buildFromSourcesPayload = (tokens: SwapTokenOption[]) => {
    const explicitSources =
      activeMode === "deposit"
        ? getResolvedDepositSourceSelection().fromSources
        : filterMinimumSourceUsdTokens(
            getExpandedSourceTokens(
              excludeSwapExactOutDestinationTokens(tokens)
            )
          )
            .filter((token) => token.chainId && token.contractAddress)
            .map((token) => ({
              chainId: token.chainId!,
              tokenAddress: token.contractAddress as `0x${string}`,
            }));
    const heldDestinationToken = isSwapExactOut
      ? undefined
      : getHeldDestinationTokenOption();
    const heldDestinationSource =
      heldDestinationToken?.chainId && heldDestinationToken.contractAddress
        ? {
            chainId: heldDestinationToken.chainId,
            tokenAddress: heldDestinationToken.contractAddress as `0x${string}`,
          }
        : undefined;
    const seen = new Set<string>();
    const sources = [...explicitSources, heldDestinationSource].filter(
      (source): source is { chainId: number; tokenAddress: `0x${string}` } => {
        if (!source) return false;
        const normalizedAddress = isNativeTokenAddress(source.tokenAddress)
          ? zeroAddress
          : source.tokenAddress.toLowerCase();
        const key = `${source.chainId}:${normalizedAddress}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }
    );

    return sources.length > 0 ? { sources } : {};
  };

  const buildPredictiveExactOutSources = async (requiredSourceUsd: Decimal) => {
    if (requiredSourceUsd.lte(0)) return [];

    const destinationKey = getTokenSelectionKey(toToken);
    const singleAssetToken = (() => {
      if (isMultiAssetMode) return undefined;
      if (sourceSelectionTouched && fromTokens.length > 0) return fromTokens[0];
      const rawPool = getExactOutSourceTokens(
        exactOutQuoteSourceModeRef.current,
        requiredSourceUsd
      ).filter((t) => getTokenSelectionKey(t) !== destinationKey);
      if (rawPool.length === 0) return undefined;
      const pool = sortExactOutSourcesBySdkPriority(
        rawPool,
        toToken?.chainId,
        toToken?.contractAddress
      );
      const capable = pool.find((token) => {
        const fullAvailableUsd = getTokenBalanceUsd(token);
        const rate = getTokenUsdRate(token);
        if (fullAvailableUsd.lte(0) || rate.lte(0)) return false;
        return fullAvailableUsd.gte(requiredSourceUsd);
      });
      if (capable) return capable;
      const bestPositive = pool.find(
        (token) =>
          getTokenBalanceUsd(token).gt(0) && getTokenUsdRate(token).gt(0)
      );
      return bestPositive ?? pool[0];
    })();
    const isExplicitUserSelection = Boolean(
      sourceSelectionTouched &&
        exactOutQuoteSourceModeRef.current !== "all" &&
        fromTokens.length > 0
    );
    const sourcePool = !isMultiAssetMode
      ? singleAssetToken
        ? [singleAssetToken]
        : []
      : isExplicitUserSelection
        ? fromTokens
        : getExactOutSourceTokens(
            exactOutQuoteSourceModeRef.current,
            requiredSourceUsd
          );
    const candidates = isExplicitUserSelection
      ? getExpandedSourceTokens(
          excludeSwapExactOutDestinationTokens(sourcePool)
        ).filter((token) => getTokenSelectionKey(token) !== destinationKey)
      : sortExactOutSourcesBySdkPriority(
          getExpandedSourceTokens(
            excludeSwapExactOutDestinationTokens(sourcePool)
          ).filter((token) => getTokenSelectionKey(token) !== destinationKey),
          toToken?.chainId,
          toToken?.contractAddress
        );
    const sources: SwapTokenOption[] = [];
    let remainingUsd = requiredSourceUsd;

    for (const token of candidates) {
      if (remainingUsd.lte(0)) break;

      const availableUsd = getTokenBalanceUsd(token);
      if (availableUsd.lte(0) && (isMultiAssetMode || !isExplicitUserSelection))
        continue;

      const rate = await resolveUsdRateForToken(token);
      if (rate.lte(0)) continue;

      const targetUsd =
        !isMultiAssetMode && isExplicitUserSelection
          ? remainingUsd
          : Decimal.min(
              remainingUsd,
              availableUsd.gt(0) ? availableUsd : remainingUsd
            );
      const tokenAmount = targetUsd
        .div(rate)
        .toDecimalPlaces(Math.max(0, token.decimals || 18), Decimal.ROUND_DOWN);
      if (tokenAmount.lte(0)) continue;

      sources.push({
        ...token,
        userAmount: tokenAmount.toFixed(),
        userAmountMode: "token",
        userAmountUsd: targetUsd
          .toDecimalPlaces(6, Decimal.ROUND_DOWN)
          .toFixed(),
      });
      remainingUsd = remainingUsd.minus(targetUsd);
    }

    return sources;
  };

  const getErrorText = (error: unknown) => {
    const err = error as any;
    const parts = [
      err?.message,
      typeof error === "string" ? error : undefined,
      err?.code,
    ];

    try {
      if (err?.data) parts.push(JSON.stringify(err.data));
    } catch {
      // Ignore non-serializable SDK error metadata.
    }

    return parts.filter(Boolean).join(" ");
  };

  const isInsufficientSourcesError = (error: unknown) => {
    const err = error as any;
    const message = getErrorText(error).toLowerCase();

    return (
      err?.code === ERROR_CODES.INSUFFICIENT_BALANCE ||
      message.includes("insufficient balance") ||
      message.includes("sources are not enough") ||
      (message.includes("source") && message.includes("not enough"))
    );
  };

  const parseLabeledErrorDecimal = (text: string, label: string) => {
    const match = text.match(
      new RegExp(`${label}\\s*:\\s*\\$?\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)`, "i")
    );
    return match ? parseFiatNumber(match[1]) : undefined;
  };

  const getExactOutRequestedUsd = () => {
    const amountNumber = parseFiatNumber(amount);
    if (!amountNumber || amountNumber.lte(0) || !toToken?.symbol) {
      return undefined;
    }

    if (activeMode === "deposit" && depositAmountMode === "usd") {
      return amountNumber;
    }

    const fiatValue = getFiatValue(amountNumber.toNumber(), toToken.symbol);
    return Number.isFinite(fiatValue) && fiatValue > 0
      ? new Decimal(fiatValue)
      : undefined;
  };

  const getExactOutAvailableSourceUsd = (
    sourceTokensOverride?: SwapTokenOption[]
  ): Decimal => {
    const sumTokensWithDestinationCredit = (tokens: SwapTokenOption[]) => {
      const sourceTokens = isSwapExactOut
        ? getExpandedSourceTokens(excludeSwapExactOutDestinationTokens(tokens))
        : tokens;
      const heldDestinationToken = isSwapExactOut
        ? undefined
        : getHeldDestinationTokenOption();
      const heldDestinationKey = getTokenSelectionKey(heldDestinationToken);
      let hasHeldDestinationToken = false;

      const sourceTotal = sourceTokens.reduce((sum, token) => {
        const value = parseFiatNumber(token.balanceInFiat) ?? new Decimal(0);
        const isHeldDestinationToken =
          Boolean(heldDestinationKey) &&
          getTokenSelectionKey(token) === heldDestinationKey;
        if (isHeldDestinationToken) hasHeldDestinationToken = true;
        return value.gt(0) &&
          (isHeldDestinationToken || value.gte(minimumSourceUsd))
          ? sum.plus(value)
          : sum;
      }, new Decimal(0));

      if (!heldDestinationToken || hasHeldDestinationToken) return sourceTotal;
      const heldDestinationUsd =
        parseFiatNumber(heldDestinationToken.balanceInFiat) ?? new Decimal(0);
      return heldDestinationUsd.gt(0)
        ? sourceTotal.plus(heldDestinationUsd)
        : sourceTotal;
    };

    if (
      sourceTokensOverride ||
      exactOutQuoteSourceModeRef.current === "selected"
    ) {
      return sumTokensWithDestinationCredit(sourceTokensOverride ?? fromTokens);
    }
    return getExactOutTotalSourceBalanceUsd();
  };

  const getExactOutTotalSourceBalanceUsd = (): Decimal => {
    const allSourceTotal = getExactOutAvailableSourceUsd(
      getMinimumBalanceSourceTokens()
    );
    if (isSwapExactOut || allSourceTotal.gt(0)) return allSourceTotal;
    return getSwapBalanceTotalUsd();
  };

  const getExactOutIntentSourceUsd = () => {
    const sourceUsd = (intentData?.sources ?? [])
      .filter((source) => !isSwapExactOutDestinationIntentSource(source))
      .reduce(
        (sum, source) =>
          sum.plus(parseFiatNumber((source as any).value) ?? new Decimal(0)),
        new Decimal(0)
      );
    return sourceUsd.gt(0) ? sourceUsd : undefined;
  };

  const getExactOutHeldDestinationUsd = () => {
    if (isSwapExactOut) return new Decimal(0);
    const value = parseFiatNumber(
      getHeldDestinationTokenOption()?.balanceInFiat
    );
    return value?.gt(0) ? value : new Decimal(0);
  };

  const exactOutIntentIncludesHeldDestination = () => {
    if (isSwapExactOut) return false;
    const heldDestinationKey = getTokenSelectionKey(
      getHeldDestinationTokenOption()
    );
    if (!heldDestinationKey) return false;
    return (intentData?.sources ?? []).some((source) => {
      const chainId = source.chain?.id;
      const contractAddress = source.token?.contractAddress;
      if (!chainId || !contractAddress) return false;
      return (
        getTokenSelectionKey({
          chainId,
          contractAddress,
        } as SwapTokenOption) === heldDestinationKey
      );
    });
  };

  const getExactOutRequiredFundingUsd = () => {
    const intentSourceUsd = getExactOutIntentSourceUsd();
    if (intentSourceUsd) {
      const destinationCreditUsd = exactOutIntentIncludesHeldDestination()
        ? new Decimal(0)
        : getExactOutHeldDestinationUsd();
      return intentSourceUsd.plus(destinationCreditUsd);
    }

    const requestedUsd = getExactOutRequestedUsd();
    if (!isSwapExactOut || !requestedUsd) return requestedUsd;

    const baseline =
      predictiveQuoteCacheRef.current[getPredictiveQuoteCacheKey()];
    const cachedSourceUsdRatio = parseFiatNumber(
      baseline?.exactOutSourceUsdPerDestinationUsd
    );
    return getPredictiveExactOutSourceTargetUsd(
      requestedUsd,
      cachedSourceUsdRatio
    );
  };

  const getExactInSourceDeficitUsd = () => {
    if (swapType !== "exactIn" || fromTokens.length === 0) return undefined;

    return fromTokens.reduce((sum, token) => {
      const requestedAmount = parseFiatNumber(
        token.userAmount || (!isMultiAssetMode ? amount : undefined)
      );
      if (!requestedAmount || requestedAmount.lte(0)) return sum;

      if (token.userAmountMode === "usd") {
        const availableUsd = parseFiatNumber(token.balanceInFiat);
        if (!availableUsd || requestedAmount.lte(availableUsd)) return sum;
        return sum.plus(requestedAmount.minus(availableUsd));
      }

      const availableTokenAmount =
        parseFiatNumber(token.balance) ?? new Decimal(0);
      if (requestedAmount.lte(availableTokenAmount)) {
        return sum;
      }

      const missingTokenAmount = requestedAmount.minus(availableTokenAmount);
      const rate = getTokenUsdRate(token);
      if (rate.gt(0)) {
        return sum.plus(missingTokenAmount.mul(rate));
      }
      const fiatBalance = parseFiatNumber(token.balanceInFiat);
      if (fiatBalance && availableTokenAmount.gt(0)) {
        return sum.plus(
          missingTokenAmount.mul(fiatBalance.div(availableTokenAmount))
        );
      }

      return sum;
    }, new Decimal(0));
  };

  const buildInsufficientSourcesIssue = (error: unknown): SwapQuoteIssue => {
    const errorText = getErrorText(error);
    const details =
      (error as any)?.data?.details ?? (error as any)?.details ?? {};
    const requiredFromError =
      parseFiatNumber(
        details.requiredUsd ??
          details.requiredUSD ??
          details.requiredAmountUsd ??
          details.requiredAmount ??
          details.required
      ) ?? parseLabeledErrorDecimal(errorText, "required");
    const availableFromError =
      parseFiatNumber(
        details.availableUsd ??
          details.availableUSD ??
          details.availableAmountUsd ??
          details.availableAmount ??
          details.available
      ) ?? parseLabeledErrorDecimal(errorText, "available");
    const requestedUsd = getExactOutRequiredFundingUsd();
    const availableUsd = getExactOutAvailableSourceUsd();
    const exactInSourceDeficitUsd = getExactInSourceDeficitUsd();

    console.log("[InsufficientSources Debug]", {
      rawError: error,
      errorText,
      errorDetails: details,
      requiredFromError: requiredFromError?.toString(),
      availableFromError: availableFromError?.toString(),
      exactInSourceDeficitUsd: exactInSourceDeficitUsd?.toString(),
      requestedUsd: requestedUsd?.toString(),
      availableUsd: availableUsd?.toString(),
      singleModeAmount: amount,
      fromToken: fromTokens[0],
    });

    let missingUsd =
      swapType === "exactIn"
        ? exactInSourceDeficitUsd && exactInSourceDeficitUsd.gt(0)
          ? new Decimal(exactInSourceDeficitUsd.toDecimalPlaces(2).toFixed())
          : undefined
        : exactInSourceDeficitUsd && exactInSourceDeficitUsd.gt(0)
          ? exactInSourceDeficitUsd
          : requiredFromError && availableFromError
            ? requiredFromError.minus(availableFromError)
            : undefined;

    if (isSwapExactOut && requestedUsd) {
      missingUsd = requestedUsd.minus(availableUsd);
    }

    if (
      isSwapExactOut &&
      requestedUsd &&
      (!missingUsd || missingUsd.lte(0) || missingUsd.gt(requestedUsd.mul(5)))
    ) {
      missingUsd = requestedUsd.minus(availableUsd);
    }

    if (missingUsd && missingUsd.gt(0)) {
      const formattedMissing =
        missingUsd.gt(0) && missingUsd.lt(0.01)
          ? "<$0.01"
          : formatUsdDisplay(missingUsd);

      return {
        type: "insufficientSources",
        missingUsd: missingUsd.toDecimalPlaces(2).toFixed(),
        message: `Need ${formattedMissing} more across your assets`,
      };
    }

    return {
      type: "insufficientSources",
      message: "Add more source balance across your assets",
    };
  };

  const getSyntheticDisconnectedSourceTokens = useCallback(
    (tokens: SwapTokenOption[]) => {
      return tokens
        .map((token) => {
          const isEthOnEthereum =
            token.chainId === 1 &&
            (token.symbol.toUpperCase() === "ETH" ||
              isNativeTokenAddress(token.contractAddress));
          const isUsdc = token.symbol.toUpperCase() === "USDC";
          const isUsdt = token.symbol.toUpperCase() === "USDT";
          const isNative = isNativeTokenAddress(token.contractAddress);

          if (isEthOnEthereum) {
            return {
              ...token,
              balance: "333.3333 ETH",
              balanceInFiat: "$1,000,000.00",
              userAmount: token.userAmount ?? "",
            };
          }

          if (isUsdc || isUsdt || isNative) {
            const rate = getTokenUsdRate(token);
            const price = rate.gt(0)
              ? rate
              : isUsdc || isUsdt
                ? new Decimal(1)
                : new Decimal(100);
            const amountNum = new Decimal(100).div(price);
            return {
              ...token,
              balance: `${amountNum.toFixed(4)} ${token.symbol}`,
              balanceInFiat: "$100.00",
              userAmount: token.userAmount ?? "",
            };
          }

          return null;
        })
        .filter((token): token is SwapTokenOption => token !== null);
    },
    []
  );

  const formatReadableTokenAmount = (rawAmount: bigint, decimals: number) =>
    new Decimal(rawAmount.toString())
      .div(new Decimal(10).pow(decimals))
      .toFixed();

  const formatReadableTokenBalanceAmount = (
    rawAmount: bigint,
    decimals: number
  ) =>
    new Decimal(rawAmount.toString())
      .div(new Decimal(10).pow(decimals))
      .toDecimalPlaces(6)
      .toFixed();

  const trimDecimalString = (value: string) =>
    value.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");

  const buildSourceTokenSnapshotMap = useCallback(
    (balances: UserAsset[] | null | undefined) => {
      const snapshots = new Map<string, SwapTokenOption>();

      for (const asset of balances ?? []) {
        for (const breakdown of asset.breakdown ?? []) {
          const chainId = breakdown.chain?.id;
          const contractAddress = breakdown.contractAddress;
          const symbol = breakdown.symbol ?? asset.symbol;

          if (
            !chainId ||
            !contractAddress ||
            !symbol ||
            !isSwapSupportedBySdkChainList(
              chainId,
              swapSupportedChainsAndTokens
            )
          ) {
            continue;
          }

          const chainMeta = CHAIN_METADATA[chainId];
          const fiatBalance = parseFiatNumber(breakdown.balanceInFiat);
          const snapshot: SwapTokenOption = {
            balance: `${breakdown.balance ?? "0"} ${symbol}`,
            balanceInFiat: fiatBalance
              ? formatUsdDisplay(fiatBalance)
              : "$0.00",
            chainId,
            chainLogo: chainMeta?.logo ?? breakdown.chain?.logo,
            chainName: getShortChainName(
              chainId,
              chainMeta?.name ?? breakdown.chain?.name
            ),
            contractAddress,
            decimals: breakdown.decimals ?? asset.decimals ?? 18,
            logo: asset.logo ?? "",
            name: symbol,
            symbol,
          };
          snapshots.set(getTokenSelectionKey(snapshot), snapshot);
        }
      }

      return snapshots;
    },
    [swapSupportedChainsAndTokens]
  );

  const patchSourceTokensWithBalances = useCallback(
    (tokens: SwapTokenOption[], balances: UserAsset[]) => {
      const snapshots = buildSourceTokenSnapshotMap(balances);

      const updateToken = (token: SwapTokenOption): SwapTokenOption => {
        const preservedAmounts = {
          userAmount: token.userAmount,
          userAmountMode: token.userAmountMode,
          userAmountUsd: token.userAmountUsd,
        };

        if (token.isUnified) {
          const sourceTokens = (token.sourceTokens ?? []).map(updateToken);
          const totalBalance = sourceTokens.reduce(
            (sum, source) =>
              sum.plus(parseFiatNumber(source.balance) ?? new Decimal(0)),
            new Decimal(0)
          );
          const totalFiat = sourceTokens.reduce(
            (sum, source) =>
              sum.plus(parseFiatNumber(source.balanceInFiat) ?? new Decimal(0)),
            new Decimal(0)
          );

          return {
            ...token,
            ...preservedAmounts,
            balance: totalBalance.toDecimalPlaces(8).toFixed(),
            balanceInFiat: formatUsdDisplay(totalFiat),
            sourceTokens,
          };
        }

        const snapshot = snapshots.get(getTokenSelectionKey(token));
        if (!snapshot) {
          return {
            ...token,
            ...preservedAmounts,
            balance: `0 ${token.symbol}`,
            balanceInFiat: "$0.00",
            chainLogo:
              token.chainLogo ??
              (token.chainId ? CHAIN_METADATA[token.chainId]?.logo : undefined),
            chainName: getShortChainName(token.chainId, token.chainName),
          };
        }

        return {
          ...token,
          ...snapshot,
          ...preservedAmounts,
        };
      };

      return tokens.map(updateToken);
    },
    [buildSourceTokenSnapshotMap]
  );

  const refreshSelectedSourceBalances = useCallback(async () => {
    const refreshedBalance = await fetchSwapBalance();
    const balances = refreshedBalance ?? swapBalance;
    if (!balances) return;

    setFromTokens((current) =>
      current.length === 0
        ? current
        : patchSourceTokensWithBalances(current, balances)
    );
    setSourceSelectionRevision((current) => current + 1);
  }, [fetchSwapBalance, patchSourceTokensWithBalances, swapBalance]);

  const receiveMaxSafetyMultiplier = new Decimal("0.9");
  const currentSwapEntry =
    currentSwapId !== null
      ? swapHistory.find((entry) => entry.id === currentSwapId)
      : undefined;

  const scheduleTerminalBalanceRefresh = () => {
    if (terminalBalanceRefreshTimerRef.current) {
      clearTimeout(terminalBalanceRefreshTimerRef.current);
    }

    terminalBalanceRefreshTimerRef.current = setTimeout(() => {
      terminalBalanceRefreshTimerRef.current = null;
      void fetchSwapBalance();
    }, BALANCE_REFRESH_AFTER_TERMINAL_MS);
  };

  const patchSwapHistoryEntry = (
    id: string | null | undefined,
    patch: Partial<SwapHistoryEntry>
  ) => {
    if (!id) return;
    setSwapHistory((prev) =>
      sortSwapHistoryEntries(
        prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
      )
    );
  };

  const patchCurrentSwapHistoryEntry = (patch: Partial<SwapHistoryEntry>) => {
    patchSwapHistoryEntry(currentSwapIdRef.current, patch);
  };

  const patchCurrentIntentExplorerUrl = (url?: string | null) => {
    if (!isHttpUrl(url)) return;
    if (intentUrlRef.current === url) return;

    intentUrlRef.current = url;
    const intentId = extractIntentIdFromUrl(url);
    patchCurrentSwapHistoryEntry({
      intentExplorerUrl: url,
      ...(intentId ? { intentId } : {}),
    });
  };

  const resetExplorerUrls = () => {
    const next = { sourceExplorerUrl: null, destinationExplorerUrl: null };
    explorerUrlsRef.current = next;
    setExplorerUrls(next);
  };

  const mergeExplorerUrls = (
    patch: Partial<{
      sourceExplorerUrl: string | null;
      destinationExplorerUrl: string | null;
    }>
  ) => {
    const next = { ...explorerUrlsRef.current, ...patch };
    explorerUrlsRef.current = next;
    setExplorerUrls(next);
    patchCurrentSwapHistoryEntry({
      sourceExplorerUrl: next.sourceExplorerUrl,
      finalExplorerUrl: next.destinationExplorerUrl ?? next.sourceExplorerUrl,
    });
  };

  const resetProgressEvents = () => {
    progressEventsRef.current = [];
    setProgressEvents((current) => (current.length === 0 ? current : []));
    setFailedProgressStep((current) => (current === null ? current : null));
    rawPlanStepsRef.current = [];
    setRawPlanSteps([]);
  };

  const appendProgressEvent = (
    name: string,
    step: SwapStepType | BridgeStepType | undefined,
    defaultCompleted: boolean,
    event?: unknown
  ) => {
    if (!step) return;
    const completed =
      typeof (step as any).completed === "boolean"
        ? Boolean((step as any).completed)
        : defaultCompleted;

    setProgressEvents((prev) => {
      const next = [
        ...prev,
        {
          id: `${Date.now()}-${prev.length}-${(step as any).typeID ?? (step as any).type ?? name}`,
          name,
          completed,
          event,
          step,
        },
      ];
      progressEventsRef.current = next;
      return next;
    });
  };

  const appendProgressListEvent = (
    name: string,
    stepList: Array<SwapStepType | BridgeStepType>,
    rawSteps?: unknown[],
    planType?: "plan_preview" | "plan_confirmed"
  ) => {
    if (stepList.length === 0) return;

    setProgressEvents((prev) => {
      const next = [
        ...prev,
        {
          id: `${Date.now()}-${prev.length}-${name}`,
          name,
          completed: false,
          step: stepList[0],
          steps: stepList,
          rawSteps: rawSteps ?? (stepList as any),
          planType,
        },
      ];
      progressEventsRef.current = next;
      return next;
    });
  };

  const startSwapHistoryEntry = () => {
    const id = `${Date.now()}-${swapRunIdRef.current}`;
    const now = Date.now();
    const resolvedToToken =
      toToken && destinationBalance
        ? { ...toToken, balance: destinationBalance }
        : toToken;
    const entry: SwapHistoryEntry = {
      id,
      mode: activeMode,
      status: "pending",
      swapType,
      createdAt: now,
      startedAt: now,
      intentData,
      fromTokens,
      toToken: resolvedToToken,
      requestedToAmount: isExactOutPaymentFlow
        ? previewDestinationAmount
        : undefined,
      requestedToValue: isExactOutPaymentFlow ? previewToAmountUsd : undefined,
      recipientAddress: transferRecipientAddress,
      opportunity: selectedOpportunity,
      feeUsd: intentFeeUsd,
      sourceExplorerUrl: null,
      finalExplorerUrl: null,
      intentExplorerUrl: isHttpUrl(intentUrlRef.current)
        ? intentUrlRef.current
        : null,
      intentId: extractIntentIdFromUrl(intentUrlRef.current),
      autoRefundAvailable: false,
    };

    currentSwapStartedAtRef.current = 0;
    currentSwapIdRef.current = id;
    setCurrentSwapId(id);
    setSwapHistory((prev) => sortSwapHistoryEntries([entry, ...prev]));
    return id;
  };

  const finishCurrentSwapHistoryEntry = (
    status: "fulfilled" | "failed" | "timeout",
    patch: Partial<SwapHistoryEntry> = {}
  ) => {
    const now = Date.now();
    const startedAt = currentSwapStartedAtRef.current || now;
    patchSwapHistoryEntry(currentSwapIdRef.current, {
      status,
      endedAt: now,
      durationSeconds: Math.max(1, Math.round((now - startedAt) / 1000)),
      sourceExplorerUrl: explorerUrlsRef.current.sourceExplorerUrl,
      finalExplorerUrl:
        explorerUrlsRef.current.destinationExplorerUrl ??
        explorerUrlsRef.current.sourceExplorerUrl,
      ...patch,
    });
    scheduleTerminalBalanceRefresh();
  };

  const markSwapExecutionStarted = () => {
    if (currentSwapStartedAtRef.current > 0) return;
    const now = Date.now();
    currentSwapStartedAtRef.current = now;
    patchCurrentSwapHistoryEntry({ startedAt: now });
  };

  const enterSkippedSwapProgress = () => {
    if (!isExactOutPaymentFlow) return;

    const shouldInitializeProgress = swapStepRef.current !== "progress";
    if (!currentSwapIdRef.current) {
      onStart?.();
      startSwapHistoryEntry();
    }

    setIntentLoading(false);
    setQuoteRefreshing(false);
    setPreviewQuoteRefreshing(false);
    setReceiveMaxCalculating(false);
    setSwapQuoteIssue(null);

    if (shouldInitializeProgress) {
      resetProgressEvents();
      swapStepsListRef.current = [];
      resetSteps();
      swapStepRef.current = "progress";
      setSwapStep("progress");
    }
  };

  const cachePredictiveBaselineFromIntent = (intent: SwapIntentData) => {
    const destinationAmount = parseFiatNumber(intent.destination?.amount);
    const destinationValue = parseFiatNumber(intent.destination?.value);
    const sourceUsd = (intent.sources ?? []).reduce(
      (sum, source) =>
        sum.plus(parseFiatNumber((source as any).value) ?? new Decimal(0)),
      new Decimal(0)
    );

    if (!destinationAmount || destinationAmount.lte(0)) return;

    const destinationUsdRate =
      destinationValue && destinationValue.gt(0)
        ? destinationValue.div(destinationAmount)
        : getUsdRateForSymbol(intent.destination?.token?.symbol);
    if (destinationUsdRate.lte(0)) return;

    cacheSymbolUsdRate(intent.destination?.token?.symbol, destinationUsdRate);

    const key = getPredictiveQuoteCacheKey();
    if (!key) return;

    const baseline: PredictiveQuoteBaseline = {
      destinationUsdRate: destinationUsdRate.toDecimalPlaces(18).toFixed(),
      updatedAt: Date.now(),
    };

    if (activeMode === "swap" && swapType === "exactIn" && sourceUsd.gt(0)) {
      baseline.exactInDestinationAmountPerSourceUsd = destinationAmount
        .div(sourceUsd)
        .toDecimalPlaces(18)
        .toFixed();
    }

    const resolvedDestinationValue =
      destinationValue && destinationValue.gt(0)
        ? destinationValue
        : destinationAmount.mul(destinationUsdRate);
    if (
      isExactOutPaymentFlow &&
      resolvedDestinationValue.gt(0) &&
      sourceUsd.gt(0)
    ) {
      baseline.exactOutSourceUsdPerDestinationUsd = sourceUsd
        .div(resolvedDestinationValue)
        .toDecimalPlaces(18)
        .toFixed();
    }

    predictiveQuoteCacheRef.current[key] = baseline;
  };

  const applySwapIntent = useCallback(
    (intent: SwapIntentData) => {
      const sourceIntent = (intent.sources ?? []).filter(
        (source) => !isSwapExactOutDestinationIntentSource(source)
      );
      const sortedIntent = {
        ...intent,
        sources: sortIntentSourcesByUsdDesc(sourceIntent),
      };
      const sortedIntentSourceTokens = sortSwapTokensByUsdDesc(
        (sortedIntent.sources ?? []).map(buildIntentSourceToken)
      );

      lastSwapIntentRefreshAtRef.current = Date.now();
      lastIntentSourceTokensRef.current = sortedIntentSourceTokens;
      if (
        !sourceSelectionTouched &&
        (activeMode === "send" ||
          isSwapExactOut ||
          (activeMode === "deposit" && swapType === "exactOut"))
      ) {
        lastAutoIntentSourceTokensRef.current = sortedIntentSourceTokens;
      }
      cacheDestinationUsdRateFromIntent(sortedIntent);
      cachePredictiveBaselineFromIntent(sortedIntent);
      setIntentData(sortedIntent);
      setIntentToAmount(sortedIntent.destination?.amount || undefined);
      setSwapQuoteIssue(null);

      if (
        isMultiAssetMode &&
        !sourceSelectionTouched &&
        !isQuoteEditLocked() &&
        (activeMode === "send" ||
          isSwapExactOut ||
          (activeMode === "deposit" && swapType === "exactOut"))
      ) {
        syncingIntentSourcesRef.current = true;
        setFromTokens(sortedIntentSourceTokens);
      }

      try {
        const bridgeFees = sortedIntent.feesAndBuffer?.bridge;
        const bridgeFeeData =
          bridgeFees && typeof bridgeFees === "object" ? bridgeFees : undefined;
        const collectionFee = parseFiatNumber(bridgeFeeData?.collection);
        const fulfilmentFee = parseFiatNumber(bridgeFeeData?.fulfilment);
        const executionGasFee =
          parseFiatNumber(bridgeFeeData?.caGas) ??
          (collectionFee !== undefined || fulfilmentFee !== undefined
            ? (collectionFee ?? new Decimal(0)).plus(
                fulfilmentFee ?? new Decimal(0)
              )
            : undefined);
        const bridgeGasSuppliedFee = parseFiatNumber(
          bridgeFeeData?.gasSupplied
        );
        const destinationGasSuppliedFee =
          getIntentDestinationGasUsdValue(sortedIntent);
        const gasSuppliedFee =
          bridgeGasSuppliedFee ?? destinationGasSuppliedFee;
        const bridgeComponentsTotal = bridgeFeeData
          ? [
              executionGasFee,
              parseFiatNumber(bridgeFeeData.protocol),
              parseFiatNumber(bridgeFeeData.solver),
              gasSuppliedFee,
            ].reduce<Decimal>(
              (sum, value) => sum.plus(value ?? new Decimal(0)),
              new Decimal(0)
            )
          : undefined;
        const rawBridgeTotal =
          typeof bridgeFees === "string"
            ? parseFiatNumber(bridgeFees)
            : parseFiatNumber(bridgeFeeData?.total);
        const bridgeTotal =
          rawBridgeTotal &&
          !bridgeGasSuppliedFee &&
          destinationGasSuppliedFee &&
          destinationGasSuppliedFee.gt(0)
            ? rawBridgeTotal.plus(destinationGasSuppliedFee)
            : (rawBridgeTotal ??
              (bridgeComponentsTotal && bridgeComponentsTotal.gt(0)
                ? bridgeComponentsTotal
                : destinationGasSuppliedFee));

        if (bridgeTotal !== undefined) {
          setIntentFeeUsd(
            bridgeTotal.gt(0) ? bridgeTotal.toDecimalPlaces(6).toFixed() : "0"
          );
        } else {
          setIntentFeeUsd(undefined);
        }
      } catch (err) {
        console.warn("Could not resolve bridge fee total", err);
        setIntentFeeUsd(undefined);
      }
    },
    [
      activeMode,
      fromTokens,
      isQuoteEditLocked,
      sourceSelectionTouched,
      swapType,
      swapBalance,
      toToken,
    ]
  );

  const handleSwapIntentCallback = useCallback(
    (data: any, runId: number, quoteInputKey: string) => {
      const compatibleData = data?.quote
        ? adaptIntentHook(
            data,
            swapSupportedChainsAndTokens ?? supportedChainsAndTokens ?? []
          )
        : data;
      const { intent, allow, deny, refresh } = compatibleData;
      const bridgeProvider = normalizeBridgeProvider(
        data?.bridgeProvider ??
          intent?.bridgeProvider ??
          intent?.normalizedIntent?.bridgeProvider ??
          intent?.swap?.bridgeProvider
      );
      const intentWithBridgeProvider = normalizeRenderableSwapIntentData(
        intent,
        bridgeProvider
      );
      logSdkIntentEvent("onIntent", data, {
        bridgeProvider,
        currentRunId: swapRunIdRef.current,
        normalizedIntent: intentWithBridgeProvider,
        isCurrentRun: swapRunIdRef.current === runId,
        quoteInputKey,
        runId,
      });
      if (swapRunIdRef.current !== runId) {
        logSdkIntentEvent("ignored stale onIntent", data, {
          currentRunId: swapRunIdRef.current,
          quoteInputKey,
          runId,
        });
        deny();
        return;
      }
      if (quoteInputKey && activeQuoteInputKeyRef.current !== quoteInputKey) {
        logSdkIntentEvent("ignored stale quote input onIntent", data, {
          currentQuoteInputKey: activeQuoteInputKeyRef.current,
          quoteInputKey,
          runId,
        });
        deny();
        return;
      }
      if (!intentWithBridgeProvider) {
        console.warn("[NexusOne SDK][intent] Unsupported intent shape", {
          intent,
          raw: data,
        });
        deny();
        setIntentLoading(false);
        setQuoteRefreshing(false);
        setReceiveMaxCalculating(false);
        setPreviewQuoteRefreshing(false);
        setTxError("Quote unavailable");
        return;
      }
      const resolvedQuoteInputKey = quoteInputKey;
      const normalizedRefresh =
        typeof refresh === "function"
          ? async (...args: unknown[]) => {
              const refreshed = await refresh(...args);
              const refreshedBridgeProvider = normalizeBridgeProvider(
                refreshed?.bridgeProvider ??
                  refreshed?.normalizedIntent?.bridgeProvider ??
                  refreshed?.swap?.bridgeProvider ??
                  bridgeProvider
              );
              return (
                normalizeRenderableSwapIntentData(
                  refreshed,
                  refreshedBridgeProvider
                ) ?? refreshed
              );
            }
          : refresh;
      providerSwapIntent.current = {
        intent: intentWithBridgeProvider as any,
        allow,
        deny,
        refresh: normalizedRefresh,
      };
      swapIntentRef.current = {
        intent: intentWithBridgeProvider,
        allow,
        deny,
        refresh: normalizedRefresh,
        runId,
        quoteInputKey: resolvedQuoteInputKey,
      };
      flushSync(() => {
        applySwapIntent(intentWithBridgeProvider);
        setIntentLoading(false);
        setQuoteRefreshing(false);
        setReceiveMaxCalculating(false);
        setPreviewQuoteRefreshing(false);
      });
      if (
        swapRunIdRef.current === runId &&
        swapStepRef.current === "progress"
      ) {
        onStart?.();
        startSwapHistoryEntry();
        setQuoteRefreshing(false);
        resetProgressEvents();
        allow();
      }
    },
    [applySwapIntent, providerSwapIntent]
  );

  // Deposit-specific
  const [selectedOpportunity, setSelectedOpportunity] = useState<
    NexusOneDepositConfig | undefined
  >(() => (activeMode === "deposit" ? configuredDeposit : undefined));
  const selectedOpportunityIdentity =
    getDepositConfigIdentity(selectedOpportunity);
  const [depositAmountMode, setDepositAmountMode] = useState<"token" | "usd">(
    "token"
  );
  const [depositSourceFilter, setDepositSourceFilter] =
    useState<DepositSourceFilter>("all");

  useEffect(() => {
    const immediateIssue = buildReceiveAmountIssue();
    applyReceiveAmountIssue(immediateIssue);

    if (!toToken || !getDestinationReceiveLimitUsd(toToken)) return;
    if (!parseFiatNumber(amount)?.gt(0)) return;
    if (getImmediateDestinationReceiveUsdRate(toToken)?.gt(0)) return;

    let cancelled = false;
    void resolveUsdRateForToken(toToken)
      .then((resolvedRate) => {
        if (cancelled) return;
        const issue = buildReceiveAmountIssue({
          destinationRate: resolvedRate.gt(0) ? resolvedRate : undefined,
        });
        applyReceiveAmountIssue(issue);
      })
      .catch(() => {
        if (!cancelled) {
          applyReceiveAmountIssue(buildReceiveAmountIssue());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeMode,
    amount,
    depositAmountMode,
    fromTokens,
    swapType,
    toToken?.chainId,
    toToken?.chainName,
    toToken?.contractAddress,
    toToken?.priceUSD,
    toToken?.symbol,
  ]);

  const trackDeposit = useCallback(
    (event: string, props?: Record<string, unknown>) => {
      const analytics = nexusSDK?.analytics;
      if (!analytics) return;
      analytics.track(event, {
        widgetSessionId: widgetSessionIdRef.current,
        widgetAttemptId: widgetAttemptIdRef.current,
        opportunityProtocol: selectedOpportunity?.protocol ?? null,
        destinationChainId: selectedOpportunity?.chainId ?? null,
        destinationToken: selectedOpportunity?.tokenSymbol ?? null,
        ...props,
      });
    },
    [nexusSDK, selectedOpportunity]
  );

  useEffect(() => {
    if (activeMode !== "deposit") return;
    if (!nexusSDK?.analytics) return;
    if (widgetOpenedFiredRef.current) return;
    widgetOpenedFiredRef.current = true;
    widgetOpenedTsRef.current = Date.now();
    rotateAttempt();
    trackDeposit("deposit_widget_opened", {
      embed: Boolean(embed),
      depositConfigured: Boolean(configuredDeposit),
      prefillAmountPresent: Boolean(config.prefill?.amount),
    });
  }, [
    activeMode,
    nexusSDK,
    embed,
    configuredDeposit,
    config.prefill,
    rotateAttempt,
    trackDeposit,
  ]);

  useEffect(() => {
    analyticsRef.current = nexusSDK?.analytics ?? null;
  }, [nexusSDK]);

  useEffect(() => {
    selectedOpportunityRef.current = selectedOpportunity;
  }, [selectedOpportunity]);

  useEffect(() => {
    return () => {
      if (!widgetOpenedFiredRef.current) return;
      const analytics = analyticsRef.current;
      if (!analytics) return;
      const opp = selectedOpportunityRef.current;
      analytics.track("deposit_widget_closed", {
        widgetSessionId: widgetSessionIdRef.current,
        widgetAttemptId: widgetAttemptIdRef.current,
        opportunityProtocol: opp?.protocol ?? null,
        lastStep: swapStepRef.current,
        reachedTerminal: reachedTerminalRef.current,
        hadSimulationSuccess: hadSimulationSuccessRef.current,
        hadPreviewViewed: hadPreviewViewedRef.current,
        timeInWidgetMs: Date.now() - widgetOpenedTsRef.current,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toTokenFromOpportunity = (
    opp: NexusOneDepositMetadata
  ): SwapTokenOption => {
    const citreaToken = findCitreaReceiveToken({
      address: opp.tokenAddress,
      chainId: opp.chainId,
      symbol: opp.tokenSymbol,
    });
    const chainTokens = supportedChainsAndTokens?.find(
      (chain) => chain.id === opp.chainId
    )?.tokens;
    const matchedToken = chainTokens?.find(
      (token) =>
        token.contractAddress.toLowerCase() ===
          opp.tokenAddress.toLowerCase() || token.symbol === opp.tokenSymbol
    );
    const tokenSymbol =
      citreaToken?.symbol ?? matchedToken?.symbol ?? opp.tokenSymbol;
    const tokenMeta =
      TOKEN_METADATA[tokenSymbol as keyof typeof TOKEN_METADATA];

    return {
      chainId: opp.chainId,
      contractAddress: citreaToken?.contractAddress ?? opp.tokenAddress,
      symbol: tokenSymbol,
      name: matchedToken?.name || citreaToken?.name || tokenSymbol,
      balance: "0",
      balanceInFiat: "$0.00",
      decimals:
        matchedToken?.decimals ??
        citreaToken?.decimals ??
        opp.tokenDecimals ??
        tokenMeta?.decimals ??
        18,
      logo:
        opp.tokenLogo ||
        matchedToken?.logo ||
        citreaToken?.logo ||
        tokenMeta?.logo,
      chainName: getShortChainName(
        opp.chainId,
        CHAIN_METADATA[opp.chainId]?.name ?? citreaToken?.chainName
      ),
      chainLogo: CHAIN_METADATA[opp.chainId]?.logo ?? citreaToken?.chainLogo,
    };
  };

  const getDestinationBalanceFromSwapBalances = (token?: SwapTokenOption) => {
    if (!token?.chainId || !token.contractAddress) return null;

    const targetAddress = token.contractAddress.toLowerCase();
    const targetSymbol = token.symbol.toUpperCase();

    for (const asset of swapBalance ?? []) {
      for (const breakdown of asset.breakdown ?? []) {
        if (breakdown.chain?.id !== token.chainId) continue;

        const breakdownAddress = breakdown.contractAddress?.toLowerCase();
        const addressMatches =
          (breakdownAddress && breakdownAddress === targetAddress) ||
          (isNativeTokenAddress(breakdownAddress) &&
            isNativeTokenAddress(targetAddress));
        const symbolMatches =
          (breakdown.symbol ?? asset.symbol ?? "").toUpperCase() ===
          targetSymbol;

        if (!addressMatches && !symbolMatches) continue;

        const balance = parseFiatNumber(breakdown.balance);
        if (!balance) return null;

        return `${balance.toDecimalPlaces(6).toFixed()} ${token.symbol}`;
      }
    }

    return null;
  };

  const resolvePrefillToken = useCallback(
    (pair?: { token: `0x${string}`; chain: number }) => {
      if (!pair?.token || !pair.chain) return undefined;

      const normalizeAddress = (address?: string) => {
        if (!address) return "";
        return isNativeTokenAddress(address)
          ? zeroAddress
          : address.toLowerCase();
      };
      const targetAddress = normalizeAddress(pair.token);

      const balanceToken = deriveTokenOptions(
        swapBalance ?? [],
        swapSupportedChainsAndTokens
      ).find(
        (token) =>
          token.chainId === pair.chain &&
          normalizeAddress(token.contractAddress) === targetAddress
      );
      if (balanceToken) return balanceToken;

      const chain = supportedChainsAndTokens?.find(
        (item) => item.id === pair.chain
      );
      const matchedToken = chain?.tokens?.find(
        (token) => normalizeAddress(token.contractAddress) === targetAddress
      );
      const citreaToken = findCitreaReceiveToken({
        address: pair.token,
        chainId: pair.chain,
      });
      const tokenAddressSymbol = Object.entries(
        TOKEN_CONTRACT_ADDRESSES as Record<string, Record<number, string>>
      ).find(
        ([, addresses]) =>
          normalizeAddress(addresses[pair.chain]) === targetAddress
      )?.[0];
      const chainMeta = CHAIN_METADATA[pair.chain];
      const isNativePrefill = isNativeTokenAddress(pair.token);
      const tokenSymbol =
        matchedToken?.symbol ??
        citreaToken?.symbol ??
        tokenAddressSymbol ??
        (isNativePrefill ? chainMeta?.nativeCurrency?.symbol : undefined) ??
        "Token";
      const tokenMeta =
        TOKEN_METADATA[tokenSymbol as keyof typeof TOKEN_METADATA];

      if (
        !chain &&
        !matchedToken &&
        !citreaToken &&
        !tokenAddressSymbol &&
        !isNativePrefill
      ) {
        return undefined;
      }

      return {
        chainId: pair.chain,
        contractAddress: citreaToken?.contractAddress ?? pair.token,
        symbol: tokenSymbol,
        name: matchedToken?.name || citreaToken?.name || tokenSymbol,
        balance: `0 ${tokenSymbol}`,
        balanceInFiat: "$0.00",
        decimals:
          matchedToken?.decimals ??
          citreaToken?.decimals ??
          tokenMeta?.decimals ??
          (isNativePrefill ? chainMeta?.nativeCurrency?.decimals : undefined) ??
          18,
        logo: matchedToken?.logo || citreaToken?.logo || tokenMeta?.logo,
        chainName: getShortChainName(
          pair.chain,
          chain?.name ?? chainMeta?.name ?? citreaToken?.chainName
        ),
        chainLogo: chainMeta?.logo ?? chain?.logo ?? citreaToken?.chainLogo,
      } satisfies SwapTokenOption;
    },
    [supportedChainsAndTokens, swapBalance]
  );

  useEffect(() => {
    if (activeMode !== "swap") return;

    const sourcePrefill = config.prefill?.source;
    const destinationPrefill = config.prefill?.destination;
    if (!sourcePrefill && !destinationPrefill) return;

    const prefillKey = [
      sourcePrefill
        ? `source:${sourcePrefill.chain}:${sourcePrefill.token.toLowerCase()}`
        : "",
      destinationPrefill
        ? `destination:${destinationPrefill.chain}:${destinationPrefill.token.toLowerCase()}`
        : "",
      config.prefill?.amount ? `amount:${config.prefill.amount}` : "",
    ].join("|");

    if (appliedTokenPrefillRef.current === prefillKey) return;

    const sourceToken = resolvePrefillToken(sourcePrefill);
    const destinationToken = resolvePrefillToken(destinationPrefill);

    if (sourcePrefill && !sourceToken) return;
    if (destinationPrefill && !destinationToken) return;

    if (sourceToken) {
      setFromTokens((current) => {
        const nextSourceToken = {
          ...sourceToken,
          userAmount: config.prefill?.amount ?? "",
        };
        const currentSourceToken = current[0];
        if (
          current.length === 1 &&
          isSameTokenSelection(currentSourceToken, nextSourceToken) &&
          currentSourceToken.userAmount === nextSourceToken.userAmount
        ) {
          return current;
        }
        return [nextSourceToken];
      });
      setSourceSelectionTouched(true);
    }
    if (destinationToken) {
      setToToken((current) =>
        isSameTokenSelection(current, destinationToken)
          ? current
          : destinationToken
      );
    }
    appliedTokenPrefillRef.current = prefillKey;
  }, [
    activeMode,
    config.prefill?.amount,
    config.prefill?.destination?.chain,
    config.prefill?.destination?.token,
    config.prefill?.source?.chain,
    config.prefill?.source?.token,
    resolvePrefillToken,
  ]);

  useEffect(() => {
    if (activeMode !== "send") return;

    const sendPrefill =
      config.prefill?.token && config.prefill?.chain
        ? {
            token: config.prefill.token,
            chain: config.prefill.chain,
          }
        : config.prefill?.destination;
    if (!sendPrefill) return;

    const prefillKey = `send:${sendPrefill.chain}:${sendPrefill.token.toLowerCase()}`;
    if (appliedTokenPrefillRef.current === prefillKey) return;

    const token = resolvePrefillToken(sendPrefill);
    if (!token) return;

    setToToken(token);
    setSwapType("exactOut");
    appliedTokenPrefillRef.current = prefillKey;
  }, [
    activeMode,
    config.prefill?.chain,
    config.prefill?.destination?.chain,
    config.prefill?.destination?.token,
    config.prefill?.token,
    resolvePrefillToken,
  ]);

  useEffect(() => {
    if (config.prefill?.amount) setAmount(config.prefill.amount);
    if (config.prefill?.recipient) {
      setRecipientAddress(config.prefill.recipient);
      setIsRecipientUserEdited(true);
    }
  }, [config.prefill?.amount, config.prefill?.recipient]);

  useEffect(() => {
    setDestinationBalance(null);

    const balanceToken =
      toToken ??
      (activeMode === "deposit" && selectedOpportunity
        ? toTokenFromOpportunity(selectedOpportunity)
        : undefined);

    if (!balanceToken?.chainId || !ownerAddress) return;

    const swapBalanceValue =
      getDestinationBalanceFromSwapBalances(balanceToken);
    if (swapBalanceValue) {
      setDestinationBalance(swapBalanceValue);
    }
  }, [
    activeMode,
    ownerAddress,
    selectedOpportunity?.chainId,
    selectedOpportunity?.tokenAddress,
    selectedOpportunity?.tokenLogo,
    selectedOpportunity?.tokenSymbol,
    swapBalance,
    toToken?.chainId,
    toToken?.chainName,
    toToken?.contractAddress,
    toToken?.decimals,
    toToken?.symbol,
  ]);

  useEffect(() => {
    if (activeMode !== "deposit" || !configuredDeposit) return;
    setSelectedOpportunity((current) =>
      isSameDepositConfig(current, configuredDeposit)
        ? current
        : configuredDeposit
    );
    setSwapType("exactOut");
    setToToken((current) => {
      const next = {
        ...toTokenFromOpportunity(configuredDeposit),
        balance: current?.balance ?? "0",
        balanceInFiat: current?.balanceInFiat ?? "$0.00",
      };
      if (
        current &&
        current.chainId === next.chainId &&
        current.contractAddress.toLowerCase() ===
          next.contractAddress.toLowerCase() &&
        current.symbol === next.symbol &&
        current.decimals === next.decimals &&
        current.logo === next.logo &&
        current.chainLogo === next.chainLogo &&
        current.chainName === next.chainName &&
        current.balance === next.balance &&
        current.balanceInFiat === next.balanceInFiat
      ) {
        return current;
      }
      return next;
    });
  }, [
    activeMode,
    configuredDepositIdentity,
    configuredDeposit?.chainId,
    configuredDeposit?.tokenAddress,
    configuredDeposit?.tokenLogo,
    configuredDeposit?.tokenSymbol,
    supportedChainsAndTokens,
  ]);

  useEffect(() => {
    if (activeMode !== "deposit" || !selectedOpportunity) return;
    setToToken((current) => {
      const next = {
        ...toTokenFromOpportunity(selectedOpportunity),
        balance: current?.balance ?? "0",
        balanceInFiat: current?.balanceInFiat ?? "$0.00",
      };
      if (
        current &&
        current.chainId === next.chainId &&
        current.contractAddress.toLowerCase() ===
          next.contractAddress.toLowerCase() &&
        current.symbol === next.symbol &&
        current.decimals === next.decimals &&
        current.logo === next.logo &&
        current.chainLogo === next.chainLogo &&
        current.chainName === next.chainName &&
        current.balance === next.balance &&
        current.balanceInFiat === next.balanceInFiat
      ) {
        return current;
      }
      return next;
    });
  }, [activeMode, selectedOpportunity, supportedChainsAndTokens]);

  useEffect(() => {
    if (activeMode !== "send") return;
    setSwapType("exactOut");
  }, [activeMode]);

  useEffect(() => {
    if (!toToken?.symbol) return;
    if (getFiatValue(1, toToken.symbol) > 0) return;

    let cancelled = false;
    void resolveTokenUsdRate(toToken.symbol).catch((error) => {
      if (!cancelled) {
        console.warn("Unable to resolve Nexus One token USD rate", {
          symbol: toToken.symbol,
          error,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeMode, getFiatValue, resolveTokenUsdRate, toToken?.symbol]);

  // Balance helpers
  const activeBalanceArray = swapBalance;
  const selectedToken = config.prefill?.token ?? "USDC";
  const currentAsset =
    activeBalanceArray?.find((a) => a.symbol === selectedToken) ||
    activeBalanceArray?.[0];
  const maxBalance = currentAsset?.balance
    ? String(currentAsset.balance)
    : undefined;
  const usdValue = getFiatValue(
    Number(amount) || 0,
    currentAsset?.symbol || "USDC"
  );
  const getDepositTokenUsdRate = () => {
    if (!selectedOpportunity?.tokenSymbol) return new Decimal(0);
    const fiat = getFiatValue(1, selectedOpportunity.tokenSymbol);
    if (Number.isFinite(fiat) && fiat > 0) {
      return new Decimal(fiat);
    }

    return getCachedDestinationUsdRate(toToken) ?? new Decimal(0);
  };
  const getDepositTokenAmountForQuote = () => {
    const parsedAmount = parseFiatNumber(amount) ?? new Decimal(0);
    if (parsedAmount.lte(0)) return undefined;
    if (depositAmountMode === "token") return parsedAmount;

    const rate = getDepositTokenUsdRate();
    if (rate.lte(0)) return undefined;
    return parsedAmount.div(rate);
  };
  const depositTokenAmountForQuote = getDepositTokenAmountForQuote();
  const depositQuoteAmountKey = depositTokenAmountForQuote?.toFixed() ?? "";
  const depositUsdDecimal =
    depositAmountMode === "usd"
      ? (parseFiatNumber(amount) ?? new Decimal(0))
      : depositTokenAmountForQuote
        ? depositTokenAmountForQuote.mul(getDepositTokenUsdRate())
        : new Decimal(0);
  const depositUsdDisplay = depositUsdDecimal.toDecimalPlaces(2).toFixed();
  const depositTokenDisplay =
    depositTokenAmountForQuote
      ?.toDecimalPlaces(toToken?.decimals ?? 18)
      .toFixed() ?? "0";
  const depositSourceTargetUsdKey =
    activeMode === "deposit"
      ? (getDepositSourceTargetUsd()?.toFixed() ?? "")
      : "";
  const normalizedQuoteAmountKey = parseFiatNumber(amount)?.toFixed() ?? "";
  const quoteRecipientKey =
    activeMode === "swap"
      ? effectiveRecipientAddress
      : activeMode === "send"
        ? recipientAddress
        : "";
  const fromTokensQuoteKey = useMemo(
    () =>
      getSourceTokensQuoteKey(
        activeMode === "swap" && swapType === "exactIn"
          ? getReadyExactInSourceTokens(fromTokens)
          : swapType === "exactOut" && !sourceSelectionTouched
            ? []
            : fromTokens
      ),
    [activeMode, swapType, fromTokens, sourceSelectionTouched]
  );
  const activeQuoteInputKey = [
    activeMode,
    swapType,
    normalizedQuoteAmountKey,
    toTokenQuoteKey,
    quoteRecipientKey.toLowerCase(),
    fromTokensQuoteKey,
    activeMode === "deposit"
      ? [
          depositAmountMode,
          depositQuoteAmountKey,
          selectedOpportunityIdentity,
          depositSourceTargetUsdKey,
          depositSourceFilter,
          sourceSelectionTouched ? "manual" : "auto",
          sourceSelectionRevision,
          exactOutQuoteSourceMode,
        ].join(":")
      : "",
    activeMode === "send" || isSwapExactOut
      ? [
          sourceSelectionTouched ? "manual" : "auto",
          sourceSelectionRevision,
          exactOutQuoteSourceMode,
        ].join(":")
      : "",
  ].join("|");
  const exactOutAutoSourceInputKey = [
    activeMode,
    swapType,
    normalizedQuoteAmountKey,
    toTokenQuoteKey,
    quoteRecipientKey.toLowerCase(),
    activeMode === "deposit"
      ? [
          depositAmountMode,
          depositQuoteAmountKey,
          selectedOpportunityIdentity,
          depositSourceTargetUsdKey,
        ].join(":")
      : "",
  ].join("|");

  useEffect(() => {
    lastAutoIntentSourceTokensRef.current = [];
  }, [exactOutAutoSourceInputKey]);

  useEffect(() => {
    activeQuoteInputKeyRef.current = activeQuoteInputKey;
    setTxError(null);
  }, [activeQuoteInputKey]);
  const hasCurrentQuoteIntent = Boolean(
    intentData &&
      swapIntentRef.current &&
      swapIntentRef.current.runId === swapRunIdRef.current &&
      swapIntentRef.current.quoteInputKey === activeQuoteInputKey
  );

  useEffect(() => {
    if (activeMode !== "deposit") return;
    if (!nexusSDK?.analytics) return;
    const parsed = parseFiatNumber(amount);
    if (!parsed || parsed.lte(0)) return;
    if (amount === amountEnteredLastValueRef.current) return;
    const timeout = setTimeout(() => {
      amountEnteredLastValueRef.current = amount;
      trackDeposit("deposit_amount_entered", {
        amountToken: depositTokenDisplay,
        amountUsd: Number(depositUsdDisplay) || 0,
        inputMethod: lastInputMethodRef.current,
      });
      lastInputMethodRef.current = "typed";
    }, 500);
    return () => clearTimeout(timeout);
  }, [
    amount,
    activeMode,
    nexusSDK,
    depositTokenDisplay,
    depositUsdDisplay,
    trackDeposit,
  ]);

  useEffect(() => {
    if (activeMode !== "deposit") return;
    if (intentData) hadSimulationSuccessRef.current = true;
  }, [intentData, activeMode]);

  useEffect(() => {
    if (activeMode !== "deposit") return;
    if (sourceSelectionTouched) return;
    previousAutoSourceCountRef.current = (intentData?.sources ?? []).length;
  }, [intentData, activeMode, sourceSelectionTouched]);

  useEffect(() => {
    if (activeMode !== "deposit") return;
    const prev = prevSourceTouchedRef.current;
    const curr = sourceSelectionTouched;
    if (prev === curr) return;
    prevSourceTouchedRef.current = curr;
    if (!prev && curr) {
      trackDeposit("deposit_source_selection_changed", {
        sourceCount: fromTokens.length,
        sourceChainIds: fromTokens.map((t) => t.chainId).filter(Boolean),
        sourceTokenSymbols: fromTokens.map((t) => t.symbol).filter(Boolean),
        previousSourceCount: previousAutoSourceCountRef.current,
      });
    } else if (prev && !curr) {
      trackDeposit("deposit_source_selection_reverted_to_auto", {
        previousSourceCount: fromTokens.length,
      });
    }
  }, [sourceSelectionTouched, activeMode, fromTokens, trackDeposit]);

  useEffect(() => {
    if (activeMode !== "deposit") return;
    if (swapStep !== "preview-intent") return;
    if (intentLoading) return;
    if (!intentData) return;
    if (hadPreviewViewedRef.current) return;
    hadPreviewViewedRef.current = true;
    previewViewedTsRef.current = Date.now();
    trackDeposit("deposit_preview_viewed", {
      totalFeeUsd: Number(intentFeeUsd) || 0,
      toAmountUsd: Number(depositUsdDisplay) || 0,
      sourceCount: (intentData?.sources ?? []).length,
    });
  }, [
    swapStep,
    intentLoading,
    intentData,
    activeMode,
    intentFeeUsd,
    depositUsdDisplay,
    trackDeposit,
  ]);
  const requiredDestinationTokenAmount =
    activeMode === "deposit"
      ? depositTokenAmountForQuote
      : activeMode === "send"
        ? parseFiatNumber(amount)
        : undefined;
  const canRefreshExactOutQuote = () =>
    activeMode === "deposit"
      ? Boolean(
          hasPositiveDecimalInput(amount) &&
            toToken &&
            selectedOpportunity &&
            depositTokenAmountForQuote &&
            depositTokenAmountForQuote.gt(0)
        )
      : activeMode === "send"
        ? Boolean(hasPositiveDecimalInput(amount) && toToken)
        : isSwapExactOut
          ? Boolean(
              hasPositiveDecimalInput(amount) &&
                toToken &&
                !buildReceiveAmountIssue()
            )
          : false;
  const buildImmediatePredictiveExactOutQuote = (
    sourceTokens: SwapTokenOption[],
    allowPartialSources: boolean
  ): PredictiveQuote | null => {
    if (!isExactOutPaymentFlow || !toToken) return null;

    const parsedAmount = parseFiatNumber(amount);
    const destinationRate = getTokenUsdRate(toToken);
    if (!parsedAmount || parsedAmount.lte(0) || destinationRate.lte(0)) {
      return null;
    }

    const destinationAmount =
      activeMode === "deposit" && depositAmountMode === "usd"
        ? parsedAmount.div(destinationRate)
        : parsedAmount;
    const destinationUsd =
      activeMode === "deposit" && depositAmountMode === "usd"
        ? parsedAmount
        : destinationAmount.mul(destinationRate);
    const destinationCoverage = getExactOutDestinationBalanceCoverage({
      requestedAmount: destinationAmount,
      requestedUsd: destinationUsd,
      token: toToken,
    });
    const destinationUsdNeedingSources = Decimal.max(
      destinationUsd.minus(destinationCoverage?.usd ?? new Decimal(0)),
      new Decimal(0)
    );
    const baseline =
      predictiveQuoteCacheRef.current[getPredictiveQuoteCacheKey()];
    const requiredSourceUsd = getPredictiveExactOutSourceTargetUsd(
      destinationUsdNeedingSources,
      parseFiatNumber(baseline?.exactOutSourceUsdPerDestinationUsd)
    );
    const destinationKey = getTokenSelectionKey(toToken);
    const allAvailableTokens =
      swapBalance && swapSupportedChainsAndTokens
        ? deriveTokenOptions(swapBalance, swapSupportedChainsAndTokens)
        : getSyntheticDisconnectedSourceTokens(disconnectedAvailableTokens);
    const singleAssetToken = (() => {
      if (isMultiAssetMode) return undefined;
      const explicit = sourceSelectionTouched
        ? ((sourceTokens && sourceTokens.length > 0
            ? sourceTokens[0]
            : undefined) ?? fromTokens[0])
        : undefined;
      if (explicit) return explicit;
      const rawPool = getExpandedSourceTokens(
        excludeSwapExactOutDestinationTokens(allAvailableTokens)
      ).filter((t) => getTokenSelectionKey(t) !== destinationKey);
      if (rawPool.length === 0) return undefined;
      const pool = sortExactOutSourcesBySdkPriority(
        rawPool,
        toToken?.chainId,
        toToken?.contractAddress
      );
      const capable = pool.find((token) => {
        const fullAvailableUsd = getTokenBalanceUsd(token);
        const rate = getTokenUsdRate(token);
        if (fullAvailableUsd.lte(0) || rate.lte(0)) return false;
        return fullAvailableUsd.gte(requiredSourceUsd);
      });
      if (capable) return capable;
      const bestPositive = pool.find(
        (token) =>
          getTokenBalanceUsd(token).gt(0) && getTokenUsdRate(token).gt(0)
      );
      return bestPositive ?? pool[0];
    })();
    const isExplicitUserSelection = Boolean(
      sourceSelectionTouched &&
        exactOutQuoteSourceModeRef.current !== "all" &&
        ((sourceTokens && sourceTokens.length > 0) || fromTokens.length > 0)
    );
    const sourcePool = !isMultiAssetMode
      ? singleAssetToken
        ? [singleAssetToken]
        : []
      : isExplicitUserSelection
        ? sourceTokens && sourceTokens.length > 0
          ? sourceTokens
          : fromTokens
        : allAvailableTokens;
    const candidates = isExplicitUserSelection
      ? getExpandedSourceTokens(
          excludeSwapExactOutDestinationTokens(sourcePool)
        ).filter((token) => getTokenSelectionKey(token) !== destinationKey)
      : sortExactOutSourcesBySdkPriority(
          getExpandedSourceTokens(
            excludeSwapExactOutDestinationTokens(sourcePool)
          ).filter((token) => getTokenSelectionKey(token) !== destinationKey),
          toToken?.chainId,
          toToken?.contractAddress
        );
    const sources: SwapTokenOption[] = [];
    let remainingUsd = requiredSourceUsd;

    for (const token of candidates) {
      if (remainingUsd.lte(0)) break;

      const availableUsd = getTokenBalanceUsd(token);
      const sourceRate = getTokenUsdRate(token);
      if (sourceRate.lte(0)) continue;
      if (availableUsd.lte(0) && (isMultiAssetMode || !isExplicitUserSelection))
        continue;

      const targetUsd =
        !isMultiAssetMode && isExplicitUserSelection
          ? remainingUsd
          : Decimal.min(
              remainingUsd,
              availableUsd.gt(0) ? availableUsd : remainingUsd
            );
      const tokenAmount = targetUsd
        .div(sourceRate)
        .toDecimalPlaces(Math.max(0, token.decimals || 18), Decimal.ROUND_DOWN);
      if (tokenAmount.lte(0)) continue;

      sources.push({
        ...token,
        userAmount: tokenAmount.toFixed(),
        userAmountMode: "token",
        userAmountUsd: targetUsd
          .toDecimalPlaces(6, Decimal.ROUND_DOWN)
          .toFixed(),
      });
      remainingUsd = remainingUsd.minus(targetUsd);
    }

    const hasUncoveredSourceAmount = remainingUsd.gt(0.01);
    if (
      requiredSourceUsd.gt(0) &&
      sources.length === 0 &&
      !allowPartialSources
    ) {
      return null;
    }

    return {
      key: getPredictiveQuoteCacheKey(activeMode, "exactOut"),
      mode: "exactOut",
      sources,
      toAmount: getPredictiveDisplayAmount(destinationAmount, toToken),
      toUsd: destinationUsd.toDecimalPlaces(6).toFixed(),
      missingUsd: hasUncoveredSourceAmount
        ? remainingUsd.toDecimalPlaces(2).toFixed()
        : undefined,
    };
  };
  const invalidateExactOutQuoteForRefresh = (options?: {
    sourceTokens?: SwapTokenOption[];
  }) => {
    immediateQuoteAfterSourceEditRef.current = true;
    const receiveIssue = buildReceiveAmountIssue({
      sourceTokens: options?.sourceTokens,
    });
    applyReceiveAmountIssue(receiveIssue);
    const shouldLoadQuote = Boolean(
      !receiveIssue && nexusSDK && canRefreshExactOutQuote()
    );
    if (!receiveIssue) {
      clearPendingSwapIntent(true, { keepQuoteRefreshing: shouldLoadQuote });
    }
    if (shouldLoadQuote) {
      setQuoteRefreshing(true);
      setTxError(null);
      setSwapQuoteIssue(null);
    }
    return shouldLoadQuote;
  };

  useEffect(() => {
    if (
      activeMode !== "swap" ||
      swapStep !== "idle" ||
      swapType !== "exactIn"
    ) {
      setPredictiveQuote((current) =>
        current?.mode === "exactIn" ? null : current
      );
      return;
    }

    const sources = getPredictiveExactInSourceTokens();
    const key = getPredictiveQuoteCacheKey();
    if (!toToken || sources.length === 0 || !key) {
      setPredictiveQuote((current) =>
        current?.mode === "exactIn" ? null : current
      );
      return;
    }

    const runId = ++predictiveQuoteRunRef.current;
    let cancelled = false;

    void (async () => {
      const baseline = predictiveQuoteCacheRef.current[key];
      const cachedDestinationRate = parseFiatNumber(
        baseline?.destinationUsdRate
      );
      const destinationRate =
        cachedDestinationRate && cachedDestinationRate.gt(0)
          ? cachedDestinationRate
          : await resolveUsdRateForToken(toToken);

      if (cancelled || runId !== predictiveQuoteRunRef.current) return;
      if (destinationRate.lte(0)) {
        setPredictiveQuote((current) =>
          current?.mode === "exactIn" ? null : current
        );
        return;
      }

      let sourceUsd = new Decimal(0);
      for (const source of sources) {
        const sourceAmount =
          parseFiatNumber(source.userAmount) ?? new Decimal(0);
        if (sourceAmount.lte(0)) continue;

        if (source.userAmountMode === "usd") {
          sourceUsd = sourceUsd.plus(sourceAmount);
          continue;
        }

        const sourceRate = await resolveUsdRateForToken(source);
        if (cancelled || runId !== predictiveQuoteRunRef.current) return;
        if (sourceRate.lte(0)) {
          setPredictiveQuote((current) =>
            current?.mode === "exactIn" ? null : current
          );
          return;
        }
        sourceUsd = sourceUsd.plus(sourceAmount.mul(sourceRate));
      }

      if (sourceUsd.lte(0)) {
        setPredictiveQuote((current) =>
          current?.mode === "exactIn" ? null : current
        );
        return;
      }

      const cachedAmountPerSourceUsd = parseFiatNumber(
        baseline?.exactInDestinationAmountPerSourceUsd
      );
      const predictedDestinationAmount =
        cachedAmountPerSourceUsd && cachedAmountPerSourceUsd.gt(0)
          ? sourceUsd.mul(cachedAmountPerSourceUsd)
          : sourceUsd
              .mul(BASIS_POINTS - PREDICTIVE_EXACT_IN_DISCOUNT_BPS)
              .div(BASIS_POINTS)
              .div(destinationRate);
      const predictedDestinationUsd =
        cachedAmountPerSourceUsd && cachedAmountPerSourceUsd.gt(0)
          ? predictedDestinationAmount.mul(destinationRate)
          : sourceUsd
              .mul(BASIS_POINTS - PREDICTIVE_EXACT_IN_DISCOUNT_BPS)
              .div(BASIS_POINTS);

      if (
        cancelled ||
        runId !== predictiveQuoteRunRef.current ||
        predictedDestinationAmount.lte(0)
      ) {
        return;
      }

      setPredictiveQuote({
        key,
        mode: "exactIn",
        toAmount: getPredictiveDisplayAmount(
          predictedDestinationAmount,
          toToken
        ),
        toUsd: predictedDestinationUsd.toDecimalPlaces(6).toFixed(),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeMode,
    amount,
    fromTokens,
    swapStep,
    swapType,
    toToken?.chainId,
    toToken?.contractAddress,
    toToken?.decimals,
    toToken?.symbol,
  ]);

  useEffect(() => {
    if (
      !isExactOutPaymentFlow ||
      swapStep !== "idle" ||
      swapType !== "exactOut"
    ) {
      setPredictiveQuote((current) =>
        current?.mode === "exactOut" ? null : current
      );
      return;
    }

    const parsedAmount = parseFiatNumber(amount);
    const key = getPredictiveQuoteCacheKey();
    if (
      !toToken ||
      !parsedAmount ||
      parsedAmount.lte(0) ||
      !key ||
      (activeMode === "deposit" && !selectedOpportunity)
    ) {
      setPredictiveQuote((current) =>
        current?.mode === "exactOut" ? null : current
      );
      return;
    }

    const runId = ++predictiveQuoteRunRef.current;
    let cancelled = false;

    void (async () => {
      const baseline = predictiveQuoteCacheRef.current[key];
      const cachedDestinationRate = parseFiatNumber(
        baseline?.destinationUsdRate
      );
      const destinationRate =
        cachedDestinationRate && cachedDestinationRate.gt(0)
          ? cachedDestinationRate
          : await resolveUsdRateForToken(toToken);

      if (cancelled || runId !== predictiveQuoteRunRef.current) return;
      if (destinationRate.lte(0)) {
        setPredictiveQuote((current) =>
          current?.mode === "exactOut" ? null : current
        );
        return;
      }

      const destinationAmount =
        activeMode === "deposit" && depositAmountMode === "usd"
          ? parsedAmount.div(destinationRate)
          : parsedAmount;
      const destinationUsd =
        activeMode === "deposit" && depositAmountMode === "usd"
          ? parsedAmount
          : destinationAmount.mul(destinationRate);
      const destinationCoverage = getExactOutDestinationBalanceCoverage({
        requestedAmount: destinationAmount,
        requestedUsd: destinationUsd,
        token: toToken,
      });
      const destinationUsdNeedingSources = Decimal.max(
        destinationUsd.minus(destinationCoverage?.usd ?? new Decimal(0)),
        new Decimal(0)
      );
      const cachedSourceUsdRatio = parseFiatNumber(
        baseline?.exactOutSourceUsdPerDestinationUsd
      );
      const requiredSourceUsd = getPredictiveExactOutSourceTargetUsd(
        destinationUsdNeedingSources,
        cachedSourceUsdRatio
      );
      const sources = requiredSourceUsd.gt(0)
        ? await buildPredictiveExactOutSources(requiredSourceUsd)
        : [];

      if (
        cancelled ||
        runId !== predictiveQuoteRunRef.current ||
        (requiredSourceUsd.gt(0) && sources.length === 0)
      ) {
        setPredictiveQuote((current) =>
          current?.mode === "exactOut" ? null : current
        );
        return;
      }

      setPredictiveQuote({
        key,
        mode: "exactOut",
        sources,
        toAmount: getPredictiveDisplayAmount(destinationAmount, toToken),
        toUsd: destinationUsd.toDecimalPlaces(6).toFixed(),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeMode,
    amount,
    depositAmountMode,
    destinationBalance,
    fromTokensQuoteKey,
    isMultiAssetMode,
    nexusSDK,
    selectedOpportunityIdentity,
    sourceSelectionRevision,
    swapBalance,
    swapStep,
    swapType,
    toToken?.balance,
    toToken?.balanceInFiat,
    toToken?.chainId,
    toToken?.contractAddress,
    toToken?.decimals,
    toToken?.symbol,
  ]);

  const resolvedDepositSourceTokens = useMemo<SwapTokenOption[]>(() => {
    if (activeMode !== "deposit" || !swapBalance) return [];
    const selection = getResolvedDepositSourceSelection();
    return getDepositSourceTokensForIds(selection.selectedSourceIds);
  }, [
    activeMode,
    depositSourceFilter,
    depositQuoteAmountKey,
    depositSourceTargetUsdKey,
    depositUsdDecimal.toFixed(),
    fromTokensQuoteKey,
    selectedOpportunity?.chainId,
    selectedOpportunity?.tokenAddress,
    selectedOpportunity?.tokenSymbol,
    sourceSelectionRevision,
    sourceSelectionTouched,
    swapBalance,
    toToken?.chainId,
    toToken?.contractAddress,
    toToken?.symbol,
  ]);
  const lockedDestinationSourceTokens = useMemo<SwapTokenOption[]>(() => {
    if (
      isSwapExactOut ||
      !isExactOutPaymentFlow ||
      !toToken?.chainId ||
      !requiredDestinationTokenAmount ||
      requiredDestinationTokenAmount.lte(0)
    ) {
      return [];
    }

    for (const asset of swapBalance ?? []) {
      for (const breakdown of asset.breakdown ?? []) {
        const chainId = breakdown.chain?.id;
        if (chainId !== toToken.chainId) continue;

        const breakdownAddress = breakdown.contractAddress;
        const addressMatches =
          breakdownAddress &&
          toToken.contractAddress &&
          (breakdownAddress.toLowerCase() ===
            toToken.contractAddress.toLowerCase() ||
            (isNativeTokenAddress(breakdownAddress) &&
              isNativeTokenAddress(toToken.contractAddress)));
        const symbolMatches =
          (breakdown.symbol ?? asset.symbol ?? "").toUpperCase() ===
          toToken.symbol.toUpperCase();

        if (!addressMatches && !symbolMatches) continue;

        const balanceAmount = parseFiatNumber(breakdown.balance);
        if (!balanceAmount || balanceAmount.lte(0)) continue;

        const chainMeta = CHAIN_METADATA[chainId];
        const symbol = breakdown.symbol ?? asset.symbol ?? toToken.symbol;
        const fiatBalance = parseFiatNumber(breakdown.balanceInFiat);
        if (!fiatBalance || fiatBalance.lt(minimumSourceUsd)) continue;
        return [
          {
            chainId,
            chainLogo:
              chainMeta?.logo ?? breakdown.chain?.logo ?? toToken.chainLogo,
            chainName: getShortChainName(
              chainId,
              chainMeta?.name ?? breakdown.chain?.name ?? toToken.chainName
            ),
            contractAddress:
              breakdown.contractAddress ?? toToken.contractAddress,
            decimals:
              breakdown.decimals ?? asset.decimals ?? toToken.decimals ?? 18,
            logo: asset.logo ?? toToken.logo,
            name: symbol,
            symbol,
            balance: `${breakdown.balance} ${symbol}`,
            balanceInFiat:
              fiatBalance !== undefined
                ? `$${fiatBalance.toDecimalPlaces(2).toFixed()}`
                : "$0.00",
          },
        ];
      }
    }

    return [];
  }, [
    activeMode,
    isSwapExactOut,
    requiredDestinationTokenAmount?.toFixed(),
    swapBalance,
    toToken?.chainId,
    toToken?.chainLogo,
    toToken?.chainName,
    toToken?.contractAddress,
    toToken?.decimals,
    toToken?.logo,
    toToken?.symbol,
  ]);

  const setSourcePickerDraftSelection = useCallback(
    (tokens: SwapTokenOption[]) => {
      const nextTokens = excludeSwapExactOutDestinationTokens(tokens).map(
        (token) => ({
          ...token,
          userAmount: "",
        })
      );
      sourcePickerDraftTokensRef.current = nextTokens;
      setSourcePickerDraftTokens(nextTokens);
    },
    [isSwapExactOut, toToken]
  );

  const getAutoExactOutSourceTokensForPicker = useCallback(() => {
    if (intentData?.sources && intentData.sources.length > 0) {
      const intentSources = excludeSwapExactOutDestinationTokens(
        (intentData.sources ?? [])
          .map(buildIntentSourceToken)
          .filter((t) => Boolean(t.contractAddress && t.symbol))
      );
      if (intentSources.length > 0) {
        return intentSources;
      }
    }

    const autoIntentTokens = excludeSwapExactOutDestinationTokens(
      lastAutoIntentSourceTokensRef.current
    );
    if (autoIntentTokens.length > 0) {
      return autoIntentTokens;
    }

    if (fromTokens.length > 0) {
      return excludeSwapExactOutDestinationTokens(fromTokens);
    }

    return [];
  }, [
    buildIntentSourceToken,
    fromTokens,
    intentData?.sources,
    isSwapExactOut,
    toToken,
  ]);

  const resetSourcePickerDraft = useCallback(() => {
    sourcePickerDraftTokensRef.current = null;
    setSourcePickerDraftTokens(null);
    setSourcePickerDraftTouched(false);
  }, []);

  const isSourcePickerMultiselect =
    isMultiAssetMode && (activeMode === "swap" || isExactOutPaymentFlow);

  const beginSourcePickerEdit = useCallback(() => {
    if (!isSourcePickerMultiselect) {
      resetSourcePickerDraft();
      return;
    }

    sourcePickerDraftDepositFilterRef.current = depositSourceFilter;
    sourcePickerDraftTouchedRef.current = sourceSelectionTouched;
    sourcePickerDraftModeRef.current = exactOutQuoteSourceModeRef.current;
    setSourcePickerDraftTouched(sourceSelectionTouched);
    const activeTokens = isExactOutPaymentFlow
      ? predictiveQuote?.mode === "exactOut" &&
        (predictiveQuote.sources?.length ?? 0) > 0
        ? (predictiveQuote.sources ?? [])
        : intentData?.sources && intentData.sources.length > 0
          ? excludeSwapExactOutDestinationTokens(
              (intentData.sources ?? [])
                .map(buildIntentSourceToken)
                .filter((t) => Boolean(t.contractAddress && t.symbol))
            )
          : fromTokens.length > 0 && sourceSelectionTouched
            ? fromTokens
            : getAutoExactOutSourceTokensForPicker()
      : fromTokens;
    setSourcePickerDraftSelection(activeTokens);
  }, [
    buildIntentSourceToken,
    depositSourceFilter,
    fromTokens,
    getAutoExactOutSourceTokensForPicker,
    intentData?.sources,
    isExactOutPaymentFlow,
    isSourcePickerMultiselect,
    predictiveQuote?.mode,
    predictiveQuote?.sources,
    resetSourcePickerDraft,
    setSourcePickerDraftSelection,
    sourceSelectionTouched,
  ]);

  const handleSourcePickerCancel = useCallback(() => {
    resetSourcePickerDraft();
    closeDrawerToIdle();
  }, [closeDrawerToIdle, resetSourcePickerDraft]);

  const tokenUserAmountsRef = useRef<
    Map<
      string,
      {
        userAmount: string;
        userAmountMode?: "usd" | "token";
        selectedPct?: number | null;
      }
    >
  >(new Map());

  useEffect(() => {
    for (const t of fromTokens) {
      const key = getTokenSelectionKey(t);
      if (key && t.userAmount) {
        tokenUserAmountsRef.current.set(key, {
          userAmount: t.userAmount,
          userAmountMode: t.userAmountMode,
          selectedPct: t.selectedPct,
        });
      }
    }
  }, [fromTokens]);

  const applyPreservedUserAmounts = useCallback((tokens: SwapTokenOption[]) => {
    return tokens.map((token) => {
      const key = getTokenSelectionKey(token);
      const stored = key ? tokenUserAmountsRef.current.get(key) : undefined;
      const preservedAmount = token.userAmount || stored?.userAmount || "";
      return {
        ...token,
        userAmount: preservedAmount,
        userAmountMode: token.userAmountMode ?? stored?.userAmountMode,
        selectedPct: token.selectedPct ?? stored?.selectedPct,
      };
    });
  }, []);

  const handleSourcePickerDraftSelectionChange = useCallback(
    (tokens: SwapTokenOption[]) => {
      if (!isSourcePickerMultiselect) return;

      const mergedTokens = applyPreservedUserAmounts(tokens);

      setSourcePickerDraftSelection(mergedTokens);
      sourcePickerDraftTouchedRef.current = true;
      sourcePickerDraftModeRef.current = "selected";
      setSourcePickerDraftTouched(true);
      if (activeMode === "deposit") {
        sourcePickerDraftDepositFilterRef.current = "custom";
      }
    },
    [
      activeMode,
      applyPreservedUserAmounts,
      isSourcePickerMultiselect,
      setSourcePickerDraftSelection,
    ]
  );

  const handleSourcePickerFilterTabSelect = useCallback(
    (tab: Exclude<SourceFilterTab, "custom">) => {
      if (!isSourcePickerMultiselect) return;

      const nextFilter: DepositSourceFilter =
        tab === "stables" ? "stablecoins" : tab;

      if (tab === "all") {
        sourcePickerDraftDepositFilterRef.current = nextFilter;
        sourcePickerDraftTouchedRef.current = false;
        sourcePickerDraftModeRef.current = "all";
        setSourcePickerDraftTouched(false);
        setSourcePickerDraftSelection(getAutoExactOutSourceTokensForPicker());
        return;
      }

      if (activeMode !== "deposit") return;

      const selection = getResolvedDepositSourceSelection({
        filter: nextFilter,
        isManualSelection: false,
      });
      const sourcePoolTokens = getDepositSourceTokensForIds(
        selection.sourcePoolIds
      );

      sourcePickerDraftDepositFilterRef.current = nextFilter;
      sourcePickerDraftTouchedRef.current = false;
      sourcePickerDraftModeRef.current = "all";
      setSourcePickerDraftTouched(false);
      setSourcePickerDraftSelection(sourcePoolTokens);
    },
    [
      activeMode,
      getAutoExactOutSourceTokensForPicker,
      getDepositSourceTokensForIds,
      getResolvedDepositSourceSelection,
      isSourcePickerMultiselect,
      setSourcePickerDraftSelection,
    ]
  );

  const handleAutoExactOut = useCallback(() => {
    sourcePickerDraftDepositFilterRef.current = "all";
    sourcePickerDraftTouchedRef.current = false;
    sourcePickerDraftModeRef.current = "all";
    setSourcePickerDraftTouched(false);
    setSourceSelectionTouched(false);
    setExactOutQuoteSourceModeValue("all");
    if (activeMode === "deposit") {
      setDepositSourceFilter("all");
    }

    setFromTokens([]);
    setSwapQuoteIssue(null);
    setReceiveAmountIssue(null);
    setTxError(null);
    setSourceSelectionRevision((current) => current + 1);

    clearPendingSwapIntent(true, { keepQuoteRefreshing: true });
    setQuoteRefreshing(true);

    const immediatePrediction = buildImmediatePredictiveExactOutQuote(
      [],
      false
    );
    if (immediatePrediction) {
      setPredictiveQuote(immediatePrediction);
      if (immediatePrediction.sources?.length > 0) {
        setFromTokens(immediatePrediction.sources);
      }
    }

    invalidateExactOutQuoteForRefresh();
  }, [
    activeMode,
    buildImmediatePredictiveExactOutQuote,
    clearPendingSwapIntent,
    invalidateExactOutQuoteForRefresh,
    setExactOutQuoteSourceModeValue,
  ]);

  const commitSourcePickerDraft = useCallback(
    (tokens?: SwapTokenOption[]) => {
      if (!isSourcePickerMultiselect) {
        resetSourcePickerDraft();
        closeDrawerToIdle();
        return;
      }

      const nextTokens =
        tokens ?? sourcePickerDraftTokensRef.current ?? fromTokens;

      const normalizedTokens = getExpandedSourceTokens(
        excludeSwapExactOutDestinationTokens(
          applyPreservedUserAmounts(nextTokens)
        )
      );

      const isManualSelection = Boolean(
        sourcePickerDraftTouchedRef.current ||
          (sourceSelectionTouched && normalizedTokens.length > 0)
      );
      setSourceSelectionTouched(isManualSelection);
      sourcePickerDraftTouchedRef.current = isManualSelection;
      setSourcePickerDraftTouched(isManualSelection);
      if (isManualSelection) {
        setExactOutQuoteSourceModeValue("selected");
        sourcePickerDraftModeRef.current = "selected";
      } else {
        setExactOutQuoteSourceModeValue(sourcePickerDraftModeRef.current);
      }
      if (activeMode === "deposit") {
        setDepositSourceFilter(sourcePickerDraftDepositFilterRef.current);
      }
      setSourceSelectionRevision((current) => current + 1);
      setFromTokens(normalizedTokens);

      const isReceiveEmptyOrZero =
        swapType === "exactOut" && !hasPositiveDecimalInput(amount);

      if (
        (activeMode === "swap" && swapType === "exactIn") ||
        isReceiveEmptyOrZero
      ) {
        const totalSendVal = normalizedTokens.reduce((sum, t) => {
          const num = Number(t.userAmount || 0);
          return sum + (Number.isFinite(num) ? num : 0);
        }, 0);
        if (totalSendVal > 0) {
          setAmount(String(totalSendVal));
        }
        clearPendingSwapIntent();
        setSwapQuoteIssue(null);
        setTxError(null);
      } else {
        const immediatePrediction = buildImmediatePredictiveExactOutQuote(
          normalizedTokens,
          isManualSelection
        );
        if (
          immediatePrediction?.missingUsd &&
          Number(immediatePrediction.missingUsd) > 0
        ) {
          setPredictiveQuote(immediatePrediction);
          setQuoteRefreshing(false);
          setIntentLoading(false);
          setReceiveMaxCalculating(false);
          const msg = !isMultiAssetMode
            ? `You're $${immediatePrediction.missingUsd} short. Switch to Multi-assets Mode`
            : `You're $${immediatePrediction.missingUsd} short. Add Assets`;
          const shortfallIssue = {
            type: "insufficientSources" as const,
            message: msg,
            missingUsd: immediatePrediction.missingUsd,
          };
          setSwapQuoteIssue(shortfallIssue as any);
          clearPendingSwapIntent(true, { keepQuoteRefreshing: false });
        } else {
          setPredictiveQuote(
            (current) =>
              immediatePrediction ??
              (current?.mode === "exactOut" ? null : current)
          );
          invalidateExactOutQuoteForRefresh({
            sourceTokens: normalizedTokens,
          });
        }
      }
      resetSourcePickerDraft();
      closeDrawerToIdle();
    },
    [
      activeMode,
      buildImmediatePredictiveExactOutQuote,
      closeDrawerToIdle,
      fromTokens,
      invalidateExactOutQuoteForRefresh,
      isSourcePickerMultiselect,
      resetSourcePickerDraft,
      setExactOutQuoteSourceModeValue,
      swapType,
    ]
  );

  const activeSourceTokensForPicker = isExactOutPaymentFlow
    ? predictiveQuote?.mode === "exactOut" &&
      (predictiveQuote.sources?.length ?? 0) > 0
      ? (predictiveQuote.sources ?? [])
      : intentData?.sources && intentData.sources.length > 0
        ? excludeSwapExactOutDestinationTokens(
            (intentData.sources ?? [])
              .map(buildIntentSourceToken)
              .filter((t) => Boolean(t.contractAddress && t.symbol))
          )
        : fromTokens.length > 0 && sourceSelectionTouched
          ? fromTokens
          : getAutoExactOutSourceTokensForPicker()
    : fromTokens;

  const sourcePickerSelectedTokens =
    isSourcePickerMultiselect && swapStep === "choose-swap-asset"
      ? (sourcePickerDraftTokens ??
        excludeSwapExactOutDestinationTokens(activeSourceTokensForPicker))
      : excludeSwapExactOutDestinationTokens(activeSourceTokensForPicker);

  useEffect(() => {
    if (!isExactOutPaymentFlow) return;
    if (lockedDestinationSourceTokens.length === 0) return;
    if (activeMode === "deposit" && !sourceSelectionTouched) return;

    setFromTokens((current) => {
      const missing = lockedDestinationSourceTokens.filter(
        (locked) =>
          !current.some(
            (token) =>
              getTokenSelectionKey(token) === getTokenSelectionKey(locked)
          )
      );
      if (missing.length === 0) return current;
      return [
        ...current,
        ...missing.map((token) => ({ ...token, userAmount: "" })),
      ];
    });
  }, [activeMode, lockedDestinationSourceTokens, sourceSelectionTouched]);

  useEffect(() => {
    if (activeMode !== "deposit") return;
    if (sourceSelectionTouched) return;
    if (
      !toToken ||
      !depositTokenAmountForQuote ||
      depositTokenAmountForQuote.lte(0)
    ) {
      return;
    }
    if (resolvedDepositSourceTokens.length === 0) {
      return;
    }

    setFromTokens((current) => {
      const canInitialize = current.length === 0;
      if (!canInitialize) return current;

      const next: SwapTokenOption[] = [];
      const seen = new Set<string>();
      for (const token of resolvedDepositSourceTokens) {
        const key = getTokenSelectionKey(token);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        next.push({ ...token, userAmount: "" });
      }

      const currentKeys = current.map(getTokenSelectionKey).sort().join("|");
      const nextKeys = next.map(getTokenSelectionKey).sort().join("|");
      if (currentKeys === nextKeys) return current;
      return next;
    });
  }, [
    activeMode,
    depositQuoteAmountKey,
    resolvedDepositSourceTokens,
    sourceSelectionTouched,
    toTokenQuoteKey,
  ]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleReset = () => {
    clearPendingSwapIntent();
    setAmount("");
    setRecipientAddress("");
    setIsRecipientUserEdited(false);
    setTxError(null);
    setSwapQuoteIssue(null);
    setReceiveAmountIssue(null);
    setIntentToAmount(undefined);
    setIntentFeeUsd(undefined);
    setIntentData(null);
    setPredictiveQuote(null);
    setFromTokens([]);
    setToToken(undefined);
    setSelectedOpportunity(undefined);
    setSourceSelectionTouched(false);
    setDepositSourceFilter("all");
    setExactOutQuoteSourceModeValue("all");
    sourcePickerDraftModeRef.current = "all";
    sourcePickerDraftTouchedRef.current = false;
    setDepositAmountMode("token");
    setIsMultiAssetMode(false);
    setSwapType("exactIn");
    setSwapStep("idle");
    setCurrentSwapId(null);
    currentSwapIdRef.current = null;
    currentSwapStartedAtRef.current = 0;
  };

  const handleFailureBack = () => {
    clearPendingSwapIntent();
    setTxError(null);
    void refreshSelectedSourceBalances();
    setSwapStep("idle");
    setCurrentSwapId(null);
    currentSwapIdRef.current = null;
    currentSwapStartedAtRef.current = 0;
    rotateAttempt();
  };

  const resetInputsAfterSuccessfulExecution = () => {
    setAmount("");
    setRecipientAddress("");
    setIsRecipientUserEdited(false);
    setTxError(null);
    setSwapQuoteIssue(null);
    setIntentToAmount(undefined);
    setIntentFeeUsd(undefined);
    setIntentData(null);
    setPredictiveQuote(null);
    clearSelectedSources();
    setDepositAmountMode("token");
    if (activeMode === "deposit") {
      setSelectedOpportunity(configuredDeposit);
      setToToken(
        configuredDeposit
          ? toTokenFromOpportunity(configuredDeposit)
          : undefined
      );
    } else {
      setToToken(undefined);
    }
  };

  const handleModalOpenChange = useCallback(
    (open: boolean) => {
      if (!open && swapStepRef.current === "progress") return;
      if (!isControlledOpen) {
        setInternalOpen(open);
      }
      onOpenChange?.(open);
      if (!open) {
        clearPendingSwapIntent();
        onClose?.();
      }
    },
    [clearPendingSwapIntent, isControlledOpen, onClose, onOpenChange]
  );

  const handleClose = () => {
    if (!embed) {
      handleModalOpenChange(false);
      return;
    }
    clearPendingSwapIntent();
    onClose?.();
  };

  const handleConnectWallet = async (
    options: { reportConversion?: boolean } = {}
  ) => {
    if (walletActionPending || nexusLoading) return;

    if (options.reportConversion && walletStatus !== "connected") {
      reportConnectWalletConversion();
    }

    const clickHandler = config.onConnectWalletClick || onConnectWallet;
    if (clickHandler) {
      setWalletActionPending(true);
      setTxError(null);
      try {
        await clickHandler();
      } catch (error: any) {
        setTxError(error?.message || "Unable to connect wallet.");
      } finally {
        setWalletActionPending(false);
      }
      return;
    }

    if (isWalletConnectPending) return;

    setWalletActionPending(true);
    setTxError(null);
    try {
      let activeConnector = connector;

      if (walletStatus !== "connected") {
        const nextConnector = connectors[0];
        if (!nextConnector) {
          throw new Error("No wallet connector available.");
        }
        await connectAsync({ connector: nextConnector });
        activeConnector = nextConnector;
      }

      const connectorProvider = await activeConnector
        ?.getProvider()
        .catch(() => undefined);
      const connectorClientProvider = connectorClient
        ? {
            request: (args: unknown) => connectorClient.request(args as any),
          }
        : undefined;
      const walletClientProvider = walletClient
        ? {
            request: (args: unknown) => walletClient.request(args as any),
          }
        : undefined;
      const windowProvider =
        typeof window !== "undefined"
          ? (window as Window & { ethereum?: EthereumProvider }).ethereum
          : undefined;
      const effectiveProvider =
        connectorProvider &&
        typeof (connectorProvider as EthereumProvider).request === "function"
          ? (connectorProvider as EthereumProvider)
          : (connectorClientProvider ?? walletClientProvider ?? windowProvider);

      if (
        !effectiveProvider ||
        typeof effectiveProvider.request !== "function"
      ) {
        throw new Error("Wallet provider is not ready yet.");
      }

      await handleInit(effectiveProvider as EthereumProvider);
    } catch (error: any) {
      setTxError(error?.message || "Unable to connect wallet.");
    } finally {
      setWalletActionPending(false);
    }
  };

  const handleOpenRecipientEditor = () => {
    if (activeMode === "swap" && !recipientAddress && defaultRecipientAddress) {
      setRecipientAddress(defaultRecipientAddress);
    }
    setTxError(null);
    openDrawerStep("enter-recipient");
  };

  const handleResetRecipientToDefault = () => {
    setRecipientAddress(defaultRecipientAddress);
    setIsRecipientUserEdited(false);
    setTxError(null);
  };

  const handleSaveRecipient = () => {
    const next = recipientAddress.trim();
    if (!next) {
      setTxError("Recipient address is required");
      return;
    }
    if (!next.endsWith(".eth") && !isAddress(next)) {
      setTxError("Incorrect address");
      return;
    }
    if (
      activeMode === "send" &&
      ownerAddress &&
      isAddress(next) &&
      next.toLowerCase() === ownerAddress.toLowerCase()
    ) {
      setTxError("Recipient cannot be the connected wallet.");
      return;
    }
    setRecipientAddress(next);
    setIsRecipientUserEdited(
      !defaultRecipientAddress ||
        next.toLowerCase() !== defaultRecipientAddress.toLowerCase()
    );
    setTxError(null);
    closeDrawerToIdle();
  };

  /** Start swap flow — v2 SDK per-operation onIntent hooks populate preview. */
  const handleEnterPreview = async (options: { background?: boolean } = {}) => {
    const { background = false } = options;
    const isExactOutFlow = isExactOutPaymentFlow;
    const quoteInputKey = activeQuoteInputKeyRef.current;
    const isCurrentQuoteInput = () =>
      activeQuoteInputKeyRef.current === quoteInputKey;

    if (!toToken) {
      return;
    }

    if (isExactOutFlow) {
      if (!hasPositiveDecimalInput(amount)) {
        return;
      }
    } else if (!hasReadyExactInSwapInput(fromTokens, toToken)) {
      if (!background) {
        setTxError(null);
        setSwapQuoteIssue(null);
      }
      return;
    }

    const receiveIssue = buildReceiveAmountIssue();
    if (receiveIssue) {
      applyReceiveAmountIssue(receiveIssue);
      if (!background && swapStepRef.current !== "idle") {
        swapStepRef.current = "idle";
        setSwapStep("idle");
      }
      return;
    }

    if (!background && activeMode === "deposit") {
      trackDeposit("deposit_confirm_clicked", {
        amountToken: depositTokenDisplay,
        amountUsd: Number(depositUsdDisplay) || 0,
        selectionMode: sourceSelectionTouched ? "manual" : "auto",
        sourceCount: (intentData?.sources ?? []).length,
      });
    }

    setTxError(null);
    setSwapQuoteIssue(null);

    if (
      !background &&
      swapIntentRef.current?.runId === swapRunIdRef.current &&
      swapIntentRef.current?.quoteInputKey === quoteInputKey &&
      intentData &&
      (activeMode !== "send" || Boolean(recipientAddress)) &&
      (!isExactOutFlow ||
        (intentData.sources ?? []).length > 0 ||
        Boolean(intentData.destination))
    ) {
      handleSwapAccept();
      return;
    }

    let resolvedRecipientAddress =
      activeMode === "swap" ? effectiveRecipientAddress : recipientAddress;

    if (!background && activeMode === "send" && !resolvedRecipientAddress) {
      setTxError("Recipient address is required");
      return;
    }

    if ((!background && activeMode === "send") || hasCustomSwapRecipient) {
      if (!resolvedRecipientAddress) {
        setTxError("Recipient address is required");
        return;
      }

      if (
        activeMode === "send" &&
        ownerAddress &&
        isAddress(resolvedRecipientAddress) &&
        resolvedRecipientAddress.toLowerCase() === ownerAddress.toLowerCase()
      ) {
        setTxError("Recipient cannot be the connected wallet.");
        return;
      }

      if (resolvedRecipientAddress.endsWith(".eth")) {
        try {
          const mainnetClient =
            publicClient?.chain?.id === 1
              ? publicClient
              : createPublicClient({
                  chain: mainnet,
                  transport: http(),
                });
          const ensAddr = await mainnetClient.getEnsAddress({
            name: normalize(resolvedRecipientAddress),
          });
          if (!ensAddr) {
            setTxError("Could not resolve ENS name to an address.");
            return;
          }
          resolvedRecipientAddress = ensAddr;
        } catch (e: any) {
          setTxError(e.message || "Failed to resolve ENS name.");
          return;
        }
      } else {
        if (!isAddress(resolvedRecipientAddress)) {
          setTxError("Invalid recipient address.");
          return;
        }
      }

      if (
        activeMode === "send" &&
        ownerAddress &&
        isAddress(resolvedRecipientAddress) &&
        resolvedRecipientAddress.toLowerCase() === ownerAddress.toLowerCase()
      ) {
        setTxError("Recipient cannot be the connected wallet.");
        return;
      }
    }

    if (!isCurrentQuoteInput()) {
      return;
    }

    if (!background) {
      onStart?.();
      startSwapHistoryEntry();
      swapStepRef.current = "progress";
      setSwapStep("progress");
    }
    setIntentLoading(true);
    setQuoteRefreshing(background);
    setIntentToAmount(undefined);
    setIntentFeeUsd(undefined);
    setIntentData(null);
    swapIntentRef.current?.deny();
    swapIntentRef.current = null;
    if (!background) {
      resetProgressEvents();
      swapStepsListRef.current = [];
      resetSteps();
    }

    if (!nexusSDK) {
      setTxError("SDK not initialized");
      if (!background) {
        setSwapStep("idle");
      }
      setIntentLoading(false);
      setQuoteRefreshing(false);
      setReceiveMaxCalculating(false);
      return;
    }

    swapRunIdRef.current += 1;
    const runId = swapRunIdRef.current;

    const isActionPlanStep = (step: SwapStepType | BridgeStepType) => {
      const type = getProgressStepType(step);
      return (
        type === "APPROVAL" ||
        type === "TRANSACTION_SENT" ||
        type === "TRANSACTION_CONFIRMED"
      );
    };

    const hasSwapPlanSteps = (stepList: Array<SwapStepType | BridgeStepType>) =>
      stepList.some((step) => !isActionPlanStep(step));

    const handleProgressStepSideEffects = (
      event: any,
      step: SwapStepType | BridgeStepType,
      completed: boolean
    ) => {
      const type = getProgressStepType(step);
      const rawStepType = String(
        event?.stepType ?? (step as any)?.type ?? (step as any)?.typeID ?? ""
      ).toLowerCase();
      const rawState = String(event?.state ?? "").toLowerCase();
      const explorerUrl = getPlanStepExplorerUrl(event, step);
      const intentExplorerUrl = getEventIntentExplorerUrl(
        appConfig.nexusNetwork,
        event,
        step
      );

      patchCurrentIntentExplorerUrl(intentExplorerUrl);

      if (
        type === "TRANSACTION_SENT" ||
        type === "TRANSACTION_CONFIRMED" ||
        type === "SOURCE_SWAP" ||
        type === "BRIDGE_DEPOSIT" ||
        type === "BRIDGE_INTENT_SUBMISSION" ||
        type === "BRIDGE_FILL" ||
        type === "DESTINATION_SWAP" ||
        type === "SWAP_COMPLETE" ||
        type === "SWAP_SKIPPED"
      ) {
        markSwapExecutionStarted();
      }

      if (
        PLAN_STEP_FUNDS_MOVED_STATES.has(rawState) &&
        (rawStepType === "source_swap" ||
          rawStepType === "eoa_to_ephemeral_transfer" ||
          rawStepType === "bridge_deposit" ||
          type.includes("SOURCE_SWAP") ||
          type === "BRIDGE_DEPOSIT")
      ) {
        fundsMovedRef.current = true;
      }

      if (explorerUrl) {
        if (
          rawStepType === "destination_swap" ||
          rawStepType === "execute_transaction" ||
          type.includes("DESTINATION_SWAP") ||
          type === "TRANSACTION_SENT" ||
          type === "TRANSACTION_CONFIRMED"
        ) {
          mergeExplorerUrls({ destinationExplorerUrl: explorerUrl });
        } else if (
          rawStepType === "source_swap" ||
          rawStepType === "eoa_to_ephemeral_transfer" ||
          rawStepType === "bridge_deposit" ||
          type.includes("SOURCE_SWAP") ||
          type === "BRIDGE_DEPOSIT"
        ) {
          mergeExplorerUrls({ sourceExplorerUrl: explorerUrl });
        }

        if (
          !intentUrlRef.current &&
          (rawStepType === "bridge_intent_submission" ||
            rawStepType === "request_submission" ||
            type === "BRIDGE_INTENT_SUBMISSION")
        ) {
          patchCurrentIntentExplorerUrl(explorerUrl);
        }
      }

      if (completed) {
        onStepComplete(step as SwapStepType);
      }
    };

    const handlePlanEvent = (event: any) => {
      if (event.type === "plan_preview" || event.type === "plan_confirmed") {
        const stepList = Array.isArray(event.plan?.steps)
          ? event.plan.steps.map((step: any) =>
              normalizePlanStep(step, step?.type, undefined, false)
            )
          : [];
        const rawSteps = Array.isArray(event.plan?.steps)
          ? event.plan.steps
          : [];
        logSwapPlanSteps(event.type, stepList, rawSteps);
        if (stepList.length === 0) return;

        if (
          event.type === "plan_confirmed" ||
          rawPlanStepsRef.current.length === 0
        ) {
          rawPlanStepsRef.current = rawSteps;
          setRawPlanSteps(rawSteps);
        }

        if (hasSwapPlanSteps(stepList)) {
          swapStepsListRef.current = stepList as SwapStepType[];
          appendProgressListEvent(
            PROGRESS_EVENT_NAMES.SWAP_PLAN_LIST,
            stepList,
            rawSteps,
            event.type
          );
        } else {
          appendProgressListEvent(
            PROGRESS_EVENT_NAMES.BRIDGE_PLAN_LIST,
            stepList,
            rawSteps,
            event.type
          );
        }
        onStepsList(stepList as SwapStepType[]);
        return;
      }

      if (event.type !== "plan_progress") {
        logSdkSwapEvent("unhandled typed event", event);
        return;
      }

      const state = String(event.state ?? "").toLowerCase();
      const completed = PLAN_FINAL_STATES.has(state);
      const step = normalizePlanStep(
        event.step,
        event.stepType,
        event.state,
        completed
      );
      const eventName = isActionPlanStep(step)
        ? PROGRESS_EVENT_NAMES.BRIDGE_PLAN_PROGRESS
        : PROGRESS_EVENT_NAMES.SWAP_PLAN_PROGRESS;

      logSwapPlanProgress(event, step, eventName, completed);
      appendProgressEvent(eventName, step, completed, event);
      handleProgressStepSideEffects(event, step, completed);
    };

    const appendSkippedSwapProgress = () => {
      const step = {
        completed: true,
        type: "SWAP_SKIPPED",
        typeID: "SWAP_SKIPPED",
      } as SwapStepType;
      enterSkippedSwapProgress();
      appendProgressEvent(PROGRESS_EVENT_NAMES.SWAP_PLAN_PROGRESS, step, true);
      onStepComplete(step);
    };

    const handleSwapEvent = (event: any) => {
      if (!event || typeof event !== "object") return;
      if (typeof event.type === "string") {
        handlePlanEvent(event);
        return;
      }
      logSdkSwapEvent("ignored event without string type", event);
    };

    const onEvent = (rawEvent: any) => {
      const event =
        rawEvent?.type === "quote" ||
        rawEvent?.type === "step" ||
        rawEvent?.type === "status"
          ? adaptIntentEvent(rawEvent)
          : rawEvent;
      const isCurrentRun = swapRunIdRef.current === runId;
      const isCurrentQuote = isCurrentQuoteInput();
      logSdkSwapEvent("onEvent", event, {
        currentRunId: swapRunIdRef.current,
        isCurrentQuote,
        isCurrentRun,
        quoteInputKey,
        runId,
      });
      if (!isCurrentRun || !isCurrentQuote) {
        logSdkSwapEvent("ignored stale onEvent", event, {
          currentRunId: swapRunIdRef.current,
          isCurrentQuote,
          quoteInputKey,
          runId,
        });
        return;
      }
      patchCurrentIntentExplorerUrl(
        getEventIntentExplorerUrl(appConfig.nexusNetwork, event)
      );
      handleSwapEvent(event);
    };

    const buildRecipientTransferExecuteConfig = (transferAmount: bigint) => {
      if (!resolvedRecipientAddress) {
        throw new Error("Recipient address is required");
      }

      const isNative =
        !toToken.contractAddress ||
        toToken.contractAddress.toLowerCase() ===
          "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
        toToken.contractAddress ===
          "0x0000000000000000000000000000000000000000";

      if (isNative) {
        return {
          to: resolvedRecipientAddress as `0x${string}`,
          value: transferAmount,
          gas: BigInt(100000),
        };
      }

      return {
        to: toToken.contractAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [resolvedRecipientAddress as `0x${string}`, transferAmount],
        }),
        gas: BigInt(100000),
      };
    };

    const executeRecipientTransfer = async (transferAmount: bigint) => {
      const result = await nexusSDK.execute(
        {
          toChainId: toToken.chainId!,
          ...buildRecipientTransferExecuteConfig(transferAmount),
        },
        { onEvent }
      );
      const finalExplorerUrl =
        getSdkExplorerUrl(result) ||
        getExplorerTxUrl(
          toToken.chainId,
          getSdkTransactionHash(result),
          result
        );
      if (finalExplorerUrl) {
        setTransferExplorerUrl(finalExplorerUrl);
        mergeExplorerUrls({ destinationExplorerUrl: finalExplorerUrl });
      }
      return finalExplorerUrl;
    };

    try {
      if (!isExactOutFlow) {
        const fromPayload: {
          chainId: number;
          tokenAddress: `0x${string}`;
          amountRaw: bigint;
        }[] = [];

        const exactInSourceTokens = getReadyExactInSourceTokens(fromTokens);

        for (const token of exactInSourceTokens) {
          // Determine the amount to use for this specific token
          let rawAmountStr = token.userAmount;
          if (!rawAmountStr && exactInSourceTokens.length === 1) {
            rawAmountStr = amount; // fallback for single-token case
          }

          let cleanAmount = parseFiatNumber(rawAmountStr) ?? new Decimal(0);
          if (cleanAmount.lte(0)) continue;

          if (token.userAmountMode === "usd") {
            const tokenBalance =
              parseFiatNumber(token.balance) ?? new Decimal(0);
            const fiatBalance =
              parseFiatNumber(token.balanceInFiat) ?? new Decimal(0);
            const price = tokenBalance.gt(0)
              ? fiatBalance.div(tokenBalance)
              : new Decimal(0);
            if (price.gt(0)) {
              cleanAmount = cleanAmount.div(price);
            } else {
              cleanAmount = new Decimal(0);
            }
          }

          if (cleanAmount.lte(0)) continue;

          const safeTokenAmountStr = cleanAmount
            .toDecimalPlaces(
              Math.max(0, token.decimals || 18),
              Decimal.ROUND_DOWN
            )
            .toFixed();

          fromPayload.push({
            chainId: token.chainId!,
            tokenAddress: token.contractAddress as `0x${string}`,
            amountRaw: parseUnits(safeTokenAmountStr, token.decimals || 18),
          });
        }

        if (fromPayload.length === 0) {
          throw new Error("No source amount available for swap.");
        }

        resetExplorerUrls();
        const exactInSwapPayload = {
          sources: fromPayload,
          toChainId: toToken.chainId!,
          toTokenAddress: toToken.contractAddress as `0x${string}`,
        };
        let intentExplorerUrl: string | null = null;
        let intentId = currentSwapEntry?.intentId;
        let finalExplorerUrl: string | null =
          explorerUrlsRef.current.destinationExplorerUrl ||
          explorerUrlsRef.current.sourceExplorerUrl;

        if (hasCustomSwapRecipient && resolvedRecipientAddress) {
          const sdkWithOptionalTransfer = nexusSDK as any;

          if (typeof sdkWithOptionalTransfer.swapAndTransfer === "function") {
            const result = await sdkWithOptionalTransfer.swapAndTransfer(
              {
                mode: "exactIn",
                recipient: resolvedRecipientAddress as `0x${string}`,
                ...exactInSwapPayload,
              },
              { onEvent }
            );
            if (result?.success === false) {
              throw new Error(result?.error || "Swap and transfer failed");
            }

            const swapResult = getSdkSwapResult(result);
            intentExplorerUrl = getSdkIntentExplorerUrlForNetwork(
              appConfig.nexusNetwork,
              result,
              swapResult
            );
            intentId =
              extractIntentIdFromUrl(intentExplorerUrl) ??
              currentSwapEntry?.intentId;
            const resultFinalExplorerUrl =
              getSdkExplorerUrl(result) ||
              getExplorerTxUrl(
                toToken.chainId,
                getSdkTransactionHash(result),
                result,
                swapResult
              );
            finalExplorerUrl = resultFinalExplorerUrl || finalExplorerUrl;
            if (resultFinalExplorerUrl) {
              setTransferExplorerUrl(resultFinalExplorerUrl);
              mergeExplorerUrls({
                destinationExplorerUrl: resultFinalExplorerUrl,
              });
            }
          } else {
            console.log(
              "[nexusSDK.swapWithExactIn payload]",
              exactInSwapPayload
            );
            const result = await nexusSDK.swapWithExactIn(exactInSwapPayload, {
              hooks: {
                onIntent: (data) =>
                  handleSwapIntentCallback(data, runId, quoteInputKey),
              },
              onEvent,
            });

            intentExplorerUrl = getSdkIntentExplorerUrlForNetwork(
              appConfig.nexusNetwork,
              result
            );
            intentId =
              extractIntentIdFromUrl(intentExplorerUrl) ??
              currentSwapEntry?.intentId;

            const latestSwapIntent = (
              swapIntentRef.current as unknown as {
                intent?: SwapIntentData;
              } | null
            )?.intent;
            const transferAmount = latestSwapIntent?.destination?.amount;
            if (!transferAmount) {
              throw new Error(
                "Unable to determine received amount to transfer."
              );
            }

            const transferAmountBigInt = parseUnits(
              transferAmount,
              toToken.decimals || 18
            );
            finalExplorerUrl =
              (await executeRecipientTransfer(transferAmountBigInt)) ||
              finalExplorerUrl;
          }
        } else {
          // Start exact-in swap — the intent hook will fire and populate preview
          console.log("[nexusSDK.swapWithExactIn payload]", exactInSwapPayload);
          const result = await nexusSDK.swapWithExactIn(exactInSwapPayload, {
            hooks: {
              onIntent: (data) =>
                handleSwapIntentCallback(data, runId, quoteInputKey),
            },
            onEvent,
          });
          intentExplorerUrl = getSdkIntentExplorerUrlForNetwork(
            appConfig.nexusNetwork,
            result
          );
          intentId =
            extractIntentIdFromUrl(intentExplorerUrl) ??
            currentSwapEntry?.intentId;
          const swapResult = getSdkSwapResult(result);
          const resultFinalExplorerUrl =
            getSdkExplorerUrl(result) ||
            getExplorerTxUrl(
              toToken.chainId,
              getSdkTransactionHash(result),
              result,
              swapResult
            );
          finalExplorerUrl = resultFinalExplorerUrl || finalExplorerUrl;
          if (resultFinalExplorerUrl) {
            setTransferExplorerUrl(resultFinalExplorerUrl);
            mergeExplorerUrls({
              destinationExplorerUrl: resultFinalExplorerUrl,
            });
          }
        }

        if (
          swapRunIdRef.current === runId &&
          swapStepRef.current === "progress"
        ) {
          const resolvedFinalExplorerUrl =
            finalExplorerUrl ||
            explorerUrlsRef.current.destinationExplorerUrl ||
            explorerUrlsRef.current.sourceExplorerUrl;
          const resolvedIntentExplorerUrl =
            intentExplorerUrl || intentUrlRef.current;
          finishCurrentSwapHistoryEntry("fulfilled", {
            finalExplorerUrl: resolvedFinalExplorerUrl,
            ...(resolvedIntentExplorerUrl
              ? { intentExplorerUrl: resolvedIntentExplorerUrl }
              : {}),
            ...(intentId ? { intentId } : {}),
          });
          resetInputsAfterSuccessfulExecution();
          onComplete?.();
          setSwapStep("success");
        }
      } else {
        const exactOutAmountString =
          activeMode === "deposit"
            ? depositTokenAmountForQuote
                ?.toDecimalPlaces(toToken.decimals || 18, Decimal.ROUND_DOWN)
                .toFixed()
            : amount;
        if (!exactOutAmountString || new Decimal(exactOutAmountString).lte(0)) {
          setTxError(
            depositAmountMode === "usd"
              ? "Unable to convert USD amount into the destination token amount."
              : "Enter a valid amount."
          );
          setIntentLoading(false);
          setQuoteRefreshing(false);
          setReceiveMaxCalculating(false);
          return;
        }
        const amountBigInt = parseUnits(
          toViemDecimalString(exactOutAmountString, toToken.decimals || 18),
          toToken.decimals || 18
        );

        resetExplorerUrls();

        const fromSourcesPayload = buildFromSourcesPayload(
          getExactOutSourceTokens()
        );

        let executeConfig: any;
        if (activeMode === "deposit" && !selectedOpportunity?.executeDeposit) {
          throw new Error("Deposit config is missing executeDeposit.");
        }

        if (activeMode === "deposit" && selectedOpportunity) {
          const user = (ownerAddress ?? connectedAddress) as `0x${string}`;

          const executeParams = selectedOpportunity.executeDeposit(
            selectedOpportunity.tokenSymbol,
            selectedOpportunity.tokenAddress,
            amountBigInt,
            selectedOpportunity.chainId,
            user
          );
          executeConfig = {
            to: executeParams.to,
            value: executeParams.value,
            data: executeParams.data,
            gasPrice: executeParams.gasPrice,
            tokenApproval: executeParams.tokenApproval,
            gas: BigInt(400_000),
          };
        } else if (
          (activeMode === "send" || hasCustomSwapRecipient) &&
          resolvedRecipientAddress
        ) {
          executeConfig = buildRecipientTransferExecuteConfig(amountBigInt);
        }

        if (executeConfig?.tokenApproval) {
          executeConfig = {
            ...executeConfig,
            tokenApproval: {
              toTokenAddress:
                executeConfig.tokenApproval.toTokenAddress ||
                toToken.contractAddress,
              amount: executeConfig.tokenApproval.amount,
              spender: executeConfig.tokenApproval.spender,
            },
          };
        }

        if (executeConfig) {
          const sdkWithOptionalTransfer = nexusSDK as any;
          const result =
            (activeMode === "send" || hasCustomSwapRecipient) &&
            typeof sdkWithOptionalTransfer.swapAndTransfer === "function"
              ? await sdkWithOptionalTransfer.swapAndTransfer(
                  {
                    mode: "exactOut",
                    toChainId: toToken.chainId!,
                    toTokenAddress: toToken.contractAddress as `0x${string}`,
                    toAmountRaw: amountBigInt,
                    recipient: resolvedRecipientAddress as `0x${string}`,
                    ...fromSourcesPayload,
                  },
                  { onEvent }
                )
              : await nexusSDK.swapAndExecute(
                  {
                    toChainId: toToken.chainId!,
                    toTokenAddress: toToken.contractAddress as `0x${string}`,
                    toAmountRaw: amountBigInt,
                    execute: executeConfig,
                    ...fromSourcesPayload,
                  },
                  {
                    onEvent,
                    hooks: {
                      onIntent: (data) =>
                        handleSwapIntentCallback(data, runId, quoteInputKey),
                    },
                  }
                );

          const swapResult = result?.swapResult ?? result?.result ?? null;
          const swapSkipped = Boolean((result as any)?.swapSkipped);
          if (swapSkipped) {
            appendSkippedSwapProgress();
          }
          if (
            !swapResult &&
            !swapSkipped &&
            activeMode !== "send" &&
            !hasCustomSwapRecipient
          ) {
            throw new Error("Swap failed");
          }
          const executeTxHash = getSdkTransactionHash(result);
          const intentExplorerUrl = getSdkIntentExplorerUrlForNetwork(
            appConfig.nexusNetwork,
            result,
            swapResult
          );
          const intentId =
            extractIntentIdFromUrl(intentExplorerUrl) ??
            currentSwapEntry?.intentId;
          const finalExplorerUrl =
            getSdkExplorerUrl(result) ||
            getExplorerTxUrl(
              toToken.chainId,
              executeTxHash,
              result,
              swapResult
            );
          if (finalExplorerUrl) {
            if (activeMode === "send" || hasCustomSwapRecipient) {
              setTransferExplorerUrl(finalExplorerUrl);
            }
            mergeExplorerUrls({ destinationExplorerUrl: finalExplorerUrl });
          }
          patchCurrentSwapHistoryEntry({
            ...(finalExplorerUrl ? { finalExplorerUrl } : {}),
            ...(intentExplorerUrl ? { intentExplorerUrl } : {}),
            ...(intentId ? { intentId } : {}),
          });
        } else {
          const activePredictiveOut =
            predictiveQuote?.mode === "exactOut" ? predictiveQuote : null;
          const isExplicit = Boolean(
            sourceSelectionTouched &&
              exactOutQuoteSourceModeRef.current !== "all" &&
              fromTokens.length > 0
          );
          const immediatePredictiveOut = buildImmediatePredictiveExactOutQuote(
            isExplicit ? fromTokens : [],
            true
          );
          if (
            immediatePredictiveOut?.missingUsd &&
            Number(immediatePredictiveOut.missingUsd) > 0.01
          ) {
            setIntentLoading(false);
            setQuoteRefreshing(false);
            setReceiveMaxCalculating(false);
            const msg = !isMultiAssetMode
              ? `You're $${immediatePredictiveOut.missingUsd} short. Switch to Multi-assets Mode`
              : `You're $${immediatePredictiveOut.missingUsd} short. Add Assets`;
            setSwapQuoteIssue({
              type: "insufficientSources",
              message: msg,
              missingUsd: immediatePredictiveOut.missingUsd,
            } as any);
            return;
          }
          if (
            !isMultiAssetMode &&
            immediatePredictiveOut?.hasUncoveredSourceAmount
          ) {
            setIntentLoading(false);
            setQuoteRefreshing(false);
            setReceiveMaxCalculating(false);
            return;
          }
          const exactOutSources = !isMultiAssetMode
            ? (() => {
                if (
                  immediatePredictiveOut?.sources &&
                  immediatePredictiveOut.sources.length > 0
                ) {
                  return [immediatePredictiveOut.sources[0]];
                }
                const sourceToken = fromTokens[0];
                if (!sourceToken) return [];
                const rate = getTokenUsdRate(sourceToken);
                const destRate = getTokenUsdRate(toToken);
                const destAmount = parseFiatNumber(amount) ?? new Decimal(0);
                const destUsd = destAmount.mul(destRate.gt(0) ? destRate : 1);
                const sourceAmount = rate.gt(0)
                  ? destUsd.div(rate)
                  : destAmount;
                return [
                  {
                    ...sourceToken,
                    userAmount: sourceAmount
                      .toDecimalPlaces(
                        sourceToken.decimals || 18,
                        Decimal.ROUND_DOWN
                      )
                      .toFixed(),
                    userAmountMode: "token" as const,
                    userAmountUsd: destUsd.toFixed(2),
                  },
                ];
              })()
            : isExplicit
              ? immediatePredictiveOut?.sources &&
                immediatePredictiveOut.sources.length > 0
                ? immediatePredictiveOut.sources
                : fromTokens
              : immediatePredictiveOut?.sources &&
                  immediatePredictiveOut.sources.length > 0
                ? immediatePredictiveOut.sources
                : activePredictiveOut?.sources &&
                    activePredictiveOut.sources.length > 0
                  ? activePredictiveOut.sources
                  : fromTokens;
          const exactOutFromPayload: {
            chainId: number;
            tokenAddress: `0x${string}`;
            amountRaw: bigint;
          }[] = [];

          for (const token of exactOutSources) {
            const cleanAmount =
              parseFiatNumber(token.userAmount) ?? new Decimal(0);
            if (cleanAmount.gt(0)) {
              const safeTokenAmountStr = cleanAmount
                .toDecimalPlaces(
                  Math.max(0, token.decimals || 18),
                  Decimal.ROUND_DOWN
                )
                .toFixed();
              exactOutFromPayload.push({
                chainId: token.chainId!,
                tokenAddress: token.contractAddress as `0x${string}`,
                amountRaw: parseUnits(safeTokenAmountStr, token.decimals || 18),
              });
            }
          }

          if (exactOutFromPayload.length === 0) {
            if (background) {
              setIntentLoading(false);
              setQuoteRefreshing(false);
              setReceiveMaxCalculating(false);
              setSwapQuoteIssue({
                type: "insufficientSources",
                message: "Insufficient balance for swap.",
              } as any);
              return;
            }
            setTxError("Insufficient balance for swap.");
            setIntentLoading(false);
            setQuoteRefreshing(false);
            setReceiveMaxCalculating(false);
            return;
          }

          const exactOutInSwapPayload = {
            sources: exactOutFromPayload,
            toChainId: toToken.chainId!,
            toTokenAddress: toToken.contractAddress as `0x${string}`,
          };

          console.log(
            "[nexusSDK.swapWithExactIn payload]",
            exactOutInSwapPayload
          );
          const result = await nexusSDK.swapWithExactIn(exactOutInSwapPayload, {
            hooks: {
              onIntent: (data) =>
                handleSwapIntentCallback(data, runId, quoteInputKey),
            },
            onEvent,
          });
          const intentExplorerUrl = getSdkIntentExplorerUrlForNetwork(
            appConfig.nexusNetwork,
            result
          );
          const intentId =
            extractIntentIdFromUrl(intentExplorerUrl) ??
            currentSwapEntry?.intentId;
          const swapResult = getSdkSwapResult(result);
          const finalExplorerUrl =
            getSdkExplorerUrl(result) ||
            getExplorerTxUrl(
              toToken.chainId,
              getSdkTransactionHash(result),
              result,
              swapResult
            );
          if (finalExplorerUrl) {
            mergeExplorerUrls({ destinationExplorerUrl: finalExplorerUrl });
          }
          patchCurrentSwapHistoryEntry({
            ...(finalExplorerUrl ? { finalExplorerUrl } : {}),
            ...(intentExplorerUrl ? { intentExplorerUrl } : {}),
            ...(intentId ? { intentId } : {}),
          });
        }

        if (
          swapRunIdRef.current === runId &&
          swapStepRef.current === "progress"
        ) {
          finishCurrentSwapHistoryEntry("fulfilled");
          resetInputsAfterSuccessfulExecution();
          onComplete?.();
          if (activeMode === "deposit") {
            reachedTerminalRef.current = true;
            const now = Date.now();
            trackDeposit("deposit_completed", {
              postConfirmDurationMs: previewConfirmedTsRef.current
                ? now - previewConfirmedTsRef.current
                : 0,
              totalDurationMs: now - widgetOpenedTsRef.current,
              attemptCount: attemptCountRef.current,
              amountToken: depositTokenDisplay,
              amountUsd: Number(depositUsdDisplay) || 0,
            });
          }
          setSwapStep("success");
        }
      }
    } catch (err: any) {
      const isIntentDenied =
        err?.code === "USER_DENIED_INTENT" ||
        err?.message?.includes("User denied") ||
        err?.message?.includes("denied swap intent");
      if (isIntentDenied) {
        return;
      }
      const caughtTimeout = isTimeoutLikeError(err);
      if (caughtTimeout) {
        console.warn("Timeout in handleEnterPreview:", err);
      } else {
        console.error("Error in handleEnterPreview:", err);
      }
      if (swapRunIdRef.current !== runId || !isCurrentQuoteInput()) {
        return;
      }
      if (activeMode === "deposit" && err?.code !== "USER_DENIED_INTENT") {
        const hasActiveExecution =
          swapStepRef.current === "progress" &&
          Boolean(currentSwapIdRef.current);
        const isInsufficient = isInsufficientSourcesError(err);
        const errMessage =
          (typeof err?.message === "string" ? err.message : "") ||
          (typeof err === "string" ? err : "");
        const errName = typeof err?.name === "string" ? err.name : "";
        const isTimeout = isTimeoutLikeError(err);
        const isUserRejected =
          err?.code === 4001 ||
          err?.code === "ACTION_REJECTED" ||
          errName === "UserRejectedRequestError" ||
          /user rejected|user denied/i.test(errMessage);
        const failedAtStep:
          | "simulation"
          | "nexus_operation"
          | "execute_leg"
          | "unknown" = !hasActiveExecution ? "simulation" : "nexus_operation";
        const errorCategory: string = isUserRejected
          ? "user_rejected"
          : isTimeout
            ? "timeout"
            : isInsufficient
              ? "no_eligible_sources"
              : !hasActiveExecution
                ? "quote_failed"
                : "execution_failed";
        reachedTerminalRef.current = true;
        if (fundsMovedRef.current) {
          trackDeposit("deposit_partial_movement_detected", {
            intentUrl: intentUrlRef.current,
          });
        }
        trackDeposit("deposit_failed", {
          errorCode: err?.code ?? "UNKNOWN",
          errorCategory,
          errorMessage: errMessage || "Transaction failed.",
          failedAtStep,
        });
      }
      setQuoteRefreshing(false);
      setIntentLoading(false);
      setReceiveMaxCalculating(false);
      const hasActiveExecution =
        swapStepRef.current === "progress" && Boolean(currentSwapIdRef.current);
      const isTimeout = caughtTimeout;
      const showFailedProgressThenReceipt = (
        error: string,
        patch: Partial<SwapHistoryEntry> = {}
      ) => {
        const failedProgressEvent = progressEventsRef.current.at(-1);
        const isTransferExecution =
          activeMode === "send" || hasCustomSwapRecipient;
        const fallbackFailedStep =
          activeMode === "deposit" || isTransferExecution
            ? ({ type: "APPROVAL", typeID: "AP" } as BridgeStepType)
            : ({
                type: "DETERMINING_SWAP",
                typeID: "DETERMINING_SWAP",
              } as unknown as SwapStepType);
        const failedStep = failedProgressEvent?.step ?? fallbackFailedStep;
        const autoRefundAvailable =
          isAutoRefundAvailableProgressEvent(failedProgressEvent);
        setFailedProgressStep(failedStep);
        finishCurrentSwapHistoryEntry("failed", {
          error,
          autoRefundAvailable,
          failureDescription: getFailureDescriptionForProgressStep(
            failedStep,
            autoRefundAvailable
          ),
          failureMessage: getFailureMessageForProgressStep(
            failedStep,
            hasCustomSwapRecipient ? "send" : activeMode,
            autoRefundAvailable
          ),
          failedStepType: getProgressStepType(failedStep),
          ...patch,
        });
        window.setTimeout(() => {
          if (
            swapRunIdRef.current === runId &&
            swapStepRef.current === "progress"
          ) {
            setSwapStep("failed");
          }
        }, 700);
      };
      const showTimeoutReceipt = (
        message = "Transaction timed out",
        patch: Partial<SwapHistoryEntry> = {}
      ) => {
        finishCurrentSwapHistoryEntry("timeout", {
          error: message,
          failureDescription:
            "This transaction is still pending. Check the intent explorer for the latest status.",
          failureMessage: TIMEOUT_LABEL,
          ...patch,
        });
        window.setTimeout(() => {
          if (
            swapRunIdRef.current === runId &&
            swapStepRef.current === "progress"
          ) {
            setSwapStep("failed");
          }
        }, 700);
      };
      if (err?.code === "USER_DENIED_INTENT") {
        if (hasActiveExecution) {
          showFailedProgressThenReceipt("Transaction cancelled by user");
        } else if (!background && swapStepRef.current === "preview-intent") {
          setSwapStep("idle");
        }
        return;
      }
      if (isInsufficientSourcesError(err) && !hasActiveExecution) {
        const issue = buildInsufficientSourcesIssue(err);
        if (!background || swapStepRef.current === "preview-intent") {
          setSwapStep("idle");
        }
        setTxError(null);
        setSwapQuoteIssue(issue);
        onError?.(issue.message);
        return;
      }
      const errorMessage =
        err?.message ||
        (typeof err === "string"
          ? err
          : "Transaction failed. Please try again or check console.");
      if (isTimeout && hasActiveExecution) {
        showTimeoutReceipt(errorMessage);
        setTxError(null);
        return;
      }
      if (hasActiveExecution) {
        showFailedProgressThenReceipt(errorMessage);
      } else if (!background || swapStepRef.current === "preview-intent") {
        setSwapStep("idle");
      }
      setTxError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const hasInsufficientSourcesQuoteIssue =
    swapQuoteIssue?.type === "insufficientSources";
  const hasReceiveAmountQuoteIssue = Boolean(receiveAmountIssue);

  useEffect(() => {
    if (activeMode !== "swap" || swapStep !== "idle" || !nexusSDK) return;

    if (syncingIntentSourcesRef.current) {
      syncingIntentSourcesRef.current = false;
      if (hasCurrentQuoteIntent) {
        setIntentLoading(false);
        setQuoteRefreshing(false);
        setReceiveMaxCalculating(false);
        return;
      }
    }

    if (hasReceiveAmountQuoteIssue) {
      clearPendingSwapIntent(true);
      setIntentLoading(false);
      setQuoteRefreshing(false);
      setReceiveMaxCalculating(false);
      return;
    }

    if (hasInsufficientSourcesQuoteIssue) {
      setIntentLoading(false);
      setQuoteRefreshing(false);
      setReceiveMaxCalculating(false);
      return;
    }

    const hasEnoughForQuote =
      swapType === "exactOut"
        ? Boolean(parseFiatNumber(amount)?.gt(0) && toToken)
        : hasReadyExactInSwapInput(fromTokens, toToken);

    if (!hasEnoughForQuote) {
      clearPendingSwapIntent();
      setSwapQuoteIssue(null);
      setTxError(null);
      return;
    }

    if (hasCurrentQuoteIntent) {
      setIntentLoading(false);
      setQuoteRefreshing(false);
      return;
    }

    clearPendingSwapIntent(true, { keepQuoteRefreshing: true });
    setQuoteRefreshing(true);
    let quoteStarted = false;
    const quoteDelay = getQuoteRequestDelay();
    const timer = window.setTimeout(() => {
      quoteStarted = true;
      void handleEnterPreview({ background: true });
    }, quoteDelay);

    return () => {
      window.clearTimeout(timer);
      if (syncingIntentSourcesRef.current) return;
      if (!quoteStarted && swapStepRef.current === "idle") {
        clearPendingSwapIntent(true, { keepQuoteRefreshing: true });
      }
    };
  }, [
    activeMode,
    activeQuoteInputKey,
    amount,
    defaultRecipientAddress,
    fromTokensQuoteKey,
    getQuoteRequestDelay,
    hasCurrentQuoteIntent,
    hasInsufficientSourcesQuoteIssue,
    hasReceiveAmountQuoteIssue,
    nexusSDK,
    recipientAddress,
    sourceSelectionRevision,
    swapStep,
    swapType,
    toTokenQuoteKey,
  ]);

  useEffect(() => {
    if (activeMode !== "deposit" || swapStep !== "idle" || !nexusSDK) return;

    if (syncingIntentSourcesRef.current) {
      syncingIntentSourcesRef.current = false;
      if (hasCurrentQuoteIntent) {
        setIntentLoading(false);
        setQuoteRefreshing(false);
        setReceiveMaxCalculating(false);
        return;
      }
    }

    if (hasReceiveAmountQuoteIssue) {
      clearPendingSwapIntent(true);
      setIntentLoading(false);
      setQuoteRefreshing(false);
      setReceiveMaxCalculating(false);
      return;
    }

    if (hasInsufficientSourcesQuoteIssue) {
      setIntentLoading(false);
      setQuoteRefreshing(false);
      setReceiveMaxCalculating(false);
      return;
    }

    const parsedAmount = parseFiatNumber(amount);
    const hasEnoughForQuote = Boolean(
      parsedAmount?.gt(0) &&
        toToken &&
        selectedOpportunity &&
        depositTokenAmountForQuote
    );

    if (!hasEnoughForQuote) {
      clearPendingSwapIntent();
      return;
    }

    if (hasCurrentQuoteIntent) {
      setIntentLoading(false);
      setQuoteRefreshing(false);
      return;
    }

    clearPendingSwapIntent(true, { keepQuoteRefreshing: true });
    setQuoteRefreshing(true);
    let quoteStarted = false;
    const quoteDelay = getQuoteRequestDelay();
    const timer = window.setTimeout(() => {
      quoteStarted = true;
      void handleEnterPreview({ background: true });
    }, quoteDelay);

    return () => {
      window.clearTimeout(timer);
      if (syncingIntentSourcesRef.current) return;
      if (!quoteStarted && swapStepRef.current === "idle") {
        clearPendingSwapIntent(true, { keepQuoteRefreshing: true });
      }
    };
  }, [
    activeMode,
    amount,
    activeQuoteInputKey,
    depositAmountMode,
    depositQuoteAmountKey,
    getQuoteRequestDelay,
    hasCurrentQuoteIntent,
    hasInsufficientSourcesQuoteIssue,
    hasReceiveAmountQuoteIssue,
    nexusSDK,
    sourceSelectionRevision,
    selectedOpportunityIdentity,
    swapStep,
    toTokenQuoteKey,
  ]);

  useEffect(() => {
    if (activeMode !== "send" || swapStep !== "idle" || !nexusSDK) return;

    if (syncingIntentSourcesRef.current) {
      syncingIntentSourcesRef.current = false;
      if (hasCurrentQuoteIntent) {
        setIntentLoading(false);
        setQuoteRefreshing(false);
        setReceiveMaxCalculating(false);
        return;
      }
    }

    if (hasReceiveAmountQuoteIssue) {
      clearPendingSwapIntent(true);
      setIntentLoading(false);
      setQuoteRefreshing(false);
      setReceiveMaxCalculating(false);
      return;
    }

    if (hasInsufficientSourcesQuoteIssue) {
      setIntentLoading(false);
      setQuoteRefreshing(false);
      setReceiveMaxCalculating(false);
      return;
    }

    const parsedAmount = parseFiatNumber(amount);
    const hasEnoughForQuote = Boolean(parsedAmount?.gt(0) && toToken);

    if (!hasEnoughForQuote) {
      clearPendingSwapIntent();
      return;
    }

    if (hasCurrentQuoteIntent) {
      setIntentLoading(false);
      setQuoteRefreshing(false);
      return;
    }

    clearPendingSwapIntent(true, { keepQuoteRefreshing: true });
    setQuoteRefreshing(true);
    let quoteStarted = false;
    const quoteDelay = getQuoteRequestDelay();
    const timer = window.setTimeout(() => {
      quoteStarted = true;
      void handleEnterPreview({ background: true });
    }, quoteDelay);

    return () => {
      window.clearTimeout(timer);
      if (syncingIntentSourcesRef.current) return;
      if (!quoteStarted && swapStepRef.current === "idle") {
        clearPendingSwapIntent(true, { keepQuoteRefreshing: true });
      }
    };
  }, [
    activeMode,
    amount,
    activeQuoteInputKey,
    getQuoteRequestDelay,
    hasCurrentQuoteIntent,
    hasInsufficientSourcesQuoteIssue,
    hasReceiveAmountQuoteIssue,
    nexusSDK,
    sourceSelectionRevision,
    swapStep,
    toTokenQuoteKey,
  ]);

  const refreshActiveSwapIntent = useCallback(async () => {
    if (receiveAmountIssueRef.current) return;

    if (swapType === "exactOut") {
      invalidateExactOutQuoteForRefresh();
      return;
    }

    const activeIntent = swapIntentRef.current;
    if (
      !activeIntent ||
      intentLoading ||
      quoteRefreshing ||
      receiveMaxCalculating ||
      previewQuoteRefreshing
    ) {
      return;
    }

    const runId = activeIntent.runId;
    const quoteInputKey = activeIntent.quoteInputKey;
    if (!quoteInputKey || activeQuoteInputKeyRef.current !== quoteInputKey) {
      return;
    }
    const isPreviewRefresh = swapStepRef.current === "preview-intent";
    if (isPreviewRefresh) {
      setPreviewQuoteRefreshing(true);
    } else {
      setQuoteRefreshing(true);
    }
    try {
      const updatedRaw = await activeIntent.refresh();
      const updatedBridgeProvider = normalizeBridgeProvider(
        (updatedRaw as any)?.bridgeProvider ??
          (updatedRaw as any)?.normalizedIntent?.bridgeProvider ??
          (updatedRaw as any)?.swap?.bridgeProvider ??
          activeIntent.intent?.bridgeProvider
      );
      const updated = normalizeRenderableSwapIntentData(
        updatedRaw,
        updatedBridgeProvider
      );
      if (
        !updated ||
        swapRunIdRef.current !== runId ||
        activeQuoteInputKeyRef.current !== quoteInputKey
      ) {
        return;
      }

      if (swapIntentRef.current) {
        swapIntentRef.current.intent = updated;
      }
      applySwapIntent(updated);
    } catch (err) {
      console.error("Unable to refresh swap intent", err);
    } finally {
      if (
        swapRunIdRef.current === runId &&
        activeQuoteInputKeyRef.current === quoteInputKey
      ) {
        if (isPreviewRefresh) {
          setPreviewQuoteRefreshing(false);
        } else {
          setQuoteRefreshing(false);
        }
      }
    }
  }, [
    applySwapIntent,
    intentLoading,
    previewQuoteRefreshing,
    quoteRefreshing,
    receiveMaxCalculating,
  ]);

  useEffect(() => {
    const hasRefreshableIntent =
      (activeMode === "swap" ||
        activeMode === "deposit" ||
        activeMode === "send") &&
      Boolean(
        intentData &&
          swapIntentRef.current &&
          swapIntentRef.current.quoteInputKey === activeQuoteInputKey
      ) &&
      (swapStep === "idle" || swapStep === "preview-intent");

    if (!hasRefreshableIntent || receiveAmountIssue) {
      setQuoteRefreshProgress(0);
      setQuoteRefreshSecondsRemaining(0);
      return;
    }

    let cancelled = false;
    let timeout: number | undefined;

    const scheduleRefresh = () => {
      const quoteAge = Date.now() - lastSwapIntentRefreshAtRef.current;
      const delay = Math.max(0, QUOTE_REFRESH_INTERVAL_MS - quoteAge);
      timeout = window.setTimeout(() => {
        if (receiveAmountIssueRef.current) {
          clearPendingSwapIntent(true);
          setQuoteRefreshProgress(0);
          setQuoteRefreshSecondsRemaining(0);
          return;
        }

        if (
          intentLoading ||
          quoteRefreshing ||
          receiveMaxCalculating ||
          previewQuoteRefreshing
        ) {
          if (!cancelled) {
            timeout = window.setTimeout(scheduleRefresh, 1000);
          }
          return;
        }

        void refreshActiveSwapIntent().finally(() => {
          if (!cancelled) {
            scheduleRefresh();
          }
        });
      }, delay);
    };

    scheduleRefresh();

    return () => {
      cancelled = true;
      if (timeout !== undefined) {
        window.clearTimeout(timeout);
      }
    };
  }, [
    activeMode,
    activeQuoteInputKey,
    intentData,
    intentLoading,
    receiveAmountIssue,
    previewQuoteRefreshing,
    quoteRefreshing,
    receiveMaxCalculating,
    refreshActiveSwapIntent,
    swapStep,
  ]);

  useEffect(() => {
    const hasRefreshableIntent =
      (activeMode === "swap" ||
        activeMode === "deposit" ||
        activeMode === "send") &&
      Boolean(
        intentData &&
          swapIntentRef.current &&
          swapIntentRef.current.quoteInputKey === activeQuoteInputKey
      ) &&
      (swapStep === "idle" || swapStep === "preview-intent");

    if (!hasRefreshableIntent || receiveAmountIssue) {
      setQuoteRefreshProgress(0);
      setQuoteRefreshSecondsRemaining(0);
      return;
    }

    const updateProgress = () => {
      const quoteAge = Date.now() - lastSwapIntentRefreshAtRef.current;
      const remaining = Math.max(0, QUOTE_REFRESH_INTERVAL_MS - quoteAge);
      setQuoteRefreshProgress(remaining / QUOTE_REFRESH_INTERVAL_MS);
      setQuoteRefreshSecondsRemaining(Math.ceil(remaining / 1000));
    };

    updateProgress();
    const interval = window.setInterval(updateProgress, 250);

    return () => window.clearInterval(interval);
  }, [
    activeMode,
    activeQuoteInputKey,
    intentData,
    receiveAmountIssue,
    swapStep,
  ]);

  /** User accepted swap from the preview — call allow() from the intent hook */
  const handleSwapAccept = () => {
    const activeIntent = swapIntentRef.current;
    if (activeIntent) {
      if (
        activeIntent.quoteInputKey &&
        activeQuoteInputKeyRef.current !== activeIntent.quoteInputKey
      ) {
        clearPendingSwapIntent(true, { keepQuoteRefreshing: true });
        setQuoteRefreshing(true);
        setSwapStep("idle");
        return;
      }
      if (activeMode === "deposit") {
        previewConfirmedTsRef.current = Date.now();
        attemptCountRef.current += 1;
        const timeInPreviewMs = previewViewedTsRef.current
          ? previewConfirmedTsRef.current - previewViewedTsRef.current
          : 0;
        trackDeposit("deposit_preview_confirmed", {
          timeInPreviewMs,
          totalFeeUsd: Number(intentFeeUsd) || 0,
          sourceCount: (intentData?.sources ?? []).length,
        });
      }
      onStart?.();
      startSwapHistoryEntry();
      setSwapStep("progress");
      setQuoteRefreshing(false);
      resetProgressEvents();
      if (swapStepsListRef.current.length > 0) {
        seed(swapStepsListRef.current);
      } else {
        resetSteps();
      }
      activeIntent.allow();
    }
  };

  // ---------------------------------------------------------------------------
  // Header title
  // ---------------------------------------------------------------------------
  const getTitle = () => {
    if (swapStep === "history") return "Transaction History";
    // Drawer panels overlay the main page,
    // so the header should still show the main page title.

    if (swapStep === "preview-intent") {
      return activeMode === "deposit"
        ? "Confirm Deposit"
        : activeMode === "send"
          ? "Confirm Send"
          : "Confirm Swap";
    }

    if (activeMode === "swap") {
      if (swapStep === "progress") return "Swapping…";
      if (swapStep === "success") return "Swap Complete";
      if (swapStep === "failed" && currentSwapEntry?.status === "timeout") {
        return TIMEOUT_LABEL;
      }
      if (swapStep === "failed") return "Swap Failed";
      return "Swap and Bridge";
    }
    if (activeMode === "deposit") {
      if (swapStep === "progress") return "Depositing…";
      if (swapStep === "success") return "Deposit Complete";
      if (swapStep === "failed" && currentSwapEntry?.status === "timeout") {
        return TIMEOUT_LABEL;
      }
      if (swapStep === "failed") return "Deposit Failed";
      return "Deposit";
    }
    if (activeMode === "send") {
      if (swapStep === "progress") return "Sending…";
      if (swapStep === "success") return "Send Complete";
      if (swapStep === "failed" && currentSwapEntry?.status === "timeout") {
        return TIMEOUT_LABEL;
      }
      if (swapStep === "failed") return "Send Failed";
      return "Send";
    }
    return "Nexus One";
  };

  // Titles that should be center-aligned (main screens / confirm screens)
  // Left-aligned: choose-swap-asset, choose-receive-asset (sub-screens with subtitles)
  const isTitleCentered = () => {
    if (swapStep === "history") return false;
    return true; // idle, drawer panels, preview-intent, progress, etc.
  };

  const canGoBack = swapStep === "preview-intent" || swapStep === "history";
  const handleHistoryToggle = () => {
    const nextStep = swapStepRef.current === "history" ? "idle" : "history";
    setIsRootHeightLockedForTransition(true);
    swapStepRef.current = nextStep;
    setSwapStep(nextStep);
  };
  const handleBack = () => {
    if (swapStep === "history") {
      setIsRootHeightLockedForTransition(true);
      setSwapStep("idle");
      return;
    }
    if (swapStep === "choose-swap-asset") {
      closeDrawerToIdle();
      return;
    }
    if (swapStep === "choose-receive-asset") {
      closeDrawerToIdle();
      return;
    }
    if (swapStep === "enter-recipient") {
      closeDrawerToIdle();
      return;
    }
    if (swapStep === "preview-intent") {
      const canRequoteAfterPreviewBack =
        activeMode === "swap"
          ? hasReadyExactInSwapInput(fromTokens, toToken)
          : canRefreshExactOutQuote();

      if (canRequoteAfterPreviewBack && isExactOutPaymentFlow) {
        setExactOutQuoteSourceModeValue("all");
      }
      if (isExactOutPaymentFlow) {
        invalidateExactOutQuoteForRefresh();
      } else {
        clearPendingSwapIntent(true, {
          keepQuoteRefreshing: canRequoteAfterPreviewBack,
        });
      }
      if (canRequoteAfterPreviewBack && activeMode === "swap") {
        setQuoteRefreshing(true);
        setTxError(null);
        setSwapQuoteIssue(null);
      }
      setSwapStep("idle");
      return;
    }
    if (swapStep === "progress") {
      return;
    } // can't go back during tx
    setSwapStep("idle");
  };

  const sanitizeNumericInput = (raw: string) => {
    if (!raw) return "";
    let next = raw.replaceAll(/[^0-9.]/g, "");
    const parts = next.split(".");
    if (parts.length > 2) next = `${parts[0]}.${parts.slice(1).join("")}`;
    if (next.startsWith(".")) next = `0${next}`;
    if (next.length > 1 && next.startsWith("0") && next[1] !== ".") {
      next = next.replace(/^0+/, "");
      if (next === "") next = "0";
      if (next.startsWith(".")) next = `0${next}`;
    }
    return next;
  };

  const handleSwapAmountChange = (val: string, panel: "send" | "receive") => {
    const sanitizedVal = sanitizeNumericInput(val);
    syncingIntentSourcesRef.current = false;
    setTxError(null);
    setAmount(sanitizedVal);

    if (panel === "receive") {
      if (swapType !== "exactOut") {
        setSwapType("exactOut");
      }
      const nextAmount = parseFiatNumber(sanitizedVal);
      const isZeroOrEmpty = !nextAmount || nextAmount.lte(0);

      if (isZeroOrEmpty) {
        setAmount(sanitizedVal);
        setPredictiveQuote(null);
        setReceiveAmountIssue(null);
        setSwapQuoteIssue(null);
        setTxError(null);
        setQuoteRefreshing(false);
        clearPendingSwapIntent();
        if (!sanitizedVal) {
          setFromTokens((current) =>
            current.map((token) => ({
              ...token,
              userAmount: "",
              userAmountUsd: "",
              selectedPct: null,
            }))
          );
        }
        return;
      }

      const hasManualSourceSelection =
        sourceSelectionTouched &&
        exactOutQuoteSourceModeRef.current !== "all" &&
        fromTokens.some((token) => token.chainId && token.contractAddress);
      if (hasManualSourceSelection) {
        setExactOutQuoteSourceModeValue("selected");
        sourcePickerDraftModeRef.current = "selected";
      } else {
        setExactOutQuoteSourceModeValue("all");
        sourcePickerDraftModeRef.current = "all";
      }

      const immediatePrediction = buildImmediatePredictiveExactOutQuote(
        hasManualSourceSelection ? fromTokens : [],
        true
      );
      if (immediatePrediction) {
        setPredictiveQuote(immediatePrediction);
      }

      if (
        immediatePrediction?.missingUsd &&
        Number(immediatePrediction.missingUsd) > 0
      ) {
        setQuoteRefreshing(false);
        setIntentLoading(false);
        setReceiveMaxCalculating(false);
        const msg = !isMultiAssetMode
          ? `You're $${immediatePrediction.missingUsd} short. Switch to Multi-assets Mode`
          : `You're $${immediatePrediction.missingUsd} short. Add Assets`;
        const shortfallIssue = {
          type: "insufficientSources" as const,
          message: msg,
          missingUsd: immediatePrediction.missingUsd,
        };
        setSwapQuoteIssue(shortfallIssue as any);
        setReceiveAmountIssue(shortfallIssue as any);
        clearPendingSwapIntent(true, { keepQuoteRefreshing: false });
        return;
      }

      const receiveIssue = buildReceiveAmountIssue({
        inputAmount: sanitizedVal,
      });
      applyReceiveAmountIssue(receiveIssue);
      if (receiveIssue) {
        return;
      }

      setSwapQuoteIssue(null);
      const shouldLoadQuote = Boolean(
        nexusSDK &&
          nextAmount?.gt(0) &&
          toToken &&
          (hasManualSourceSelection ||
            (immediatePrediction?.sources &&
              immediatePrediction.sources.length > 0 &&
              !immediatePrediction.missingUsd))
      );
      clearPendingSwapIntent(true, { keepQuoteRefreshing: shouldLoadQuote });
      if (shouldLoadQuote) {
        setQuoteRefreshing(true);
      }
      return;
    }

    if (panel === "send") {
      if (swapType !== "exactIn") {
        setSwapType("exactIn");
      }
      setSwapQuoteIssue(null);
      const nextAmount = parseFiatNumber(sanitizedVal);
      const isZeroOrEmpty = !nextAmount || nextAmount.lte(0);

      if (isZeroOrEmpty) {
        setAmount(sanitizedVal);
        setPredictiveQuote(null);
        setReceiveAmountIssue(null);
        setSwapQuoteIssue(null);
        setTxError(null);
        setQuoteRefreshing(false);
        clearPendingSwapIntent();
        if (!sanitizedVal) {
          setFromTokens((current) =>
            current.map((token) => ({
              ...token,
              userAmount: "",
              userAmountUsd: "",
              selectedPct: null,
            }))
          );
        }
        return;
      }

      const hasSelectedSourceToken = fromTokens.some(
        (token) => token.chainId && token.contractAddress
      );
      const shouldLoadQuote = Boolean(
        nexusSDK && nextAmount?.gt(0) && toToken && hasSelectedSourceToken
      );
      clearPendingSwapIntent(true, { keepQuoteRefreshing: shouldLoadQuote });
      if (shouldLoadQuote) {
        setQuoteRefreshing(true);
      }
    }
  };

  const handleSwapTokensUpdate = (tokens: SwapTokenOption[]) => {
    setSwapQuoteIssue(null);
    setTxError(null);
    setSourceSelectionTouched(true);
    sourcePickerDraftTouchedRef.current = true;
    setSourcePickerDraftTouched(true);
    if (swapType === "exactOut" && !hasPositiveDecimalInput(amount)) {
      setSwapType("exactIn");
      setExactOutQuoteSourceModeValue("all");
    }
    applyReceiveAmountIssue(buildReceiveAmountIssue({ sourceTokens: tokens }));
    setFromTokens(tokens);
  };

  const applySwapTypeChange = (nextType: SwapType, syncQuery: boolean) => {
    if (activeMode !== "swap" || swapStepRef.current !== "idle") return;
    if (syncQuery) {
      writeSwapParam(nextType === "exactOut" ? "out" : "in");
    }
    if (nextType === swapType) return;

    syncingIntentSourcesRef.current = false;
    maxPercentRunRef.current += 1;
    clearPendingSwapIntent();
    setAmount("");
    setReceiveMaxCalculating(false);
    setMaxCalculationPercent(null);
    setSwapQuoteIssue(null);
    setReceiveAmountIssue(null);
    setTxError(null);
    setSwapType(nextType);
    if (nextType === "exactOut") {
      resetExactOutSourcesToAuto();
      return;
    }
    clearSelectedSources();
  };

  const handleSwapTypeChange = (nextType: SwapType) => {
    applySwapTypeChange(nextType, true);
  };

  const handleToggleMultiAssetMode = useCallback(() => {
    const willEnable = !isMultiAssetMode;
    setIsMultiAssetMode(willEnable);
    if (!willEnable) {
      setFromTokens([]);
      handleSwapAmountChange("", "send");
      clearPendingSwapIntent();
    } else if (swapType === "exactOut" && amount && toToken) {
      sourcePickerDraftDepositFilterRef.current = "all";
      sourcePickerDraftTouchedRef.current = false;
      sourcePickerDraftModeRef.current = "all";
      setSourcePickerDraftTouched(false);
      setSourceSelectionTouched(false);
      setExactOutQuoteSourceModeValue("all");
      setFromTokens([]);
      setSwapQuoteIssue(null);
      setReceiveAmountIssue(null);
      setTxError(null);
      setSourceSelectionRevision((current) => current + 1);
      clearPendingSwapIntent(true, { keepQuoteRefreshing: true });
      setQuoteRefreshing(true);

      const immediatePrediction = buildImmediatePredictiveExactOutQuote(
        [],
        false
      );
      if (immediatePrediction) {
        setPredictiveQuote(immediatePrediction);
        if (immediatePrediction.sources?.length > 0) {
          setFromTokens(immediatePrediction.sources);
        }
      }
    }
    if (swapType === "exactOut") {
      invalidateExactOutQuoteForRefresh();
    }
  }, [
    isMultiAssetMode,
    swapType,
    amount,
    toToken,
    clearPendingSwapIntent,
    setExactOutQuoteSourceModeValue,
    buildImmediatePredictiveExactOutQuote,
    invalidateExactOutQuoteForRefresh,
    handleSwapAmountChange,
  ]);

  useEffect(() => {
    if (activeMode !== "swap") return;

    const handlePopState = () => {
      const nextType = readSwapParam() === "out" ? "exactOut" : "exactIn";
      applySwapTypeChange(nextType, false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeMode, swapType]);

  const handleDepositAmountChange = (val: string) => {
    syncingIntentSourcesRef.current = false;
    resetExactOutSourcesToAuto();
    maxPercentRunRef.current += 1;
    setReceiveMaxCalculating(false);
    setMaxCalculationPercent(null);
    setSwapQuoteIssue(null);
    const nextAmount = parseFiatNumber(val);
    const receiveIssue = buildReceiveAmountIssue({ inputAmount: val });
    applyReceiveAmountIssue(receiveIssue);
    const shouldLoadQuote = Boolean(
      !receiveIssue &&
        nexusSDK &&
        nextAmount?.gt(0) &&
        toToken &&
        selectedOpportunity
    );
    if (!receiveIssue) {
      clearPendingSwapIntent(true, { keepQuoteRefreshing: shouldLoadQuote });
    }
    if (shouldLoadQuote) {
      setQuoteRefreshing(true);
    }
    setAmount(val);
  };

  const handleSendAmountChange = (val: string) => {
    syncingIntentSourcesRef.current = false;
    resetExactOutSourcesToAuto();
    maxPercentRunRef.current += 1;
    setReceiveMaxCalculating(false);
    setMaxCalculationPercent(null);
    setSwapQuoteIssue(null);
    setSwapType("exactOut");
    const nextAmount = parseFiatNumber(val);
    const receiveIssue = buildReceiveAmountIssue({
      inputAmount: val,
      type: "exactOut",
    });
    applyReceiveAmountIssue(receiveIssue);
    const shouldLoadQuote = Boolean(
      !receiveIssue && nexusSDK && nextAmount?.gt(0) && toToken
    );
    if (!receiveIssue) {
      clearPendingSwapIntent(true, { keepQuoteRefreshing: shouldLoadQuote });
    }
    if (shouldLoadQuote) {
      setQuoteRefreshing(true);
    }
    setAmount(val);
  };

  const handleDepositAmountModeToggle = () => {
    syncingIntentSourcesRef.current = false;
    resetExactOutSourcesToAuto();
    const rate = getDepositTokenUsdRate();
    const parsedAmount = parseFiatNumber(amount) ?? new Decimal(0);
    if (parsedAmount.gt(0) && rate.gt(0)) {
      const converted =
        depositAmountMode === "token"
          ? parsedAmount.mul(rate).toDecimalPlaces(2)
          : parsedAmount.div(rate).toDecimalPlaces(toToken?.decimals ?? 18);
      setAmount(converted.toFixed());
    }
    clearPendingSwapIntent();
    setDepositAmountMode((current) => (current === "token" ? "usd" : "token"));
  };

  const handleDepositPercentSelect = async (pct: number) => {
    if (!toToken) return;

    syncingIntentSourcesRef.current = false;
    setTxError(null);
    setSwapQuoteIssue(null);
    const runId = ++maxPercentRunRef.current;
    lastInputMethodRef.current =
      pct === 20 ? "percent_20" : pct === 50 ? "percent_50" : "percent_max";

    if (pct !== 100) {
      const usdAmount = getTotalBalancePercentUsdAmount(pct);
      const shouldUseMaxQuoteFallback =
        depositAmountMode === "usd" && getDepositTokenUsdRate().lte(0);
      const nextAmount =
        depositAmountMode === "usd"
          ? usdAmount.toDecimalPlaces(2, Decimal.ROUND_DOWN).toFixed()
          : formatTokenAmountFromUsd(usdAmount, toToken);

      if (nextAmount && !shouldUseMaxQuoteFallback) {
        setQuoteRefreshing(false);
        setReceiveMaxCalculating(false);
        setMaxCalculationPercent(null);
        handleDepositAmountChange(nextAmount);
        return;
      }

      setQuoteRefreshing(false);
      setReceiveMaxCalculating(true);
      setMaxCalculationPercent(pct);
      try {
        await waitForNextPaint();
        const fallback = await getPercentAmountFromMaxQuote(
          toToken,
          pct,
          depositAmountMode === "usd"
        );
        if (runId !== maxPercentRunRef.current) return;
        if (!fallback) {
          setQuoteRefreshing(false);
          setReceiveMaxCalculating(false);
          setMaxCalculationPercent(null);
          setTxError(
            "Unable to calculate this percentage for the deposit asset."
          );
          return;
        }

        setDepositAmountMode(fallback.mode);
        setReceiveMaxCalculating(false);
        setMaxCalculationPercent(null);
        handleDepositAmountChange(fallback.amount);
      } catch (error: any) {
        if (runId !== maxPercentRunRef.current) return;
        console.error("Unable to calculate percentage deposit amount", error);
        setReceiveMaxCalculating(false);
        setMaxCalculationPercent(null);
        setQuoteRefreshing(false);
        if (isInsufficientSourcesError(error)) {
          setSwapQuoteIssue(buildInsufficientSourcesIssue(error));
          return;
        }
        setTxError(
          error?.message ||
            "Unable to calculate this percentage for the deposit asset."
        );
      }
      return;
    }

    setQuoteRefreshing(false);
    setReceiveMaxCalculating(true);
    setMaxCalculationPercent(100);
    try {
      await waitForNextPaint();
      const maxAmount = await getPercentAmountFromMaxQuote(
        toToken,
        100,
        depositAmountMode === "usd"
      );
      if (runId !== maxPercentRunRef.current) return;
      if (!maxAmount) {
        setReceiveMaxCalculating(false);
        setMaxCalculationPercent(null);
        setQuoteRefreshing(false);
        setTxError("No depositable amount is available for this deposit.");
        return;
      }

      setDepositAmountMode(maxAmount.mode);
      setReceiveMaxCalculating(false);
      setMaxCalculationPercent(null);
      handleDepositAmountChange(maxAmount.amount);
    } catch (error: any) {
      if (runId !== maxPercentRunRef.current) return;
      console.error("Unable to calculate max deposit amount", error);
      setReceiveMaxCalculating(false);
      setMaxCalculationPercent(null);
      setQuoteRefreshing(false);
      if (isInsufficientSourcesError(error)) {
        setSwapQuoteIssue(buildInsufficientSourcesIssue(error));
        return;
      }
      setTxError(
        error?.message || "Unable to calculate the max deposit amount."
      );
    }
  };

  const handleSendPercentSelect = (pct: number) => {
    if (!toToken) return;

    syncingIntentSourcesRef.current = false;
    setTxError(null);
    setSwapQuoteIssue(null);
    const runId = ++maxPercentRunRef.current;

    if (pct !== 100) {
      const nextAmount = getExactOutPercentAmountFromBalance(toToken, pct);

      if (nextAmount) {
        setQuoteRefreshing(false);
        setReceiveMaxCalculating(false);
        setMaxCalculationPercent(null);
        handleSendAmountChange(nextAmount);
        return;
      }

      setQuoteRefreshing(false);
      setReceiveMaxCalculating(false);
      setMaxCalculationPercent(null);
      setTxError("Unable to calculate this percentage for the send asset.");
      return;
    }

    setQuoteRefreshing(false);
    setReceiveMaxCalculating(false);
    setMaxCalculationPercent(null);
    const maxAmount = getExactOutPercentAmountFromBalance(toToken, 100);
    if (runId !== maxPercentRunRef.current) return;
    if (!maxAmount) {
      setTxError("No transferable amount is available for this asset.");
      return;
    }

    handleSendAmountChange(maxAmount);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const predictiveExactInQuote =
    predictiveQuote?.mode === "exactIn" &&
    predictiveQuote.key === getPredictiveQuoteCacheKey("swap", "exactIn")
      ? predictiveQuote
      : null;
  const predictiveExactOutQuote =
    predictiveQuote?.mode === "exactOut" &&
    predictiveQuote.key === getPredictiveQuoteCacheKey(activeMode, "exactOut")
      ? predictiveQuote
      : null;

  const hasExactInSourceBalanceExceeded = useMemo(() => {
    if (
      activeMode !== "swap" &&
      activeMode !== "send" &&
      activeMode !== "deposit"
    ) {
      return false;
    }
    if (swapType !== "exactIn") return false;
    if (fromTokens.length === 0) return false;

    return fromTokens.some((token, index) => {
      const raw =
        token.userAmount || (!isMultiAssetMode && index === 0 ? amount : "");
      if (!hasPositiveDecimalInput(raw)) return false;
      const requested = parseFiatNumber(raw);
      if (!requested || requested.lte(0)) return false;

      if (token.userAmountMode === "usd") {
        const fiatBal = parseFiatNumber(token.balanceInFiat);
        return Boolean(fiatBal && requested.gt(fiatBal));
      }

      const tokenBal = parseFiatNumber(token.balance);
      return Boolean(tokenBal && requested.gt(tokenBal));
    });
  }, [activeMode, swapType, fromTokens, isMultiAssetMode, amount]);

  const insufficientSourceIssue = hasExactInSourceBalanceExceeded
    ? {
        type: "insufficientSources" as const,
        message:
          "Cannot proceed with this swap due to insufficient balance on source",
      }
    : swapQuoteIssue?.type === "insufficientSources"
      ? swapQuoteIssue
      : receiveAmountIssue?.type === "insufficientSources"
        ? receiveAmountIssue
        : predictiveExactOutQuote?.missingUsd &&
            Number(predictiveExactOutQuote.missingUsd) > 0
          ? {
              type: "insufficientSources" as const,
              message: !isMultiAssetMode
                ? `You're $${Number(predictiveExactOutQuote.missingUsd).toFixed(2)} short. Switch to Multi-assets Mode`
                : `You're $${Number(predictiveExactOutQuote.missingUsd).toFixed(2)} short. Add Assets`,
              missingUsd: Number(predictiveExactOutQuote.missingUsd).toFixed(2),
            }
          : null;
  const blockingQuoteIssue = insufficientSourceIssue ?? receiveAmountIssue;
  const hasCurrentRunnableIntent = hasCurrentQuoteIntent;
  const hasIntentSources = Boolean((intentData?.sources ?? []).length > 0);
  const hasCurrentIntentSources = hasCurrentRunnableIntent && hasIntentSources;
  const hasCurrentExactOutPaymentIntent =
    hasCurrentRunnableIntent &&
    (hasIntentSources ||
      (isExactOutPaymentFlow && Boolean(intentData?.destination)));
  const hasPositiveRootAmount = hasPositiveDecimalInput(amount);
  const isExactOutSourcePickerDisabled =
    !toToken ||
    !hasPositiveRootAmount ||
    quoteRefreshing ||
    intentLoading ||
    previewQuoteRefreshing;
  const isExactOutRouteLoading =
    isExactOutPaymentFlow &&
    swapStep === "idle" &&
    swapType === "exactOut" &&
    Boolean(
      toToken && (receiveMaxCalculating || (amount && Number(amount) > 0))
    ) &&
    !blockingQuoteIssue &&
    !hasCurrentExactOutPaymentIntent &&
    (quoteRefreshing || intentLoading || receiveMaxCalculating);
  const isQuoteUnavailableForAutoSourceFlow =
    isExactOutPaymentFlow &&
    Boolean(hasPositiveDecimalInput(amount) && toToken) &&
    !quoteRefreshing &&
    !receiveMaxCalculating &&
    !intentLoading &&
    !blockingQuoteIssue &&
    !hasCurrentExactOutPaymentIntent;
  const hasReadySwapQuoteInput = isSwapExactOut
    ? Boolean(hasPositiveRootAmount && toToken)
    : hasReadyExactInSwapInput(fromTokens, toToken);
  const [localInitError, setLocalInitError] = useState<string | null>(null);

  useEffect(() => {
    if (
      (nexusLoading ||
        (ownerAddress &&
          (swapBalance === null || swapBalance === undefined))) &&
      !nexusInitError
    ) {
      const timer = setTimeout(() => {
        setLocalInitError(
          "Failed to initialize Nexus. Refresh and try again. If the problem persists, contact support."
        );
      }, 15000);
      return () => clearTimeout(timer);
    }
    if (!nexusLoading && swapBalance !== null && swapBalance !== undefined) {
      setLocalInitError(null);
    }
  }, [nexusLoading, swapBalance, nexusInitError, ownerAddress]);

  const effectiveNexusInitError = nexusInitError || localInitError;

  const needsWalletConnection = !ownerAddress || !nexusSDK;
  const isBalancesLoading =
    !needsWalletConnection &&
    (nexusLoading ||
      swapBalance === null ||
      swapBalance === undefined ||
      Boolean(effectiveNexusInitError));
  const isExactOutPaymentQuotePending =
    isExactOutPaymentFlow && (quoteRefreshing || intentLoading);
  const walletConnectBusy =
    walletActionPending ||
    nexusLoading ||
    isWalletConnectPending ||
    walletStatus === "connecting";
  const hasConnectWalletHandler = Boolean(
    config.onConnectWalletClick || onConnectWallet || connectors.length > 0
  );
  const walletCtaLabel = hasConnectWalletHandler
    ? walletConnectBusy
      ? "Connecting..."
      : "Connect Wallet"
    : "Connect your wallet to proceed";
  const isSwapCtaDisabled = needsWalletConnection
    ? !hasConnectWalletHandler || walletConnectBusy
    : isBalancesLoading ||
      (isSwapExactOut
        ? !hasReadySwapQuoteInput ||
          receiveMaxCalculating ||
          isExactOutPaymentQuotePending ||
          (!hasCurrentExactOutPaymentIntent &&
            isQuoteUnavailableForAutoSourceFlow) ||
          Boolean(blockingQuoteIssue)
        : !hasReadySwapQuoteInput ||
          receiveMaxCalculating ||
          quoteRefreshing ||
          Boolean(blockingQuoteIssue));
  const isDepositCtaDisabled = needsWalletConnection
    ? !hasConnectWalletHandler || walletConnectBusy
    : isBalancesLoading ||
      !hasPositiveRootAmount ||
      !toToken ||
      receiveMaxCalculating ||
      isExactOutPaymentQuotePending ||
      (!hasCurrentExactOutPaymentIntent &&
        isQuoteUnavailableForAutoSourceFlow) ||
      Boolean(blockingQuoteIssue);
  const sendNeedsRecipient = activeMode === "send" && !recipientAddress;
  const isSendCtaDisabled = needsWalletConnection
    ? !hasConnectWalletHandler || walletConnectBusy
    : isBalancesLoading ||
      !hasPositiveRootAmount ||
      !toToken ||
      hasSameOwnerSendRecipient ||
      receiveMaxCalculating ||
      (!sendNeedsRecipient &&
        (isExactOutPaymentQuotePending ||
          (!hasCurrentExactOutPaymentIntent &&
            isQuoteUnavailableForAutoSourceFlow))) ||
      Boolean(blockingQuoteIssue);
  const quoteCtaLabel = (fallback: string) => {
    if (needsWalletConnection) return walletCtaLabel;
    if (effectiveNexusInitError) return "Unable to load";
    if (isBalancesLoading) return "Fetching balances...";
    if (insufficientSourceIssue) return "Insufficient balance";
    if (receiveAmountIssue) return receiveAmountIssue.ctaLabel;
    if (receiveMaxCalculating) return "Calculating...";
    if (
      isExactOutPaymentQuotePending ||
      (!hasCurrentExactOutPaymentIntent && (quoteRefreshing || intentLoading))
    ) {
      return "Fetching quotes...";
    }
    if (isQuoteUnavailableForAutoSourceFlow) return "Quote unavailable";
    if (!hasPositiveRootAmount) return "Enter amount";
    return fallback;
  };
  const sendCtaLabel = (() => {
    if (needsWalletConnection) return walletCtaLabel;
    if (effectiveNexusInitError) return "Unable to load";
    if (isBalancesLoading) return "Fetching balances...";
    if (insufficientSourceIssue) return "Insufficient balance";
    if (receiveAmountIssue) return receiveAmountIssue.ctaLabel;
    if (!hasPositiveRootAmount) return "Enter amount";
    if (!toToken) return "Select token";
    if (hasSameOwnerSendRecipient) return "Change recipient";
    if (sendNeedsRecipient) return "Add recipient";
    return quoteCtaLabel("Review send");
  })();
  const previewIntentSourceUsdNumber = (intentData?.sources ?? []).reduce(
    (sum, source) =>
      sum.plus(parseFiatNumber((source as any).value) ?? new Decimal(0)),
    new Decimal(0)
  );
  const previewSourceUsdNumber = previewIntentSourceUsdNumber.gt(0)
    ? previewIntentSourceUsdNumber
    : fromTokens.length > 0
      ? fromTokens.reduce(
          (sum, token) =>
            sum.plus(
              getTokenUsdValue(
                token,
                swapType === "exactIn" && fromTokens.length === 1
                  ? amount
                  : undefined
              )
            ),
          new Decimal(0)
        )
      : undefined;
  const previewExactOutDestinationAmount =
    activeMode === "deposit"
      ? depositTokenAmountForQuote
      : activeMode === "send" || isSwapExactOut
        ? parseFiatNumber(amount)
        : undefined;
  const previewExactOutDestinationUsdNumber =
    activeMode === "deposit"
      ? depositUsdDecimal
      : (activeMode === "send" || isSwapExactOut) && amount && toToken
        ? getTokenUsdValue(
            {
              ...toToken,
              userAmount: amount,
              userAmountMode: "token",
            },
            amount
          )
        : undefined;
  const previewDestinationUsdNumber =
    isExactOutPaymentFlow && previewExactOutDestinationUsdNumber?.gt(0)
      ? previewExactOutDestinationUsdNumber
      : parseFiatNumber((intentData?.destination as any)?.value);
  const previewDestinationAmount =
    isExactOutPaymentFlow && previewExactOutDestinationAmount?.gt(0)
      ? previewExactOutDestinationAmount
          .toDecimalPlaces(toToken?.decimals ?? 18, Decimal.ROUND_DOWN)
          .toFixed()
      : intentToAmount;
  const previewFromAmountUsd =
    previewSourceUsdNumber && previewSourceUsdNumber.gt(0)
      ? previewSourceUsdNumber.toDecimalPlaces(6).toFixed()
      : undefined;
  const previewToAmountUsd =
    previewDestinationUsdNumber && previewDestinationUsdNumber.gt(0)
      ? previewDestinationUsdNumber.toDecimalPlaces(6).toFixed()
      : undefined;
  const previewDestinationGasFeeUsd = (() => {
    const value = getIntentDestinationGasUsdValue(intentData);
    return value && value.gt(0)
      ? value.toDecimalPlaces(6, Decimal.ROUND_DOWN).toFixed()
      : undefined;
  })();
  const shouldUseCurrentExactOutIntentSources =
    isExactOutPaymentFlow && hasCurrentQuoteIntent && hasIntentSources;
  const currentExactOutIntentSourceTokens =
    shouldUseCurrentExactOutIntentSources
      ? sortSwapTokensByUsdDesc(
          (intentData?.sources ?? [])
            .map(buildIntentSourceToken)
            .filter(
              (token) =>
                hasPositiveDecimalInput(token.userAmount) ||
                hasPositiveDecimalInput(token.userAmountUsd)
            )
        )
      : [];
  const resolvedToToken =
    toToken ??
    (activeMode === "deposit" && selectedOpportunity
      ? toTokenFromOpportunity(selectedOpportunity)
      : undefined);
  const toTokenWithFetchedBalance =
    resolvedToToken && destinationBalance
      ? { ...resolvedToToken, balance: destinationBalance }
      : resolvedToToken;
  const predictiveDisconnectedReceiveQuote = useMemo(() => {
    if (!needsWalletConnection || !toToken) return undefined;

    let totalSourceUsd = new Decimal(0);
    if (fromTokens.length > 0) {
      for (const t of fromTokens) {
        const amt = parseFiatNumber(t.userAmount);
        if (amt && amt.gt(0)) {
          const rate = getTokenUsdRate(t);
          totalSourceUsd = totalSourceUsd.plus(amt.mul(rate));
        }
      }
    }
    if (totalSourceUsd.lte(0)) {
      const inputNum = parseFiatNumber(amount);
      if (inputNum && inputNum.gt(0) && fromTokens[0]) {
        const rate = getTokenUsdRate(fromTokens[0]);
        totalSourceUsd = inputNum.mul(rate);
      }
    }

    if (totalSourceUsd.lte(0)) return undefined;

    const destRate = getTokenUsdRate(toToken);
    const receiveAmount = destRate.gt(0)
      ? totalSourceUsd.div(destRate)
      : new Decimal(0);

    const formattedAmount = receiveAmount.gt(0)
      ? receiveAmount
          .toDecimalPlaces(
            Math.min(toToken.decimals ?? 18, 6),
            Decimal.ROUND_DOWN
          )
          .toFixed()
      : "0";
    const formattedUsd = totalSourceUsd.gt(0) ? totalSourceUsd.toFixed(2) : "0";

    return {
      toAmount: formattedAmount,
      toUsd: formattedUsd,
    };
  }, [needsWalletConnection, amount, toToken, fromTokens, getTokenUsdRate]);

  const idleReceiveQuoteAmount = needsWalletConnection
    ? predictiveDisconnectedReceiveQuote?.toAmount
    : activeMode === "swap" && swapType === "exactIn"
      ? (intentToAmount ?? predictiveExactInQuote?.toAmount)
      : undefined;

  const idleReceiveQuoteUsd = needsWalletConnection
    ? predictiveDisconnectedReceiveQuote?.toUsd
    : activeMode === "swap" && swapType === "exactIn"
      ? (previewToAmountUsd ?? predictiveExactInQuote?.toUsd)
      : previewToAmountUsd;
  const exactOutDestinationCoverage = getExactOutDestinationBalanceCoverage({
    requestedAmount: previewExactOutDestinationAmount,
    requestedUsd: previewExactOutDestinationUsdNumber,
    producedAmount: hasIntentSources
      ? parseFiatNumber(intentData?.destination?.amount)
      : undefined,
    producedUsd: hasIntentSources
      ? parseFiatNumber(intentData?.destination?.value)
      : undefined,
    token: toTokenWithFetchedBalance,
  });
  const destinationBalanceDisplayToken = buildDestinationBalanceDisplayToken(
    exactOutDestinationCoverage,
    toTokenWithFetchedBalance
  );
  const shouldShowPredictiveExactOutDisplay =
    isExactOutPaymentFlow &&
    (quoteRefreshing || intentLoading) &&
    !hasIntentSources &&
    Boolean(
      predictiveExactOutQuote &&
        ((predictiveExactOutQuote.sources?.length ?? 0) > 0 ||
          destinationBalanceDisplayToken)
    );
  const baseDisplayFromTokens = (() => {
    if (!isMultiAssetMode) {
      const calculatedSources =
        predictiveExactOutQuote?.sources ??
        (shouldUseCurrentExactOutIntentSources
          ? currentExactOutIntentSourceTokens
          : []);
      const primaryToken =
        (sourceSelectionTouched ? fromTokens[0] : undefined) ??
        calculatedSources[0] ??
        fromTokens[0];
      if (primaryToken) {
        const match = calculatedSources.find(
          (s) =>
            getTokenSelectionKey(s) === getTokenSelectionKey(primaryToken) ||
            isSameTokenChainPair(s, primaryToken) ||
            (s.symbol &&
              primaryToken.symbol &&
              s.symbol.toUpperCase() === primaryToken.symbol.toUpperCase() &&
              (s.chainId === primaryToken.chainId ||
                !s.chainId ||
                !primaryToken.chainId))
        );
        let userAmount = match?.userAmount || primaryToken.userAmount || "";
        let userAmountUsd =
          match?.userAmountUsd || primaryToken.userAmountUsd || "";
        if (!userAmount && hasPositiveDecimalInput(amount)) {
          const destRate = getTokenUsdRate(toToken);
          const sourceRate = getTokenUsdRate(primaryToken);
          const destAmt = parseFiatNumber(amount) ?? new Decimal(0);
          const destUsd = destAmt.mul(destRate.gt(0) ? destRate : 1);
          const targetSourceUsd = getPredictiveExactOutSourceTargetUsd(destUsd);
          if (sourceRate.gt(0)) {
            userAmount = targetSourceUsd
              .div(sourceRate)
              .toDecimalPlaces(
                Math.max(0, primaryToken.decimals || 18),
                Decimal.ROUND_DOWN
              )
              .toFixed();
            userAmountUsd = targetSourceUsd.toFixed(2);
          }
        }
        return [
          {
            ...primaryToken,
            userAmount,
            userAmountMode:
              match?.userAmountMode || primaryToken.userAmountMode || "token",
            userAmountUsd,
          },
        ];
      }
      return [];
    }
    if (isExactOutPaymentFlow) {
      const calculatedSources =
        predictiveExactOutQuote?.sources ??
        (shouldUseCurrentExactOutIntentSources
          ? currentExactOutIntentSourceTokens
          : []);

      if (fromTokens.length > 0) {
        const calculatedMap = new Map<string, SwapTokenOption>();
        for (const s of calculatedSources) {
          calculatedMap.set(getTokenSelectionKey(s), s);
        }

        const mappedFromTokens = fromTokens.map((token) => {
          const match =
            calculatedMap.get(getTokenSelectionKey(token)) ??
            calculatedSources.find(
              (s) =>
                isSameTokenChainPair(s, token) ||
                (s.symbol &&
                  token.symbol &&
                  s.symbol.toUpperCase() === token.symbol.toUpperCase() &&
                  (s.chainId === token.chainId || !s.chainId || !token.chainId))
            );

          if (match) {
            return {
              ...token,
              userAmount: match.userAmount || token.userAmount || "",
              userAmountMode:
                match.userAmountMode || token.userAmountMode || "token",
              userAmountUsd: match.userAmountUsd || token.userAmountUsd || "",
            };
          }

          return {
            ...token,
            userAmount: token.userAmount || "",
            userAmountMode: token.userAmountMode || "token",
            userAmountUsd: token.userAmountUsd || "",
          };
        });

        const existingKeys = new Set(fromTokens.map(getTokenSelectionKey));
        const extraCalculated = calculatedSources.filter(
          (s) => !existingKeys.has(getTokenSelectionKey(s))
        );

        return [...mappedFromTokens, ...extraCalculated];
      }

      if (calculatedSources.length > 0) {
        return calculatedSources;
      }
      return excludeSwapExactOutDestinationTokens(
        shouldUseCurrentExactOutIntentSources
          ? currentExactOutIntentSourceTokens
          : shouldShowPredictiveExactOutDisplay
            ? (predictiveExactOutQuote?.sources ?? fromTokens)
            : fromTokens
      );
    }
    return fromTokens;
  })();
  const displayFromTokens = (() => {
    if (!destinationBalanceDisplayToken || !isExactOutPaymentFlow) {
      return mergeDisplaySourceTokens(
        sourceSelectionTouched
          ? baseDisplayFromTokens
          : sortDisplaySourcesByBalanceUsdDesc(baseDisplayFromTokens)
      );
    }

    const destinationKey = getTokenSelectionKey(destinationBalanceDisplayToken);
    let replacedEmptyDestinationToken = false;
    const tokens = baseDisplayFromTokens.map((token) => {
      const isDestinationToken = getTokenSelectionKey(token) === destinationKey;
      if (
        isDestinationToken &&
        !hasPositiveDecimalInput(token.userAmount) &&
        !hasPositiveDecimalInput(token.userAmountUsd)
      ) {
        replacedEmptyDestinationToken = true;
        return destinationBalanceDisplayToken;
      }
      return token;
    });

    const displayTokens = replacedEmptyDestinationToken
      ? tokens
      : [...tokens, destinationBalanceDisplayToken];
    return mergeDisplaySourceTokens(
      sourceSelectionTouched
        ? displayTokens
        : sortDisplaySourcesByBalanceUsdDesc(displayTokens)
    );
  })();
  const currentTokenVisualSources = useMemo<TokenVisualSources>(
    () => ({
      balanceAssets: swapBalance,
      tokens: [
        ...displayFromTokens,
        ...(toTokenWithFetchedBalance ? [toTokenWithFetchedBalance] : []),
      ],
    }),
    [displayFromTokens, swapBalance, toTokenWithFetchedBalance]
  );
  const displayExactOutRouteLoading =
    isExactOutRouteLoading && !shouldShowPredictiveExactOutDisplay;
  const totalSwapBalanceUsd = getSwapBalanceTotalUsd()
    .toDecimalPlaces(2)
    .toFixed();
  const sendAmountUsd =
    amount && toToken
      ? getTokenUsdValue(
          {
            ...toToken,
            userAmount: amount,
            userAmountMode: "token",
          },
          amount
        ).toNumber()
      : 0;
  const exactOutRequiredUsdAmount = (() => {
    if (!isExactOutPaymentFlow) return undefined;
    const requiredFundingUsd = getExactOutRequiredFundingUsd();
    if (isSwapExactOut && requiredFundingUsd?.gt(0)) {
      return requiredFundingUsd;
    }
    const missingUsd = parseFiatNumber(insufficientSourceIssue?.missingUsd);
    if (missingUsd?.gt(0)) {
      return getExactOutAvailableSourceUsd().plus(missingUsd);
    }
    if (requiredFundingUsd?.gt(0)) return requiredFundingUsd;
    return sendAmountUsd > 0 ? new Decimal(sendAmountUsd) : undefined;
  })();
  const exactOutRequiredUsdDisplay = exactOutRequiredUsdAmount
    ?.toDecimalPlaces(2)
    .toFixed();
  const exactOutBalanceSourceTokens = isSwapExactOut
    ? getExactOutSourceTokens("all")
    : [];
  const exactOutAvailableBalanceUsd = isSwapExactOut
    ? getExactOutTotalSourceBalanceUsd()
    : new Decimal(0);
  const exactOutIdleSourceTokens =
    swapType === "exactOut" &&
    !hasPositiveDecimalInput(amount) &&
    fromTokens.length === 0
      ? []
      : displayFromTokens;
  const exactOutShowQuotedAmounts = Boolean(
    shouldShowPredictiveExactOutDisplay ||
      (hasCurrentExactOutPaymentIntent &&
        (hasIntentSources || destinationBalanceDisplayToken))
  );
  const exactOutReceiveUsd =
    previewToAmountUsd ??
    predictiveExactOutQuote?.toUsd ??
    (sendAmountUsd > 0 ? sendAmountUsd.toFixed(2) : "0");
  const isIdleSwapQuoteLoading =
    activeMode === "swap" &&
    swapStep === "idle" &&
    (quoteRefreshing || intentLoading);
  const isReceiveAmountLoading =
    !needsWalletConnection &&
    (receiveMaxCalculating ||
      (isIdleSwapQuoteLoading &&
        swapType === "exactIn" &&
        !idleReceiveQuoteAmount));
  const isReceiveUsdLoading =
    !needsWalletConnection &&
    (receiveMaxCalculating ||
      (isIdleSwapQuoteLoading &&
        swapType === "exactIn" &&
        !idleReceiveQuoteUsd));
  const hasQuoteRefreshCountdown =
    (activeMode === "swap" ||
      activeMode === "deposit" ||
      activeMode === "send") &&
    (hasCurrentQuoteIntent || quoteRefreshing || previewQuoteRefreshing) &&
    (swapStep === "idle" || swapStep === "preview-intent");
  const isRecipientDrawerClosing = closingDrawerStep === "enter-recipient";
  const isSwapAssetDrawerClosing = closingDrawerStep === "choose-swap-asset";
  const isReceiveAssetDrawerClosing =
    closingDrawerStep === "choose-receive-asset";
  const isDrawerOverlayActive =
    swapStep === "choose-swap-asset" ||
    swapStep === "choose-receive-asset" ||
    swapStep === "enter-recipient" ||
    closingDrawerStep !== null;
  const shouldUseListMinHeight =
    swapStep === "choose-swap-asset" ||
    swapStep === "choose-receive-asset" ||
    closingDrawerStep === "choose-swap-asset" ||
    closingDrawerStep === "choose-receive-asset";
  const shouldUseMeasuredRootHeight =
    (shouldUseListMinHeight ||
      swapStep === "history" ||
      isRootHeightLockedForTransition) &&
    hasMeasuredRootContent &&
    rootContentHeight;

  const widgetContent = (
    <div
      className={className}
      data-nexus-one-root
      style={{
        backgroundColor: "#FFFFFF",
        backgroundImage: "none",
        backgroundPosition: "center",
        backgroundPositionX: "center",
        backgroundPositionY: "center",
        backgroundSize: "cover",
        borderRadius: "32px",
        boxShadow: "0 0 10.4px 0 rgba(0, 0, 0, 0.10)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        fontFeatureSettings: '"tnum"',
        fontSize: "12px",
        fontSynthesis: "none",
        fontVariantNumeric: "tabular-nums",
        gap: "16px",
        height: shouldUseMeasuredRootHeight
          ? `${rootContentHeight + 24}px`
          : "fit-content",
        maxHeight: isDrawerOverlayActive ? "90dvh" : undefined,
        minHeight: shouldUseListMinHeight
          ? NEXUS_ONE_LIST_MIN_HEIGHT
          : undefined,
        lineHeight: "17px",
        margin: "auto",
        overflowX: isDrawerOverlayActive ? "hidden" : "clip",
        overflowY: isDrawerOverlayActive ? "hidden" : "visible",
        overscrollBehavior: isDrawerOverlayActive ? "contain" : undefined,
        padding: "12px",
        scrollbarColor: `${theme.colors.textEmpty} transparent`,
        scrollbarWidth: "thin",
        position: "relative",
        transition: (() => {
          const transitions = [];
          if (hasMeasuredRootContent) {
            transitions.push(
              `height ${ROOT_HEIGHT_TRANSITION_MS}ms cubic-bezier(0.2, 0, 0, 1)`
            );
          }
          transitions.push("box-shadow 0.5s ease-in-out");
          return transitions.join(", ");
        })(),
        willChange: "height",
        width: "100%",
        maxWidth: "512px",
        minWidth: "280px",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      <div
        ref={rootContentRef}
        style={{
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          gap: "12px",
          minHeight: 0,
          width: "100%",
        }}
      >
        {/* Header row: in idle mode show Multi-assets mode toggle */}
        {activeMode === "swap" &&
        [
          "idle",
          "choose-swap-asset",
          "choose-receive-asset",
          "enter-recipient",
        ].includes(swapStep) &&
        !canGoBack ? (
          <div
            style={{
              alignItems: "center",
              boxSizing: "border-box",
              display: "flex",
              flexShrink: 0,
              justifyContent: "space-between",
              padding: "4px 6px 0 6px",
              width: "100%",
              position: "relative",
              zIndex: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  color: "#1F1F1F",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "13px",
                  fontStyle: "normal",
                  fontWeight: 500,
                  lineHeight: "normal",
                }}
              >
                Multi-assets Mode
              </span>
              <button
                aria-label="Toggle multi-assets mode"
                onClick={handleToggleMultiAssetMode}
                style={{
                  alignItems: "center",
                  backgroundColor: isMultiAssetMode ? "#1F1F1F" : "#D9D9DE",
                  border: "none",
                  borderRadius: "999px",
                  cursor: "pointer",
                  display: "flex",
                  height: "20px",
                  outline: "none",
                  padding: "2px",
                  transition: "background-color 0.2s ease",
                  width: "36px",
                }}
                type="button"
              >
                <div
                  style={{
                    backgroundColor: "#FFF",
                    borderRadius: "999px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                    height: "16px",
                    transform: isMultiAssetMode
                      ? "translateX(16px)"
                      : "translateX(0px)",
                    transition: "transform 0.2s ease",
                    width: "16px",
                  }}
                />
              </button>
            </div>

            {/* Right: Countdown Timer + History toggle icon */}
            <div
              style={{
                alignItems: "center",
                display: "flex",
                gap: "8px",
              }}
            >
              {hasQuoteRefreshCountdown && (
                <QuoteRefreshCountdown
                  isRefreshing={quoteRefreshing || previewQuoteRefreshing}
                  progress={quoteRefreshProgress}
                  secondsRemaining={quoteRefreshSecondsRemaining}
                />
              )}
              <button
                aria-label="View transaction history"
                onClick={handleHistoryToggle}
                style={{
                  alignItems: "center",
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: "999px",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  display: "flex",
                  flexShrink: 0,
                  height: "28px",
                  justifyContent: "center",
                  padding: 0,
                  width: "28px",
                  color: "#1F1F1F",
                }}
                type="button"
              >
                <svg
                  fill="none"
                  height="16"
                  style={{ width: "16px", height: "16px", flexShrink: 0 }}
                  viewBox="0 0 16 16"
                  width="16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 4V8L10.5 9.5"
                    stroke="#1F1F1F"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M14 8C14 11.314 11.314 14 8 14C4.686 14 2 11.314 2 8C2 4.686 4.686 2 8 2C10.196 2 12.117 3.179 13.163 4.936"
                    stroke="#1F1F1F"
                    strokeLinecap="round"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M13.5 2V5H10.5"
                    stroke="#1F1F1F"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              alignItems: "center",
              boxSizing: "border-box",
              display: "flex",
              flexShrink: 0,
              justifyContent: "space-between",
              padding: 0,
              width: "100%",
              position: "relative",
              zIndex: 10,
            }}
          >
            <div className="flex items-center gap-x-2">
              {canGoBack && (
                <button
                  aria-label="Back"
                  onClick={handleBack}
                  style={{
                    alignItems: "center",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    padding: "4px",
                    marginRight: "4px",
                  }}
                >
                  <ArrowLeft
                    className="w-5 h-5"
                    style={{ color: theme.colors.textStrong }}
                  />
                </button>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    boxSizing: "border-box",
                    color: theme.colors.text,
                    ...theme.typography.headingPanel,
                  }}
                >
                  {getTitle()}
                </div>
              </div>

              {/* Sub-screen asset counts */}
              {!isTitleCentered() &&
                activeMode === "swap" &&
                swapStep === "choose-swap-asset" &&
                swapType === "exactIn" && (
                  <span
                    style={{
                      color: theme.colors.muted,
                      fontFamily: theme.fonts.sans,
                      fontSize: "14px",
                      marginLeft: "7px",
                    }}
                  >
                    {fromTokens.length} asset(s) selected
                  </span>
                )}
            </div>

            {/* Right side icons */}
            <div
              style={{
                alignItems: "center",
                boxSizing: "border-box",
                display: "flex",
                gap: "9px",
              }}
            >
              {hasQuoteRefreshCountdown && (
                <QuoteRefreshCountdown
                  isRefreshing={quoteRefreshing || previewQuoteRefreshing}
                  progress={quoteRefreshProgress}
                  secondsRemaining={quoteRefreshSecondsRemaining}
                />
              )}
              {swapStep !== "history" && (
                <button
                  aria-label="View transaction history"
                  onClick={handleHistoryToggle}
                  style={{
                    alignItems: "center",
                    backgroundColor:
                      theme.primitives.iconButton.backgroundColor,
                    borderColor: theme.primitives.iconButton.borderColor,
                    borderRadius: theme.radius.iconButton,
                    borderStyle: "solid",
                    borderWidth: "1px",
                    boxShadow: theme.primitives.iconButton.boxShadow,
                    boxSizing: "border-box",
                    display: "flex",
                    flexShrink: 0,
                    height: "28px",
                    justifyContent: "center",
                    width: "28px",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <svg
                    fill="none"
                    height="14"
                    style={{ width: "14px", height: "14px", flexShrink: 0 }}
                    viewBox="0 0 16 16"
                    width="14"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 4V8L10.5 9.5"
                      stroke={theme.colors.textStrong}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.4"
                    />
                    <path
                      d="M14 8C14 11.314 11.314 14 8 14C4.686 14 2 11.314 2 8C2 4.686 4.686 2 8 2C10.196 2 12.117 3.179 13.163 4.936"
                      stroke={theme.colors.textStrong}
                      strokeLinecap="round"
                      strokeWidth="1.4"
                    />
                    <path
                      d="M13.5 2V5H10.5"
                      stroke={theme.colors.textStrong}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.4"
                    />
                  </svg>
                </button>
              )}
              {showCloseButton && (
                <button
                  aria-label="Close"
                  onClick={handleClose}
                  style={{
                    alignItems: "center",
                    backgroundColor:
                      theme.primitives.iconButton.backgroundColor,
                    borderColor: theme.primitives.iconButton.borderColor,
                    borderRadius: theme.radius.iconButton,
                    borderStyle: "solid",
                    borderWidth: "1px",
                    boxShadow: theme.primitives.iconButton.boxShadow,
                    boxSizing: "border-box",
                    cursor: "pointer",
                    display: "flex",
                    flexShrink: 0,
                    height: "28px",
                    justifyContent: "center",
                    padding: 0,
                    width: "28px",
                  }}
                >
                  <svg
                    fill="none"
                    height="14"
                    style={{ width: "14px", height: "14px", flexShrink: 0 }}
                    viewBox="0 0 16 16"
                    width="14"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 4L12 12M12 4L4 12"
                      stroke={theme.colors.textStrong}
                      strokeLinecap="round"
                      strokeWidth="1.4"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Main content area */}
        {/* ------------------------------------------------------------------ */}
        <div
          style={{
            boxSizing: "border-box",
            display: "flex",
            flex: 1,
            flexDirection: "column",
            gap: "7px",
            minHeight: 0,
            padding: 0,
            width: "100%",
          }}
        >
          {/* =============================================================== */}
          {/* SHARED SUB-SCREENS (non-drawer panels)                        */}
          {/* =============================================================== */}
          {(activeMode === "swap" ||
            activeMode === "send" ||
            activeMode === "deposit") &&
            swapStep !== "idle" &&
            swapStep !== "choose-swap-asset" &&
            swapStep !== "choose-receive-asset" &&
            swapStep !== "enter-recipient" && (
              <>
                {/* Panel: preview. */}
                {swapStep === "preview-intent" && (
                  <div
                    className="w-full"
                    style={{
                      maxHeight: "calc(90dvh - 66px)",
                      minHeight: 0,
                      overflowX: "hidden",
                      overflowY: isPreviewTransitioning ? "hidden" : "auto",
                      overscrollBehavior: "contain",
                      scrollbarColor: "#C8C8C7 transparent",
                      scrollbarWidth: "thin",
                      width: "100%",
                    }}
                  >
                    <SwapIntentPreview
                      activeMode={activeMode}
                      destinationGasFeeUsd={previewDestinationGasFeeUsd}
                      estimatedTime="10s"
                      explorerUrls={explorerUrls}
                      fromAmount={amount}
                      fromAmountUsd={previewFromAmountUsd}
                      fromToken={fromTokens[0]}
                      fromTokens={fromTokens}
                      intentData={intentData}
                      isLoading={intentLoading}
                      isRefreshing={previewQuoteRefreshing}
                      mode={activeMode}
                      onAccept={handleSwapAccept}
                      onReject={() => {
                        clearPendingSwapIntent();
                        setSwapStep("idle");
                      }}
                      onTransitionChange={setIsPreviewTransitioning}
                      opportunity={selectedOpportunity}
                      recipientAddress={transferRecipientAddress}
                      steps={steps}
                      swapBalances={swapBalance}
                      swapType={swapType}
                      toAmount={previewDestinationAmount}
                      toAmountTokens={
                        previewDestinationAmount
                          ? `${previewDestinationAmount}`
                          : undefined
                      }
                      toAmountUsd={previewToAmountUsd}
                      toToken={toTokenWithFetchedBalance}
                      totalFeeUsd={intentFeeUsd}
                    />
                  </div>
                )}

                {swapStep === "progress" && (
                  <NexusOneProgressScreen
                    failedStep={failedProgressStep}
                    fromAmountUsd={previewFromAmountUsd}
                    fromTokens={fromTokens}
                    intentData={intentData}
                    mode={activeMode}
                    opportunity={selectedOpportunity}
                    progressEvents={progressEvents}
                    rawSteps={rawPlanSteps}
                    recipientAddress={transferRecipientAddress}
                    steps={steps}
                    swapBalances={swapBalance}
                    swapType={swapType}
                    toAmount={previewDestinationAmount}
                    toAmountUsd={previewToAmountUsd}
                    toToken={toTokenWithFetchedBalance}
                    totalFeeUsd={intentFeeUsd}
                  />
                )}

                {(swapStep === "success" || swapStep === "failed") &&
                  currentSwapEntry && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                      <SwapReceiptPanel
                        entry={currentSwapEntry}
                        onDone={
                          swapStep === "failed"
                            ? handleFailureBack
                            : handleReset
                        }
                        visualSources={currentTokenVisualSources}
                      />
                    </div>
                  )}
              </>
            )}

          {/* =============================================================== */}
          {/* HISTORY SCREEN                                                   */}
          {/* =============================================================== */}
          {swapStep === "history" && (
            <SwapHistoryPanel
              entries={swapHistory}
              now={historyNow}
              visualSources={currentTokenVisualSources}
            />
          )}

          {/* =============================================================== */}
          {/* SWAP IDLE SCREEN                                                 */}
          {/* =============================================================== */}
          {activeMode === "swap" &&
            [
              "idle",
              "choose-swap-asset",
              "choose-receive-asset",
              "enter-recipient",
            ].includes(swapStep) && (
              <>
                <SwapIdleForm
                  amount={amount}
                  defaultRecipientAddress={defaultRecipientAddress}
                  destinationGasFeeUsd={previewDestinationGasFeeUsd}
                  fromTokens={
                    swapType === "exactOut"
                      ? exactOutIdleSourceTokens
                      : fromTokens
                  }
                  getTokenUsdRate={(t) => getTokenUsdRate(t).toNumber()}
                  intentData={intentData}
                  isLoadingBalances={isBalancesLoading}
                  isMultiAssetMode={isMultiAssetMode}
                  isQuoteLoading={isIdleSwapQuoteLoading}
                  isReceiveAmountLoading={isReceiveAmountLoading}
                  isReceiveUsdLoading={isReceiveUsdLoading}
                  missingUsd={insufficientSourceIssue?.missingUsd}
                  needsWalletConnection={needsWalletConnection}
                  onAmountChange={(val, panel) => {
                    handleSwapAmountChange(val, panel);
                  }}
                  onOpenDestPicker={() =>
                    openDrawerStep("choose-receive-asset")
                  }
                  onOpenRecipientPicker={handleOpenRecipientEditor}
                  onOpenSourcePicker={(index) => {
                    setEditingAssetIndex(index ?? null);
                    beginSourcePickerEdit();
                    openDrawerStep("choose-swap-asset");
                  }}
                  onRestoreAuto={handleAutoExactOut}
                  onSetPercent={handleSendPercentSelect}
                  onToggleMultiAssetMode={handleToggleMultiAssetMode}
                  onUpdateTokens={handleSwapTokensUpdate}
                  receiveAmountIssue={receiveAmountIssue}
                  receiveQuoteAmount={idleReceiveQuoteAmount}
                  receiveQuoteUsd={idleReceiveQuoteUsd}
                  recipientAddress={effectiveRecipientAddress}
                  showRestoreAuto={
                    isExactOutPaymentFlow &&
                    (sourceSelectionTouched ||
                      exactOutQuoteSourceModeRef.current === "selected")
                  }
                  sourceRouteMessage={insufficientSourceIssue?.message}
                  sourceRouteStatus={
                    insufficientSourceIssue
                      ? "insufficient"
                      : isReceiveAmountLoading || displayExactOutRouteLoading
                        ? "loading"
                        : undefined
                  }
                  swapType={swapType}
                  toToken={toTokenWithFetchedBalance}
                  totalBalance={totalSwapBalanceUsd}
                  totalFeeUsd={intentFeeUsd}
                  usdValue={
                    swapType === "exactOut"
                      ? exactOutReceiveUsd
                      : needsWalletConnection && fromTokens[0] && amount
                        ? (() => {
                            const inputNum = parseFiatNumber(amount);
                            if (!inputNum || inputNum.lte(0)) return "";
                            const rate = getTokenUsdRate(fromTokens[0]);
                            const val = inputNum.mul(rate);
                            return val.gt(0) ? val.toFixed(2) : "";
                          })()
                        : amount && usdValue > 0
                          ? usdValue.toFixed(2)
                          : ""
                  }
                />

                {effectiveNexusInitError && (
                  <StatusAlert message={effectiveNexusInitError} type="error" />
                )}

                {txError && !blockingQuoteIssue && (
                  <StatusAlert message={txError} type="error" />
                )}

                {/* CTA Button */}
                <div
                  style={{
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    marginTop: "4px",
                    width: "100%",
                  }}
                >
                  <button
                    disabled={isSwapCtaDisabled}
                    onClick={() => {
                      if (needsWalletConnection) {
                        void handleConnectWallet({ reportConversion: true });
                        return;
                      }
                      void handleEnterPreview();
                    }}
                    style={{
                      alignItems: "center",
                      backgroundColor: effectiveNexusInitError
                        ? "#FCEEED"
                        : isSwapCtaDisabled
                          ? "#CBCBCB"
                          : "#1F1F1F",
                      border: effectiveNexusInitError
                        ? "1px solid #F7C4C1"
                        : "none",
                      borderRadius: "32px",
                      boxSizing: "border-box",
                      color: effectiveNexusInitError ? "#D32F2F" : "#FFFFFE",
                      cursor: isSwapCtaDisabled ? "not-allowed" : "pointer",
                      display: "flex",
                      flexShrink: 0,
                      fontFamily: '"Geist", system-ui, sans-serif',
                      fontSize: "16px",
                      fontWeight: 500,
                      justifyContent: "center",
                      letterSpacing: "-0.08px",
                      lineHeight: "20px",
                      padding: "16px 20px",
                      position: "relative",
                      textAlign: "center",
                      textTransform: "capitalize",
                      transition: "background-color 0.2s ease",
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      width: "100%",
                    }}
                    type="button"
                  >
                    <span
                      style={{
                        alignItems: "center",
                        display: "inline-flex",
                        gap: "8px",
                        justifyContent: "center",
                        position: "relative",
                      }}
                    >
                      {!effectiveNexusInitError &&
                      ((!needsWalletConnection && isBalancesLoading) ||
                        quoteRefreshing ||
                        receiveMaxCalculating ||
                        (needsWalletConnection && walletConnectBusy)) ? (
                        <Loader2
                          className="animate-spin"
                          style={{
                            color: "#FFFFFE",
                            height: "16px",
                            width: "16px",
                          }}
                        />
                      ) : null}
                      <span>
                        {quoteCtaLabel(
                          isSwapExactOut ? "Pay & Swap" : "Approve & Swap"
                        )}
                      </span>
                    </span>
                  </button>
                </div>
              </>
            )}

          {/* =============================================================== */}
          {/* DEPOSIT MODE LAYOUT                                              */}
          {/* =============================================================== */}
          {activeMode === "deposit" &&
            [
              "idle",
              "choose-swap-asset",
              "choose-receive-asset",
              "enter-recipient",
            ].includes(swapStep) && (
              <>
                {selectedOpportunity && (
                  <>
                    <DepositIdleForm
                      amount={amount}
                      amountMode={depositAmountMode}
                      calculatingPercent={maxCalculationPercent}
                      fromTokens={displayFromTokens}
                      isCalculatingMax={receiveMaxCalculating}
                      isQuoteRefreshing={
                        !hasCurrentIntentSources &&
                        (quoteRefreshing || intentLoading)
                      }
                      isSourcePickerDisabled={
                        !toTokenWithFetchedBalance || !hasPositiveRootAmount
                      }
                      needsWalletConnection={needsWalletConnection}
                      onAmountChange={handleDepositAmountChange}
                      onAmountModeToggle={handleDepositAmountModeToggle}
                      onOpenSourcePicker={() => {
                        if (needsWalletConnection) {
                          void handleConnectWallet();
                          return;
                        }
                        beginSourcePickerEdit();
                        openDrawerStep("choose-swap-asset");
                      }}
                      onSetPercent={handleDepositPercentSelect}
                      routeMessage={insufficientSourceIssue?.message}
                      routeStatus={
                        insufficientSourceIssue
                          ? "insufficient"
                          : displayExactOutRouteLoading
                            ? "loading"
                            : undefined
                      }
                      showAutoBadge={!sourceSelectionTouched}
                      tokenValue={depositTokenDisplay}
                      toToken={toTokenWithFetchedBalance}
                      totalBalance={totalSwapBalanceUsd}
                      usdValue={depositUsdDisplay}
                    />

                    {effectiveNexusInitError && (
                      <StatusAlert
                        message={effectiveNexusInitError}
                        type="error"
                      />
                    )}

                    {txError && !blockingQuoteIssue && (
                      <StatusAlert message={txError} type="error" />
                    )}

                    <div
                      style={{
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <button
                        disabled={isDepositCtaDisabled}
                        onClick={() => {
                          if (needsWalletConnection) {
                            void handleConnectWallet({
                              reportConversion: true,
                            });
                            return;
                          }
                          void handleEnterPreview();
                        }}
                        style={{
                          alignItems: "center",
                          backgroundColor:
                            effectiveNexusInitError || blockingQuoteIssue
                              ? "#FCEEED"
                              : isDepositCtaDisabled
                                ? "#CBCBCB"
                                : theme.colors.text,
                          border:
                            effectiveNexusInitError || blockingQuoteIssue
                              ? "1px solid #F7C4C1"
                              : "none",
                          borderRadius:
                            effectiveNexusInitError || blockingQuoteIssue
                              ? "4px"
                              : theme.radius.primaryButton,
                          boxShadow:
                            blockingQuoteIssue ||
                            isDepositCtaDisabled ||
                            effectiveNexusInitError
                              ? "none"
                              : theme.shadows.primaryButton,
                          boxSizing: "border-box",
                          display: "flex",
                          flexShrink: 0,
                          gap: "7px",
                          height: "40px",
                          justifyContent: "center",
                          paddingInline: "16px",
                          cursor: isDepositCtaDisabled
                            ? "not-allowed"
                            : "pointer",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                          width: "100%",
                        }}
                      >
                        {blockingQuoteIssue ? (
                          <AlertCircle
                            style={{
                              color: "#D32F2F",
                              height: "14px",
                              width: "14px",
                            }}
                          />
                        ) : !effectiveNexusInitError &&
                          ((needsWalletConnection && walletConnectBusy) ||
                            (!hasCurrentIntentSources &&
                              (quoteRefreshing || intentLoading)) ||
                            receiveMaxCalculating) ? (
                          <Loader2
                            className="animate-spin"
                            style={{
                              color: isDepositCtaDisabled
                                ? theme.colors.muted
                                : theme.colors.surface,
                              height: "14px",
                              width: "14px",
                            }}
                          />
                        ) : null}
                        <div
                          style={{
                            boxSizing: "border-box",
                            color:
                              effectiveNexusInitError || blockingQuoteIssue
                                ? "#D32F2F"
                                : isDepositCtaDisabled
                                  ? theme.colors.muted
                                  : theme.colors.surface,
                            fontFamily: theme.fonts.sans,
                            fontSize: blockingQuoteIssue ? "13px" : "14px",
                            fontWeight: 500,
                            lineHeight: "21px",
                          }}
                        >
                          {quoteCtaLabel("Review deposit")}
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

          {/* =============================================================== */}
          {/* SEND MODE — recipient first, then amount, then asset         */}
          {/* =============================================================== */}
          {activeMode === "send" &&
            [
              "idle",
              "choose-swap-asset",
              "choose-receive-asset",
              "enter-recipient",
            ].includes(swapStep) && (
              <>
                <SendIdleForm
                  amount={amount}
                  calculatingPercent={maxCalculationPercent}
                  fromTokens={displayFromTokens}
                  isCalculatingMax={receiveMaxCalculating}
                  isQuoteRefreshing={
                    !hasCurrentIntentSources &&
                    (quoteRefreshing || intentLoading)
                  }
                  isSourcePickerDisabled={
                    !toTokenWithFetchedBalance || !hasPositiveRootAmount
                  }
                  needsWalletConnection={needsWalletConnection}
                  onAmountChange={handleSendAmountChange}
                  onOpenAssetPicker={() =>
                    openDrawerStep("choose-receive-asset")
                  }
                  onOpenRecipientPicker={handleOpenRecipientEditor}
                  onOpenSourcePicker={() => {
                    if (needsWalletConnection) {
                      void handleConnectWallet();
                      return;
                    }
                    setEditingAssetIndex(null);
                    beginSourcePickerEdit();
                    openDrawerStep("choose-swap-asset");
                  }}
                  onSetPercent={handleSendPercentSelect}
                  recipientAddress={recipientAddress || ""}
                  routeMessage={insufficientSourceIssue?.message}
                  routeStatus={
                    insufficientSourceIssue
                      ? "insufficient"
                      : displayExactOutRouteLoading
                        ? "loading"
                        : undefined
                  }
                  showAutoBadge={!sourceSelectionTouched}
                  toToken={toTokenWithFetchedBalance}
                  totalBalance={totalSwapBalanceUsd}
                  usdValue={
                    needsWalletConnection && fromTokens[0] && amount
                      ? (() => {
                          const inputNum = parseFiatNumber(amount);
                          if (!inputNum || inputNum.lte(0)) return "";
                          const rate = getTokenUsdRate(fromTokens[0]);
                          const val = inputNum.mul(rate);
                          return val.gt(0) ? val.toFixed(2) : "";
                        })()
                      : amount && sendAmountUsd > 0
                        ? sendAmountUsd.toFixed(2)
                        : ""
                  }
                />

                {effectiveNexusInitError && (
                  <StatusAlert message={effectiveNexusInitError} type="error" />
                )}

                {txError && !blockingQuoteIssue && (
                  <StatusAlert message={txError} type="error" />
                )}

                <div
                  style={{
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <button
                    disabled={isSendCtaDisabled}
                    onClick={() => {
                      if (needsWalletConnection) {
                        void handleConnectWallet({ reportConversion: true });
                        return;
                      }
                      if (sendNeedsRecipient) {
                        handleOpenRecipientEditor();
                        return;
                      }
                      void handleEnterPreview();
                    }}
                    style={{
                      alignItems: "center",
                      backgroundColor:
                        effectiveNexusInitError || blockingQuoteIssue
                          ? "#FCEEED"
                          : isSendCtaDisabled
                            ? "#CBCBCB"
                            : theme.colors.text,
                      border:
                        effectiveNexusInitError || blockingQuoteIssue
                          ? "1px solid #F7C4C1"
                          : "none",
                      borderRadius:
                        effectiveNexusInitError || blockingQuoteIssue
                          ? "4px"
                          : theme.radius.primaryButton,
                      boxShadow:
                        blockingQuoteIssue ||
                        isSendCtaDisabled ||
                        effectiveNexusInitError
                          ? "none"
                          : theme.shadows.primaryButton,
                      boxSizing: "border-box",
                      display: "flex",
                      flexShrink: 0,
                      gap: "7px",
                      height: "40px",
                      justifyContent: "center",
                      paddingInline: "16px",
                      cursor: isSendCtaDisabled ? "not-allowed" : "pointer",
                      width: "100%",
                    }}
                  >
                    {blockingQuoteIssue ? (
                      <AlertCircle
                        style={{
                          color: "#D32F2F",
                          height: "14px",
                          width: "14px",
                        }}
                      />
                    ) : !effectiveNexusInitError &&
                      ((needsWalletConnection && walletConnectBusy) ||
                        (!sendNeedsRecipient &&
                          ((!hasCurrentIntentSources &&
                            (quoteRefreshing || intentLoading)) ||
                            receiveMaxCalculating))) ? (
                      <Loader2
                        className="animate-spin"
                        style={{
                          color: isSendCtaDisabled
                            ? theme.colors.muted
                            : theme.colors.surface,
                          height: "14px",
                          width: "14px",
                        }}
                      />
                    ) : null}
                    <div
                      style={{
                        boxSizing: "border-box",
                        color:
                          effectiveNexusInitError || blockingQuoteIssue
                            ? "#D32F2F"
                            : isSendCtaDisabled
                              ? theme.colors.muted
                              : theme.colors.surface,
                        fontFamily: theme.fonts.sans,
                        fontSize: blockingQuoteIssue ? "13px" : "14px",
                        fontWeight: 500,
                        lineHeight: "21px",
                      }}
                    >
                      {sendCtaLabel}
                    </div>
                  </button>
                </div>
              </>
            )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* DRAWER PANELS — rendered as direct children of root widget          */}
      {/* so they overlay the main page as bottom drawers                     */}
      {/* ================================================================== */}

      {/* Drawer: enter-recipient */}
      {(activeMode === "swap" ||
        activeMode === "send" ||
        activeMode === "deposit") &&
        swapStep === "enter-recipient" && (
          <div
            style={{
              height: "100%",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 40,
              pointerEvents: "none",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <div
              onClick={() => {
                setTxError(null);
                closeDrawerToIdle();
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.35)",
                pointerEvents: "auto",
                opacity: isRecipientDrawerClosing ? 0 : 1,
                transition: `opacity ${DRAWER_CLOSE_MS}ms ease`,
              }}
            />
            <div
              className={
                isRecipientDrawerClosing
                  ? undefined
                  : "animate-in slide-in-from-bottom-full duration-300"
              }
              data-nexus-one-sheet
              style={{
                ...modalHeightTransitionStyle,
                bottom: 0,
                height: "auto",
                left: 0,
                maxHeight: "90%",
                position: "absolute",
                right: 0,
                width: "100%",
                backgroundColor: theme.colors.surface,
                borderRadius: "16px 16px 0 0",
                display: "flex",
                flexDirection: "column",
                pointerEvents: "auto",
                boxShadow: theme.shadows.sheet,
                boxSizing: "border-box",
                overflowY: "auto",
                padding: "12px 16px 16px",
                opacity: isRecipientDrawerClosing ? 0 : 1,
                transform: isRecipientDrawerClosing
                  ? "translateY(100%)"
                  : "translateY(0)",
                transition: `${modalHeightTransition}, transform ${DRAWER_CLOSE_MS}ms ease, opacity ${DRAWER_CLOSE_MS}ms ease`,
                willChange: "height, max-height, transform, opacity",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "12px",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    backgroundColor: theme.colors.divider,
                    borderRadius: "999px",
                    height: "4px",
                    width: "32px",
                  }}
                />
              </div>
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: "12px",
                  paddingBottom: "14px",
                }}
              >
                <button
                  aria-label="Back"
                  onClick={() => {
                    setTxError(null);
                    closeDrawerToIdle();
                  }}
                  style={{
                    alignItems: "center",
                    backgroundColor: theme.colors.surface,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: "8px",
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
                  <ArrowLeft
                    style={{
                      color: theme.colors.textStrong,
                      height: "16px",
                      width: "16px",
                    }}
                  />
                </button>
                <div
                  style={{
                    color: theme.colors.textStrong,
                    fontFamily: theme.fonts.display,
                    fontSize: "20px",
                    fontWeight: 500,
                    lineHeight: "24px",
                  }}
                >
                  Recipient
                </div>
              </div>
              <div
                style={{
                  backgroundColor: theme.colors.border,
                  height: "1px",
                  marginBottom: "16px",
                  width: "100%",
                }}
              />
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    color: theme.colors.muted,
                    fontFamily: theme.fonts.sans,
                    fontSize: "15px",
                    fontWeight: 500,
                    lineHeight: "20px",
                  }}
                >
                  Wallet Address
                </div>
                {activeMode === "swap" && defaultRecipientAddress && (
                  <button
                    onClick={handleResetRecipientToDefault}
                    style={{
                      backgroundColor: "#F4F7FE",
                      border: "none",
                      borderRadius: "4px",
                      color: theme.colors.primary,
                      cursor: "pointer",
                      fontFamily: theme.fonts.sans,
                      fontSize: "14px",
                      fontWeight: 500,
                      lineHeight: "18px",
                      padding: "8px 12px",
                    }}
                    type="button"
                  >
                    Reset to default
                  </button>
                )}
              </div>
              <RecipientInput
                hasError={Boolean(txError)}
                label={null}
                onChange={(next) => {
                  setIsRecipientUserEdited(true);
                  setRecipientAddress(next);
                  if (txError) setTxError(null);
                }}
                onClear={() => {
                  setRecipientAddress("");
                  setIsRecipientUserEdited(activeMode === "send");
                }}
                placeholder="Wallet address"
                value={recipientAddress}
              />
              {txError && (
                <div
                  style={{
                    color: "#E35454",
                    fontFamily: theme.fonts.sans,
                    fontSize: "15px",
                    fontWeight: 500,
                    lineHeight: "20px",
                    marginTop: "10px",
                  }}
                >
                  {txError}
                </div>
              )}
              {activeMode === "send" && (
                <div
                  style={{
                    color: theme.colors.textSubtle,
                    fontFamily: theme.fonts.sans,
                    fontSize: "15px",
                    lineHeight: "20px",
                    marginTop: "10px",
                  }}
                >
                  Recipient must be different from the connected wallet.
                </div>
              )}
              <button
                onClick={handleSaveRecipient}
                style={{
                  alignItems: "center",
                  backgroundColor: theme.colors.text,
                  border: "none",
                  borderRadius: "8px",
                  boxShadow: "#5555550D 0px 1px 4px",
                  color: theme.colors.surface,
                  cursor: "pointer",
                  display: "flex",
                  fontFamily: theme.fonts.sans,
                  fontSize: "16px",
                  fontWeight: 500,
                  height: "43px",
                  justifyContent: "center",
                  marginTop: "22px",
                  width: "100%",
                }}
              >
                Save
              </button>
            </div>
          </div>
        )}

      {/* Modal: choose-swap-asset */}
      {(activeMode === "swap" ||
        activeMode === "send" ||
        activeMode === "deposit") &&
        (swapStep === "choose-swap-asset" ||
          closingDrawerStep === "choose-swap-asset") &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                if (isSourcePickerMultiselect) {
                  handleSourcePickerCancel();
                } else {
                  closeDrawerToIdle();
                }
              }
            }}
            style={{
              alignItems: "center",
              animation:
                closingDrawerStep === "choose-swap-asset"
                  ? "nexusBackdropFadeOut 0.22s cubic-bezier(0.2, 0, 0, 1) forwards"
                  : "nexusBackdropFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
              backdropFilter: "blur(8px)",
              background: "rgba(215, 218, 220, 0.50)",
              bottom: 0,
              boxSizing: "border-box",
              display: "flex",
              inset: 0,
              justifyContent: "center",
              left: 0,
              padding: "16px",
              position: "fixed",
              right: 0,
              top: 0,
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 9999999,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                animation:
                  closingDrawerStep === "choose-swap-asset"
                    ? "nexusZoomFadeOut 0.22s cubic-bezier(0.2, 0, 0, 1) forwards"
                    : "nexusZoomFadeIn 0.28s cubic-bezier(0.34, 1.25, 0.64, 1)",
                backgroundColor: "#FFFFFF",
                borderRadius: "32px",
                boxShadow: "0 0 10.4px 0 rgba(0, 0, 0, 0.10)",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                maxHeight: "90vh",
                maxWidth: "840px",
                minWidth: "280px",
                overflow: "hidden",
                width: "100%",
                transition:
                  "height 0.3s cubic-bezier(0.2, 0, 0, 1), max-height 0.3s cubic-bezier(0.2, 0, 0, 1)",
              }}
            >
              <SwapAssetSelector
                allowSelectedTokenRemoval={false}
                allowUnified={false}
                autoSelectFilterTabs={isExactOutPaymentFlow}
                editingAssetIndex={editingAssetIndex}
                excludedTokens={
                  toToken &&
                  !toToken.isUnifiedCandidate &&
                  !(toToken as any).isUnified
                    ? [toToken]
                    : []
                }
                filterTabBehavior={
                  activeMode === "deposit" ? "source-pool" : "select-all"
                }
                hideCustomTab={activeMode === "swap" && !isSwapExactOut}
                initialFilterTab={
                  activeMode === "deposit"
                    ? depositSourceFilter === "stablecoins"
                      ? "stables"
                      : depositSourceFilter
                    : isExactOutPaymentFlow && sourcePickerDraftTouched
                      ? "custom"
                      : "all"
                }
                isLoadingBalances={nexusLoading || swapBalance === undefined}
                isMulti={isSourcePickerMultiselect}
                lockedTokens={lockedDestinationSourceTokens}
                needsWalletConnection={needsWalletConnection}
                onBack={
                  isSourcePickerMultiselect
                    ? handleSourcePickerCancel
                    : closeDrawerToIdle
                }
                onDone={
                  isSourcePickerMultiselect
                    ? commitSourcePickerDraft
                    : closeDrawerToIdle
                }
                onFilterTabSelect={
                  isSourcePickerMultiselect
                    ? handleSourcePickerFilterTabSelect
                    : undefined
                }
                onRestoreAuto={
                  isSourcePickerMultiselect
                    ? () => handleSourcePickerFilterTabSelect("all")
                    : undefined
                }
                onSelect={(token) => {
                  const shouldClearDestination = Boolean(
                    (toToken &&
                      sourceSelectionIncludesTokenChainPair(token, toToken)) ||
                      isSwapExactOutDestinationToken(token)
                  );
                  const baseList =
                    isSourcePickerMultiselect && sourcePickerDraftTokens
                      ? sourcePickerDraftTokens
                      : fromTokens;
                  const next = [...baseList];
                  const targetIndex =
                    editingAssetIndex !== null ? editingAssetIndex : null;
                  const existingToken =
                    targetIndex !== null && targetIndex < next.length
                      ? next[targetIndex]
                      : undefined;
                  const tokenChanged =
                    Boolean(
                      existingToken?.symbol || existingToken?.contractAddress
                    ) && !isSameTokenSelection(existingToken, token);
                  const preservedAmount = tokenChanged
                    ? ""
                    : existingToken?.userAmount ||
                      (targetIndex === 0 ? amount : "");
                  const newToken = {
                    ...token,
                    userAmount: preservedAmount,
                  };

                  if (!isMultiAssetMode) {
                    next.length = 0;
                    next.push(newToken);
                  } else if (
                    targetIndex !== null &&
                    !isSourcePickerMultiselect
                  ) {
                    if (targetIndex < next.length) {
                      next[targetIndex] = newToken;
                    } else {
                      next.push(newToken);
                    }
                  } else {
                    const alreadyExists = next.some((t) =>
                      isSameTokenSelection(t, token)
                    );
                    if (!alreadyExists) {
                      next.push(newToken);
                    }
                  }

                  setSourceSelectionTouched(true);
                  sourcePickerDraftTouchedRef.current = true;
                  setSourcePickerDraftTouched(true);
                  setFromTokens(next);
                  if (isSourcePickerMultiselect) {
                    handleSourcePickerDraftSelectionChange(next);
                  }
                  const isReceiveEmptyOrZero =
                    swapType === "exactOut" && !hasPositiveDecimalInput(amount);

                  if (isReceiveEmptyOrZero) {
                    setSwapType("exactIn");
                    setExactOutQuoteSourceModeValue("all");
                  }

                  if (swapType === "exactIn" || isReceiveEmptyOrZero) {
                    const totalSendVal = next.reduce((sum, t) => {
                      const num = Number(t.userAmount || 0);
                      return sum + (Number.isFinite(num) ? num : 0);
                    }, 0);
                    setAmount(totalSendVal > 0 ? String(totalSendVal) : "");
                  }
                  if (shouldClearDestination) {
                    setToToken(undefined);
                    setDestinationBalance(undefined);
                  }
                  if (isSwapExactOut) {
                    invalidateExactOutQuoteForRefresh({
                      sourceTokens: next,
                    });
                  }
                  if (!isSourcePickerMultiselect) {
                    closeDrawerToIdle();
                  }
                }}
                onSelectionChange={
                  isSourcePickerMultiselect
                    ? handleSourcePickerDraftSelectionChange
                    : undefined
                }
                onToggle={(token) => {
                  if (
                    editingAssetIndex !== null &&
                    !isSourcePickerMultiselect
                  ) {
                    const baseList = fromTokens;
                    const next = [...baseList];
                    const targetIndex = editingAssetIndex;
                    const existingToken =
                      targetIndex < next.length ? next[targetIndex] : undefined;
                    const tokenChanged =
                      Boolean(
                        existingToken?.symbol || existingToken?.contractAddress
                      ) && !isSameTokenSelection(existingToken, token);
                    const preservedAmount = tokenChanged
                      ? ""
                      : existingToken?.userAmount ||
                        (targetIndex === 0 ? amount : "");
                    const newToken = {
                      ...token,
                      userAmount: preservedAmount,
                    };

                    if (!isMultiAssetMode) {
                      next.length = 0;
                      next.push(newToken);
                    } else if (targetIndex < next.length) {
                      next[targetIndex] = newToken;
                    } else {
                      next.push(newToken);
                    }

                    setFromTokens(next);
                    if (swapType === "exactIn") {
                      const totalSendVal = next.reduce((sum, t) => {
                        const num = Number(t.userAmount || 0);
                        return sum + (Number.isFinite(num) ? num : 0);
                      }, 0);
                      setAmount(totalSendVal > 0 ? String(totalSendVal) : "");
                    }
                    return;
                  }

                  const prev = isSourcePickerMultiselect
                    ? (sourcePickerDraftTokens ?? sourcePickerSelectedTokens)
                    : fromTokens;
                  if (!isSourcePickerMultiselect) {
                    clearPendingSwapIntent();
                  }
                  const nextTokens = (() => {
                    const isSameSelection = (
                      a: SwapTokenOption,
                      b: SwapTokenOption
                    ) => {
                      if (a.isUnified || b.isUnified) {
                        return Boolean(
                          a.isUnified &&
                            b.isUnified &&
                            a.unifiedSymbol === b.unifiedSymbol
                        );
                      }
                      return (
                        a.contractAddress.toLowerCase() ===
                          b.contractAddress.toLowerCase() &&
                        a.chainId === b.chainId
                      );
                    };
                    const isExactOutSourcePicker = isSourcePickerMultiselect;
                    const sourceTokens = token.sourceTokens ?? [];
                    const isSameUnifiedGroup = (item: SwapTokenOption) =>
                      Boolean(
                        item.isUnified &&
                          token.isUnified &&
                          item.unifiedSymbol === token.unifiedSymbol
                      );
                    const withDefaultAmount = (item: SwapTokenOption) => {
                      const existingInPrev = prev.find(
                        (p) =>
                          isSameSelection(p, item) ||
                          (Boolean(p.contractAddress) &&
                            Boolean(item.contractAddress) &&
                            p.contractAddress.toLowerCase() ===
                              item.contractAddress.toLowerCase() &&
                            p.chainId === item.chainId)
                      );
                      if (existingInPrev && existingInPrev.userAmount) {
                        return {
                          ...item,
                          userAmount: existingInPrev.userAmount,
                          userAmountMode:
                            existingInPrev.userAmountMode ??
                            item.userAmountMode,
                          selectedPct: existingInPrev.selectedPct,
                        };
                      }
                      return {
                        ...item,
                        userAmount:
                          activeMode === "swap" &&
                          !isSwapExactOut &&
                          prev.length === 0
                            ? amount
                            : (item.userAmount ?? ""),
                      };
                    };
                    if (token.isUnified && sourceTokens.length > 0) {
                      const isSameGroupToken = (item: SwapTokenOption) =>
                        Boolean(
                          !item.isUnified &&
                            sourceTokens.some(
                              (s) =>
                                s.chainId === item.chainId &&
                                s.contractAddress.toLowerCase() ===
                                  item.contractAddress.toLowerCase()
                            )
                        );
                      const areAllChildrenSelected = sourceTokens.every(
                        (source) =>
                          prev.some(
                            (item) =>
                              !item.isUnified &&
                              item.chainId === source.chainId &&
                              item.contractAddress.toLowerCase() ===
                                source.contractAddress.toLowerCase()
                          )
                      );
                      const isUnifiedTokenSelected = prev.some(
                        (item) =>
                          item.isUnified &&
                          (
                            item.unifiedSymbol ??
                            item.symbol ??
                            ""
                          ).toUpperCase() ===
                            (
                              token.unifiedSymbol ??
                              token.symbol ??
                              ""
                            ).toUpperCase()
                      );

                      const withoutGroup = prev.filter(
                        (item) =>
                          !isSameGroupToken(item) &&
                          !(
                            item.isUnified &&
                            (
                              item.unifiedSymbol ??
                              item.symbol ??
                              ""
                            ).toUpperCase() ===
                              (
                                token.unifiedSymbol ??
                                token.symbol ??
                                ""
                              ).toUpperCase()
                          )
                      );

                      if (areAllChildrenSelected || isUnifiedTokenSelected) {
                        return withoutGroup;
                      }

                      return [
                        ...withoutGroup,
                        ...sourceTokens.map((source) =>
                          withDefaultAmount(source)
                        ),
                      ];
                    }

                    const exists = prev.find((item) =>
                      isSameSelection(item, token)
                    );
                    if (exists) {
                      return prev.filter(
                        (item) => !isSameSelection(item, token)
                      );
                    }

                    const tokenGroupSymbol = (
                      token.unifiedSymbol ??
                      token.symbol ??
                      ""
                    ).toUpperCase();
                    const withoutUnifiedGroup = prev.filter((item) => {
                      if (
                        item.isUnified &&
                        (
                          item.unifiedSymbol ??
                          item.symbol ??
                          ""
                        ).toUpperCase() === tokenGroupSymbol
                      ) {
                        return false;
                      }
                      return true;
                    });
                    return [...withoutUnifiedGroup, withDefaultAmount(token)];
                  })();

                  setSourceSelectionTouched(true);
                  sourcePickerDraftTouchedRef.current = true;
                  setSourcePickerDraftTouched(true);
                  setFromTokens(nextTokens);
                  if (isSourcePickerMultiselect) {
                    handleSourcePickerDraftSelectionChange(nextTokens);
                  }
                  const isReceiveEmptyOrZero =
                    swapType === "exactOut" && !hasPositiveDecimalInput(amount);

                  if (isReceiveEmptyOrZero) {
                    setSwapType("exactIn");
                    setExactOutQuoteSourceModeValue("all");
                  }

                  if (swapType === "exactIn" || isReceiveEmptyOrZero) {
                    const totalSendVal = nextTokens.reduce((sum, t) => {
                      const num = Number(t.userAmount || 0);
                      return sum + (Number.isFinite(num) ? num : 0);
                    }, 0);
                    setAmount(totalSendVal > 0 ? String(totalSendVal) : "");
                  }
                }}
                preserveSelectedBelowMinimum={false}
                requiredUsd={
                  activeMode === "deposit"
                    ? (exactOutRequiredUsdDisplay ?? depositUsdDisplay)
                    : isExactOutPaymentFlow
                      ? exactOutRequiredUsdDisplay
                      : undefined
                }
                restoreAutoTokens={
                  isExactOutPaymentFlow
                    ? getAutoExactOutSourceTokensForPicker()
                    : undefined
                }
                selectedTokens={sourcePickerSelectedTokens}
                showBelowMinimumInline={true}
                showRestoreAuto={sourcePickerDraftTouched}
                staticOptions={
                  !ownerAddress || !swapBalance || swapBalance.length === 0
                    ? disconnectedAvailableTokens
                    : undefined
                }
                swapBalance={swapBalance}
                swapSupportedChains={swapSupportedChainsAndTokens}
                title={
                  isSwapExactOut
                    ? "Choose assets to send"
                    : activeMode === "deposit" || activeMode === "send"
                      ? "Choose assets to pay with"
                      : "Choose assets to send"
                }
              />
            </div>
          </div>,
          document.body
        )}

      {/* Modal: choose-receive-asset */}
      {(activeMode === "swap" ||
        activeMode === "send" ||
        activeMode === "deposit") &&
        (swapStep === "choose-receive-asset" ||
          closingDrawerStep === "choose-receive-asset") &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeDrawerToIdle();
              }
            }}
            style={{
              alignItems: "center",
              animation:
                closingDrawerStep === "choose-receive-asset"
                  ? "nexusBackdropFadeOut 0.22s cubic-bezier(0.2, 0, 0, 1) forwards"
                  : "nexusBackdropFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
              backdropFilter: "blur(8px)",
              background: "rgba(215, 218, 220, 0.50)",
              bottom: 0,
              boxSizing: "border-box",
              display: "flex",
              inset: 0,
              justifyContent: "center",
              left: 0,
              padding: "16px",
              position: "fixed",
              right: 0,
              top: 0,
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 9999999,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                animation:
                  closingDrawerStep === "choose-receive-asset"
                    ? "nexusZoomFadeOut 0.22s cubic-bezier(0.2, 0, 0, 1) forwards"
                    : "nexusZoomFadeIn 0.28s cubic-bezier(0.34, 1.25, 0.64, 1)",
                backgroundColor: "#FFFFFF",
                borderRadius: "32px",
                boxShadow: "0 0 10.4px 0 rgba(0, 0, 0, 0.10)",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                maxHeight: "90vh",
                maxWidth: "840px",
                minWidth: "280px",
                overflow: "hidden",
                width: "100%",
                transition:
                  "height 0.3s cubic-bezier(0.2, 0, 0, 1), max-height 0.3s cubic-bezier(0.2, 0, 0, 1)",
              }}
            >
              <ReceiveAssetSelector
                excludedTokens={fromTokens.filter(
                  (t) => !t.isUnifiedCandidate && !(t as any).isUnified
                )}
                needsWalletConnection={needsWalletConnection}
                onBack={closeDrawerToIdle}
                onSelect={(token) => {
                  const tokenChanged = !isSameTokenSelection(toToken, token);
                  if (tokenChanged) {
                    onReceiveAssetChange?.({
                      chainId: token.chainId,
                      chainName: token.chainName,
                      contractAddress: token.contractAddress,
                      symbol: token.symbol,
                    });
                  }
                  if (
                    activeMode === "swap" &&
                    isSwapExactOut &&
                    sourceSelectionIncludesTokenChainPair(token, fromTokens)
                  ) {
                    setFromTokens([]);
                    setExactOutQuoteSourceModeValue("all");
                  }
                  if (
                    activeMode === "send" ||
                    activeMode === "deposit" ||
                    isSwapExactOut
                  ) {
                    setExactOutQuoteSourceModeValue("all");
                    if (tokenChanged) {
                      clearPendingSwapIntent();
                      setAmount("");
                    }
                    setSwapType("exactOut");
                    setToToken(token);
                    closeDrawerToIdle();
                    return;
                  }
                  if (tokenChanged) {
                    clearPendingSwapIntent();
                  }
                  if (swapType !== "exactIn") {
                    setSwapType("exactIn");
                  }
                  const sourceUpdate = removeTokenChainPairFromSources(
                    fromTokens,
                    token
                  );
                  if (sourceUpdate.removed) {
                    if (!tokenChanged) {
                      clearPendingSwapIntent();
                    }
                    setFromTokens(sourceUpdate.sources);
                    setAmount(getSourceAmountInput(sourceUpdate.sources));
                  }
                  setToToken(token);
                  closeDrawerToIdle();
                }}
                selectedToken={toToken}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );

  if (embed) return widgetContent;

  return (
    <Dialog onOpenChange={handleModalOpenChange} open={isModalOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {activeMode === "deposit"
            ? "Deposit"
            : activeMode === "send"
              ? "Send"
              : "Swap"}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-md! border-0 bg-transparent p-0 shadow-none"
        dismissible={swapStep !== "progress"}
        showCloseButton={false}
      >
        {widgetContent}
      </DialogContent>
    </Dialog>
  );
}

export default NexusOne;
