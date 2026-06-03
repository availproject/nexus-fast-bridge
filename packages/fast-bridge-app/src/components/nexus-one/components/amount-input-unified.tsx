import type { UserAssetDatum } from "@avail-project/nexus-core";
import Decimal from "decimal.js";
import type React from "react";
import { useMemo } from "react";
import {
  formatTokenAmountDisplay,
  formatUsdBalanceLabel,
} from "./swap-asset-selector";

interface AmountInputUnifiedProps {
  amount: string;
  disabled?: boolean;
  header?: React.ReactNode;
  maxAvailableAmount?: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  tokenIcon?: React.ReactNode;
  /** Label shown beside Balance text, e.g. "USDC" */
  tokenSymbol?: string;
  unifiedBalances?: UserAssetDatum[];
  usdValue?: string;
}

export function AmountInputUnified({
  amount,
  onChange,
  onCommit,
  disabled,
  maxAvailableAmount,
  unifiedBalances,
  tokenIcon,
  usdValue,
  tokenSymbol,
  header,
}: AmountInputUnifiedProps) {
  const handleMax = () => {
    if (!totalBalanceValue) {
      return;
    }
    onChange(totalBalanceValue);
    onCommit?.(totalBalanceValue);
  };

  const isUsdMode = !tokenSymbol;
  const totalBalanceValue = useMemo(() => {
    if (!unifiedBalances?.length) {
      return "";
    }
    if (isUsdMode) {
      return unifiedBalances
        .reduce((acc, curr) => acc.add(curr.balanceInFiat ?? 0), new Decimal(0))
        .toDecimalPlaces(8, Decimal.ROUND_DOWN)
        .toFixed(0);
    }
    return unifiedBalances
      .reduce((acc, curr) => acc.add(curr.balance ?? 0), new Decimal(0))
      .toDecimalPlaces(8, Decimal.ROUND_DOWN)
      .toFixed(0);
  }, [isUsdMode, unifiedBalances]);
  const totalBalanceLabel = useMemo(() => {
    if (!unifiedBalances?.length) {
      return "0";
    }
    if (isUsdMode) {
      const fiatAmount = unifiedBalances.reduce(
        (acc, curr) => acc.add(curr.balanceInFiat ?? 0),
        new Decimal(0)
      );
      return formatUsdBalanceLabel(fiatAmount);
    }
    const amount = unifiedBalances.reduce(
      (acc, curr) => acc.add(curr.balance ?? 0),
      new Decimal(0)
    );
    return formatTokenAmountDisplay(amount);
  }, [isUsdMode, unifiedBalances]);

  return (
    <div
      className="flex min-h-[168px] w-full flex-col bg-white"
      style={{
        borderRadius: "12px",
        border: "1px solid var(--border-default, #E8E8E7)",
        boxShadow: "0px 1px 12px 0px #5B5B5B0D",
        background: "#FFFFFF",
      }}
    >
      {header && (
        <div className="w-full border-[#E8E8E7] border-b px-4 py-3">
          {header}
        </div>
      )}
      <div className="relative flex w-full flex-1 flex-col items-center justify-center p-4">
        {/* Central Input row: large amount + MAX button inline */}
        <div className="mb-1.5 flex w-full items-center justify-center gap-x-2">
          <div
            className="flex items-center justify-center text-center"
            style={{
              fontSize: "34px",
              fontWeight: 500,
              gap: "2px",
            }}
          >
            {tokenIcon ? (
              <div className="mr-3 flex items-center justify-center">
                {tokenIcon}
              </div>
            ) : (
              <span className="mr-1.5 text-gray-800 leading-none">$</span>
            )}
            <input
              className="min-w-0 truncate border-none bg-transparent p-0 text-start tabular-nums outline-none placeholder:text-gray-300 focus:ring-0"
              disabled={disabled}
              inputMode="decimal"
              onBlur={() => onCommit?.(amount)}
              onChange={(e) => {
                let next = e.target.value.replaceAll(/[^0-9.]/g, "");
                const parts = next.split(".");
                if (parts.length > 2) {
                  next = `${parts[0]}.${parts.slice(1).join("")}`;
                }
                if (next === ".") {
                  next = "0.";
                }
                onChange(next);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onCommit?.(amount);
                }
              }}
              placeholder="0"
              style={{
                fontFamily: "'Delight', sans-serif",
                fontWeight: 500,
                fontSize: "34px",
                lineHeight: "100%",
                height: "34px",
                letterSpacing: "2%",
                color: "var(--foreground-primary, #161615)",
                fieldSizing: "content",
                minWidth: "1ch",
                maxWidth: "6ch",
              }}
              type="text"
              value={amount}
            />
          </div>
          {/* MAX button — inline beside the input */}
          <button
            className="shrink-0 transition-opacity focus:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={disabled || !maxAvailableAmount}
            onClick={handleMax}
            style={{
              background: "var(--background-tertiary, #F0F0EF)",
              width: "40px",
              height: "22px",
              borderRadius: "6px",
              padding: "3px 7px",
              color: "var(--foreground-muted, #848483)",
              fontFamily:
                "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontWeight: 400,
              fontSize: "10px",
              lineHeight: "100%",
            }}
          >
            MAX
          </button>
        </div>

        {/* Balance display — below amount + MAX row */}
        {(totalBalanceValue || maxAvailableAmount) && (
          <div className="absolute bottom-4 left-0 flex w-full justify-center">
            <p
              style={{
                color: "var(--widget-card-foreground-muted, #848483)",
                fontFamily:
                  "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
                fontWeight: 400,
                fontSize: "12px",
                lineHeight: "100%",
                textAlign: "center",
              }}
            >
              Balance: {totalBalanceLabel || "0"}
              {tokenSymbol ? ` ${tokenSymbol}` : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
