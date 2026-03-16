"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DEFAULT_CHAIN_SLUG,
  getChainSettings,
  isValidChainSlug,
} from "@/config/chain-settings";
import type { AppConfig, ChainFeatures } from "@/types/runtime";
import { defaultChainFeatures } from "@/types/runtime";

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const LS_CHAIN_KEY = "fastbridge:lastChain";
const LS_TOKEN_KEY = "fastbridge:lastToken";

export function loadLastChain(): string {
  try {
    return localStorage.getItem(LS_CHAIN_KEY) ?? DEFAULT_CHAIN_SLUG;
  } catch {
    return DEFAULT_CHAIN_SLUG;
  }
}

function persistChain(slug: string): void {
  try {
    localStorage.setItem(LS_CHAIN_KEY, slug);
  } catch {
    /* storage full or blocked — ignore */
  }
}

export function loadLastToken(): string {
  try {
    return localStorage.getItem(LS_TOKEN_KEY) ?? "USDC";
  } catch {
    return "USDC";
  }
}

export function persistToken(symbol: string): void {
  try {
    localStorage.setItem(LS_TOKEN_KEY, symbol);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface RuntimeContextValue {
  appConfig: AppConfig;
  chainFeatures: ChainFeatures;
  chainSlug: string;
  setChain: (slug: string) => void;
}

const RuntimeContext = createContext<RuntimeContextValue | undefined>(
  undefined
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const { chain } = useParams<{ chain: string }>();
  const navigate = useNavigate();

  // Resolve the active slug, with redirect for invalid/missing routes
  const resolvedSlug = useMemo(() => {
    if (chain && isValidChainSlug(chain)) {
      return chain;
    }
    return undefined; // triggers redirect
  }, [chain]);

  // Redirect invalid slugs to the last-used chain (or default)
  useEffect(() => {
    if (resolvedSlug === undefined) {
      const target = loadLastChain();
      navigate(`/${target}`, { replace: true });
    }
  }, [resolvedSlug, navigate]);

  // Persist valid chain to localStorage
  useEffect(() => {
    if (resolvedSlug) {
      persistChain(resolvedSlug);
    }
  }, [resolvedSlug]);

  const activeSlug = resolvedSlug ?? DEFAULT_CHAIN_SLUG;
  const settings = useMemo(() => getChainSettings(activeSlug), [activeSlug]);

  // Update document metadata when chain changes (client-side, for aesthetics)
  useEffect(() => {
    const { meta, appTitle } = settings.appConfig;
    const title = meta.title || appTitle;

    // Title
    document.title = title;

    const setMeta = (selector: string, value: string) => {
      const el = document.querySelector(selector) as HTMLMetaElement | null;
      if (el) {
        el.content = value;
      }
    };

    // Standard
    setMeta('meta[name="title"]', title);
    setMeta('meta[name="description"]', meta.description);
    setMeta('meta[name="theme-color"]', meta.themeColor);

    // Canonical
    const canonical = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (canonical) {
      canonical.href = meta.canonicalUrl;
    }

    // Favicon
    const favicon = document.querySelector(
      'link[rel="icon"]'
    ) as HTMLLinkElement | null;
    if (favicon) {
      favicon.href = meta.faviconUrl;
    }

    // Open Graph
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', meta.description);
    setMeta('meta[property="og:url"]', meta.canonicalUrl);
    setMeta('meta[property="og:image"]', meta.imageUrl);

    // Twitter / X
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', meta.description);
    setMeta('meta[name="twitter:image"]', meta.imageUrl);
    setMeta('meta[name="twitter:site"]', meta.canonicalUrl);
  }, [settings]);

  const setChain = useCallback(
    (slug: string) => {
      if (!isValidChainSlug(slug)) {
        return;
      }
      // Use View Transitions API for smooth theme swap, with fallback
      const doNavigate = () => {
        navigate(`/${slug}`);
      };

      if (
        typeof document !== "undefined" &&
        "startViewTransition" in document
      ) {
        (
          document as Document & {
            startViewTransition: (cb: () => void) => void;
          }
        ).startViewTransition(doNavigate);
      } else {
        doNavigate();
      }
    },
    [navigate]
  );

  const value = useMemo<RuntimeContextValue>(
    () => ({
      appConfig: settings.appConfig,
      chainFeatures: { ...defaultChainFeatures, ...settings.chainFeatures },
      chainSlug: activeSlug,
      setChain,
    }),
    [settings, activeSlug, setChain]
  );

  // Don't render children until we've resolved a valid slug
  if (resolvedSlug === undefined) {
    return null;
  }

  return (
    <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRuntime(): RuntimeContextValue {
  const ctx = useContext(RuntimeContext);
  if (!ctx) {
    throw new Error("useRuntime must be used within a RuntimeProvider");
  }
  return ctx;
}
