// biome-ignore-all lint: NexusOne registry component from shadcn registry.

"use client";
import { formatTokenBalance } from "@avail-project/nexus-core/utils";
import { Check, ChevronDown, Copy, Globe, Info, Search, X } from "lucide-react";
import React, {
  useCallback,
  useDeferredValue,
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
import { useNexus } from "../../nexus/nexus-provider";
import { nexusOneTheme } from "../theme";
import {
  CITREA_CHAIN_ID,
  CITREA_STABLE_SYMBOLS,
  getCitreaChainMeta,
  getCitreaReceiveTokenOptions,
} from "../utils/citrea-tokens";
import {
  getTokenSearchRank,
  isSameTokenChainPair,
  RadioDot,
  SWAP_CHAIN_DISPLAY_ORDER,
  type SwapTokenOption,
  sortChainIdsBySwapDisplayOrder,
} from "./swap-asset-selector";

interface ReceiveAssetSelectorProps {
  excludedTokens?: SwapTokenOption[];
  onBack: () => void;
  onSelect: (token: SwapTokenOption) => void;
}

const SUPPORTED_RECEIVE_CHAIN_IDS = new Set<number>(SWAP_CHAIN_DISPLAY_ORDER);
const CHAIN_SELECTOR_CLOSE_MS = 220;
const MODAL_HEIGHT_TRANSITION_MS = 260;
const modalHeightTransitionStyle = {
  interpolateSize: "allow-keywords",
} as React.CSSProperties;
const modalHeightTransition = `height ${MODAL_HEIGHT_TRANSITION_MS}ms ease, max-height ${MODAL_HEIGHT_TRANSITION_MS}ms ease`;

const AVATAR_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#D4A5A5",
  "#9B59B6",
  "#3498DB",
  "#E67E22",
  "#1ABC9C",
  "#F39C12",
  "#34495E",
];

const getAvatarColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const TokenLogo = ({
  token,
  size = 40,
  fontSize = 16,
}: {
  token: SwapTokenOption;
  size?: number;
  fontSize?: number;
}) => {
  const [error, setError] = useState(false);

  if (!token.logo || error) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "999px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: getAvatarColor(token.symbol),
          color: "#fff",
          fontWeight: 600,
          fontSize,
        }}
      >
        {token.symbol.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      alt={token.symbol}
      onError={() => setError(true)}
      src={token.logo}
      style={{
        position: "absolute",
        inset: 0,
        width: size,
        height: size,
        borderRadius: "999px",
        objectFit: "cover",
      }}
    />
  );
};

const parseFiatValue = (value: unknown) => {
  const parsed = Number(String(value ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const STABLE_SYMBOLS = new Set([
  "USDC",
  "USDT",
  "DAI",
  "FRAX",
  "LUSD",
  "TUSD",
  "USDD",
  "GHO",
  "crvUSD",
  "sUSD",
  "USDe",
  ...CITREA_STABLE_SYMBOLS,
]);

const FILTER_TABS = [
  { label: "All", key: "all" },
  { label: "Native", key: "native" },
  { label: "Stables", key: "stables" },
  { label: "Custom", key: "custom" },
];

const getTokenBalanceKey = (chainId?: number, address?: string) => {
  if (!chainId || !address) return null;
  return `${chainId}-${address.toLowerCase()}`;
};

const getNativeAddressAlias = (address?: string) => {
  if (!address) return null;
  const lower = address.toLowerCase();
  if (lower === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
    return "0x0000000000000000000000000000000000000000";
  }
  if (lower === "0x0000000000000000000000000000000000000000") {
    return "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  }
  return null;
};

type RawReceiveToken = {
  address?: string;
  decimals?: number;
  logoURI?: string;
  name?: string;
  priceUSD?: number | string;
  symbol?: string;
  verificationStatus?: TokenVerificationStatus;
};

type TokenVerificationStatus = "flagged" | "unverified" | "verified";

const getTokenVerificationRank = (status?: TokenVerificationStatus) => {
  if (status === "verified") return 0;
  if (status === "flagged") return 2;
  return 1;
};

type ReceiveTokenOption = SwapTokenOption & {
  hasBalance?: boolean;
  verificationStatus?: TokenVerificationStatus;
};

type RawReceiveTokensData = {
  stableSymbols: string[];
  tokens: Record<string, RawReceiveToken[]>;
};

const EMPTY_RECEIVE_TOKENS_DATA: RawReceiveTokensData = {
  stableSymbols: [],
  tokens: {},
};
const LEGACY_RECEIVE_TOKEN_STORAGE_KEYS = [
  "nexus_receive_tokens_cache",
  "nexus_receive_tokens_time",
  "nexus_receive_tokens_cache_v1",
  "nexus_receive_tokens_time_v1",
  "nexus_receive_tokens_cache_v2",
  "nexus_receive_tokens_time_v2",
] as const;
const LEGACY_RECEIVE_TOKEN_STORAGE_PREFIX = "nexus_receive_tokens_";
const RECEIVE_TOKEN_DB_NAME = "nexus-fastbridge-cache";
const RECEIVE_TOKEN_DB_VERSION = 1;
const RECEIVE_TOKEN_STORE_NAME = "api-responses";
const RECEIVE_TOKEN_CACHE_KEY = "liquest-receive-tokens-v1";

type PersistedReceiveTokens = {
  data: RawReceiveTokensData;
  schemaVersion: 1;
  storedAt: number;
};

let rawTokensCache: RawReceiveTokensData | null = null;
let rawTokensPromise: Promise<RawReceiveTokensData> | null = null;
let rawTokensRefreshPromise: Promise<RawReceiveTokensData> | null = null;
let receiveTokenDbPromise: Promise<IDBDatabase | null> | null = null;
let legacyReceiveTokenStorageCleared = false;

const clearLegacyReceiveTokenStorageCache = () => {
  if (legacyReceiveTokenStorageCleared || typeof window === "undefined") {
    return;
  }
  legacyReceiveTokenStorageCleared = true;

  try {
    const matchingKeys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(LEGACY_RECEIVE_TOKEN_STORAGE_PREFIX)) {
        matchingKeys.push(key);
      }
    }
    for (const key of LEGACY_RECEIVE_TOKEN_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
    for (const key of matchingKeys) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // localStorage can be unavailable; the in-memory token cache still works.
  }
};

const hasReceiveTokens = (data: RawReceiveTokensData) =>
  Object.keys(data.tokens).length > 0;

const isRawReceiveTokensData = (
  value: unknown
): value is RawReceiveTokensData => {
  if (!(value && typeof value === "object")) {
    return false;
  }

  const candidate = value as {
    stableSymbols?: unknown;
    tokens?: unknown;
  };
  return (
    Array.isArray(candidate.stableSymbols) &&
    candidate.stableSymbols.every((symbol) => typeof symbol === "string") &&
    Boolean(
      candidate.tokens &&
        typeof candidate.tokens === "object" &&
        !Array.isArray(candidate.tokens)
    )
  );
};

const openReceiveTokenCacheDb = (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  if (receiveTokenDbPromise) {
    return receiveTokenDbPromise;
  }

  receiveTokenDbPromise = new Promise((resolve) => {
    let settled = false;
    const settle = (db: IDBDatabase | null) => {
      if (settled) {
        db?.close();
        return;
      }
      settled = true;
      resolve(db);
    };
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(RECEIVE_TOKEN_DB_NAME, RECEIVE_TOKEN_DB_VERSION);
    } catch {
      settle(null);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECEIVE_TOKEN_STORE_NAME)) {
        db.createObjectStore(RECEIVE_TOKEN_STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      settle(db);
    };
    request.onerror = () => settle(null);
    request.onblocked = () => settle(null);
  });

  return receiveTokenDbPromise;
};

const readPersistedReceiveTokens = async () => {
  const db = await openReceiveTokenCacheDb();
  if (!db) {
    return null;
  }

  return new Promise<RawReceiveTokensData | null>((resolve) => {
    try {
      const transaction = db.transaction(RECEIVE_TOKEN_STORE_NAME, "readonly");
      const request = transaction
        .objectStore(RECEIVE_TOKEN_STORE_NAME)
        .get(RECEIVE_TOKEN_CACHE_KEY);

      request.onsuccess = () => {
        const record = request.result as PersistedReceiveTokens | undefined;
        resolve(
          record?.schemaVersion === 1 &&
            isRawReceiveTokensData(record.data) &&
            hasReceiveTokens(record.data)
            ? record.data
            : null
        );
      };
      request.onerror = () => resolve(null);
      transaction.onabort = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const persistReceiveTokens = async (data: RawReceiveTokensData) => {
  const db = await openReceiveTokenCacheDb();
  if (!db) {
    return;
  }

  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(RECEIVE_TOKEN_STORE_NAME, "readwrite");
      const record: PersistedReceiveTokens = {
        data,
        schemaVersion: 1,
        storedAt: Date.now(),
      };
      transaction
        .objectStore(RECEIVE_TOKEN_STORE_NAME)
        .put(record, RECEIVE_TOKEN_CACHE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      // IndexedDB can be unavailable or over quota; memory caching still works.
      resolve();
    }
  });
};

const normalizeReceiveTokenAddress = (address?: string) => {
  if (!address) return "";
  const lower = address.toLowerCase();
  if (
    lower === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
    lower === "0x0000000000000000000000000000000000000000"
  ) {
    return "0x0000000000000000000000000000000000000000";
  }
  return lower;
};

export const getCachedReceiveTokenMatch = (
  token?: SwapTokenOption | null
): SwapTokenOption | null => {
  if (!token?.chainId || !rawTokensCache) return null;

  const chainTokens = rawTokensCache.tokens[String(token.chainId)] ?? [];
  const tokenAddress = normalizeReceiveTokenAddress(token.contractAddress);
  const addressMatch = chainTokens.find(
    (candidate) =>
      normalizeReceiveTokenAddress(candidate.address) === tokenAddress
  );
  const symbolMatches = chainTokens.filter(
    (candidate) =>
      candidate.symbol?.toUpperCase() === token.symbol.toUpperCase()
  );
  const matchedToken =
    addressMatch ?? (symbolMatches.length === 1 ? symbolMatches[0] : undefined);

  if (!matchedToken) return null;

  return {
    ...token,
    decimals: matchedToken.decimals ?? token.decimals,
    logo: matchedToken.logoURI || token.logo,
    name: matchedToken.name || token.name,
    priceUSD: matchedToken.priceUSD ?? token.priceUSD,
    symbol: matchedToken.symbol || token.symbol,
  };
};

const fetchReceiveTokens = async (): Promise<RawReceiveTokensData> => {
  let data: RawReceiveTokensData = EMPTY_RECEIVE_TOKENS_DATA;
  try {
    const [resAll, resStables] = await Promise.all([
      fetch("https://li.quest/v1/tokens"),
      fetch("https://li.quest/v1/tokens?tags=stablecoin"),
    ]);

    let allTokens: RawReceiveTokensData["tokens"] = {};
    if (resAll.ok) {
      try {
        const allData = await resAll.json();
        allTokens = allData.tokens || {};
      } catch (jsonErr) {
        console.error(
          "[preloadReceiveTokens] Failed to parse all tokens JSON response:",
          jsonErr
        );
      }
    } else {
      console.warn(
        "[preloadReceiveTokens] resAll response was not ok:",
        resAll.status,
        resAll.statusText
      );
    }

    const stableSymbols = new Set<string>();
    if (resStables.ok) {
      try {
        const stablesData = await resStables.json();
        const stableChains = stablesData.tokens || {};
        for (const chainId of Object.keys(stableChains)) {
          for (const token of stableChains[chainId]) {
            stableSymbols.add(token.symbol);
          }
        }
      } catch (jsonErr) {
        console.error(
          "[preloadReceiveTokens] Failed to parse stable tokens JSON response:",
          jsonErr
        );
      }
    } else {
      console.warn(
        "[preloadReceiveTokens] resStables response was not ok:",
        resStables.status,
        resStables.statusText
      );
    }

    data = {
      tokens: allTokens,
      stableSymbols: Array.from(stableSymbols),
    };
  } catch (error) {
    console.error(
      "[preloadReceiveTokens] Failed to fetch/parse tokens from li.quest:",
      error
    );
  }

  return data;
};

const refreshReceiveTokens = (): Promise<RawReceiveTokensData> => {
  if (rawTokensRefreshPromise) {
    return rawTokensRefreshPromise;
  }

  rawTokensRefreshPromise = (async () => {
    const data = await fetchReceiveTokens();
    if (!hasReceiveTokens(data)) {
      rawTokensRefreshPromise = null;
      return data;
    }

    rawTokensCache = data;
    await persistReceiveTokens(data);
    return data;
  })();

  return rawTokensRefreshPromise;
};

export const preloadReceiveTokens = () => {
  if (typeof window === "undefined") {
    return null;
  }
  clearLegacyReceiveTokenStorageCache();

  if (rawTokensCache) {
    refreshReceiveTokens();
    return Promise.resolve(rawTokensCache);
  }

  if (!rawTokensPromise) {
    rawTokensPromise = (async () => {
      const persistedData = await readPersistedReceiveTokens();
      if (persistedData) {
        rawTokensCache = persistedData;
        refreshReceiveTokens();
        return persistedData;
      }

      const freshData = await refreshReceiveTokens();
      if (!hasReceiveTokens(freshData)) {
        rawTokensPromise = null;
      }
      return freshData;
    })();
  }

  return rawTokensPromise;
};

export function ReceiveAssetSelector({
  excludedTokens = [],
  onSelect,
  onBack,
}: ReceiveAssetSelectorProps) {
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const chainCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const {
    supportedChainsAndTokens,
    swapBalance,
    swapSupportedChainsAndTokens,
  } = useNexus();
  const sdkSwapSupportedChainIds = useMemo(
    () => getSdkSwapSupportedChainIds(swapSupportedChainsAndTokens),
    [swapSupportedChainsAndTokens]
  );
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedChainFilter, setSelectedChainFilter] = useState<number | null>(
    null
  );
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showChainSelector, setShowChainSelector] = useState(false);
  const [isChainSelectorClosing, setIsChainSelectorClosing] = useState(false);
  const [chainQuery, setChainQuery] = useState("");
  const [isChainSearchFocused, setIsChainSearchFocused] = useState(false);
  const [selectedTokenHash, setSelectedTokenHash] = useState<string | null>(
    null
  );
  const [selectedTokenFull, setSelectedTokenFull] =
    useState<SwapTokenOption | null>(null);
  const [hoveredHash, setHoveredHash] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);
  const [tooltipState, setTooltipState] = useState<{
    hash: string;
    x: number;
    y: number;
    t: SwapTokenOption;
  } | null>(null);

  const [apiTokens, setApiTokens] = useState<ReceiveTokenOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dynamicStableSymbols, setDynamicStableSymbols] =
    useState<Set<string>>(STABLE_SYMBOLS);

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

  const balanceMap = useMemo(() => {
    const map = new Map<
      string,
      Pick<ReceiveTokenOption, "balance" | "balanceInFiat" | "hasBalance">
    >();
    for (const asset of swapBalance ?? []) {
      for (const bd of asset.breakdown ?? []) {
        if (
          !isSwapSupportedBySdkChainList(
            bd.chain?.id,
            swapSupportedChainsAndTokens
          )
        ) {
          continue;
        }
        const key = getTokenBalanceKey(bd.chain?.id, bd.contractAddress);
        if (!key) continue;
        const fiatBalance = parseFiatValue(bd.balanceInFiat);
        const tokenBalance = parseFiatValue(bd.balance);
        if (fiatBalance <= 0 && tokenBalance <= 0) continue;

        const symbol = bd.symbol ?? asset.symbol;
        const decimals = bd.decimals ?? asset.decimals ?? 18;
        map.set(key, {
          balance: bd.balance ?? "0",
          balanceInFiat:
            bd.balanceInFiat != null ? `$${fiatBalance.toFixed(2)}` : "$0.00",
          hasBalance: true,
        });
        const nativeAlias = getNativeAddressAlias(bd.contractAddress);
        const aliasKey = getTokenBalanceKey(
          bd.chain?.id,
          nativeAlias ?? undefined
        );
        if (aliasKey) {
          map.set(aliasKey, map.get(key)!);
        }
      }
    }
    return map;
  }, [swapBalance, swapSupportedChainsAndTokens]);

  const tokensWithBalances = useMemo(() => {
    return apiTokens.map((token) => {
      const balance = balanceMap.get(
        getTokenBalanceKey(token.chainId, token.contractAddress) ?? ""
      );
      return balance
        ? { ...token, ...balance }
        : { ...token, hasBalance: false };
    });
  }, [apiTokens, balanceMap]);

  useEffect(() => {
    const handleGlobalClick = () => setTooltipState(null);
    if (tooltipState) {
      window.addEventListener("click", handleGlobalClick);
    }
    return () => {
      window.removeEventListener("click", handleGlobalClick);
    };
  }, [tooltipState]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(30);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [deferredQuery, activeTab, selectedChainFilter]);

  // Cross-reference map for chain names & logos, and balances
  const chainMetaMap = useMemo(() => {
    const map = new Map<number, { name: string; logo: string }>();
    if (supportedChainsAndTokens) {
      for (const c of supportedChainsAndTokens) {
        map.set(c.id, { name: getShortChainName(c.id, c.name), logo: c.logo });
      }
    }
    if (swapSupportedChainsAndTokens) {
      for (const c of swapSupportedChainsAndTokens) {
        if (
          !isSwapSupportedBySdkChainList(c.id, swapSupportedChainsAndTokens)
        ) {
          continue;
        }
        map.set(c.id, { name: getShortChainName(c.id, c.name), logo: c.logo });
      }
    }
    if (!map.has(CITREA_CHAIN_ID)) {
      map.set(CITREA_CHAIN_ID, getCitreaChainMeta());
    }
    return map;
  }, [supportedChainsAndTokens, swapSupportedChainsAndTokens]);

  const chainFilterIds = useMemo(() => {
    const supportedIds: number[] | undefined = sdkSwapSupportedChainIds
      ? Array.from(sdkSwapSupportedChainIds)
      : swapSupportedChainsAndTokens
          ?.map((chain: { id: number }) => chain.id)
          .filter(
            (id: number) =>
              SUPPORTED_RECEIVE_CHAIN_IDS.has(id) &&
              isSwapSupportedBySdkChainList(id, swapSupportedChainsAndTokens)
          );

    const nextIds = new Set(
      supportedIds ? supportedIds : Array.from(SUPPORTED_RECEIVE_CHAIN_IDS)
    );
    if (
      !sdkSwapSupportedChainIds ||
      sdkSwapSupportedChainIds.has(CITREA_CHAIN_ID)
    ) {
      nextIds.add(CITREA_CHAIN_ID);
    }

    return sortChainIdsBySwapDisplayOrder(
      Array.from(nextIds).filter((id) =>
        sdkSwapSupportedChainIds
          ? sdkSwapSupportedChainIds.has(id)
          : SUPPORTED_RECEIVE_CHAIN_IDS.has(id) &&
            isSwapSupportedBySdkChainList(id, swapSupportedChainsAndTokens)
      )
    );
  }, [sdkSwapSupportedChainIds, swapSupportedChainsAndTokens]);

  useEffect(() => {
    let active = true;
    const fetchTokens = async () => {
      try {
        setIsLoading(true);
        const data = await preloadReceiveTokens();
        if (!active) return;
        if (!data) return;

        if (data.stableSymbols && Array.isArray(data.stableSymbols)) {
          setDynamicStableSymbols(
            new Set([
              ...Array.from(STABLE_SYMBOLS),
              ...data.stableSymbols,
              ...CITREA_STABLE_SYMBOLS,
            ])
          );
        }

        const allParsed: ReceiveTokenOption[] = [];
        const chains = data.tokens || {};
        for (const chainIdStr of Object.keys(chains)) {
          const chainId = parseInt(chainIdStr, 10);
          if (
            sdkSwapSupportedChainIds
              ? !sdkSwapSupportedChainIds.has(chainId)
              : !SUPPORTED_RECEIVE_CHAIN_IDS.has(chainId)
          ) {
            continue;
          }
          if (
            !isSwapSupportedBySdkChainList(
              chainId,
              swapSupportedChainsAndTokens
            )
          ) {
            continue;
          }
          const meta = chainMetaMap.get(chainId) || {
            name: getShortChainName(chainId, `Chain ${chainId}`),
            logo: "",
          };
          for (const t of chains[chainIdStr]) {
            if (!t.address || !t.symbol) continue;
            allParsed.push({
              contractAddress: t.address,
              symbol: t.symbol,
              name: t.name || t.symbol,
              logo: t.logoURI || "",
              decimals: t.decimals ?? 18,
              priceUSD: t.priceUSD,
              chainId,
              chainName: meta.name,
              chainLogo: meta.logo,
              balance: "0",
              balanceInFiat: "$0.00",
              verificationStatus: t.verificationStatus,
            });
          }
        }
        const tokensByKey = new Map<string, ReceiveTokenOption>();
        for (const token of [...allParsed, ...getCitreaReceiveTokenOptions()]) {
          const address =
            token.contractAddress.toLowerCase() ===
            "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
              ? "0x0000000000000000000000000000000000000000"
              : token.contractAddress.toLowerCase();
          const key = `${token.chainId ?? 0}-${address}`;
          const existing = tokensByKey.get(key);
          tokensByKey.set(key, {
            ...existing,
            ...token,
            priceUSD: token.priceUSD ?? existing?.priceUSD,
          });
        }
        setApiTokens(Array.from(tokensByKey.values()));
      } catch (err) {
        console.error("Failed to fetch receive tokens", err);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchTokens();
    return () => {
      active = false;
    };
  }, [chainMetaMap, sdkSwapSupportedChainIds, swapSupportedChainsAndTokens]);

  const isNativeToken = (t: SwapTokenOption) =>
    t.contractAddress.toLowerCase() ===
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
    t.contractAddress.toLowerCase() ===
      "0x0000000000000000000000000000000000000000";

  const filtered = useMemo(() => {
    let result = tokensWithBalances.filter(
      (token) =>
        !excludedTokens.some((excludedToken) =>
          isSameTokenChainPair(token, excludedToken)
        ) &&
        (token.verificationStatus !== "flagged" ||
          token.hasBalance ||
          isNativeToken(token))
    );
    if (selectedChainFilter)
      result = result.filter((t) => t.chainId === selectedChainFilter);
    if (deferredQuery.trim()) {
      result = result.filter(
        (t) => getTokenSearchRank(t, deferredQuery) !== null
      );
    }
    if (activeTab === "native") result = result.filter(isNativeToken);
    else if (activeTab === "stables")
      result = result.filter((t) => dynamicStableSymbols.has(t.symbol));
    else if (activeTab === "custom")
      result = result.filter(
        (token) =>
          !isNativeToken(token) && !dynamicStableSymbols.has(token.symbol)
      );

    return result;
  }, [
    tokensWithBalances,
    selectedChainFilter,
    deferredQuery,
    activeTab,
    dynamicStableSymbols,
    excludedTokens,
  ]);

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aHasBalance = a.hasBalance === true;
      const bHasBalance = b.hasBalance === true;
      if (aHasBalance !== bHasBalance) return aHasBalance ? -1 : 1;

      const aFiat = parseFiatValue(a.balanceInFiat);
      const bFiat = parseFiatValue(b.balanceInFiat);
      if (aHasBalance && aFiat !== bFiat) return bFiat - aFiat;

      if (!aHasBalance) {
        const statusDifference =
          getTokenVerificationRank(a.verificationStatus) -
          getTokenVerificationRank(b.verificationStatus);
        if (statusDifference !== 0) return statusDifference;
      }

      if (deferredQuery.trim()) {
        const aRank = getTokenSearchRank(a, deferredQuery);
        const bRank = getTokenSearchRank(b, deferredQuery);
        const aScore = aRank?.score ?? Number.MAX_SAFE_INTEGER;
        const bScore = bRank?.score ?? Number.MAX_SAFE_INTEGER;
        if (aScore !== bScore) return aScore - bScore;

        const aMatched = aRank?.matchedTerms ?? 0;
        const bMatched = bRank?.matchedTerms ?? 0;
        if (aMatched !== bMatched) return bMatched - aMatched;
      }
      return `${a.symbol} ${a.chainName}`.localeCompare(
        `${b.symbol} ${b.chainName}`
      );
    });
  }, [filtered, deferredQuery]);

  const selectedChainMeta =
    selectedChainFilter === null
      ? undefined
      : chainMetaMap.get(selectedChainFilter);
  const selectedChainLabel =
    selectedChainFilter === null
      ? "All chains"
      : selectedChainMeta?.name || "Chain";

  return (
    <div
      ref={selectorRef}
      style={{
        boxSizing: "border-box",
        display: "flex",
        flex: "1 1 auto",
        flexDirection: "column",
        height: "100%",
        maxHeight: "100%",
        minHeight: 0,
        overflow: "hidden",
        padding: "16px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          minHeight: 32,
        }}
      >
        <button
          onClick={onBack}
          style={{
            width: 32,
            height: 32,
            borderRadius: 99,
            border: "1px solid #0000000A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FFFFFF",
            boxShadow: "#3C28640F 0px 1px 2px, #3C28640A 0px 2px 6px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <ChevronDown
            style={{
              color: "#5B5B5A",
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
            justifyContent: "center",
            minHeight: 32,
          }}
        >
          <span
            style={{
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: 16,
              fontWeight: 500,
              lineHeight: "22px",
              color: "#1F1F1F",
            }}
          >
            Choose assets to receive
          </span>
          <span
            style={{
              color: "#8E8E89",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: 13,
              lineHeight: "18px",
            }}
          >
            Select token and chain
          </span>
        </div>
      </div>

      <div
        style={{
          padding: "0 0 16px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 56,
            gap: 10,
            borderRadius: 14,
            border: "none",
            boxShadow: isSearchFocused
              ? "0 0 0 1px #A8C9FF, #3C28640F 0px 1px 2px inset"
              : "#3C28640F 0px 1px 2px inset",
            padding: "0 8px 0 14px",
            backgroundColor: "#FAFAFC",
          }}
        >
          <Search
            style={{ width: 18, height: 18, color: "#848483", flexShrink: 0 }}
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
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: 14,
              lineHeight: "20px",
              color: "#161615",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
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
              <X style={{ width: 16, height: 16, color: "#848483" }} />
            </button>
          )}
          <button
            onClick={openChainSelector}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 999,
              backgroundColor: "#FFFFFE",
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
                  color: "#161615",
                  flexShrink: 0,
                }}
              />
            ) : (
              <img
                alt={selectedChainLabel}
                src={selectedChainMeta?.logo}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "999px",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            )}
            <span
              style={{
                color: "#161615",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "14px",
                fontWeight: 500,
                lineHeight: "20px",
                maxWidth: "86px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {selectedChainLabel}
            </span>
            <ChevronDown style={{ width: 12, height: 12, color: "#848483" }} />
          </button>
        </div>

        {/* Filter tabs */}
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 0,
            backgroundColor: "#F5F6F8",
            borderRadius: 12,
            boxShadow: "#2A388B0F 0px 1px 2px inset",
            padding: 4,
          }}
        >
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                alignItems: "center",
                display: "flex",
                flex: 1,
                height: activeTab === tab.key ? 40 : 32,
                justifyContent: "center",
                padding: 0,
                backgroundColor:
                  activeTab === tab.key ? "#FFFFFF" : "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: 14,
                fontWeight: activeTab === tab.key ? 600 : 500,
                color: activeTab === tab.key ? "#1F1F1F" : "#8E8E89",
                boxShadow:
                  activeTab === tab.key
                    ? "#FFFFFFE6 0px 1px 0px inset, #3C286414 0px 1px 2px, #3C28640F 0px 2px 6px"
                    : "none",
                transition:
                  "background-color 150ms ease, box-shadow 150ms ease, color 150ms ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Token list */}
      <div
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
          if (scrollHeight - scrollTop - clientHeight < 200) {
            setVisibleCount((prev) => prev + 30);
          }
        }}
        ref={listRef}
        style={{
          flex: "1 1 auto",
          backgroundColor: "#FFFFFF",
          border: "1px solid #E8E8E7",
          borderRadius: 12,
          boxShadow: "#3C286426 0px 0px 2px, #3C28640A 0px 1px 4px",
          minHeight: 0,
          overflowX: "hidden",
          overflowY: "auto",
          position: "relative",
          zIndex: hoveredHash || tooltipState ? 20 : 1,
        }}
      >
        {isLoading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#848483",
              fontFamily: '"Geist", system-ui, sans-serif',
            }}
          >
            Loading...
          </div>
        ) : sortedFiltered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#848483",
              fontFamily: '"Geist", system-ui, sans-serif',
            }}
          >
            No tokens found
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {sortedFiltered.slice(0, visibleCount).map((t) => {
              const hash = `${t.chainId}-${t.contractAddress}`;
              const isSelected = selectedTokenHash === hash;
              const isHovered = hoveredHash === hash;
              const isInfoOpen = tooltipState?.hash === hash;
              const isDetailActive = isHovered || isInfoOpen;
              const numericBalance = Number.parseFloat(
                String(t.balance ?? "0").replace(/[^0-9.]/g, "")
              );
              const hasBalance =
                Number.isFinite(numericBalance) && numericBalance > 0;
              return (
                <button
                  key={hash}
                  onClick={() => {
                    setSelectedTokenHash(hash);
                    setSelectedTokenFull(t);
                    onSelect(t);
                  }}
                  onMouseEnter={() => setHoveredHash(hash)}
                  onMouseLeave={() => setHoveredHash(null)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    backgroundColor: isSelected ? "#F4F7FE" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    borderBottom: "1px solid #F0F0EF",
                    boxSizing: "border-box",
                    position: isDetailActive ? "relative" : "static",
                    zIndex: isDetailActive ? 50 : 1,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <RadioDot selected={isSelected} />
                    <div
                      style={{
                        position: "relative",
                        flexShrink: 0,
                        width: 40,
                        height: 40,
                      }}
                    >
                      <TokenLogo fontSize={16} size={40} token={t} />
                      {t.chainLogo && (
                        <img
                          alt={t.chainName}
                          src={t.chainLogo}
                          style={{
                            position: "absolute",
                            bottom: -8,
                            right: -8,
                            width: 22,
                            height: 22,
                            borderRadius: "999px",
                            border: "2px solid #FFFFFE",
                            zIndex: 2,
                          }}
                        />
                      )}
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
                          fontSize: 15,
                          color: "#161615",
                        }}
                      >
                        {t.symbol}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: '"Geist", system-ui, sans-serif',
                            fontSize: 13,
                            color: "#848483",
                          }}
                        >
                          {isDetailActive
                            ? `${t.contractAddress.slice(0, 6)}...${t.contractAddress.slice(-4)}`
                            : `on ${t.chainName || "Unknown chain"}`}
                        </span>
                        {isDetailActive && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {copiedHash === hash ? (
                              <Check
                                style={{
                                  width: 12,
                                  height: 12,
                                  color: "#006BF4",
                                }}
                              />
                            ) : (
                              <Copy
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(
                                    t.contractAddress
                                  );
                                  setCopiedHash(hash);
                                  setTimeout(() => setCopiedHash(null), 2000);
                                }}
                                style={{
                                  width: 12,
                                  height: 12,
                                  color: "#848483",
                                  cursor: "pointer",
                                }}
                              />
                            )}
                            <div
                              className="relative"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (tooltipState?.hash === hash) {
                                  setTooltipState(null);
                                } else {
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  setTooltipState({
                                    hash,
                                    x: rect.left + rect.width / 2,
                                    y: rect.top,
                                    t,
                                  });
                                }
                              }}
                            >
                              <Info
                                style={{
                                  width: 12,
                                  height: 12,
                                  color: "#848483",
                                  cursor: "pointer",
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {hasBalance && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: '"Geist", system-ui, sans-serif',
                          fontWeight: 500,
                          fontSize: 14,
                          color: "#161615",
                        }}
                      >
                        {formatTokenBalance(t.balance, {
                          symbol: t.symbol,
                          decimals: t.decimals,
                        }) ?? `${t.balance} ${t.symbol}`}
                      </span>
                      <span
                        style={{
                          fontFamily: '"Geist", system-ui, sans-serif',
                          fontSize: 13,
                          color: "#848483",
                        }}
                      >
                        {t.balanceInFiat}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
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
                      alignItems: "center",
                      backgroundColor: "#FFFFFE",
                      border: "1px solid #E8E8E7",
                      borderRadius: 8,
                      cursor: "pointer",
                      display: "flex",
                      flexShrink: 0,
                      height: 30,
                      justifyContent: "center",
                      width: 30,
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
                      fontFamily: '"Geist", system-ui, sans-serif',
                      fontWeight: 600,
                      fontSize: 17,
                      color: "#161615",
                    }}
                  >
                    Select chain
                  </span>
                </div>
                <div style={{ paddingBottom: 10 }}>
                  <div
                    style={{
                      alignItems: "center",
                      backgroundColor: "#FFFFFE",
                      border: `1px solid ${isChainSearchFocused ? "#A8C9FF" : "#E8E8E7"}`,
                      borderRadius: 11,
                      boxShadow: isChainSearchFocused
                        ? "0 0 0 1px rgba(0,107,244,0.16)"
                        : "none",
                      display: "flex",
                      gap: 8,
                      height: 38,
                      padding: "0 12px",
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
                        backgroundColor: "transparent",
                        border: "none",
                        color: "#161615",
                        flex: 1,
                        fontFamily: '"Geist", system-ui, sans-serif',
                        fontSize: 13,
                        minWidth: 0,
                        outline: "none",
                      }}
                      value={chainQuery}
                    />
                  </div>
                </div>
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
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginLeft: 10,
                        }}
                      >
                        <Globe
                          style={{
                            width: 28,
                            height: 28,
                            color: "#161615",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: '"Geist", system-ui, sans-serif',
                            fontWeight: 500,
                            fontSize: 14,
                            color: "#161615",
                          }}
                        >
                          All Chains
                        </span>
                      </div>
                    </button>
                    {chainFilterIds
                      .filter((id) => {
                        const meta = chainMetaMap.get(id);
                        return (meta?.name || "")
                          .toLowerCase()
                          .includes(chainQuery.toLowerCase());
                      })
                      .map((id) => {
                        const meta = chainMetaMap.get(id);
                        if (!meta) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => {
                              setSelectedChainFilter(id);
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
                            <RadioDot selected={selectedChainFilter === id} />
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginLeft: 10,
                              }}
                            >
                              <img
                                src={meta.logo}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "999px",
                                  objectFit: "cover",
                                }}
                              />
                              <span
                                style={{
                                  fontFamily: '"Geist", system-ui, sans-serif',
                                  fontWeight: 500,
                                  fontSize: 14,
                                  color: "#161615",
                                }}
                              >
                                {meta.name}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          );
          return portalRoot ? createPortal(chainModal, portalRoot) : chainModal;
        })()}

      {/* Portal Tooltip */}
      {tooltipState &&
        typeof window !== "undefined" &&
        (() => {
          const explorerUrl = tooltipState.t.chainId
            ? CHAIN_METADATA[tooltipState.t.chainId]?.blockExplorerUrls?.[0]
            : null;

          return createPortal(
            <div
              className="w-[280px] bg-white border border-[#E8E8E7] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-4 text-left"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                top: tooltipState.y - 12,
                left: tooltipState.x,
                transform: "translate(-50%, -100%)",
                zIndex: 2147483647,
                display: "flex",
                flexDirection: "column",
                pointerEvents: "auto",
              }}
            >
              {/* Triangle pointer */}
              <div
                style={{
                  position: "absolute",
                  bottom: "-6px",
                  left: "50%",
                  transform: "translateX(-50%) rotate(45deg)",
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#fff",
                  borderRight: "1px solid #E8E8E7",
                  borderBottom: "1px solid #E8E8E7",
                  zIndex: 1,
                }}
              ></div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <div style={{ position: "relative", width: 24, height: 24 }}>
                  <TokenLogo fontSize={10} size={24} token={tooltipState.t} />
                  {tooltipState.t.chainLogo && (
                    <img
                      alt={tooltipState.t.chainName}
                      src={tooltipState.t.chainLogo}
                      style={{
                        position: "absolute",
                        bottom: -4,
                        right: -4,
                        width: 10,
                        height: 10,
                        borderRadius: "999px",
                        border: "1px solid #FFFFFE",
                        zIndex: 2,
                      }}
                    />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontFamily: '"Geist", system-ui, sans-serif',
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#161615",
                    }}
                  >
                    {tooltipState.t.name}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <span
                  style={{
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: 12,
                    color: "#848483",
                  }}
                >
                  Symbol:
                </span>
                <span
                  style={{
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: 12,
                    color: "#161615",
                    fontWeight: 500,
                  }}
                >
                  {tooltipState.t.symbol}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <span
                  style={{
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: 12,
                    color: "#848483",
                  }}
                >
                  Decimals:
                </span>
                <span
                  style={{
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: 12,
                    color: "#161615",
                    fontWeight: 500,
                  }}
                >
                  {tooltipState.t.decimals}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <span
                  style={{
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: 12,
                    color: "#848483",
                  }}
                >
                  Contract address:
                </span>
                {explorerUrl ? (
                  <a
                    href={`${explorerUrl}/address/${tooltipState.t.contractAddress}`}
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: '"Geist", system-ui, sans-serif',
                      fontSize: 11,
                      color: "#006BF4",
                      wordBreak: "break-all",
                      textDecoration: "underline",
                      outline: "none",
                      cursor: "pointer",
                    }}
                    target="_blank"
                  >
                    {tooltipState.t.contractAddress}
                  </a>
                ) : (
                  <span
                    style={{
                      fontFamily: '"Geist", system-ui, sans-serif',
                      fontSize: 11,
                      color: "#161615",
                      wordBreak: "break-all",
                    }}
                  >
                    {tooltipState.t.contractAddress}
                  </span>
                )}
              </div>
            </div>,
            document.body
          );
        })()}
    </div>
  );
}
