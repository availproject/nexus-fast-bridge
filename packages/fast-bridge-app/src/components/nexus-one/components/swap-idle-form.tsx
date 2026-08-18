// biome-ignore-all lint: NexusOne registry component from shadcn registry.

import Decimal from "decimal.js";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AddressIdenticon } from "./address-identicon";
import {
  formatSelectedTokenBalanceLabel,
  formatTokenAmountDisplay,
  formatUsdBalanceLabel,
  type SwapTokenOption,
} from "./swap-asset-selector";

const tabularNums: React.CSSProperties = {
  fontFeatureSettings: '"tnum"',
  fontVariantNumeric: "tabular-nums",
};

const ASSET_DROPDOWN_SHADOW =
  "0 0 12px 0 rgba(61, 123, 255, 0.15), 0 2px 6px 0 rgba(60, 40, 100, 0.06), 0 1px 2px 0 rgba(60, 40, 100, 0.08), 0 1px 0 0 rgba(255, 255, 255, 0.90) inset";

interface SwapIdleFormProps {
  amount: string;
  defaultRecipientAddress?: string;
  destinationGasFeeUsd?: string;
  fromTokens: SwapTokenOption[];
  getTokenUsdRate?: (token: SwapTokenOption) => number;
  intentData?: any;
  isExpanded?: boolean;
  isLoadingBalances?: boolean;
  isMultiAssetMode?: boolean;
  isReceiveAmountLoading?: boolean;
  isReceiveUsdLoading?: boolean;
  isSourcePickerDisabled?: boolean;
  missingUsd?: string;
  needsWalletConnection?: boolean;
  onAmountChange: (val: string, panel: "send" | "receive") => void;
  onOpenDestPicker: () => void;
  onOpenRecipientPicker?: () => void;
  onOpenSourcePicker: (index?: number) => void;
  onRestoreAuto?: () => void;
  onSetPercent?: (pct: number) => void;
  onToggleExpand?: () => void;
  onUpdateTokens?: (tokens: SwapTokenOption[]) => void;
  receiveQuoteAmount?: string;
  receiveQuoteUsd?: string;
  recipientAddress?: string;
  showRestoreAuto?: boolean;
  sourceRouteMessage?: string;
  sourceRouteStatus?: "loading" | "insufficient";
  swapType: "exactIn" | "exactOut";
  toToken?: SwapTokenOption;
  totalBalance: string;
  totalFeeUsd?: string;
  usdValue: string;
}

/** Chevron down icon used in asset selector pills */
const ChevronDownIcon = ({ color = "#3D7BFF" }: { color?: string }) => (
  <svg
    height="10"
    style={{ width: "12px", height: "12px", flexShrink: 0 }}
    viewBox="0 0 10 10"
    width="10"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2 3.5L5 6.5L8 3.5"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

const ArrowUpDownIcon = () => (
  <svg
    height="12"
    style={{ flexShrink: 0 }}
    viewBox="0 0 24 24"
    width="12"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M7 15L7 3M7 3L11 7M7 3L3 7M17 9L17 21M17 21L13 17M17 21L21 17"
      fill="none"
      stroke="#848483"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

/** Reusable percentage quick-select buttons row with transition wrapper */
export function PercentButtons({
  disabled = false,
  visible = true,
  onSelect,
  maxLabel = "Max",
  selectedPct,
}: {
  disabled?: boolean;
  visible?: boolean;
  onSelect: (pct: number) => void;
  maxLabel?: string;
  selectedPct?: number | null;
}) {
  const [hoveredPct, setHoveredPct] = useState<number | null>(null);
  const [internalSelectedPct, setInternalSelectedPct] = useState<number | null>(
    null
  );

  const activePct =
    selectedPct !== undefined ? selectedPct : internalSelectedPct;

  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: "#F0F3F9",
        borderRadius: "8px",
        boxShadow: "0 1px 2px 0 rgba(42, 56, 139, 0.06) inset",
        boxSizing: "border-box",
        display: "flex",
        flexShrink: 0,
        gap: "2px",
        padding: "2px",
        opacity: visible ? 1 : 0,
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.18s ease-out, visibility 0.18s ease-out",
        width: "121px",
        height: "26px",
      }}
    >
      {[20, 50, 100].map((pct) => {
        const label = pct === 100 ? maxLabel : `${pct}%`;
        const isHovered = hoveredPct === pct;
        const isSelected = activePct === pct;

        return (
          <button
            disabled={disabled}
            key={pct}
            onClick={(e) => {
              e.stopPropagation();
              if (disabled) return;
              setInternalSelectedPct(pct);
              onSelect(pct);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onMouseEnter={() => setHoveredPct(pct)}
            onMouseLeave={() => setHoveredPct(null)}
            style={{
              alignItems: "center",
              backgroundColor: isSelected
                ? "#FFFFFF"
                : isHovered
                  ? "#FFFFFF"
                  : "transparent",
              borderRadius: "6px",
              boxShadow: isSelected
                ? "0 1px 3px 0 rgba(42, 56, 139, 0.14), 0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                : isHovered
                  ? "0 1px 2px rgba(42, 56, 139, 0.08)"
                  : "none",
              boxSizing: "border-box",
              color: isSelected ? "#006BF4" : "#1F1F1F",
              cursor: disabled ? "default" : "pointer",
              display: "flex",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "11px",
              fontWeight: isSelected ? 600 : 500,
              height: "22px",
              justifyContent: "center",
              flex: "1 1 0%",
              minWidth: 0,
              opacity: disabled ? 0.55 : 1,
              padding: "0",
              border: "none",
              transition: "all 0.15s ease-out",
            }}
            tabIndex={-1}
            type="button"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function UnifiedTokenLogoBadge({
  token,
  size = 24,
}: {
  token: SwapTokenOption;
  size?: number;
}) {
  const [popover, setPopover] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const sources = token.sourceTokens ?? [];
  const chainCount =
    new Set(
      sources
        .map((source) => source.chainId ?? source.chainName)
        .filter(Boolean)
    ).size || sources.length;

  const showPopover = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect || typeof window === "undefined") return;
    const width = 250;
    const maxHeight = 260;
    const viewportPadding = 8;
    const left = Math.min(
      Math.max(viewportPadding, rect.right - width),
      window.innerWidth - width - viewportPadding
    );
    const belowTop = rect.bottom + 8;
    const top =
      belowTop + maxHeight > window.innerHeight
        ? Math.max(viewportPadding, rect.top - maxHeight - 8)
        : belowTop;
    setPopover({ left, top, width, maxHeight });
  };

  return (
    <div
      onMouseEnter={showPopover}
      onMouseLeave={() => setPopover(null)}
      ref={triggerRef}
      style={{
        boxSizing: "border-box",
        flexShrink: 0,
        height: `${size}px`,
        position: "relative",
        width: `${size}px`,
      }}
    >
      <LogoCircle
        alt={token.symbol}
        fontSize={Math.max(9, Math.floor(size / 2))}
        label={token.symbol}
        size={size}
        src={token.logo}
      />
      {chainCount > 0 && (
        <div
          style={{
            alignItems: "center",
            backgroundColor: "#006BF4",
            border: "1px solid #FFFFFE",
            borderRadius: "999px",
            bottom: -3,
            boxSizing: "border-box",
            color: "#FFFFFE",
            display: "flex",
            fontFamily: '"Geist", system-ui, sans-serif',
            fontSize: "8px",
            fontWeight: 700,
            height: "12px",
            justifyContent: "center",
            lineHeight: "14px",
            minWidth: "12px",
            paddingInline: chainCount > 9 ? "3px" : 0,
            position: "absolute",
            right: -3,
          }}
        >
          {chainCount}
        </div>
      )}
      {popover &&
        sources.length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              backgroundColor: "#FFFFFE",
              border: "1px solid #E8E8E7",
              borderRadius: "10px",
              boxShadow: "0 10px 28px rgba(22, 22, 21, 0.14)",
              boxSizing: "border-box",
              ...tabularNums,
              left: popover.left,
              maxHeight: popover.maxHeight,
              overflowY: "auto",
              padding: "12px",
              pointerEvents: "none",
              position: "fixed",
              top: popover.top,
              width: popover.width,
              zIndex: 2147483647,
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  color: "#848483",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  lineHeight: "16px",
                  textTransform: "uppercase",
                }}
              >
                Unified · {chainCount} {chainCount === 1 ? "Chain" : "Chains"}
              </span>
              <span
                style={{
                  color: "#161615",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "15px",
                  fontWeight: 700,
                  lineHeight: "16px",
                }}
              >
                ≈ {formatUsdBalanceLabel(token.balanceInFiat)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {sources.map((source) => (
                <div
                  key={`${source.chainId}-${source.contractAddress}`}
                  style={{
                    alignItems: "center",
                    display: "flex",
                    gap: "8px",
                    justifyContent: "space-between",
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
                    <LogoCircle
                      alt={source.chainName}
                      fontSize={7}
                      label={source.chainName}
                      size={15}
                      src={source.chainLogo}
                    />
                    <span
                      style={{
                        color: "#161615",
                        fontFamily: '"Geist", system-ui, sans-serif',
                        fontSize: "15px",
                        fontWeight: 500,
                        lineHeight: "20px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {source.chainName || "Unknown chain"}
                    </span>
                  </div>
                  <span
                    style={{
                      color: "#161615",
                      fontFamily: '"Geist", system-ui, sans-serif',
                      fontSize: "15px",
                      fontWeight: 600,
                      lineHeight: "20px",
                    }}
                  >
                    {formatAmountInputDisplay(source.balance || "0")}
                  </span>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function PercentHoverButton({
  label,
  onClick,
  tabIndex,
}: {
  label: string;
  onClick: () => void;
  tabIndex?: number;
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const handledPointerDownRef = useRef(false);
  const pointerResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (pointerResetTimerRef.current) {
        clearTimeout(pointerResetTimerRef.current);
      }
    };
  }, []);

  const isHighlighted = hover || active;

  return (
    <button
      onClick={() => {
        if (handledPointerDownRef.current) {
          if (pointerResetTimerRef.current) {
            clearTimeout(pointerResetTimerRef.current);
            pointerResetTimerRef.current = null;
          }
          handledPointerDownRef.current = false;
          return;
        }
        onClick();
      }}
      onMouseDown={(event) => {
        event.preventDefault();
        setActive(true);
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setActive(false);
      }}
      onMouseUp={() => setActive(false)}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse") return;
        event.preventDefault();
        if (pointerResetTimerRef.current) {
          clearTimeout(pointerResetTimerRef.current);
        }
        handledPointerDownRef.current = true;
        setActive(true);
        onClick();
      }}
      onPointerUp={() => {
        setActive(false);
        if (handledPointerDownRef.current) {
          pointerResetTimerRef.current = setTimeout(() => {
            handledPointerDownRef.current = false;
            pointerResetTimerRef.current = null;
          }, 350);
        }
      }}
      style={{
        alignItems: "center",
        backgroundColor: isHighlighted ? "#E8F0FF" : "#F4F4F3",
        borderRadius: "6px",
        boxSizing: "border-box",
        display: "flex",
        flex: "1 1 0%",
        justifyContent: "center",
        paddingBlock: "3px",
        paddingInline: "6px",
        border: "none",
        cursor: "pointer",
        transition: "background-color 0.2s ease-out",
      }}
      tabIndex={tabIndex}
    >
      <div
        style={{
          boxSizing: "border-box",
          color: isHighlighted ? "#006BF4" : "#363635",
          fontFamily: '"Geist", system-ui, sans-serif',
          fontSize: "11px",
          fontWeight: 500,
          lineHeight: "16px",
          transition: "color 0.2s ease-out",
          ...(label === "MAX" ? { letterSpacing: "0.02em" } : {}),
        }}
      >
        {label}
      </div>
    </button>
  );
}

function SkeletonBar({
  width,
  height,
  borderRadius = "8px",
}: {
  width: string;
  height: string;
  borderRadius?: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        background:
          "linear-gradient(90deg, #F0F0EF 0%, #E6EEFF 48%, #F0F0EF 100%)",
        backgroundSize: "200% 100%",
        borderRadius,
        height,
        maxWidth: "100%",
        width,
        animation: "nexusSwapSkeletonShimmer 1.2s ease-in-out infinite",
      }}
    />
  );
}

function LogoCircle({
  src,
  alt,
  label,
  size,
  fontSize,
  outline,
  style,
}: {
  src?: string;
  alt?: string;
  label?: string;
  size: number;
  fontSize: number;
  outline?: string;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  const fallbackLabel = (label || alt || "?").trim().slice(0, 1).toUpperCase();

  if (!failed && src) {
    return (
      <img
        alt={alt || label || ""}
        onError={() => setFailed(true)}
        src={src}
        style={{
          backgroundColor: "#FFFFFE",
          borderRadius: "999px",
          height: `${size}px`,
          objectFit: "cover",
          outline,
          width: `${size}px`,
          ...style,
        }}
      />
    );
  }

  return (
    <div
      aria-label={alt || label || "Token"}
      role="img"
      style={{
        alignItems: "center",
        backgroundColor: "#E8F0FF",
        borderRadius: "999px",
        color: "#006BF4",
        display: "flex",
        fontFamily: '"Geist", system-ui, sans-serif',
        fontSize: `${fontSize}px`,
        fontWeight: 700,
        height: `${size}px`,
        justifyContent: "center",
        lineHeight: `${size}px`,
        outline,
        width: `${size}px`,
        ...style,
      }}
    >
      {fallbackLabel || "?"}
    </div>
  );
}

const sameAddress = (a?: string, b?: string) =>
  Boolean(a && b && a.toLowerCase() === b.toLowerCase());

const formatShortAddress = (address?: string) => {
  if (!address) return "";
  return address.length > 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
};

const formatTokenBalanceLabel = formatSelectedTokenBalanceLabel;

const parseDecimal = (value: unknown) => {
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

const formatUsdValue = (value: Decimal) =>
  value.gt(0) && value.lt(0.01) ? "<0.01" : value.toDecimalPlaces(2).toFixed(2);

const MAX_AMOUNT_DISPLAY_DECIMALS = 8;
const getTokenInputDecimals = (token?: Pick<SwapTokenOption, "decimals">) => {
  const decimals = Number(token?.decimals);
  return Number.isFinite(decimals) && decimals >= 0 ? Math.floor(decimals) : 18;
};

const formatAmountInputDisplay = (value: string) => {
  if (!value) return "";
  try {
    return new Decimal(value)
      .toDecimalPlaces(MAX_AMOUNT_DISPLAY_DECIMALS, Decimal.ROUND_DOWN)
      .toFixed();
  } catch {
    return value;
  }
};

export function SwapIdleForm({
  amount,
  receiveQuoteAmount,
  receiveQuoteUsd,
  isReceiveAmountLoading = false,
  isReceiveUsdLoading = false,
  sourceRouteStatus,
  sourceRouteMessage,
  onAmountChange,
  fromTokens,
  toToken,
  totalBalance,
  usdValue,
  onOpenSourcePicker,
  onOpenDestPicker,
  onOpenRecipientPicker,
  recipientAddress,
  defaultRecipientAddress,
  swapType,
  onUpdateTokens,
  missingUsd,
  isSourcePickerDisabled = false,
  onSetPercent,
  destinationGasFeeUsd,
  intentData,
  totalFeeUsd,
  isMultiAssetMode = false,
  isExpanded = false,
  isLoadingBalances = false,
  onToggleExpand,
  onRestoreAuto,
  showRestoreAuto = false,
  needsWalletConnection = false,
  getTokenUsdRate,
}: SwapIdleFormProps) {
  const [focusedPanel, setFocusedPanel] = useState<"send" | "receive" | null>(
    null
  );
  const [hoveredPanel, setHoveredPanel] = useState<"send" | "receive" | null>(
    null
  );
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [extraSlots, setExtraSlots] = useState(0);
  const [isExpandModalOpen, setIsExpandModalOpen] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [tooltipTriggerRect, setTooltipTriggerRect] = useState<DOMRect | null>(
    null
  );
  const sourceListRef = useRef<HTMLDivElement | null>(null);
  const sourceRowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const sourceInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const previousSourceCountRef = useRef(fromTokens.length);

  useEffect(() => {
    if (isMultiAssetMode) {
      setExtraSlots(Math.max(0, 2 - fromTokens.length));
    } else {
      setExtraSlots(0);
    }
  }, [isMultiAssetMode]);

  useEffect(() => {
    const previousSourceCount = previousSourceCountRef.current;
    if (fromTokens.length > previousSourceCount && previousSourceCount > 0) {
      const addedCount = fromTokens.length - previousSourceCount;
      setExtraSlots((prev) => Math.max(0, prev - addedCount));
      const newIndex = fromTokens.length - 1;
      requestAnimationFrame(() => {
        const input = sourceInputRefs.current[newIndex];
        if (input) {
          input.focus();
          input.select();
        }

        const container = sourceListRef.current;
        const row = sourceRowRefs.current[newIndex];
        if (
          !container ||
          !row ||
          container.scrollHeight <= container.clientHeight
        ) {
          return;
        }

        const containerRect = container.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        const nextTop =
          rowRect.top - containerRect.top + container.scrollTop - 8;

        container.scrollTo({
          behavior: "smooth",
          top: Math.max(0, nextTop),
        });
      });
    }
    previousSourceCountRef.current = fromTokens.length;
  }, [fromTokens.length]);

  const sanitizeInput = (raw: string, maxDecimals = 18): string => {
    if (!raw) return "";
    let next = raw.replaceAll(/[^0-9.]/g, "");
    const parts = next.split(".");
    if (parts.length > 2) next = `${parts[0]}.${parts.slice(1).join("")}`;
    const [integerPart, decimalPart] = next.split(".");
    if (decimalPart !== undefined) {
      next = `${integerPart}.${decimalPart.slice(0, Math.max(0, maxDecimals))}`;
    }
    if (next === ".") next = "0.";
    // Strip leading zeros
    if (next.length > 1 && next.startsWith("0") && next[1] !== ".") {
      next = next.replace(/^0+/, "");
      if (next === "") next = "0";
      if (next.startsWith(".")) next = `0${next}`;
    }
    return next;
  };

  const handleReceiveInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeInput(e.target.value, toToken?.decimals ?? 18);
    onAmountChange(sanitized, "receive");
  };

  const handleBlurAmount = (index: number) => {
    if (!onUpdateTokens) return;
    const token = fromTokens[index];
    if (!token || !token.userAmount) return;
    if (token.userAmount.includes(".")) {
      const stripped = token.userAmount.replace(/0+$/, "").replace(/\.$/, "");
      if (stripped !== token.userAmount) {
        const next = [...fromTokens];
        next[index] = { ...token, userAmount: stripped };
        onUpdateTokens(next);
      }
    }
  };

  const handleSendInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const token = fromTokens.length === 1 ? fromTokens[0] : undefined;
    const sanitized = sanitizeInput(
      e.target.value,
      getTokenInputDecimals(token)
    );
    if (fromTokens.length > 0 && onUpdateTokens) {
      const next = [...fromTokens];
      next[0] = { ...next[0], userAmount: sanitized, selectedPct: null };
      onUpdateTokens(next);
    }
    onAmountChange(sanitized, "send");
  };

  const handleTokenAmountChange = (index: number, val: string) => {
    if (!onUpdateTokens) return;
    const token = fromTokens[index];
    if (!token) return;

    const sanitized = sanitizeInput(
      val,
      token.userAmountMode === "usd"
        ? MAX_AMOUNT_DISPLAY_DECIMALS
        : getTokenInputDecimals(token)
    );

    const next = [...fromTokens];
    next[index] = { ...token, userAmount: sanitized, selectedPct: null };
    onUpdateTokens(next);

    // Also update total amount for backwards compatibility if needed
    const total = next.reduce((sum, t) => sum + Number(t.userAmount || 0), 0);
    onAmountChange(total > 0 ? String(total) : "", "send");
  };

  const handleToggleMode = (index: number) => {
    if (!onUpdateTokens) return;
    const token = fromTokens[index];
    if (!token) return;

    const tokenBalance =
      Number(String(token.balance).replace(/[^0-9.]/g, "")) || 0;
    const fiatBalance =
      Number(String(token.balanceInFiat).replace(/[^0-9.]/g, "")) || 0;
    const price = tokenBalance > 0 ? fiatBalance / tokenBalance : 0;
    if (price === 0) return;

    const currentVal = Number(
      token.userAmount || (!isMultiAssetMode ? amount : 0) || 0
    );
    const next = [...fromTokens];
    if (token.userAmountMode === "usd") {
      const newTokenVal = currentVal > 0 ? (currentVal / price).toString() : "";
      next[index] = {
        ...token,
        userAmountMode: "token",
        userAmount: newTokenVal ? newTokenVal.substring(0, 10) : "",
      };
    } else {
      const newUsdVal = currentVal > 0 ? (currentVal * price).toFixed(2) : "";
      next[index] = { ...token, userAmountMode: "usd", userAmount: newUsdVal };
    }
    onUpdateTokens(next);
    const total = getTokenAmountTotal(next);
    onAmountChange(total > 0 ? String(total) : "", "send");
  };

  const getSourceUsdValue = React.useCallback(
    (token: SwapTokenOption) => {
      if (!token || !token.userAmount) return 0;
      const quotedUsd = parseDecimal(token.userAmountUsd);
      if (quotedUsd && quotedUsd.gt(0)) return quotedUsd.toNumber();
      const tokenBalance =
        Number(String(token.balance).replace(/[^0-9.]/g, "")) || 0;
      const fiatBalance =
        Number(String(token.balanceInFiat).replace(/[^0-9.]/g, "")) || 0;
      const price = tokenBalance > 0 ? fiatBalance / tokenBalance : 0;
      const amountNumber = Number(token.userAmount || 0);
      if (!Number.isFinite(amountNumber)) return 0;
      if (token.userAmountMode === "usd") return amountNumber;
      if (price > 0) return amountNumber * price;
      if (getTokenUsdRate) {
        const rate = getTokenUsdRate(token);
        if (Number.isFinite(rate) && rate > 0) return amountNumber * rate;
      }
      const fallbackUsd = Number(usdValue || 0);
      return Number.isFinite(fallbackUsd) && fallbackUsd > 0 ? fallbackUsd : 0;
    },
    [getTokenUsdRate, usdValue]
  );

  const totalUsd = React.useMemo(() => {
    return fromTokens.reduce((sum, token) => sum + getSourceUsdValue(token), 0);
  }, [fromTokens, getSourceUsdValue]);

  const hasSourceOverflow = fromTokens.length > 3;
  const [isSourceListAtBottom, setIsSourceListAtBottom] = useState(false);
  const updateSourceListScrollState = React.useCallback(() => {
    const element = sourceListRef.current;
    if (!element || !hasSourceOverflow) {
      setIsSourceListAtBottom(false);
      return;
    }

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    setIsSourceListAtBottom(distanceFromBottom <= 2);
  }, [hasSourceOverflow]);

  useEffect(() => {
    requestAnimationFrame(updateSourceListScrollState);
  }, [fromTokens.length, updateSourceListScrollState]);

  const sourceRowsToRender: Array<{
    token: SwapTokenOption | null;
    index: number;
    position: number;
  }> = React.useMemo(() => {
    if (!isMultiAssetMode) {
      return fromTokens.length > 0
        ? [{ token: fromTokens[0], index: 0, position: 0 }]
        : [{ token: null, index: 0, position: 0 }];
    }
    const count = Math.max(1, fromTokens.length + extraSlots);
    const rows: Array<{
      token: SwapTokenOption | null;
      index: number;
      position: number;
    }> = [];
    for (let i = 0; i < count; i++) {
      rows.push({
        token: fromTokens[i] || null,
        index: i,
        position: i,
      });
    }
    return rows;
  }, [isMultiAssetMode, fromTokens, extraSlots]);

  const totalAssetCount = isMultiAssetMode
    ? sourceRowsToRender.length
    : fromTokens.length;

  const handleAddAsset = () => {
    const nextIndex = sourceRowsToRender.length;
    setExtraSlots((prev) => prev + 1);
    setFocusedRow(nextIndex);
    setTimeout(() => {
      const el = sourceRowRefs.current[nextIndex];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      const inputEl = sourceInputRefs.current[nextIndex];
      if (inputEl) {
        inputEl.focus();
      }
    }, 50);
  };

  const handleClearAll = () => {
    if (onUpdateTokens) {
      onUpdateTokens([]);
    }
    onAmountChange("", "send");
    setExtraSlots(isMultiAssetMode ? 1 : 0);
  };

  const handleRemoveRow = (index: number) => {
    if (!isMultiAssetMode) {
      if (onUpdateTokens) {
        onUpdateTokens([]);
      }
      onAmountChange("", "send");
      return;
    }

    const currentTotalRows = sourceRowsToRender.length;
    if (currentTotalRows <= 1) {
      if (fromTokens.length > 0) {
        const firstToken = fromTokens[0];
        if (
          firstToken &&
          firstToken.userAmount &&
          firstToken.userAmount !== ""
        ) {
          const next = [{ ...firstToken, userAmount: "" }];
          if (onUpdateTokens) {
            onUpdateTokens(next);
          }
        } else {
          if (onUpdateTokens) {
            onUpdateTokens([]);
          }
        }
      }
      onAmountChange("", "send");
      setExtraSlots(fromTokens.length > 0 ? 0 : 1);
      return;
    }

    if (index < fromTokens.length) {
      const next = [...fromTokens];
      next.splice(index, 1);
      if (onUpdateTokens) {
        onUpdateTokens(next);
      }
      const total = getTokenAmountTotal(next);
      onAmountChange(total > 0 ? String(total) : "", "send");
    } else {
      setExtraSlots((prev) => Math.max(0, prev - 1));
    }
  };

  const isExactIn = swapType === "exactIn";
  const showSourceRouteSkeleton = !isExactIn && sourceRouteStatus === "loading";
  const sourceRouteHelper =
    sourceRouteStatus === "insufficient" ? sourceRouteMessage : undefined;
  const receiveBalanceLabel = formatTokenBalanceLabel(toToken);
  const getReceiveUsdRate = () => {
    const quoteTokenAmount = parseDecimal(receiveQuoteAmount);
    const quoteUsdAmount = parseDecimal(receiveQuoteUsd);
    if (quoteTokenAmount?.gt(0) && quoteUsdAmount?.gt(0)) {
      return quoteUsdAmount.div(quoteTokenAmount);
    }

    const tokenBalance = parseDecimal(toToken?.balance);
    const fiatBalance = parseDecimal(toToken?.balanceInFiat);
    if (tokenBalance?.gt(0) && fiatBalance?.gt(0)) {
      return fiatBalance.div(tokenBalance);
    }

    return undefined;
  };
  const hasReceiveValue = isExactIn
    ? Boolean(receiveQuoteAmount && parseDecimal(receiveQuoteAmount)?.gt(0))
    : Boolean(amount && parseDecimal(amount)?.gt(0));
  const receiveInputValue = isExactIn
    ? receiveQuoteAmount && parseDecimal(receiveQuoteAmount)?.gt(0)
      ? receiveQuoteAmount
      : ""
    : amount;
  const receiveDisplayValue =
    focusedPanel === "receive"
      ? receiveInputValue
      : formatAmountInputDisplay(receiveInputValue);
  const receiveUsdRate = getReceiveUsdRate();
  const receiveTokenAmount = parseDecimal(receiveInputValue);
  const receiveUsdAmount = receiveQuoteUsd
    ? parseDecimal(receiveQuoteUsd)
    : receiveTokenAmount && receiveUsdRate
      ? receiveTokenAmount.mul(receiveUsdRate)
      : undefined;
  const getTokenAmountTotal = (tokens: SwapTokenOption[]) =>
    tokens.reduce((sum, item) => sum + Number(item.userAmount || 0), 0);

  const handleSendPercentForToken = (
    index: number,
    pct: number,
    token: SwapTokenOption
  ) => {
    if (!token.balance || !onUpdateTokens) return;
    let finalVal = "";
    const isUsdMode = token.userAmountMode === "usd";

    if (isUsdMode) {
      const fiatBalStr = String(token.balanceInFiat || "0");
      const fiatBalance = parseDecimal(fiatBalStr);
      if (!fiatBalance) return;
      if (pct === 100) {
        finalVal = fiatBalance
          .toDecimalPlaces(MAX_AMOUNT_DISPLAY_DECIMALS, Decimal.ROUND_DOWN)
          .toFixed();
      } else {
        finalVal = fiatBalance
          .mul(pct)
          .div(100)
          .toDecimalPlaces(MAX_AMOUNT_DISPLAY_DECIMALS, Decimal.ROUND_DOWN)
          .toFixed();
      }
    } else {
      const balanceStr = String(token.balance || "0");
      const tokenBalance = parseDecimal(balanceStr);
      if (!tokenBalance) return;
      const tokenDecimals = getTokenInputDecimals(token);
      if (pct === 100) {
        finalVal = tokenBalance
          .toDecimalPlaces(tokenDecimals, Decimal.ROUND_DOWN)
          .toFixed();
      } else {
        finalVal = tokenBalance
          .mul(pct)
          .div(100)
          .toDecimalPlaces(tokenDecimals, Decimal.ROUND_DOWN)
          .toFixed();
      }
    }

    const next = [...fromTokens];
    next[index] = {
      ...next[index],
      userAmount: finalVal,
      userAmountMode: isUsdMode ? "usd" : "token",
      selectedPct: pct,
    };
    onUpdateTokens(next);
    const total = getTokenAmountTotal(next);
    onAmountChange(total > 0 ? String(total) : "", "send");
  };

  const feeAmountValue = React.useMemo(() => {
    if (totalFeeUsd && parseDecimal(totalFeeUsd)?.gt(0)) {
      const dec = parseDecimal(totalFeeUsd);
      return dec && dec.lt(0.01) ? "0" : (dec?.toFixed(2) ?? "0");
    }
    const rawBridge = intentData?.feesAndBuffer?.bridge;
    const bridgeTotal =
      typeof rawBridge === "string"
        ? parseDecimal(rawBridge)
        : parseDecimal(rawBridge?.total);
    if (bridgeTotal && bridgeTotal.gt(0)) {
      return bridgeTotal.lt(0.01) ? "0" : bridgeTotal.toFixed(2);
    }
    return "0";
  }, [intentData, totalFeeUsd]);

  // Fees breakdown for fees tooltip
  const feeBreakdown = React.useMemo(() => {
    const rawBridge = intentData?.feesAndBuffer?.bridge;
    const bridgeFeeData =
      rawBridge && typeof rawBridge === "object" ? rawBridge : undefined;

    const caGas = parseDecimal(bridgeFeeData?.caGas);
    const collection = parseDecimal(bridgeFeeData?.collection);
    const fulfilment = parseDecimal(bridgeFeeData?.fulfilment);
    const destGasVal =
      parseDecimal(intentData?.destination?.gas?.value) ??
      parseDecimal(destinationGasFeeUsd);

    const executionFee =
      caGas ??
      (collection !== undefined || fulfilment !== undefined
        ? (collection ?? new Decimal(0)).plus(fulfilment ?? new Decimal(0))
        : undefined) ??
      destGasVal;

    const solverFee = parseDecimal(bridgeFeeData?.solver);
    const protocolFee = parseDecimal(bridgeFeeData?.protocol);

    const formatFeeStr = (dec: Decimal | undefined) => {
      if (!dec || dec.lte(0)) return "$0";
      if (dec.lt(0.01)) return "<$0.01";
      return `$${dec.toFixed(2)}`;
    };

    return {
      hasProtocolFees: Boolean(protocolFee && protocolFee.gt(0)),
      networkFees: formatFeeStr(executionFee),
      protocolFees: formatFeeStr(protocolFee),
      solverFees: formatFeeStr(solverFee),
    };
  }, [intentData, destinationGasFeeUsd]);

  // Min received display for slippage tooltip
  const minReceivedDisplay = React.useMemo(() => {
    const intentMinAmount =
      (intentData?.destination as any)?.minAmount ??
      (intentData?.destination as any)?.minReceived ??
      (intentData as any)?.minAmount ??
      (intentData as any)?.minReceived;

    const destSymbol = toToken?.symbol || intentData?.destination?.symbol || "";

    if (intentMinAmount && parseDecimal(String(intentMinAmount))?.gt(0)) {
      const formatted = formatTokenAmountDisplay(String(intentMinAmount));
      return `${formatted} ${destSymbol}`.trim();
    }

    const fallbackAmount =
      intentData?.destination?.amount ??
      receiveQuoteAmount ??
      (swapType === "exactOut" ? amount : undefined);

    if (fallbackAmount && parseDecimal(String(fallbackAmount))?.gt(0)) {
      const formatted = formatTokenAmountDisplay(String(fallbackAmount));
      return `${formatted} ${destSymbol}`.trim();
    }

    return destSymbol ? `0 ${destSymbol}` : "0";
  }, [intentData, receiveQuoteAmount, swapType, amount, toToken]);

  // Price impact display for slippage tooltip
  const priceImpactDisplay = React.useMemo(() => {
    let sourceUsdTotal = new Decimal(0);
    if (fromTokens.length > 0) {
      for (const t of fromTokens) {
        const val = getSourceUsdValue(t);
        if (val > 0) {
          sourceUsdTotal = sourceUsdTotal.plus(val);
        }
      }
    }
    if (sourceUsdTotal.lte(0) && intentData?.sources) {
      sourceUsdTotal = (intentData.sources as any[]).reduce(
        (acc: Decimal, s: any) =>
          acc.plus(parseDecimal(s.value) ?? new Decimal(0)),
        new Decimal(0)
      );
    }

    const destUsd =
      receiveUsdAmount ??
      (intentData?.destination?.value
        ? parseDecimal(intentData.destination.value)
        : undefined);

    const explicitImpactUsd = parseDecimal((intentData as any)?.priceImpactUsd);
    if (
      explicitImpactUsd !== undefined &&
      sourceUsdTotal.gt(0) &&
      explicitImpactUsd.abs().lte(sourceUsdTotal)
    ) {
      return `$ ${explicitImpactUsd.abs().toFixed(2)}`;
    }

    if (sourceUsdTotal.gt(0) && destUsd && destUsd.gt(0)) {
      const rawFee =
        parseDecimal(totalFeeUsd) ??
        parseDecimal(intentData?.feesAndBuffer?.bridge?.total) ??
        new Decimal(0);
      const impact = Decimal.max(
        sourceUsdTotal.minus(destUsd).minus(rawFee),
        0
      );
      return `$ ${impact.toFixed(2)}`;
    }

    return "$ 0.00";
  }, [
    intentData,
    fromTokens,
    getSourceUsdValue,
    receiveUsdAmount,
    totalFeeUsd,
  ]);

  const hasSendToken = isMultiAssetMode
    ? fromTokens.length > 0 &&
      fromTokens.some((t) => Boolean(t && (t.symbol || t.contractAddress)))
    : fromTokens.length > 0 &&
      Boolean(fromTokens[0]?.symbol || fromTokens[0]?.contractAddress);
  const hasReceiveToken = Boolean(toToken?.symbol || toToken?.contractAddress);
  const hasSendAmount = isMultiAssetMode
    ? fromTokens.length > 0 &&
      fromTokens.some((t) =>
        Boolean(
          t &&
            (t.symbol || t.contractAddress) &&
            t?.userAmount &&
            parseDecimal(t.userAmount)?.gt(0)
        )
      )
    : Boolean(amount && parseDecimal(amount)?.gt(0));
  const hasReceiveAmount = Boolean(
    (swapType === "exactOut" && amount && parseDecimal(amount)?.gt(0)) ||
      (receiveQuoteAmount && parseDecimal(receiveQuoteAmount)?.gt(0))
  );
  const isIntentActive =
    (hasSendAmount && hasSendToken && hasReceiveToken) ||
    (hasReceiveAmount && hasReceiveToken && hasSendToken && hasSendAmount);

  const warningMessage = React.useMemo(() => {
    if (missingUsd && parseDecimal(missingUsd)?.gt(0)) {
      if (!isMultiAssetMode) {
        return `You're $${Number(missingUsd).toFixed(2)} short. Add more assets to swap. Use Multi-assets Mode`;
      }
      return `You're $${Number(missingUsd).toFixed(2)} short. Add more assets to swap`;
    }
    if (sourceRouteStatus === "insufficient" || sourceRouteMessage) {
      return (
        sourceRouteMessage || "Your balance is too low to complete this swap"
      );
    }
    return null;
  }, [missingUsd, isMultiAssetMode, sourceRouteStatus, sourceRouteMessage]);

  const renderSourceRow = (
    token: SwapTokenOption | null,
    index: number,
    inModal = false
  ) => {
    return (
      <div
        key={
          token
            ? `${token.contractAddress}-${token.chainId}-${index}${inModal ? "-modal" : ""}`
            : `empty-slot-${index}${inModal ? "-modal" : ""}`
        }
        ref={(element) => {
          if (!inModal) {
            sourceRowRefs.current[index] = element;
          }
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0px",
          width: "100%",
        }}
      >
        {/* Top Row: Input (left) & Token Selector Pill + Clear (right) */}
        <div
          onMouseEnter={() => setHoveredRow(index)}
          onMouseLeave={() =>
            setHoveredRow((prev) => (prev === index ? null : prev))
          }
          style={{
            alignItems: "center",
            alignSelf: "stretch",
            boxSizing: "border-box",
            display: "flex",
            gap: "12px",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          {/* Left: Input */}
          <div
            style={{
              display: "flex",
              flex: 1,
              minWidth: 0,
            }}
          >
            <input
              onBlur={() => {
                if (token) handleBlurAmount(index);
                setFocusedRow(null);
                setFocusedPanel(null);
              }}
              onChange={(e) => {
                if (token) {
                  handleTokenAmountChange(index, e.target.value);
                } else if (!isMultiAssetMode) {
                  handleSendInput(e);
                }
              }}
              onFocus={() => {
                setFocusedRow(index);
                setFocusedPanel("send");
              }}
              placeholder={token?.userAmountMode === "usd" ? "$0" : "0"}
              ref={(element) => {
                if (!inModal) {
                  sourceInputRefs.current[index] = element;
                }
              }}
              style={{
                boxSizing: "border-box",
                color: "#1F1F1F",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "clamp(22px, 5.5vw, 28px)",
                fontStyle: "normal",
                fontWeight: 500,
                lineHeight: "32px",
                letterSpacing: "-0.28px",
                background: "transparent",
                border: "none",
                outline: "none",
                padding: 0,
                width: "100%",
                minWidth: 0,
              }}
              type="text"
              value={
                token
                  ? focusedRow === index
                    ? token.userAmount || ""
                    : formatAmountInputDisplay(token.userAmount || "")
                  : !isMultiAssetMode && isExactIn
                    ? focusedRow === index
                      ? amount
                      : formatAmountInputDisplay(amount)
                    : ""
              }
            />
          </div>

          {/* Right: Select assets or Token Pill + Cross */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            {isLoadingBalances ? (
              <div
                className="nexus-balance-skeleton"
                style={{
                  animation:
                    "nexusSwapSkeletonShimmer 1.2s ease-in-out infinite",
                  backgroundColor: "#E8E8E7",
                  borderRadius: "999px",
                  flexShrink: 0,
                  height: "36px",
                  width: "110px",
                }}
              />
            ) : token ? (
              <>
                <button
                  disabled={isSourcePickerDisabled}
                  onClick={() => onOpenSourcePicker(index)}
                  style={{
                    alignItems: "center",
                    backgroundColor: "#FFF",
                    border: "none",
                    borderRadius: "999px",
                    boxShadow: ASSET_DROPDOWN_SHADOW,
                    boxSizing: "border-box",
                    display: "flex",
                    gap: "6px",
                    padding: "5px 10px 5px 6px",
                    cursor: isSourcePickerDisabled ? "not-allowed" : "pointer",
                    flexShrink: 0,
                    opacity: isSourcePickerDisabled ? 0.72 : 1,
                  }}
                  type="button"
                >
                  <div
                    style={{
                      boxSizing: "border-box",
                      flexShrink: 0,
                      height: "26px",
                      position: "relative",
                      width: "26px",
                    }}
                  >
                    <LogoCircle
                      alt={token.symbol}
                      fontSize={12}
                      label={token.symbol}
                      size={26}
                      src={token.logo}
                    />
                    {token.chainLogo && (
                      <LogoCircle
                        alt={token.chainName}
                        fontSize={6}
                        label={token.chainName}
                        outline="1.5px solid #FFFFFE"
                        size={12}
                        src={token.chainLogo}
                        style={{
                          bottom: -2,
                          position: "absolute",
                          right: -2,
                        }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      color: "#1F1F1F",
                      fontFamily: '"Geist", system-ui, sans-serif',
                      fontSize: "13.5px",
                      fontStyle: "normal",
                      fontWeight: 500,
                      lineHeight: "18px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {token.symbol}
                  </span>
                  <ChevronDownIcon color="#3D7BFF" />
                </button>
                {isMultiAssetMode && (
                  <button
                    aria-label="Clear asset row"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveRow(index);
                    }}
                    style={{
                      alignItems: "center",
                      backgroundColor: "#F5F5F4",
                      border: "none",
                      borderRadius: "999px",
                      color: "#848483",
                      cursor: "pointer",
                      display: "flex",
                      flexShrink: 0,
                      height: "24px",
                      justifyContent: "center",
                      padding: 0,
                      width: "24px",
                    }}
                    type="button"
                  >
                    <svg
                      fill="none"
                      height="10"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      width="10"
                    >
                      <line x1="18" x2="6" y1="6" y2="18" />
                      <line x1="6" x2="18" y1="6" y2="18" />
                    </svg>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  disabled={isSourcePickerDisabled}
                  onClick={() => onOpenSourcePicker(index)}
                  style={{
                    alignItems: "center",
                    backgroundColor: "#FFF",
                    border: "none",
                    borderRadius: "999px",
                    boxShadow: ASSET_DROPDOWN_SHADOW,
                    boxSizing: "border-box",
                    display: "flex",
                    gap: "6px",
                    padding: "5px 10px 5px 6px",
                    cursor: isSourcePickerDisabled ? "not-allowed" : "pointer",
                    flexShrink: 0,
                    opacity: isSourcePickerDisabled ? 0.72 : 1,
                  }}
                  type="button"
                >
                  <div
                    style={{
                      backgroundColor: "transparent",
                      border: "1.5px dashed #D9D9DE",
                      borderRadius: "999px",
                      boxSizing: "border-box",
                      flexShrink: 0,
                      height: "26px",
                      width: "26px",
                    }}
                  />
                  <span
                    style={{
                      color: "#1F1F1F",
                      fontFamily: '"Geist", system-ui, sans-serif',
                      fontSize: "13.5px",
                      fontStyle: "normal",
                      fontWeight: 500,
                      lineHeight: "18px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Select asset
                  </span>
                  <ChevronDownIcon color="#3D7BFF" />
                </button>
                {isMultiAssetMode && (
                  <button
                    aria-label="Clear asset row"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveRow(index);
                    }}
                    style={{
                      alignItems: "center",
                      backgroundColor: "#F0F0EF",
                      border: "none",
                      borderRadius: "999px",
                      color: "#8E8E89",
                      cursor: "pointer",
                      display: "flex",
                      flexShrink: 0,
                      height: "24px",
                      justifyContent: "center",
                      padding: 0,
                      width: "24px",
                    }}
                    type="button"
                  >
                    <svg
                      fill="none"
                      height="10"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      width="10"
                    >
                      <line x1="18" x2="6" y1="6" y2="18" />
                      <line x1="6" x2="18" y1="6" y2="18" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bottom Row: USD Value (left) & Percent Buttons + Balance (right) on SAME vertical level */}
        <div
          style={{
            alignItems: "center",
            boxSizing: "border-box",
            display: "flex",
            justifyContent: "space-between",
            minHeight: "26px",
            marginTop: "0px",
            width: "100%",
          }}
        >
          {/* Left: USD Value Button */}
          <button
            onClick={() => handleToggleMode(index)}
            style={{
              alignItems: "center",
              background: "transparent",
              border: "none",
              color: "#8E8E89",
              cursor: token ? "pointer" : "default",
              display: "inline-flex",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "14px",
              fontStyle: "normal",
              fontWeight: 400,
              gap: "4px",
              lineHeight: "18px",
              padding: 0,
              textAlign: "left",
              transition: "color 0.15s ease",
              userSelect: "none",
            }}
            type="button"
          >
            {token?.userAmountMode === "usd" ? (
              <>
                ≈ {(() => {
                  const tokenBal =
                    Number(String(token.balance).replace(/[^0-9.]/g, "")) || 0;
                  const fiatBal =
                    Number(
                      String(token.balanceInFiat).replace(/[^0-9.]/g, "")
                    ) || 0;
                  const price = tokenBal > 0 ? fiatBal / tokenBal : 0;
                  const usdVal = Number(token.userAmount || 0);
                  if (price > 0 && usdVal > 0) {
                    return `${(usdVal / price).toFixed(6).replace(/\.?0+$/, "")} ${token.symbol}`;
                  }
                  return `0 ${token.symbol}`;
                })()}
                <svg
                  fill="none"
                  height="12"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  style={{ opacity: 0.6 }}
                  viewBox="0 0 24 24"
                  width="12"
                >
                  <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" />
                </svg>
              </>
            ) : (
              <>
                ≈ $
                {token?.userAmount
                  ? getSourceUsdValue(token)
                    ? getSourceUsdValue(token).toFixed(2)
                    : "0"
                  : isMultiAssetMode
                    ? "0"
                    : usdValue || "0"}
                {token && (
                  <svg
                    fill="none"
                    height="12"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    style={{ opacity: 0.6 }}
                    viewBox="0 0 24 24"
                    width="12"
                  >
                    <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" />
                  </svg>
                )}
              </>
            )}
          </button>

          {/* Right: Percent Buttons & Balance */}
          {token && (
            <div
              style={{
                alignItems: "center",
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <PercentButtons
                disabled={!token?.balance}
                onSelect={(pct) => handleSendPercentForToken(index, pct, token)}
                selectedPct={token?.selectedPct}
                visible={
                  !needsWalletConnection &&
                  (isMultiAssetMode
                    ? focusedRow === index || hoveredRow === index
                    : focusedPanel === "send" ||
                      hoveredPanel === "send" ||
                      focusedRow === 0 ||
                      hoveredRow === 0)
                }
              />
              {!needsWalletConnection && (
                <div
                  style={{
                    color: "#8E8E89",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: "13px",
                    fontStyle: "normal",
                    fontWeight: 400,
                    lineHeight: "16px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isLoadingBalances ? (
                    <span
                      className="nexus-balance-skeleton"
                      style={{
                        animation:
                          "nexusSwapSkeletonShimmer 1.2s ease-in-out infinite",
                        backgroundColor: "#E8E8E7",
                        borderRadius: "6px",
                        display: "inline-block",
                        height: "14px",
                        verticalAlign: "middle",
                        width: "90px",
                      }}
                    />
                  ) : (
                    `Balance · ${formatTokenBalanceLabel(token)}`
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {(isReceiveAmountLoading || isReceiveUsdLoading || sourceRouteStatus) && (
        <style>
          {`@keyframes nexusSwapSkeletonShimmer {
            0% { opacity: 0.55; }
            50% { opacity: 1; }
            100% { opacity: 0.55; }
          }
          @keyframes nexusFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes nexusPopIn {
            from { opacity: 0; transform: scale(0.96); }
            to { opacity: 1; transform: scale(1); }
          }`}
        </style>
      )}

      {/* ─── SEND CONTAINER ─── */}
      <div
        onMouseEnter={() => setHoveredPanel("send")}
        onMouseLeave={() =>
          setHoveredPanel((prev) => (prev === "send" ? null : prev))
        }
        style={{
          display: "flex",
          padding: "12px",
          flexDirection: "column",
          alignItems: "stretch",
          gap: "8px",
          alignSelf: "stretch",
          borderRadius: "24px 24px 12px 12px",
          border:
            focusedPanel === "send"
              ? "1px solid #EAEAEA"
              : hoveredPanel === "send"
                ? "1px solid #F0F0F0"
                : "1px solid #F5F5F5",
          backgroundColor: focusedPanel === "send" ? "#F7F8FA" : "#FFF",
          boxShadow:
            focusedPanel !== "send" && hoveredPanel === "send"
              ? ASSET_DROPDOWN_SHADOW
              : "none",
          boxSizing: "border-box",
          width: "100%",
          transition:
            "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        {/* Top row: SEND + Assets Count + Expand Icon */}
        <div
          style={{
            alignItems: "center",
            alignSelf: "stretch",
            boxSizing: "border-box",
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                color: "#8E8E89",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "12px",
                fontStyle: "normal",
                fontWeight: 500,
                lineHeight: "16px",
                letterSpacing: "0.96px",
                textTransform: "uppercase",
              }}
            >
              Send
            </div>
            {isMultiAssetMode && totalAssetCount > 2 && (
              <div
                style={{
                  display: "flex",
                  padding: "4px 8px",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "10px",
                  borderRadius: "100px",
                  background: "#EAF1FF",
                  color: "#3D7BFF",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "10px",
                  fontStyle: "normal",
                  fontWeight: 600,
                  lineHeight: "12px",
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                }}
              >
                {totalAssetCount} Assets
              </div>
            )}
          </div>

          {/* Expand icon on multi asset mode if more than 2 assets with smooth fade */}
          {isMultiAssetMode && (
            <button
              aria-label="Expand assets"
              onClick={() => setIsExpandModalOpen(true)}
              style={{
                width: "14px",
                height: "14px",
                flexShrink: 0,
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: totalAssetCount > 2 ? "pointer" : "default",
                opacity: totalAssetCount > 2 ? 1 : 0,
                pointerEvents: totalAssetCount > 2 ? "auto" : "none",
                transition: "opacity 0.25s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              type="button"
            >
              <svg
                fill="none"
                height="14"
                stroke="#1F1F1F"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.4"
                viewBox="0 0 14 14"
                width="14"
              >
                <path d="M8.5 1.5H12.5V5.5M5.5 12.5H1.5V8.5M12.5 1.5L8.5 5.5M1.5 12.5L5.5 8.5" />
              </svg>
            </button>
          )}
        </div>

        {/* Amount Rows or Shimmer Loading Skeleton */}
        {showSourceRouteSkeleton ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              width: "100%",
            }}
          >
            {[0, 1].map((i) => (
              <div
                key={`skeleton-row-${i}`}
                style={{
                  alignItems: "center",
                  animation:
                    "nexusSwapSkeletonShimmer 1.5s ease-in-out infinite",
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: i > 0 ? "8px" : "0",
                  borderTop: i > 0 ? "1px solid #F5F5F5" : "none",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#E5E5EB",
                      borderRadius: "6px",
                      height: "24px",
                      width: "64px",
                    }}
                  />
                  <div
                    style={{
                      backgroundColor: "#E5E5EB",
                      borderRadius: "4px",
                      height: "14px",
                      width: "48px",
                    }}
                  />
                </div>
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#E5E5EB",
                      borderRadius: "20px",
                      height: "34px",
                      width: "140px",
                    }}
                  />
                  <div
                    style={{
                      backgroundColor: "#E5E5EB",
                      borderRadius: "999px",
                      height: "24px",
                      width: "24px",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              maxHeight: isMultiAssetMode ? "310px" : undefined,
              overflowY: isMultiAssetMode ? "auto" : "visible",
              padding: isMultiAssetMode ? "8px 4px 8px 2px" : undefined,
              width: "100%",
            }}
          >
            {sourceRowsToRender.map(({ token, index }) =>
              renderSourceRow(token, index, false)
            )}
          </div>
        )}

        {/* Warning Container */}
        {warningMessage && (
          <div
            style={{
              alignItems: "center",
              background:
                "linear-gradient(90deg, rgba(249, 115, 22, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%), #FFF",
              borderRadius: "12px",
              boxSizing: "border-box",
              color: "#FF7B20",
              display: "flex",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "13px",
              fontStyle: "normal",
              fontWeight: 500,
              gap: "8px",
              lineHeight: "130%",
              marginTop: "4px",
              maxWidth: "100%",
              padding: "8px",
              width: "fit-content",
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                flexShrink: 0,
                height: "16px",
                justifyContent: "center",
                width: "16px",
              }}
            >
              <svg
                fill="none"
                height="16"
                viewBox="0 0 16 16"
                width="16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="7"
                  stroke="#FF7B20"
                  strokeWidth="1.3"
                />
                <line
                  stroke="#FF7B20"
                  strokeLinecap="round"
                  strokeWidth="1.3"
                  x1="8"
                  x2="8"
                  y1="5"
                  y2="8.5"
                />
                <circle cx="8" cy="11.25" fill="#FF7B20" r="0.75" />
              </svg>
            </div>
            <span>{warningMessage}</span>
          </div>
        )}

        {/* Multi-asset bottom bar: Total and Clear All / Add Asset */}
        {isMultiAssetMode && (
          <div
            style={{
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderBottomLeftRadius: "11px",
              borderBottomRightRadius: "11px",
              borderTop: "1px solid #F5F5F5",
              boxSizing: "border-box",
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              justifyContent: "space-between",
              margin: "4px -12px -12px -12px",
              padding: "12px",
              width: "calc(100% + 24px)",
            }}
          >
            {/* Left: Total amount or skeleton placeholder */}
            {showSourceRouteSkeleton ? (
              <div
                style={{
                  alignItems: "center",
                  animation:
                    "nexusSwapSkeletonShimmer 1.5s ease-in-out infinite",
                  display: "flex",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#E5E5EB",
                    borderRadius: "4px",
                    height: "16px",
                    width: "64px",
                  }}
                />
                <div
                  style={{
                    backgroundColor: "#E5E5EB",
                    borderRadius: "4px",
                    height: "16px",
                    width: "40px",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    color: "#1F1F1F",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: "18px",
                    fontStyle: "normal",
                    fontWeight: 500,
                    lineHeight: "22px",
                  }}
                >
                  ≈ ${totalUsd > 0 ? totalUsd.toFixed(2) : "0.00"}
                </span>
                <span
                  style={{
                    color: "#8E8E89",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: "12px",
                    fontStyle: "normal",
                    fontWeight: 600,
                    letterSpacing: "0.72px",
                    lineHeight: "16px",
                    textTransform: "uppercase",
                  }}
                >
                  TOTAL
                </span>
              </div>
            )}

            {/* Right: Clear All & Add Asset buttons */}
            <div
              style={{
                alignItems: "center",
                display: "flex",
                gap: "4px",
              }}
            >
              <button
                onClick={handleClearAll}
                style={{
                  alignItems: "center",
                  background: "transparent",
                  border: "none",
                  color: "#BFBFBF",
                  cursor: "pointer",
                  display: "flex",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "14px",
                  fontStyle: "normal",
                  fontWeight: 500,
                  lineHeight: "18px",
                  padding: "8px 10px",
                }}
                type="button"
              >
                Clear All
              </button>
              <button
                onClick={handleAddAsset}
                style={{
                  alignItems: "center",
                  background: "#EEF2FF",
                  border: "none",
                  borderRadius: "10px",
                  color: "#3D7BFF",
                  cursor: "pointer",
                  display: "flex",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "14px",
                  fontStyle: "normal",
                  fontWeight: 500,
                  gap: "4px",
                  lineHeight: "18px",
                  padding: "8px 10px",
                }}
                type="button"
              >
                <span style={{ fontSize: "16px", lineHeight: "16px" }}>+</span>
                <span>Add Asset</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── RECEIVE CONTAINER ─── */}
      <div
        onMouseEnter={() => setHoveredPanel("receive")}
        onMouseLeave={() =>
          setHoveredPanel((prev) => (prev === "receive" ? null : prev))
        }
        style={{
          display: "flex",
          padding: "12px",
          flexDirection: "column",
          alignItems: "stretch",
          gap: "16px",
          alignSelf: "stretch",
          borderRadius: "12px 12px 24px 24px",
          border:
            focusedPanel === "receive"
              ? "1px solid #EAEAEA"
              : hoveredPanel === "receive"
                ? "1px solid #F0F0F0"
                : "1px solid #F5F5F5",
          backgroundColor: focusedPanel === "receive" ? "#F7F8FA" : "#FFF",
          boxShadow:
            focusedPanel !== "receive" && hoveredPanel === "receive"
              ? ASSET_DROPDOWN_SHADOW
              : "none",
          boxSizing: "border-box",
          width: "100%",
          transition:
            "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        {/* Top row: RECEIVE + Recipient Address */}
        <div
          style={{
            alignItems: "center",
            alignSelf: "stretch",
            boxSizing: "border-box",
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <span
            style={{
              color: "#8E8E89",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "12px",
              fontStyle: "normal",
              fontWeight: 500,
              lineHeight: "16px",
              letterSpacing: "0.96px",
              textTransform: "uppercase",
            }}
          >
            Receive
          </span>
          {Boolean(recipientAddress || defaultRecipientAddress) && (
            <div
              onClick={onOpenRecipientPicker}
              style={{
                alignItems: "center",
                boxSizing: "border-box",
                color: "#3D7BFF",
                display: "inline-flex",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "12px",
                fontStyle: "normal",
                fontWeight: 500,
                lineHeight: "16px",
                textTransform: "capitalize",
                gap: "4px",
                cursor: onOpenRecipientPicker ? "pointer" : "default",
              }}
            >
              <span>
                {formatShortAddress(
                  recipientAddress || defaultRecipientAddress
                )}
              </span>
              {onOpenRecipientPicker && (
                <svg
                  fill="none"
                  height="12"
                  stroke="#3D7BFF"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="12"
                >
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Amount Row: Input / USD value on left, Select asset button on right */}
        <div
          style={{
            alignItems: "flex-start",
            alignSelf: "stretch",
            boxSizing: "border-box",
            display: "flex",
            gap: "12px",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minWidth: 0,
              gap: "2px",
            }}
          >
            {isReceiveAmountLoading ? (
              <div
                style={{
                  alignItems: "center",
                  boxSizing: "border-box",
                  display: "flex",
                  minHeight: "32px",
                  minWidth: 0,
                  width: "100%",
                }}
              >
                <SkeletonBar height="28px" width="60%" />
              </div>
            ) : (
              <input
                onBlur={() => setFocusedPanel(null)}
                onChange={handleReceiveInput}
                onFocus={() => setFocusedPanel("receive")}
                placeholder="0"
                style={{
                  boxSizing: "border-box",
                  color: "#1F1F1F",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "clamp(22px, 5.5vw, 28px)",
                  fontStyle: "normal",
                  fontWeight: 500,
                  lineHeight: "32px",
                  letterSpacing: "-0.28px",
                  background: "transparent",
                  border: "none",
                  cursor: "text",
                  outline: "none",
                  padding: 0,
                  width: "100%",
                  minWidth: 0,
                }}
                type="text"
                value={receiveDisplayValue}
              />
            )}
            <div
              style={{
                color: "#8E8E89",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "14px",
                fontStyle: "normal",
                fontWeight: 400,
                lineHeight: "18px",
              }}
            >
              ≈ $
              {receiveUsdAmount
                ? formatUsdValue(receiveUsdAmount)
                : receiveDisplayValue && toToken?.priceUSD
                  ? (
                      Number(receiveDisplayValue) * Number(toToken.priceUSD)
                    ).toFixed(2)
                  : "0"}
            </div>
          </div>

          {/* Right: Select asset / Token pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              height: "32px",
            }}
          >
            {isLoadingBalances ? (
              <div
                className="nexus-balance-skeleton"
                style={{
                  animation:
                    "nexusSwapSkeletonShimmer 1.2s ease-in-out infinite",
                  backgroundColor: "#E8E8E7",
                  borderRadius: "999px",
                  flexShrink: 0,
                  height: "36px",
                  width: "110px",
                }}
              />
            ) : toToken ? (
              <button
                onClick={onOpenDestPicker}
                style={{
                  alignItems: "center",
                  backgroundColor: "#FFF",
                  border: "none",
                  borderRadius: "999px",
                  boxShadow: ASSET_DROPDOWN_SHADOW,
                  boxSizing: "border-box",
                  display: "flex",
                  gap: "6px",
                  padding: "5px 10px 5px 6px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                type="button"
              >
                <div
                  style={{
                    boxSizing: "border-box",
                    flexShrink: 0,
                    height: "26px",
                    position: "relative",
                    width: "26px",
                  }}
                >
                  <LogoCircle
                    alt={toToken.symbol}
                    fontSize={12}
                    label={toToken.symbol}
                    size={26}
                    src={toToken.logo}
                  />
                  {toToken.chainLogo && (
                    <LogoCircle
                      alt={toToken.chainName}
                      fontSize={6}
                      label={toToken.chainName}
                      outline="1.5px solid #FFFFFE"
                      size={12}
                      src={toToken.chainLogo}
                      style={{
                        bottom: -2,
                        position: "absolute",
                        right: -2,
                      }}
                    />
                  )}
                </div>
                <span
                  style={{
                    color: "#1F1F1F",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: "13.5px",
                    fontStyle: "normal",
                    fontWeight: 500,
                    lineHeight: "18px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {toToken.symbol}
                </span>
                <ChevronDownIcon color="#3D7BFF" />
              </button>
            ) : (
              <button
                onClick={onOpenDestPicker}
                style={{
                  alignItems: "center",
                  backgroundColor: "#FFF",
                  border: "none",
                  borderRadius: "999px",
                  boxShadow: ASSET_DROPDOWN_SHADOW,
                  boxSizing: "border-box",
                  display: "flex",
                  gap: "6px",
                  padding: "5px 10px 5px 6px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                type="button"
              >
                <div
                  style={{
                    backgroundColor: "transparent",
                    border: "1.5px dashed #D9D9DE",
                    borderRadius: "999px",
                    boxSizing: "border-box",
                    flexShrink: 0,
                    height: "26px",
                    width: "26px",
                  }}
                />
                <span
                  style={{
                    color: "#1F1F1F",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: "13.5px",
                    fontStyle: "normal",
                    fontWeight: 500,
                    lineHeight: "18px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Select asset
                </span>
                <ChevronDownIcon color="#3D7BFF" />
              </button>
            )}
          </div>
        </div>

        {/* Auto-select banner in RECEIVE if on Exact Out user modified assets */}
        {showRestoreAuto && onRestoreAuto && (
          <div
            style={{
              alignItems: "center",
              background: "#F0F3F9",
              borderRadius: "12px",
              boxSizing: "border-box",
              color: "#7989AD",
              display: "flex",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "13px",
              fontStyle: "normal",
              fontWeight: 500,
              gap: "10px",
              lineHeight: "130%",
              marginTop: "4px",
              padding: "8px",
              width: "100%",
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: "#DFE6F5",
                borderRadius: "8px",
                color: "#7989AD",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                height: "28px",
                justifyContent: "center",
                width: "28px",
              }}
            >
              <svg
                fill="none"
                height="14"
                stroke="#7989AD"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="14"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="16" y2="12" />
                <line x1="12" x2="12.01" y2="8" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              Let us auto-select the assets for you from your wallet.{" "}
              <button
                onClick={onRestoreAuto}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#3D7BFF",
                  cursor: "pointer",
                  display: "inline",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "13px",
                  fontStyle: "normal",
                  fontWeight: 700,
                  lineHeight: "130%",
                  padding: 0,
                  textDecoration: "underline",
                  textDecorationStyle: "solid",
                  textTransform: "uppercase",
                }}
                type="button"
              >
                AUTO
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── FEES & SLIPPAGE ROW (shown when intent active and wallet connected) ─── */}
      {isIntentActive && !needsWalletConnection && (
        <div
          style={{
            alignItems: "center",
            boxSizing: "border-box",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "space-between",
            marginTop: "2px",
            padding: "0 6px",
            width: "100%",
          }}
        >
          {/* Left: Fees (Est) $0 (i) */}
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: "4px",
              position: "relative",
            }}
          >
            <span
              style={{
                color: "#6B7280",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "13px",
                fontStyle: "normal",
                fontWeight: 500,
                lineHeight: "normal",
              }}
            >
              Fees (Est)
            </span>
            <span
              style={{
                color: "#111827",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "15px",
                fontStyle: "normal",
                fontWeight: 500,
                lineHeight: "normal",
              }}
            >
              ${feeAmountValue}
            </span>
            <div
              onMouseEnter={() => setTooltip("fees-info")}
              onMouseLeave={() => setTooltip(null)}
              style={{
                alignItems: "center",
                cursor: "pointer",
                display: "flex",
                position: "relative",
              }}
            >
              <svg
                fill="none"
                height="14"
                stroke="#8E8E89"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                style={{ height: "14px", width: "14px" }}
                viewBox="0 0 24 24"
                width="14"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="16" y2="12" />
                <line x1="12" x2="12.01" y1="8" y2="8" />
              </svg>
              {tooltip === "fees-info" && (
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #F0F0EF",
                    borderRadius: "12px",
                    bottom: "calc(100% + 10px)",
                    boxShadow:
                      "0 4px 16px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1)",
                    left: 0,
                    padding: "10px 14px",
                    pointerEvents: "none",
                    position: "absolute",
                    whiteSpace: "nowrap",
                    zIndex: 1000,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        alignItems: "center",
                        display: "flex",
                        gap: "12px",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          color: "#6B7280",
                          fontFamily: '"Geist", system-ui, sans-serif',
                          fontSize: "13px",
                          fontWeight: 500,
                        }}
                      >
                        Network fees:
                      </span>
                      <span
                        style={{
                          color: "#1F1F1F",
                          fontFamily: '"Geist", system-ui, sans-serif',
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        {feeBreakdown.networkFees}
                      </span>
                    </div>
                    <div
                      style={{
                        alignItems: "center",
                        display: "flex",
                        gap: "12px",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          color: "#6B7280",
                          fontFamily: '"Geist", system-ui, sans-serif',
                          fontSize: "13px",
                          fontWeight: 500,
                        }}
                      >
                        Solver fees:
                      </span>
                      <span
                        style={{
                          color: "#1F1F1F",
                          fontFamily: '"Geist", system-ui, sans-serif',
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        {feeBreakdown.solverFees}
                      </span>
                    </div>
                    {feeBreakdown.hasProtocolFees && (
                      <div
                        style={{
                          alignItems: "center",
                          display: "flex",
                          gap: "12px",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            color: "#6B7280",
                            fontFamily: '"Geist", system-ui, sans-serif',
                            fontSize: "13px",
                            fontWeight: 500,
                          }}
                        >
                          Protocol fees:
                        </span>
                        <span
                          style={{
                            color: "#1F1F1F",
                            fontFamily: '"Geist", system-ui, sans-serif',
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        >
                          {feeBreakdown.protocolFees}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Max Slippage [Auto] 0.2% (i) */}
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: "6px",
              position: "relative",
            }}
          >
            <span
              style={{
                color: "#6B7280",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "13px",
                fontStyle: "normal",
                fontWeight: 500,
                lineHeight: "normal",
              }}
            >
              Max Slippage
            </span>
            <span
              style={{
                alignItems: "center",
                background: "#EEF2FF",
                borderRadius: "999px",
                color: "#4F46E5",
                display: "flex",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "12px",
                fontStyle: "normal",
                fontWeight: 600,
                lineHeight: "normal",
                padding: "3px 8px",
              }}
            >
              Auto
            </span>
            <span
              style={{
                color: "#111827",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "15px",
                fontStyle: "normal",
                fontWeight: 500,
                lineHeight: "normal",
              }}
            >
              0.2%
            </span>
            <div
              onMouseEnter={() => setTooltip("slippage-info")}
              onMouseLeave={() => setTooltip(null)}
              style={{
                alignItems: "center",
                cursor: "pointer",
                display: "flex",
                position: "relative",
              }}
            >
              <svg
                fill="none"
                height="14"
                stroke="#8E8E89"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                style={{ height: "14px", width: "14px" }}
                viewBox="0 0 24 24"
                width="14"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="16" y2="12" />
                <line x1="12" x2="12.01" y1="8" y2="8" />
              </svg>
              {tooltip === "slippage-info" && (
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #F0F0EF",
                    borderRadius: "12px",
                    bottom: "calc(100% + 10px)",
                    boxShadow:
                      "0 4px 16px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1)",
                    padding: "10px 14px",
                    pointerEvents: "none",
                    position: "absolute",
                    right: 0,
                    whiteSpace: "nowrap",
                    zIndex: 1000,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        alignItems: "center",
                        display: "flex",
                        gap: "12px",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          color: "#6B7280",
                          fontFamily: '"Geist", system-ui, sans-serif',
                          fontSize: "13px",
                          fontWeight: 500,
                        }}
                      >
                        Min. received:
                      </span>
                      <span
                        style={{
                          color: "#1F1F1F",
                          fontFamily: '"Geist", system-ui, sans-serif',
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        {minReceivedDisplay}
                      </span>
                    </div>
                    <div
                      style={{
                        alignItems: "center",
                        display: "flex",
                        gap: "12px",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          color: "#6B7280",
                          fontFamily: '"Geist", system-ui, sans-serif',
                          fontSize: "13px",
                          fontWeight: 500,
                        }}
                      >
                        Price Impact:
                      </span>
                      <span
                        style={{
                          color: "#1F1F1F",
                          fontFamily: '"Geist", system-ui, sans-serif',
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        {priceImpactDisplay}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── EXPANDED FULL-SCREEN ASSETS MODAL ─── */}
      {isExpandModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsExpandModalOpen(false);
              }
            }}
            style={{
              alignItems: "center",
              animation: "nexusFadeIn 0.2s ease-out",
              backdropFilter: "blur(8px)",
              background: "rgba(215, 218, 220, 0.50)",
              bottom: 0,
              boxSizing: "border-box",
              display: "flex",
              inset: 0,
              justifyContent: "center",
              padding: "16px",
              position: "fixed",
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 9999999,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                alignItems: "center",
                animation: "nexusPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                background: "#FFF",
                borderRadius: "38px",
                boxShadow: "0 0 10.4px 0 rgba(0, 0, 0, 0.10)",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                maxHeight: "calc(95vh - 20px)",
                maxWidth: "512px",
                minWidth: "280px",
                padding: "12px",
                width: "100%",
              }}
            >
              {/* Inner Frame */}
              <div
                style={{
                  alignItems: "stretch",
                  alignSelf: "stretch",
                  border: "1px solid #F5F5F5",
                  borderRadius: "24px 24px 12px 12px",
                  boxSizing: "border-box",
                  display: "flex",
                  flex: "1 1 auto",
                  flexDirection: "column",
                  gap: "8px",
                  maxHeight: "calc(95vh - 100px)",
                  minHeight: 0,
                  padding: "12px 12px 0 12px",
                  width: "100%",
                }}
              >
                {/* Header Row: SEND + Asset Count Badge + Compress Icon */}
                <div
                  style={{
                    alignItems: "center",
                    alignSelf: "stretch",
                    boxSizing: "border-box",
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        color: "#8E8E89",
                        fontFamily: '"Geist", system-ui, sans-serif',
                        fontSize: "12px",
                        fontStyle: "normal",
                        fontWeight: 500,
                        letterSpacing: "0.96px",
                        lineHeight: "16px",
                        textTransform: "uppercase",
                      }}
                    >
                      Send
                    </span>
                    {totalAssetCount > 0 && (
                      <div
                        style={{
                          alignItems: "center",
                          background: "#EAF1FF",
                          borderRadius: "100px",
                          color: "#3D7BFF",
                          display: "flex",
                          fontFamily: '"Geist", system-ui, sans-serif',
                          fontSize: "10px",
                          fontStyle: "normal",
                          fontWeight: 600,
                          gap: "10px",
                          letterSpacing: "0.6px",
                          lineHeight: "12px",
                          padding: "4px 8px",
                          textTransform: "uppercase",
                        }}
                      >
                        {totalAssetCount} Assets
                      </div>
                    )}
                  </div>

                  {/* Compress / Inward Arrows Icon */}
                  <button
                    aria-label="Collapse assets view"
                    onClick={() => setIsExpandModalOpen(false)}
                    style={{
                      alignItems: "center",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      flexShrink: 0,
                      height: "14px",
                      justifyContent: "center",
                      padding: 0,
                      width: "14px",
                    }}
                    type="button"
                  >
                    <svg
                      fill="none"
                      height="14"
                      stroke="#1F1F1F"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.4"
                      viewBox="0 0 14 14"
                      width="14"
                    >
                      <path d="M1.5 5.5H5.5V1.5M12.5 8.5H8.5V12.5M5.5 5.5L1.5 1.5M8.5 8.5L12.5 12.5" />
                    </svg>
                  </button>
                </div>

                {/* Scrollable list of asset rows */}
                <div
                  style={{
                    boxSizing: "border-box",
                    display: "flex",
                    flex: "1 1 auto",
                    flexDirection: "column",
                    gap: "12px",
                    maxHeight: "calc(80vh - 140px)",
                    minHeight: 0,
                    overflowY: "auto",
                    padding: "8px 4px 8px 2px",
                    width: "100%",
                  }}
                >
                  {sourceRowsToRender.map(({ token, index }) =>
                    renderSourceRow(token, index, true)
                  )}
                </div>

                {/* Bottom bar inside Inner Frame: Total, Clear All, and Add Asset */}
                <div
                  style={{
                    alignItems: "center",
                    borderTop: "1px solid #F5F5F5",
                    boxSizing: "border-box",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    justifyContent: "space-between",
                    marginTop: "4px",
                    padding: "8px 0",
                    width: "100%",
                  }}
                >
                  {/* Left: Total amount */}
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        color: "#1F1F1F",
                        fontFamily: '"Geist", system-ui, sans-serif',
                        fontSize: "18px",
                        fontStyle: "normal",
                        fontWeight: 500,
                        lineHeight: "22px",
                      }}
                    >
                      ≈ ${totalUsd > 0 ? totalUsd.toFixed(2) : "0.00"}
                    </span>
                    <span
                      style={{
                        color: "#8E8E89",
                        fontFamily: '"Geist", system-ui, sans-serif',
                        fontSize: "12px",
                        fontStyle: "normal",
                        fontWeight: 600,
                        letterSpacing: "0.72px",
                        lineHeight: "16px",
                        textTransform: "uppercase",
                      }}
                    >
                      TOTAL
                    </span>
                  </div>

                  {/* Right: Clear All & Add Asset buttons */}
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      gap: "4px",
                    }}
                  >
                    <button
                      onClick={() => {
                        handleClearAll();
                        setIsExpandModalOpen(false);
                      }}
                      style={{
                        alignItems: "center",
                        background: "transparent",
                        border: "none",
                        color: "#BFBFBF",
                        cursor: "pointer",
                        display: "flex",
                        fontFamily: '"Geist", system-ui, sans-serif',
                        fontSize: "14px",
                        fontStyle: "normal",
                        fontWeight: 500,
                        lineHeight: "18px",
                        padding: "8px 10px",
                      }}
                      type="button"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={handleAddAsset}
                      style={{
                        alignItems: "center",
                        background: "#EEF2FF",
                        border: "none",
                        borderRadius: "10px",
                        color: "#3D7BFF",
                        cursor: "pointer",
                        display: "flex",
                        fontFamily: '"Geist", system-ui, sans-serif',
                        fontSize: "14px",
                        fontStyle: "normal",
                        fontWeight: 500,
                        gap: "4px",
                        lineHeight: "18px",
                        padding: "8px 10px",
                      }}
                      type="button"
                    >
                      <span style={{ fontSize: "16px", lineHeight: "16px" }}>
                        +
                      </span>
                      <span>Add Asset</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Done Button */}
              <button
                onClick={() => setIsExpandModalOpen(false)}
                style={{
                  alignItems: "center",
                  backgroundColor: "#1F1F1F",
                  border: "none",
                  borderRadius: "999px",
                  boxSizing: "border-box",
                  color: "#FFFFFE",
                  cursor: "pointer",
                  display: "flex",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "16px",
                  fontStyle: "normal",
                  fontWeight: 500,
                  height: "56px",
                  justifyContent: "center",
                  lineHeight: "20px",
                  padding: "12px 24px",
                  width: "100%",
                }}
                type="button"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
