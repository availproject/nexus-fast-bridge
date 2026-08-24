import Decimal from "decimal.js";
import { ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AddressIdenticon } from "./address-identicon";
import { EstimatedFeesDisclosure } from "./estimated-fees-disclosure";
import {
  formatSelectedTokenBalanceLabel,
  type SwapTokenOption,
} from "./swap-asset-selector";
import { PercentButtons } from "./swap-idle-form";
import type { SwapIntentData } from "./swap-intent-preview";

interface ExactOutSwapIdleFormProps {
  amount: string;
  defaultRecipientAddress?: string;
  destinationGasFeeUsd?: string;
  fromTokens: SwapTokenOption[];
  intentData?: SwapIntentData | null;
  isBalanceLoading?: boolean;
  isQuoteLoading?: boolean;
  isSourcePickerDisabled?: boolean;
  needsWalletConnection?: boolean;
  onAmountChange: (value: string) => void;
  onOpenDestinationPicker: () => void;
  onOpenRecipientPicker: () => void;
  onOpenSourcePicker: () => void;
  onSetPercent: (percent: number) => void;
  recipientAddress?: string;
  routeMessage?: string;
  showQuotedAmounts?: boolean;
  sourceSelectionTouched?: boolean;
  toToken?: SwapTokenOption;
  totalBalanceUsd: string;
  totalFeeUsd?: string;
  usdValue?: string;
}

const parseDecimal = (value: unknown) => {
  const cleaned = String(value ?? "").replaceAll(/[^0-9.-]/g, "");
  if (!cleaned) {
    return new Decimal(0);
  }
  try {
    return new Decimal(cleaned);
  } catch {
    return new Decimal(0);
  }
};

const formatNumber = (value: unknown, decimals = 6) => {
  const amount = parseDecimal(value);
  if (amount.eq(0)) {
    return "0";
  }
  return amount
    .toDecimalPlaces(decimals, Decimal.ROUND_DOWN)
    .toFixed()
    .replace(/\.0+$/, "");
};

const formatUsd = (value: unknown) =>
  `$${parseDecimal(value).toDecimalPlaces(2).toFixed()}`;

const sanitizeAmount = (value: string, decimals = 18) => {
  const cleaned = value.replaceAll(/[^0-9.]/g, "");
  const [whole = "", ...fractionParts] = cleaned.split(".");
  const fraction = fractionParts.join("").slice(0, Math.max(0, decimals));
  if (cleaned.includes(".")) {
    return `${whole || "0"}.${fraction}`;
  }
  return whole.replace(/^0+(?=\d)/, "");
};

const shortAddress = (address?: string) =>
  address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Select recipient";

function BalanceSkeleton({ width }: { width: number }) {
  return (
    <span
      aria-label="Loading balance"
      className="nexus-balance-skeleton"
      role="status"
      style={{
        borderRadius: "5px",
        display: "inline-block",
        height: 12,
        width,
      }}
    />
  );
}

function TokenLogo({
  chainLogo,
  label,
  logo,
  size = 34,
}: {
  chainLogo?: string;
  label: string;
  logo?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(!logo);

  useEffect(() => {
    setFailed(!logo);
  }, [logo]);

  return (
    <div
      style={{
        flexShrink: 0,
        height: size,
        position: "relative",
        width: size,
      }}
    >
      {!failed && logo ? (
        <img
          alt={label}
          onError={() => setFailed(true)}
          src={logo}
          style={{
            borderRadius: "999px",
            height: size,
            objectFit: "cover",
            width: size,
          }}
        />
      ) : (
        <span
          style={{
            alignItems: "center",
            background: "#E8F0FF",
            borderRadius: "999px",
            color: "#006BF4",
            display: "flex",
            fontFamily: '"Geist", system-ui, sans-serif',
            fontSize: Math.max(8, size * 0.3),
            fontWeight: 700,
            height: size,
            justifyContent: "center",
            width: size,
          }}
        >
          {label.slice(0, 2).toUpperCase()}
        </span>
      )}
      {chainLogo && (
        <img
          alt=""
          src={chainLogo}
          style={{
            borderRadius: "999px",
            bottom: -2,
            height: Math.max(11, size * 0.42),
            objectFit: "cover",
            outline: "1.5px solid #FFFFFE",
            position: "absolute",
            right: -2,
            width: Math.max(11, size * 0.42),
          }}
        />
      )}
    </div>
  );
}

function SourceLogoStack({ tokens }: { tokens: SwapTokenOption[] }) {
  const visible = tokens.slice(0, 3);
  return (
    <div style={{ alignItems: "center", display: "flex", flexShrink: 0 }}>
      {visible.map((token, index) => (
        <div
          key={`${token.chainId ?? "unified"}:${token.contractAddress}`}
          style={{ marginLeft: index === 0 ? 0 : -8 }}
        >
          <TokenLogo
            chainLogo={token.chainLogo}
            label={token.symbol}
            logo={token.logo}
            size={28}
          />
        </div>
      ))}
      {tokens.length > visible.length && (
        <span
          style={{
            alignItems: "center",
            background: "#F0F0EF",
            borderRadius: "999px",
            color: "#848483",
            display: "flex",
            fontFamily: '"Geist", system-ui, sans-serif',
            fontSize: "11px",
            fontWeight: 500,
            height: 28,
            justifyContent: "center",
            marginLeft: -8,
            outline: "2px solid #FFFFFE",
            width: 28,
          }}
        >
          +{tokens.length - visible.length}
        </span>
      )}
    </div>
  );
}

export function ExactOutSwapIdleForm({
  amount,
  defaultRecipientAddress,
  destinationGasFeeUsd,
  fromTokens,
  intentData,
  isBalanceLoading = false,
  isQuoteLoading = false,
  isSourcePickerDisabled = false,
  needsWalletConnection = false,
  onAmountChange,
  onOpenDestinationPicker,
  onOpenRecipientPicker,
  onOpenSourcePicker,
  onSetPercent,
  recipientAddress,
  routeMessage,
  showQuotedAmounts = false,
  sourceSelectionTouched = false,
  toToken,
  totalBalanceUsd,
  totalFeeUsd,
  usdValue,
}: ExactOutSwapIdleFormProps) {
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const sourceSummary = useMemo(() => {
    const chainCount = new Set(
      fromTokens.map((token) => token.chainId).filter(Boolean)
    ).size;
    return {
      assetCount: fromTokens.length,
      chainCount,
    };
  }, [fromTokens]);
  const isDefaultRecipient =
    recipientAddress?.toLowerCase() === defaultRecipientAddress?.toLowerCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
      <section
        className="nexus-focus-container"
        style={{
          background: "#FFFFFF",
          border: "1px solid transparent",
          borderRadius: "12px",
          boxShadow: "#3C286433 0 0 3px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          padding: "9px",
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
              color: "#848483",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "12px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Receive
          </span>
          <span
            style={{
              color: "#8E8E89",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "11px",
              lineHeight: "16px",
            }}
          >
            You can swap up to{" "}
            <strong style={{ color: "#1F1F1F" }}>
              {isBalanceLoading ? (
                <BalanceSkeleton width={48} />
              ) : (
                formatUsd(totalBalanceUsd)
              )}
            </strong>
          </span>
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: "9px",
            justifyContent: "space-between",
          }}
        >
          <input
            aria-label="Receive amount"
            inputMode="decimal"
            onBlur={() => setIsAmountFocused(false)}
            onChange={(event) =>
              onAmountChange(
                sanitizeAmount(event.target.value, toToken?.decimals ?? 18)
              )
            }
            onFocus={() => setIsAmountFocused(true)}
            placeholder="0"
            style={{
              background: "transparent",
              border: "none",
              color: amount ? "#1F1F1F" : "#C8C8C7",
              flex: 1,
              fontFamily: '"Delight-Medium", "Delight", system-ui, sans-serif',
              fontSize: "29px",
              fontWeight: 500,
              lineHeight: "34px",
              minWidth: 0,
              outline: "none",
              padding: 0,
            }}
            value={amount}
          />
          <button
            onClick={onOpenDestinationPicker}
            style={{
              alignItems: "center",
              background: "#FFFFFE",
              border: toToken ? "1px solid #E8E8E7" : "1px dashed #C8C8C7",
              borderRadius: "999px",
              boxShadow: "#3C28640F 0 1px 2px",
              cursor: "pointer",
              display: "flex",
              flexShrink: 0,
              gap: "5.5px",
              padding: toToken
                ? "3.3px 8.8px 3.3px 4.4px"
                : "3.3px 8.8px 3.3px 7.7px",
            }}
            type="button"
          >
            {toToken ? (
              <TokenLogo
                chainLogo={toToken.chainLogo}
                label={toToken.symbol}
                logo={toToken.logo}
                size={22}
              />
            ) : (
              <span
                style={{
                  border: "1.5px dashed #C8C8C7",
                  borderRadius: "999px",
                  height: 19.8,
                  width: 19.8,
                }}
              />
            )}
            <span
              style={{
                color: "#1F1F1F",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "15.4px",
                fontWeight: 500,
                lineHeight: "20.9px",
              }}
            >
              {toToken?.symbol ?? "Select asset"}
            </span>
            <ChevronDown
              aria-hidden="true"
              style={{
                color: "#848483",
                flexShrink: 0,
                height: 13.2,
                width: 13.2,
              }}
            />
          </button>
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: "7px",
            justifyContent: "space-between",
            minHeight: "22px",
          }}
        >
          <span
            style={{
              color: "#8E8E89",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "11px",
              lineHeight: "16px",
            }}
          >
            ≈ {formatUsd(usdValue)}
          </span>
          <div style={{ alignItems: "center", display: "flex", gap: "5px" }}>
            <PercentButtons
              disabled={!toToken || isQuoteLoading}
              onSelect={onSetPercent}
              visible={
                !needsWalletConnection && Boolean(toToken) && isAmountFocused
              }
            />
            {toToken && (
              <span
                style={{
                  alignItems: "center",
                  color: "#8E8E89",
                  display: "flex",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "11px",
                  gap: "4px",
                  lineHeight: "16px",
                }}
              >
                Balance:{" "}
                {isBalanceLoading ? (
                  <BalanceSkeleton width={78} />
                ) : (
                  formatSelectedTokenBalanceLabel(toToken)
                )}
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid #E8E8E7",
            marginTop: "4px",
            paddingTop: "6px",
          }}
        >
          <div
            style={{
              color: "#848483",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "12px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              lineHeight: "18px",
              marginBottom: "4px",
              textTransform: "uppercase",
            }}
          >
            Recipient
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
                alignItems: "center",
                color: isDefaultRecipient ? "#006BF4" : "#B7791F",
                display: "flex",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "13px",
                fontWeight: 500,
                gap: "6px",
              }}
            >
              {recipientAddress && (
                <AddressIdenticon address={recipientAddress} size={16} />
              )}
              {shortAddress(recipientAddress)}
            </span>
            <button
              onClick={onOpenRecipientPicker}
              style={{
                alignItems: "center",
                background: "#FFFFFF",
                border: "1px solid #0000000A",
                borderRadius: "999px",
                boxShadow: "#3C28640F 0 1px 2px",
                boxSizing: "border-box",
                color: "#1F1F1F",
                cursor: "pointer",
                display: "flex",
                fontFamily: '"Geist", system-ui, sans-serif',
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
        </div>
      </section>

      <section
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          boxShadow: "#3C286433 0 0 3px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "9px",
          padding: "9px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "flex-start",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span
              style={{
                alignItems: "center",
                color: "#161615",
                display: "flex",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "14px",
                fontWeight: 500,
                gap: "8px",
                lineHeight: "16px",
              }}
            >
              Send
              {(showQuotedAmounts || routeMessage) &&
                sourceSummary.assetCount > 0 && (
                  <span
                    style={{
                      background: "#E8F0FF",
                      borderRadius: "999px",
                      boxSizing: "border-box",
                      color: "#3D7BFF",
                      display: "inline-flex",
                      fontSize: "8px",
                      fontWeight: 600,
                      height: "16px",
                      alignItems: "center",
                      letterSpacing: "0.06em",
                      lineHeight: "10px",
                      padding: "0 5px",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {sourceSummary.assetCount} asset
                    {sourceSummary.assetCount === 1 ? "" : "s"}
                  </span>
                )}
            </span>
            <span
              style={{
                color: "#9A9A99",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "12px",
                lineHeight: "16px",
              }}
            >
              {sourceSelectionTouched
                ? "Manually selected"
                : amount
                  ? `Auto-selected to cover your ${formatUsd(usdValue)}`
                  : "Auto-selected"}
            </span>
          </div>
          <button
            disabled={isSourcePickerDisabled}
            onClick={onOpenSourcePicker}
            style={{
              background: isSourcePickerDisabled ? "#F5F6F8" : "#FFFFFF",
              border: "1px solid #0000000A",
              borderRadius: "999px",
              boxShadow: isSourcePickerDisabled
                ? "none"
                : "#3C28640F 0 1px 2px",
              boxSizing: "border-box",
              color: isSourcePickerDisabled ? "#B8B8B5" : "#1F1F1F",
              cursor: isSourcePickerDisabled ? "not-allowed" : "pointer",
              fontFamily: '"Geist", system-ui, sans-serif',
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

        {(showQuotedAmounts || routeMessage) && fromTokens.length > 0 ? (
          <div
            style={{
              position: "relative",
            }}
          >
            <div
              className="nexus-source-token-scroll"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "9px",
                maxHeight: fromTokens.length > 3 ? "132px" : undefined,
                overflowY: fromTokens.length > 3 ? "auto" : undefined,
                paddingBottom: fromTokens.length > 3 ? "14px" : undefined,
                paddingRight: fromTokens.length > 3 ? "7px" : undefined,
              }}
            >
              {fromTokens.map((token) => (
                <div
                  key={`${token.chainId ?? "unified"}:${token.contractAddress}`}
                  style={{
                    alignItems: "center",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      gap: "9px",
                    }}
                  >
                    <TokenLogo
                      chainLogo={token.chainLogo}
                      label={token.symbol}
                      logo={token.logo}
                      size={28}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <span
                        style={{
                          color: "#1F1F1F",
                          fontFamily: '"Geist", system-ui, sans-serif',
                          fontSize: "13px",
                          fontWeight: 500,
                          lineHeight: "16px",
                        }}
                      >
                        {token.symbol}
                      </span>
                      <span
                        style={{
                          color: "#8E8E89",
                          fontFamily: '"Geist", system-ui, sans-serif',
                          fontSize: "12px",
                          lineHeight: "16px",
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
                      gap: "2px",
                    }}
                  >
                    <span
                      style={{
                        color: "#1F1F1F",
                        fontFamily: '"Geist", system-ui, sans-serif',
                        fontSize: "13px",
                        fontWeight: 600,
                        lineHeight: "16px",
                      }}
                    >
                      {formatNumber(token.userAmount || token.balance)}{" "}
                      {token.symbol}
                    </span>
                    <span
                      style={{
                        color: "#8E8E89",
                        fontFamily: '"Geist", system-ui, sans-serif',
                        fontSize: "12px",
                        lineHeight: "16px",
                      }}
                    >
                      {formatUsd(token.userAmountUsd || token.balanceInFiat)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {fromTokens.length > 3 && (
              <div
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0) 0%, #FFFFFF 100%)",
                  bottom: 0,
                  height: "22px",
                  left: 0,
                  pointerEvents: "none",
                  position: "absolute",
                  right: "7px",
                }}
              />
            )}
          </div>
        ) : fromTokens.length > 0 ? (
          <div style={{ alignItems: "center", display: "flex", gap: "9px" }}>
            <SourceLogoStack tokens={fromTokens} />
            <span
              style={{
                color: "#848483",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "12px",
                lineHeight: "16px",
              }}
            >
              Pay with {sourceSummary.assetCount} token
              {sourceSummary.assetCount === 1 ? "" : "s"} across{" "}
              {sourceSummary.chainCount} chain
              {sourceSummary.chainCount === 1 ? "" : "s"} · auto-converted to
              selected chains
            </span>
          </div>
        ) : (
          <span
            style={{
              color: "#848483",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "12px",
              lineHeight: "16px",
            }}
          >
            Sources will be auto-selected from your balances.
          </span>
        )}

        {isQuoteLoading && (
          <div
            style={{
              alignItems: "center",
              color: "#006BF4",
              display: "flex",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "12px",
              gap: "8px",
              minHeight: 20,
            }}
          >
            <Loader2
              className="animate-spin"
              style={{ height: 16, width: 16 }}
            />
            Calculating best route…
          </div>
        )}

        {routeMessage && (
          <span
            style={{
              color: "#D32F2F",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "12px",
            }}
          >
            {routeMessage}
          </span>
        )}

        <EstimatedFeesDisclosure
          destinationGasFeeUsd={destinationGasFeeUsd}
          intentData={intentData}
          totalFeeUsd={totalFeeUsd}
        />
      </section>
    </div>
  );
}
