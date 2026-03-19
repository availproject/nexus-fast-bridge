import { useMemo } from "react";
import { useTokenPrice } from "../utils/token-pricing";

// Keep the regex at module scope to avoid re-creation on every render.
const TRAILING_ZEROS_REGEX = /\.?0+$/;

/**
 * Converts a USD dollar cap into a maximum token amount string.
 *
 * Rules:
 * - USDC / USDT / USDM are treated as 1:1 with USD (price = 1), so the cap
 *   passes through directly (e.g. $550 → "550").
 * - ETH / WETH fetch a live price from Binance (CoinGecko fallback).
 *   Returns undefined while the price is still loading (0), so callers
 *   should treat undefined as "no cap applied yet".
 * - Unknown tokens: returns undefined (no cap).
 *
 * @param usdLimit   Dollar limit (e.g., 550 or 5000). Pass undefined to
 *                   disable capping.
 * @param token      Token symbol (e.g., "USDC", "ETH", "USDM").
 * @returns          Max token amount as a decimal string, or undefined when
 *                   the price is not yet available or the token is unknown.
 */
export function useUsdMaxAmount(
  usdLimit: number | undefined,
  token: string | undefined
): string | undefined {
  // USDM is pegged 1:1 to USD like USDC — use USDC for the price lookup.
  const priceSymbol = useMemo(() => {
    if (!token) {
      return undefined;
    }
    const upper = token.toUpperCase();
    if (upper === "USDM") {
      return "USDC";
    }
    return upper;
  }, [token]);

  const tokenPrice = useTokenPrice(priceSymbol);

  return useMemo(() => {
    if (usdLimit === undefined || usdLimit === null) {
      return undefined;
    }
    // Stablecoin: always 1:1 USD — no async price needed, return immediately.
    const upper = token?.toUpperCase() ?? "";
    if (["USDC", "USDT", "USDM"].includes(upper)) {
      return String(usdLimit);
    }
    // For non-stables: wait until the live price has loaded.
    if (!tokenPrice || tokenPrice <= 0) {
      return undefined;
    }
    // Compute: tokenAmount = usdLimit / tokenPrice, rounded to 6 d.p.
    const tokenAmount = usdLimit / tokenPrice;
    return tokenAmount.toFixed(6).replace(TRAILING_ZEROS_REGEX, "");
  }, [usdLimit, token, tokenPrice]);
}
