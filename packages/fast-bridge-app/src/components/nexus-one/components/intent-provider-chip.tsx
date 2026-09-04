import type { IntentProvider } from "@avail-project/nexus-core";
import { Info } from "lucide-react";
import { withBasePath } from "@/lib/utils";
import {
  formatIntentProviderName,
  isBetterIntentProvider,
} from "../../nexus/better-intent-compat";

const PROVIDER_LOGOS: Record<IntentProvider, string> = {
  "nexus-v2": "/avail_logo.svg",
  mayan: "/mayan_logo.svg",
  relay: "/relay_logo.png",
};

const fontFamily = '"Geist", var(--font-geist-sans), system-ui, sans-serif';

interface IntentProviderChipProps {
  align?: "flex-start" | "flex-end";
  label?: string;
  provider: unknown;
}

/** Small pill naming the Better Intent provider a quote was routed through. */
export function IntentProviderChip({
  align = "flex-start",
  label = "Routed via",
  provider,
}: IntentProviderChipProps) {
  if (!isBetterIntentProvider(provider)) {
    return null;
  }
  const name = formatIntentProviderName(provider);
  return (
    <div style={{ display: "flex", justifyContent: align }}>
      <span
        style={{
          alignItems: "center",
          background: "#F6F6F5",
          border: "1px solid #ECECEB",
          borderRadius: "999px",
          color: "#5F5F5C",
          display: "inline-flex",
          fontFamily,
          fontSize: "11px",
          fontWeight: 500,
          gap: "5px",
          lineHeight: "14px",
          padding: "3px 8px 3px 4px",
        }}
        title={`Quoted and executed by ${name}`}
      >
        <img
          alt=""
          src={withBasePath(PROVIDER_LOGOS[provider])}
          style={{
            borderRadius: "999px",
            display: "block",
            height: 14,
            maxWidth: 40,
            objectFit: "contain",
            width: "auto",
          }}
        />
        <span>
          {label} <strong style={{ fontWeight: 600 }}>{name}</strong>
        </span>
      </span>
    </div>
  );
}

/** Full-width notice naming the provider, in the style of the earlier Mayan badge. */
export function IntentProviderBanner({ provider }: { provider: unknown }) {
  if (!isBetterIntentProvider(provider)) {
    return null;
  }
  const name = formatIntentProviderName(provider);
  const isWordmark = provider === "mayan";
  return (
    <div
      style={{
        alignItems: "center",
        background: "#F3F6FF",
        border: "1px solid #E8EEFF",
        borderRadius: "8px",
        boxSizing: "border-box",
        color: "var(--foreground-brand, #006BF4)",
        display: "flex",
        fontFamily,
        fontSize: "12px",
        fontWeight: 500,
        gap: "6px",
        lineHeight: "16px",
        minHeight: "36px",
        padding: "9px 12px",
        width: "100%",
      }}
    >
      <Info style={{ flexShrink: 0, height: 13, width: 13 }} />
      <span style={{ flexShrink: 0 }}>This transaction is routed via</span>
      <img
        alt={isWordmark ? name : ""}
        src={withBasePath(PROVIDER_LOGOS[provider])}
        style={{
          borderRadius: isWordmark ? 0 : "999px",
          display: "block",
          height: isWordmark ? "20px" : "16px",
          objectFit: "contain",
          width: "auto",
        }}
      />
      {isWordmark ? null : <strong style={{ fontWeight: 600 }}>{name}</strong>}
    </div>
  );
}
