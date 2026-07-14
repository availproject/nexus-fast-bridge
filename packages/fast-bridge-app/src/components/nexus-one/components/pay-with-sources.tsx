// biome-ignore-all lint: NexusOne registry component from shadcn registry.

import Decimal from "decimal.js";
import { Loader2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import type { SwapTokenOption } from "./swap-asset-selector";

const uiFont = '"Geist", system-ui, sans-serif';
const primary = "#161615";
const muted = "#848483";
const brand = "#006BF4";

function TokenLogo({
  src,
  label,
  size = 28,
  style,
}: {
  src?: string;
  label?: string;
  size?: number;
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
          backgroundColor: "#FFFFFE",
          borderRadius: "999px",
          height: size,
          objectFit: "cover",
          width: size,
          ...style,
        }}
      />
    );
  }

  return (
    <span
      style={{
        alignItems: "center",
        backgroundColor: "#E8F0FF",
        borderRadius: "999px",
        color: brand,
        display: "inline-flex",
        fontFamily: uiFont,
        fontSize: Math.max(10, Math.round(size * 0.4)),
        fontWeight: 700,
        height: size,
        justifyContent: "center",
        width: size,
        ...style,
      }}
    >
      {(label || "?").trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

function SkeletonSummary() {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        gap: "12px",
        width: "100%",
      }}
    >
      <div
        className="animate-pulse"
        style={{
          background:
            "linear-gradient(90deg, #F0F0EF 0%, #F7F7F6 48%, #F0F0EF 100%)",
          backgroundSize: "200% 100%",
          borderRadius: "999px",
          height: "28px",
          width: "72px",
        }}
      />
      <div
        className="animate-pulse"
        style={{
          background:
            "linear-gradient(90deg, #F0F0EF 0%, #F7F7F6 48%, #F0F0EF 100%)",
          backgroundSize: "200% 100%",
          borderRadius: "6px",
          height: "16px",
          width: "68%",
        }}
      />
    </div>
  );
}

const getSourceTokenKey = (token: SwapTokenOption) =>
  `${token.chainId ?? "unified"}:${token.contractAddress.toLowerCase()}`;

const getConcreteSourceTokens = (tokens: SwapTokenOption[]) => {
  const concreteTokens = tokens.flatMap((token) =>
    token.isUnified && token.sourceTokens?.length ? token.sourceTokens : [token]
  );
  const uniqueTokens = new Map<string, SwapTokenOption>();
  for (const token of concreteTokens) {
    uniqueTokens.set(getSourceTokenKey(token), token);
  }
  return [...uniqueTokens.values()];
};

const pluralize = (count: number, singular: string) =>
  `${count} ${singular}${count === 1 ? "" : "s"}`;

const parseAmount = (value: unknown) => {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return undefined;
  try {
    const amount = new Decimal(cleaned);
    return amount.isFinite() ? amount : undefined;
  } catch {
    return undefined;
  }
};

const formatSourceAmount = (token: SwapTokenOption) => {
  const amount = parseAmount(token.userAmount || token.balance);
  if (!amount) return token.symbol;
  return `${amount.toDecimalPlaces(6).toFixed()} ${token.symbol}`;
};

const formatSourceUsd = (token: SwapTokenOption) => {
  const quotedUsd = parseAmount(token.userAmountUsd);
  if (quotedUsd) return `$${quotedUsd.toDecimalPlaces(2).toFixed(2)}`;

  const balance = parseAmount(token.balance);
  const balanceUsd = parseAmount(token.balanceInFiat);
  const selectedAmount = parseAmount(token.userAmount);
  const selectedUsd =
    selectedAmount && balance?.gt(0) && balanceUsd
      ? selectedAmount.mul(balanceUsd).div(balance)
      : balanceUsd;
  return selectedUsd ? `$${selectedUsd.toDecimalPlaces(2).toFixed(2)}` : "";
};

export function PayWithSources({
  fromTokens,
  onOpenSourcePicker,
  routeStatus,
  routeMessage,
  showAutoBadge = true,
  isSourcePickerDisabled = false,
}: {
  fromTokens: SwapTokenOption[];
  onOpenSourcePicker: () => void;
  routeStatus?: "loading" | "insufficient";
  routeMessage?: string;
  showAutoBadge?: boolean;
  isSourcePickerDisabled?: boolean;
  reserveSourceRows?: boolean;
}) {
  const sourceTokens = useMemo(
    () => getConcreteSourceTokens(fromTokens),
    [fromTokens]
  );
  const sourceChainCount = useMemo(
    () =>
      new Set(
        sourceTokens
          .map((token) => token.chainId)
          .filter((chainId): chainId is number => chainId !== undefined)
      ).size,
    [sourceTokens]
  );
  const visibleLogoTokens = sourceTokens.slice(0, 3);
  const hiddenLogoCount = Math.max(0, sourceTokens.length - 3);
  const hasSources = sourceTokens.length > 0;
  const isRouteLoading = routeStatus === "loading";
  const editDisabled = isSourcePickerDisabled || !hasSources;
  const selectionLabel = showAutoBadge ? "Auto-selected" : "Manually selected";
  const sourceSummary = `Pay with ${pluralize(sourceTokens.length, "token")} across ${pluralize(sourceChainCount, "chain")} · auto-converted to selected chains`;

  return (
    <div
      style={{
        alignItems: "stretch",
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        boxShadow: "#3C286433 0px 0px 3px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "flex-start",
          display: "flex",
          gap: "4px",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "flex-start",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span
            style={{
              color: primary,
              fontFamily: uiFont,
              fontSize: "15px",
              fontWeight: 500,
              lineHeight: "18px",
            }}
          >
            Send
          </span>
          <span
            style={{
              color: "#9A9A99",
              fontFamily: uiFont,
              fontSize: "14px",
              lineHeight: "16px",
            }}
          >
            {selectionLabel}
          </span>
        </div>

        <button
          disabled={editDisabled}
          onClick={onOpenSourcePicker}
          style={{
            alignItems: "center",
            backgroundColor: editDisabled ? "#F5F6F8" : "#FFFFFF",
            border: "1px solid #0000000A",
            borderRadius: "999px",
            boxShadow: editDisabled ? "none" : "#3C28640F 0px 1px 2px",
            color: editDisabled ? "#B6B6B3" : "#9E9E9C",
            cursor: editDisabled ? "not-allowed" : "pointer",
            display: "flex",
            flexShrink: 0,
            fontFamily: uiFont,
            fontSize: "13px",
            fontWeight: 500,
            lineHeight: "16px",
            padding: "6px 14px",
          }}
          type="button"
        >
          Edit
        </button>
      </div>

      {hasSources ? (
        <div
          style={{
            alignItems: "flex-start",
            display: "flex",
            gap: "12px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexShrink: 0,
            }}
          >
            {visibleLogoTokens.map((token, index) => (
              <TokenLogo
                key={getSourceTokenKey(token)}
                label={token.symbol}
                src={token.logo}
                style={{
                  flexShrink: 0,
                  marginLeft: index === 0 ? 0 : "-8px",
                  outline: "2px solid #FFFFFE",
                }}
              />
            ))}
            {hiddenLogoCount > 0 && (
              <span
                style={{
                  alignItems: "center",
                  backgroundColor: "#F0F0EF",
                  borderRadius: "999px",
                  color: muted,
                  display: "flex",
                  flexShrink: 0,
                  fontFamily: uiFont,
                  fontSize: "11px",
                  fontWeight: 500,
                  height: "28px",
                  justifyContent: "center",
                  lineHeight: "12px",
                  marginLeft: "-8px",
                  outline: "2px solid #FFFFFE",
                  width: "28px",
                }}
              >
                +{hiddenLogoCount}
              </span>
            )}
          </div>
          <span
            style={{
              color: muted,
              flex: 1,
              fontFamily: uiFont,
              fontSize: "14px",
              lineHeight: "16px",
              minWidth: 0,
            }}
          >
            {sourceSummary}
          </span>
        </div>
      ) : isRouteLoading ? (
        <SkeletonSummary />
      ) : (
        <span
          style={{
            color: muted,
            fontFamily: uiFont,
            fontSize: "14px",
            lineHeight: "16px",
          }}
        >
          Source assets will be auto-selected after you set a receive amount.
        </span>
      )}

      {isRouteLoading && (
        <div
          style={{
            alignItems: "center",
            color: brand,
            display: "flex",
            fontFamily: uiFont,
            fontSize: "12px",
            gap: "6px",
            lineHeight: "16px",
          }}
        >
          <Loader2 className="animate-spin" size={14} />
          Calculating best route...
        </div>
      )}

      {routeStatus === "insufficient" && hasSources && (
        <div
          style={{
            borderTop: "1px solid #ECECEB",
            display: "flex",
            flexDirection: "column",
            maxHeight: "220px",
            overflowY: sourceTokens.length > 3 ? "auto" : undefined,
          }}
        >
          {sourceTokens.map((token, index) => {
            const sourceUsd = formatSourceUsd(token);
            return (
              <div
                key={getSourceTokenKey(token)}
                style={{
                  alignItems: "center",
                  borderTop: index === 0 ? "none" : "1px solid #F0F0EF",
                  display: "flex",
                  justifyContent: "space-between",
                  minHeight: "58px",
                  padding: "8px 0",
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
                  <TokenLogo label={token.symbol} size={32} src={token.logo} />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        color: primary,
                        fontFamily: uiFont,
                        fontSize: "14px",
                        fontWeight: 500,
                        lineHeight: "18px",
                      }}
                    >
                      {token.symbol}
                    </span>
                    <span
                      style={{
                        color: muted,
                        fontFamily: uiFont,
                        fontSize: "13px",
                        lineHeight: "16px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      on {token.chainName || "Unknown chain"}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    alignItems: "flex-end",
                    display: "flex",
                    flexDirection: "column",
                    flexShrink: 0,
                    gap: "3px",
                    textAlign: "right",
                  }}
                >
                  <span
                    style={{
                      color: primary,
                      fontFamily: uiFont,
                      fontSize: "14px",
                      fontWeight: 500,
                      lineHeight: "18px",
                    }}
                  >
                    {formatSourceAmount(token)}
                  </span>
                  {sourceUsd && (
                    <span
                      style={{
                        color: muted,
                        fontFamily: uiFont,
                        fontSize: "13px",
                        lineHeight: "16px",
                      }}
                    >
                      {sourceUsd}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {routeStatus === "insufficient" && routeMessage && (
        <span
          style={{
            color: "#E92C2C",
            fontFamily: uiFont,
            fontSize: "13px",
            lineHeight: "18px",
          }}
        >
          {routeMessage}
        </span>
      )}
    </div>
  );
}
