import Decimal from "decimal.js";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { AddressIdenticon } from "./address-identicon";
import { EstimatedFeesDisclosure } from "./estimated-fees-disclosure";
import type { SwapTokenOption } from "./swap-asset-selector";
import type { SwapIntentData } from "./swap-intent-preview";

interface ExactOutSwapIdleFormProps {
  amount: string;
  calculatingPercent: number | null;
  defaultRecipientAddress?: string;
  destinationGasFeeUsd?: string;
  fromTokens: SwapTokenOption[];
  intentData?: SwapIntentData | null;
  isQuoteLoading?: boolean;
  isSourcePickerDisabled?: boolean;
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
  return (
    <div
      style={{
        flexShrink: 0,
        height: size,
        position: "relative",
        width: size,
      }}
    >
      {logo ? (
        <img
          alt={label}
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
            height: Math.max(12, size * 0.42),
            objectFit: "cover",
            outline: "1.5px solid #FFFFFE",
            position: "absolute",
            right: -2,
            width: Math.max(12, size * 0.42),
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

function PercentButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active: boolean;
  children: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        background: active ? "#FFFFFE" : "transparent",
        border: "none",
        borderRadius: "8px",
        boxShadow: active ? "0 1px 3px #3C28641A" : "none",
        color: active ? "#1F1F1F" : "#8E8E89",
        cursor: disabled ? "default" : "pointer",
        fontFamily: '"Geist", system-ui, sans-serif',
        fontSize: "12px",
        fontWeight: 500,
        height: 30,
        minWidth: 48,
        opacity: disabled ? 0.6 : 1,
        padding: "0 10px",
      }}
      type="button"
    >
      {children}
    </button>
  );
}

export function ExactOutSwapIdleForm({
  amount,
  calculatingPercent,
  defaultRecipientAddress,
  destinationGasFeeUsd,
  fromTokens,
  intentData,
  isQuoteLoading = false,
  isSourcePickerDisabled = false,
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
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <section
        style={{
          background: "#FFFFFE",
          border: "1px solid #E8E8E7",
          borderRadius: "12px",
          boxShadow: "#1616150A 0 1px 2px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "16px",
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
              fontSize: "13px",
            }}
          >
            You can swap up to{" "}
            <strong style={{ color: "#1F1F1F" }}>
              {formatUsd(totalBalanceUsd)}
            </strong>
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
          <input
            aria-label="Receive amount"
            inputMode="decimal"
            onChange={(event) =>
              onAmountChange(
                sanitizeAmount(event.target.value, toToken?.decimals ?? 18)
              )
            }
            placeholder="0"
            style={{
              background: "transparent",
              border: "none",
              color: amount ? "#1F1F1F" : "#C8C8C7",
              flex: 1,
              fontFamily: '"Delight-Medium", "Delight", system-ui, sans-serif',
              fontSize: "40px",
              fontWeight: 500,
              lineHeight: "48px",
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
              gap: "8px",
              padding: "7px 12px 7px 7px",
            }}
            type="button"
          >
            {toToken ? (
              <TokenLogo
                chainLogo={toToken.chainLogo}
                label={toToken.symbol}
                logo={toToken.logo}
                size={32}
              />
            ) : (
              <span
                style={{
                  border: "1.5px dashed #C8C8C7",
                  borderRadius: "999px",
                  height: 28,
                  width: 28,
                }}
              />
            )}
            <span
              style={{
                color: "#1F1F1F",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              {toToken?.symbol ?? "Select asset"}
            </span>
            <span aria-hidden="true" style={{ color: "#848483" }}>
              ⌄
            </span>
          </button>
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: "10px",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              color: "#8E8E89",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "14px",
            }}
          >
            ≈ {formatUsd(usdValue)}
          </span>
          <div style={{ alignItems: "center", display: "flex", gap: "8px" }}>
            <div
              style={{
                background: "#F5F6F8",
                borderRadius: "10px",
                display: "flex",
                padding: "2px",
              }}
            >
              <PercentButton
                active={calculatingPercent === 20}
                disabled={!toToken || isQuoteLoading}
                onClick={() => onSetPercent(20)}
              >
                20%
              </PercentButton>
              <PercentButton
                active={calculatingPercent === 75}
                disabled={!toToken || isQuoteLoading}
                onClick={() => onSetPercent(75)}
              >
                75%
              </PercentButton>
              <PercentButton
                active={calculatingPercent === 100}
                disabled={!toToken || isQuoteLoading}
                onClick={() => onSetPercent(100)}
              >
                Max
              </PercentButton>
            </div>
            {toToken && (
              <span
                style={{
                  color: "#8E8E89",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "13px",
                }}
              >
                Balance · {formatNumber(toToken.balance)} {toToken.symbol}
              </span>
            )}
          </div>
        </div>

        <div style={{ borderTop: "1px solid #E8E8E7", paddingTop: "12px" }}>
          <div
            style={{
              color: "#848483",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "12px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              marginBottom: "8px",
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
                fontSize: "14px",
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
                background: "#FFFFFE",
                border: "1px solid #E8E8E7",
                borderRadius: "999px",
                boxShadow: "#3C28640F 0 1px 2px",
                color: "#1F1F1F",
                cursor: "pointer",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "13px",
                fontWeight: 500,
                padding: "7px 14px",
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
          background: "#FFFFFE",
          border: "1px solid #E8E8E7",
          borderRadius: "12px",
          boxShadow: "#1616150A 0 1px 2px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "16px",
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
                fontSize: "15px",
                fontWeight: 500,
                gap: "8px",
              }}
            >
              Send
              {showQuotedAmounts && sourceSummary.assetCount > 0 && (
                <span
                  style={{
                    background: "#E8F0FF",
                    borderRadius: "999px",
                    color: "#3D7BFF",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    padding: "3px 8px",
                    textTransform: "uppercase",
                  }}
                >
                  {sourceSummary.assetCount} assets
                </span>
              )}
            </span>
            <span
              style={{
                color: "#9A9A99",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "14px",
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
              background: "#FFFFFE",
              border: "1px solid #0000000A",
              borderRadius: "999px",
              boxShadow: "#3C28640F 0 1px 2px",
              color: isSourcePickerDisabled ? "#B8B8B5" : "#1F1F1F",
              cursor: isSourcePickerDisabled ? "default" : "pointer",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "13px",
              fontWeight: 500,
              padding: "7px 14px",
            }}
            type="button"
          >
            Edit
          </button>
        </div>

        {isQuoteLoading ? (
          <div
            style={{
              alignItems: "center",
              color: "#006BF4",
              display: "flex",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "14px",
              gap: "8px",
              minHeight: 36,
            }}
          >
            <Loader2
              className="animate-spin"
              style={{ height: 16, width: 16 }}
            />
            Calculating best route…
          </div>
        ) : showQuotedAmounts && fromTokens.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
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
                  style={{ alignItems: "center", display: "flex", gap: "12px" }}
                >
                  <TokenLogo
                    chainLogo={token.chainLogo}
                    label={token.symbol}
                    logo={token.logo}
                    size={36}
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
                        fontSize: "14px",
                        fontWeight: 600,
                      }}
                    >
                      {token.symbol}
                    </span>
                    <span
                      style={{
                        color: "#8E8E89",
                        fontFamily: '"Geist", system-ui, sans-serif',
                        fontSize: "13px",
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
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    {formatNumber(token.userAmount || token.balance)}{" "}
                    {token.symbol}
                  </span>
                  <span
                    style={{
                      color: "#8E8E89",
                      fontFamily: '"Geist", system-ui, sans-serif',
                      fontSize: "13px",
                    }}
                  >
                    {formatUsd(token.userAmountUsd || token.balanceInFiat)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : fromTokens.length > 0 ? (
          <div style={{ alignItems: "center", display: "flex", gap: "12px" }}>
            <SourceLogoStack tokens={fromTokens} />
            <span
              style={{
                color: "#848483",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "14px",
                lineHeight: "18px",
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
              fontSize: "14px",
            }}
          >
            Sources will be auto-selected from your balances.
          </span>
        )}

        {routeMessage && (
          <span
            style={{
              color: "#D32F2F",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "13px",
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
