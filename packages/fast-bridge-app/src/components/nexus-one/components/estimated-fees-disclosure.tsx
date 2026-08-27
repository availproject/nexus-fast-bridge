import Decimal from "decimal.js";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { SwapIntentData } from "./swap-intent-preview";

interface FeeRow {
  label: string;
  value: Decimal;
}

interface EstimatedFeesDisclosureProps {
  destinationGasFeeUsd?: string;
  intentData?: SwapIntentData | null;
  totalFeeUsd?: string;
}

const parseDecimal = (value: unknown): Decimal | undefined => {
  const cleaned = String(value ?? "").replaceAll(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") {
    return undefined;
  }
  try {
    const parsed = new Decimal(cleaned);
    return parsed.isFinite() ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const formatUsd = (value?: Decimal) => {
  if (!value) {
    return "--";
  }
  if (value.gt(0) && value.lt(0.01)) {
    return "<$0.01";
  }
  return `$${value.toDecimalPlaces(2).toFixed()}`;
};

export function EstimatedFeesDisclosure({
  destinationGasFeeUsd,
  intentData,
  totalFeeUsd,
}: EstimatedFeesDisclosureProps) {
  const [open, setOpen] = useState(false);
  const feeSummary = useMemo(() => {
    const bridge = intentData?.feesAndBuffer?.bridge;
    const isBetterIntentProvider =
      intentData?.bridgeProvider === "nexus-v2" ||
      intentData?.bridgeProvider === "mayan";
    const data = bridge && typeof bridge === "object" ? bridge : undefined;
    const collection = parseDecimal(data?.collection);
    const fulfilment = parseDecimal(data?.fulfilment);
    const executionGas =
      parseDecimal(data?.caGas) ??
      (collection || fulfilment
        ? (collection ?? new Decimal(0)).plus(fulfilment ?? new Decimal(0))
        : undefined);
    const protocol = parseDecimal(data?.protocol);
    const solver = parseDecimal(data?.solver);
    const bridgeGasSupplied = parseDecimal(data?.gasSupplied);
    const destinationGasSupplied =
      bridgeGasSupplied ??
      parseDecimal(intentData?.destination?.gas?.value) ??
      parseDecimal(destinationGasFeeUsd);
    const rows: FeeRow[] = data
      ? [
          {
            label: isBetterIntentProvider ? "Network Fee" : "Execution Gas Fee",
            value: executionGas ?? new Decimal(0),
          },
          { label: "Protocol Fee", value: protocol ?? new Decimal(0) },
          { label: "Solver Fee", value: solver ?? new Decimal(0) },
          ...(destinationGasSupplied?.gt(0)
            ? [{ label: "Gas Sponsorship", value: destinationGasSupplied }]
            : []),
        ]
      : [];
    const componentsTotal = rows.reduce(
      (total, row) => total.plus(row.value),
      new Decimal(0)
    );
    const rawBridgeTotal =
      (typeof bridge === "string" ? parseDecimal(bridge) : undefined) ??
      parseDecimal(data?.total);
    const bridgeTotal =
      rawBridgeTotal && !bridgeGasSupplied && destinationGasSupplied?.gt(0)
        ? rawBridgeTotal.plus(destinationGasSupplied)
        : rawBridgeTotal;
    const total =
      bridgeTotal ??
      (componentsTotal.gt(0) ? componentsTotal : undefined) ??
      parseDecimal(totalFeeUsd) ??
      parseDecimal(
        (intentData as { fees?: { total?: unknown } } | null)?.fees?.total
      ) ??
      destinationGasSupplied;

    return { rows, total };
  }, [destinationGasFeeUsd, intentData, totalFeeUsd]);

  if (!feeSummary.total && feeSummary.rows.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        borderTop: "1px solid #E8E8E7",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <button
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        style={{
          alignItems: "center",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          padding: "12px 0 0",
          width: "100%",
        }}
        type="button"
      >
        <span
          style={{
            color: "#1F1F1F",
            fontFamily: '"Geist", system-ui, sans-serif',
            fontSize: "14px",
            lineHeight: "20px",
          }}
        >
          Fees <span style={{ color: "#848483" }}>(Estimated)</span>
        </span>
        <span style={{ alignItems: "center", display: "flex", gap: "8px" }}>
          <span
            style={{
              color: "#1F1F1F",
              fontFamily: '"Geist", system-ui, sans-serif',
              fontSize: "14px",
              fontWeight: 600,
              lineHeight: "20px",
            }}
          >
            {formatUsd(feeSummary.total)}
          </span>
          <ChevronDown
            aria-hidden="true"
            style={{
              color: "#848483",
              height: 16,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 180ms ease",
              width: 16,
            }}
          />
        </span>
      </button>
      <div
        aria-hidden={!open}
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          transition: "grid-template-rows 180ms ease, opacity 140ms ease",
        }}
      >
        <div style={{ minHeight: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              paddingTop: "10px",
            }}
          >
            {(feeSummary.rows.length > 0
              ? feeSummary.rows
              : [
                  {
                    label: "Network & protocol",
                    value: feeSummary.total ?? new Decimal(0),
                  },
                ]
            ).map((row) => (
              <div
                key={row.label}
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
                  }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    color: "#1F1F1F",
                    fontFamily: '"Geist", system-ui, sans-serif',
                    fontSize: "12px",
                  }}
                >
                  {formatUsd(row.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
