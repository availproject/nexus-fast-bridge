import Decimal from "decimal.js";
import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import { PayWithSources as SharedPayWithSources } from "./pay-with-sources";
import {
  formatSelectedTokenBalanceLabel,
  formatUsdBalanceLabel,
  type SwapTokenOption,
} from "./swap-asset-selector";

interface DepositIdleFormProps {
  amount: string;
  amountMode: "token" | "usd";
  calculatingPercent?: number | null;
  fromTokens: SwapTokenOption[];
  isCalculatingMax?: boolean;
  isQuoteRefreshing?: boolean;
  onAmountChange: (val: string) => void;
  onAmountModeToggle: () => void;
  onOpenSourcePicker: () => void;
  onSetPercent: (pct: number) => void;
  routeMessage?: string;
  routeStatus?: "loading" | "insufficient";
  showAutoBadge?: boolean;
  tokenValue: string;
  toToken?: SwapTokenOption;
  totalBalance: string;
  usdValue: string;
}

const uiFont = '"Geist", system-ui, sans-serif';
const primary = "#161615";
const muted = "#848483";
const border = "#E8E8E7";
const brand = "#006BF4";

const parseDecimal = (value: unknown) => {
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

const MAX_AMOUNT_DISPLAY_DECIMALS = 8;
const getTokenInputDecimals = (token?: Pick<SwapTokenOption, "decimals">) => {
  const decimals = Number(token?.decimals);
  return Number.isFinite(decimals) && decimals >= 0 ? Math.floor(decimals) : 18;
};

const formatAmountInputDisplay = (value: string) => {
  if (!value) {
    return "";
  }
  try {
    return new Decimal(value)
      .toDecimalPlaces(MAX_AMOUNT_DISPLAY_DECIMALS, Decimal.ROUND_DOWN)
      .toFixed(0);
  } catch {
    return value;
  }
};

const sanitizeAmountInput = (raw: string, maxDecimals: number) => {
  let next = raw.replaceAll(/[^0-9.]/g, "");
  const parts = next.split(".");
  if (parts.length > 2) {
    next = `${parts[0]}.${parts.slice(1).join("")}`;
  }
  const [integerPart, decimalPart] = next.split(".");
  if (decimalPart !== undefined) {
    next = `${integerPart}.${decimalPart.slice(0, Math.max(0, maxDecimals))}`;
  }
  if (next === ".") {
    next = "0.";
  }
  return next;
};

function TokenLogo({
  src,
  label,
  size = 30,
  fontSize = 12,
  style,
}: {
  src?: string;
  label?: string;
  size?: number;
  fontSize?: number;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(!src);

  React.useEffect(() => {
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
    <div
      style={{
        alignItems: "center",
        backgroundColor: "#E8F0FF",
        borderRadius: "999px",
        color: brand,
        display: "flex",
        fontFamily: uiFont,
        fontSize,
        fontWeight: 700,
        height: size,
        justifyContent: "center",
        width: size,
        ...style,
      }}
    >
      {(label || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

export function DepositIdleForm({
  amount,
  amountMode,
  onAmountChange,
  onAmountModeToggle,
  toToken,
  totalBalance,
  usdValue,
  tokenValue,
  fromTokens,
  onOpenSourcePicker,
  onSetPercent,
  routeStatus,
  routeMessage,
  isCalculatingMax,
  calculatingPercent,
  showAutoBadge = true,
}: DepositIdleFormProps) {
  const [pendingPercent, setPendingPercent] = useState<number | null>(null);
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  React.useEffect(() => {
    if (!isCalculatingMax) {
      setPendingPercent(null);
    }
  }, [isCalculatingMax]);

  const handlePercentSelect = (pct: number) => {
    setPendingPercent(pct);
    onSetPercent(pct);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAmountChange(
      sanitizeAmountInput(
        e.target.value,
        isUsdMode ? MAX_AMOUNT_DISPLAY_DECIMALS : getTokenInputDecimals(toToken)
      )
    );
  };
  const isUsdMode = amountMode === "usd";
  const amountDisplayValue = isAmountFocused
    ? amount
    : formatAmountInputDisplay(amount);
  const activePendingPercent =
    calculatingPercent ?? (isCalculatingMax ? pendingPercent : null);
  const isMaxCalculating = Boolean(
    isCalculatingMax && activePendingPercent === 100
  );
  const destinationBalanceLabel = isUsdMode
    ? formatUsdBalanceLabel(toToken?.balanceInFiat)
    : formatSelectedTokenBalanceLabel(toToken) ||
      `0 ${toToken?.symbol || ""}`.trim();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
      }}
    >
      <div
        style={{
          backgroundColor: "#FFFFFE",
          borderColor: border,
          borderRadius: "12px",
          borderStyle: "solid",
          borderWidth: "1px",
          boxShadow: "#1616150A 0px 1px 2px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          padding: "15px 14px",
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
            style={{
              color: muted,
              fontFamily: uiFont,
              fontSize: "12px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              lineHeight: "20px",
              textTransform: "uppercase",
            }}
          >
            Deposit
          </div>
          <div style={{ alignItems: "center", display: "flex", gap: "4px" }}>
            <span
              style={{
                color: muted,
                fontFamily: uiFont,
                fontSize: "13px",
                lineHeight: "18px",
              }}
            >
              Total Balance:
            </span>
            <span
              style={{
                color: primary,
                fontFamily: uiFont,
                fontSize: "13px",
                fontWeight: 600,
                lineHeight: "18px",
              }}
            >
              ${totalBalance}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: "10px",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div
              style={{
                alignItems: "baseline",
                display: "flex",
                flex: "1 1 0%",
                minWidth: 0,
              }}
            >
              {isMaxCalculating ? (
                <div
                  aria-label="Calculating max amount"
                  className="animate-pulse"
                  style={{
                    alignSelf: "center",
                    backgroundColor: "#F0F0EF",
                    borderRadius: "8px",
                    height: "34px",
                    maxWidth: "220px",
                    minWidth: "132px",
                    width: "62%",
                  }}
                />
              ) : (
                <>
                  {isUsdMode && amount && (
                    <span
                      style={{
                        color: primary,
                        fontFamily:
                          '"Delight-Medium", "Delight", system-ui, sans-serif',
                        fontSize: "30px",
                        fontWeight: 500,
                        lineHeight: "36px",
                      }}
                    >
                      $
                    </span>
                  )}
                  <input
                    onBlur={() => setIsAmountFocused(false)}
                    onChange={handleInput}
                    onFocus={() => setIsAmountFocused(true)}
                    placeholder="0"
                    style={{
                      background: "transparent",
                      border: "none",
                      boxSizing: "border-box",
                      color: amount ? primary : "#9E9E9C",
                      fontFamily:
                        '"Delight-Medium", "Delight", system-ui, sans-serif',
                      fontSize: "32px",
                      fontWeight: 500,
                      lineHeight: "38px",
                      minWidth: 0,
                      outline: "none",
                      padding: 0,
                      width: "100%",
                    }}
                    type="text"
                    value={amountDisplayValue}
                  />
                </>
              )}
              {isCalculatingMax && !isMaxCalculating && (
                <Loader2
                  className="animate-spin"
                  style={{
                    alignSelf: "center",
                    color: brand,
                    flexShrink: 0,
                    height: 18,
                    marginLeft: 6,
                    width: 18,
                  }}
                />
              )}
            </div>

            <div
              style={{
                alignItems: "center",
                backgroundColor: "#FFFFFE",
                borderColor: border,
                borderRadius: "999px",
                borderStyle: "solid",
                borderWidth: "1px",
                boxShadow: "#1616150A 0px 1px 2px",
                boxSizing: "border-box",
                display: "inline-flex",
                flexShrink: 0,
                gap: "8px",
                height: "32px",
                paddingLeft: "4px",
                paddingRight: "10px",
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  height: "24px",
                  position: "relative",
                  width: "24px",
                }}
              >
                <TokenLogo
                  label={toToken?.symbol}
                  size={24}
                  src={toToken?.logo}
                />
                {toToken?.chainLogo && (
                  <TokenLogo
                    label={toToken.chainName}
                    size={12}
                    src={toToken.chainLogo}
                    style={{
                      bottom: -2,
                      outline: "1px solid #FFFFFE",
                      position: "absolute",
                      right: -2,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  color: primary,
                  fontFamily: uiFont,
                  fontSize: "15px",
                  fontWeight: 600,
                  lineHeight: "22px",
                }}
              >
                {toToken?.symbol || "Token"}
              </div>
            </div>
          </div>

          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <button
              onClick={onAmountModeToggle}
              style={{
                background: "transparent",
                border: "none",
                color: muted,
                cursor: "pointer",
                fontFamily: uiFont,
                fontSize: "13px",
                lineHeight: "18px",
                padding: 0,
              }}
              type="button"
            >
              {isUsdMode
                ? `≈ ${tokenValue || "0"} ${toToken?.symbol || ""} ↕`
                : `≈ $${usdValue || "0"} ↕`}
            </button>
            <div style={{ alignItems: "center", display: "flex", gap: "5px" }}>
              <span
                style={{
                  color: "#7C7C7A",
                  fontFamily: uiFont,
                  fontSize: "13px",
                  lineHeight: "18px",
                }}
              >
                Balance:
              </span>
              <span
                style={{
                  color: primary,
                  fontFamily: uiFont,
                  fontSize: "13px",
                  fontWeight: 500,
                  lineHeight: "18px",
                }}
              >
                {destinationBalanceLabel}
              </span>
            </div>
          </div>

          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: "5px",
              minHeight: "24px",
              width: "100%",
            }}
          >
            {[25, 50, 75].map((pct) => {
              const isPending = Boolean(
                isCalculatingMax && activePendingPercent === pct
              );
              return (
                <button
                  key={pct}
                  onClick={() => handlePercentSelect(pct)}
                  onMouseDown={(event) => event.preventDefault()}
                  style={{
                    alignItems: "center",
                    backgroundColor: isPending ? "#E8F0FF" : "#F4F4F3",
                    border: "none",
                    borderRadius: "7px",
                    cursor: "pointer",
                    display: "flex",
                    flex: "1 1 0%",
                    gap: "5px",
                    justifyContent: "center",
                    padding: "4px 7px",
                  }}
                  type="button"
                >
                  {isPending && (
                    <Loader2
                      className="animate-spin"
                      style={{ color: brand, height: 12, width: 12 }}
                    />
                  )}
                  <span
                    style={{
                      color: isPending ? brand : "#363635",
                      fontFamily: uiFont,
                      fontSize: "11px",
                      fontWeight: isPending ? 600 : 500,
                      lineHeight: "16px",
                    }}
                  >
                    {pct}%
                  </span>
                </button>
              );
            })}
            {(() => {
              const isPending = Boolean(
                isCalculatingMax && activePendingPercent === 100
              );
              return (
                <button
                  onClick={() => handlePercentSelect(100)}
                  onMouseDown={(event) => event.preventDefault()}
                  style={{
                    alignItems: "center",
                    backgroundColor: isPending ? "#E8F0FF" : "#F4F4F3",
                    border: "none",
                    borderRadius: "7px",
                    cursor: "pointer",
                    display: "flex",
                    flex: isPending ? "1.8 1 0%" : "1 1 0%",
                    gap: "5px",
                    justifyContent: "center",
                    minWidth: 0,
                    padding: "4px 7px",
                  }}
                  type="button"
                >
                  {isPending && (
                    <Loader2
                      className="animate-spin"
                      style={{ color: brand, height: 12, width: 12 }}
                    />
                  )}
                  <span
                    style={{
                      color: isPending ? brand : "#363635",
                      fontFamily: uiFont,
                      fontSize: isPending ? "9px" : "11px",
                      fontWeight: isPending ? 600 : 500,
                      letterSpacing: "0.02em",
                      lineHeight: "16px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isPending ? "Calculating Max..." : "MAX"}
                  </span>
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      <SharedPayWithSources
        fromTokens={fromTokens}
        onOpenSourcePicker={onOpenSourcePicker}
        routeMessage={routeMessage}
        routeStatus={routeStatus}
        showAutoBadge={showAutoBadge}
      />
    </div>
  );
}
