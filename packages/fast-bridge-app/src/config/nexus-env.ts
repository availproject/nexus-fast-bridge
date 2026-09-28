import type { NexusNetwork } from "@avail-project/nexus-core";

export type NexusChannel = "stable" | "preview";

export interface NexusEnvConfig {
  channel: NexusChannel;
  debug: boolean;
  network: NexusNetwork;
}

export const DEFAULT_NEXUS_NETWORK: NexusNetwork = "mainnet";
export const DEFAULT_NEXUS_CHANNEL: NexusChannel = "stable";

const isValidEnvString = (val: unknown): val is string => {
  if (typeof val !== "string") {
    return false;
  }
  const trimmed = val.trim();
  return trimmed.length > 0 && trimmed !== "undefined" && trimmed !== "null";
};

/**
 * Resolves VITE_CONFIG_NEXUS_NETWORK using static property access so Vite
 * statically inlines the value at build time.
 */
export const getNetworkEnvValue = (): string | undefined => {
  const metaVal =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_CONFIG_NEXUS_NETWORK
      : undefined;
  if (isValidEnvString(metaVal)) {
    return metaVal.trim();
  }

  const procVal =
    typeof process !== "undefined"
      ? process.env?.VITE_CONFIG_NEXUS_NETWORK
      : undefined;
  if (isValidEnvString(procVal)) {
    return procVal.trim();
  }

  return undefined;
};

/**
 * Resolves VITE_CONFIG_NEXUS_CHANNEL using static property access so Vite
 * statically inlines the value at build time.
 */
export const getChannelEnvValue = (): string | undefined => {
  const metaVal =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_CONFIG_NEXUS_CHANNEL
      : undefined;
  if (isValidEnvString(metaVal)) {
    return metaVal.trim();
  }

  const procVal =
    typeof process !== "undefined"
      ? process.env?.VITE_CONFIG_NEXUS_CHANNEL
      : undefined;
  if (isValidEnvString(procVal)) {
    return procVal.trim();
  }

  return undefined;
};

/**
 * Resolves the active Nexus network.
 * Falls back to "mainnet" if not specified or not present in env vars.
 */
export const resolveNexusNetwork = (
  explicitNetwork?: NexusNetwork
): NexusNetwork => {
  if (explicitNetwork) {
    return explicitNetwork;
  }
  const envVal = getNetworkEnvValue();
  if (envVal) {
    const normalized = envVal.toLowerCase();
    if (
      normalized === "mainnet" ||
      normalized === "canary" ||
      normalized === "testnet"
    ) {
      return normalized;
    }
    return envVal as NexusNetwork;
  }
  return DEFAULT_NEXUS_NETWORK;
};

/**
 * Resolves the active Nexus chain release channel ("stable" | "preview").
 * Falls back to "stable" if not specified, not present in env vars, or invalid.
 */
export const resolveNexusChannel = (
  explicitChannel?: NexusChannel
): NexusChannel => {
  if (explicitChannel) {
    return explicitChannel;
  }
  const envVal = getChannelEnvValue();
  if (envVal) {
    const normalized = envVal.toLowerCase();
    if (normalized === "preview") {
      return "preview";
    }
    if (normalized === "stable") {
      return "stable";
    }
  }
  return DEFAULT_NEXUS_CHANNEL;
};
