import { useCallback, useEffect, useState } from "react";
import { useNexus } from "../../nexus/nexus-provider";
import { INTENT_HISTORY_REFRESH_EVENT } from "../history-events";

const ITEMS_PER_PAGE = 10;
const SDK_INTENT_PAGE_LIMIT = 20;

type NexusIntentStatus = "created" | "deposited" | "fulfilled" | "expired";

interface NexusIntentRecord {
  destinationChain?: {
    id?: number | string;
    logo?: string;
    name?: string;
  };
  destinations: {
    amount?: string;
    token: {
      logo?: string;
      symbol: string;
    };
  }[];
  expiry: number;
  explorerUrl?: string;
  requestHash: string;
  sources?: {
    chain?: {
      id?: number | string;
      logo?: string;
      name?: string;
    };
  }[];
  status: NexusIntentStatus;
}

interface NexusIntentListResult {
  intents: NexusIntentRecord[];
  total: number;
}

export interface IntentHistoryItem {
  destinationChain?: NexusIntentRecord["destinationChain"];
  destinations: NexusIntentRecord["destinations"];
  expiry: number;
  explorerUrl?: string;
  id: string;
  requestHash: string;
  sources?: NexusIntentRecord["sources"];
  status: NexusIntentStatus;
}

type IntentHistoryClient = {
  listIntents?: (params?: {
    page?: number;
    status?: NexusIntentStatus;
  }) => Promise<NexusIntentListResult | null | undefined>;
};

const normalizeIntentRecord = (
  intent: NexusIntentRecord
): IntentHistoryItem => ({
  destinationChain: intent.destinationChain,
  destinations: intent.destinations ?? [],
  expiry: intent.expiry,
  explorerUrl: intent.explorerUrl,
  id: intent.requestHash,
  requestHash: intent.requestHash,
  sources: intent.sources,
  status: intent.status,
});

function formatExpiryDate(timestamp: number) {
  const date = new Date(timestamp * 1000);
  const formatted = date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  return formatted.replace(" ", ", ");
}

const useViewHistory = () => {
  const { nexusSDK } = useNexus();
  const [history, setHistory] = useState<IntentHistoryItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [displayedHistory, setDisplayedHistory] = useState<IntentHistoryItem[]>(
    []
  );
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null);

  const observerTarget = useCallback((node: HTMLDivElement | null) => {
    setSentinelNode(node);
  }, []);

  const fetchIntentHistory = useCallback(async () => {
    if (!nexusSDK) {
      return;
    }
    try {
      const historyClient = nexusSDK as IntentHistoryClient;
      if (typeof historyClient.listIntents !== "function") {
        setLoadError(null);
        setHistory([]);
        setDisplayedHistory([]);
        setPage(0);
        setHasMore(false);
        return;
      }

      const nextHistory: IntentHistoryItem[] = [];
      let currentPage = 1;
      let total = Number.POSITIVE_INFINITY;

      while (nextHistory.length < total) {
        const result = await historyClient.listIntents({ page: currentPage });
        const intents = result?.intents ?? [];
        total = Number.isFinite(result?.total)
          ? (result?.total ?? intents.length)
          : intents.length;

        if (intents.length === 0) {
          break;
        }

        nextHistory.push(...intents.map(normalizeIntentRecord));

        if (intents.length < SDK_INTENT_PAGE_LIMIT) {
          break;
        }
        currentPage += 1;
      }

      setLoadError(null);
      setHistory(nextHistory);
      const firstPage = nextHistory.slice(0, ITEMS_PER_PAGE);
      setDisplayedHistory(firstPage);
      setPage(0);
      setHasMore(nextHistory.length > ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching intent history:", error);
      setLoadError("Please check your wallet connection and try again.");
      setHistory([]);
      setDisplayedHistory([]);
      setPage(0);
      setHasMore(false);
    }
  }, [nexusSDK]);

  useEffect(() => {
    fetchIntentHistory().catch((error) => {
      console.error("Failed to fetch intent history:", error);
    });
  }, [fetchIntentHistory]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleRefresh = () => {
      fetchIntentHistory().catch((error) => {
        console.error("Failed to refresh intent history:", error);
      });
    };

    window.addEventListener(INTENT_HISTORY_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(INTENT_HISTORY_REFRESH_EVENT, handleRefresh);
    };
  }, [fetchIntentHistory]);

  const loadMore = useCallback(() => {
    if (!history || isLoadingMore || !hasMore) {
      return;
    }
    setIsLoadingMore(true);

    setTimeout(() => {
      const nextPage = page + 1;
      const startIndex = nextPage * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const newItems = history.slice(startIndex, endIndex);

      if (newItems.length > 0) {
        setDisplayedHistory((prev) => [...prev, ...newItems]);
        setPage(nextPage);
        setHasMore(endIndex < history.length);
      } else {
        setHasMore(false);
      }

      setIsLoadingMore(false);
    }, 300);
  }, [history, page, isLoadingMore, hasMore]);

  useEffect(() => {
    if (!sentinelNode) {
      return;
    }

    const rootElement = sentinelNode.parentElement;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, root: rootElement ?? null }
    );

    observer.observe(sentinelNode);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, loadMore, sentinelNode]);

  const getStatus = (pastIntent: IntentHistoryItem) => {
    if (pastIntent.status === "fulfilled") {
      return "Fulfilled";
    }
    if (pastIntent.status === "deposited") {
      return "Deposited";
    }
    if (pastIntent.status === "created") {
      return "Created";
    }
    if (pastIntent.status === "expired") {
      return "Expired";
    }
    return "Failed";
  };

  return {
    history,
    loadError,
    displayedHistory,
    page,
    hasMore,
    isLoadingMore,
    getStatus,
    observerTarget,
    refreshHistory: fetchIntentHistory,
    ITEMS_PER_PAGE,
    formatExpiryDate,
  };
};

export default useViewHistory;
