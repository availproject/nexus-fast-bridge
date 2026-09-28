import type { NexusNetwork } from "@avail-project/nexus-core";

export type NexusChannel = "stable" | "preview";

export interface NexusEnvConfig {
  channel: NexusChannel;
  debug: boolean;
  network: NexusNetwork;
}

export const DEFAULT_NEXUS_NETWORK: NexusNetwork = "mainnet";
export const DEFAULT_NEXUS_CHANNEL: NexusChannel = "stable";

const NETWORK_ENV_KEYS = [
  "VITE_NEXUS_NETWORK",
  "VITE_CONFIG_NEXUS_NETWORK",
  "VITE_NETWORK",
  "NEXUS_NETWORK",
  "NETWORK",
] as const;

const CHANNEL_ENV_KEYS = [
  "VITE_NEXUS_CHANNEL",
  "VITE_CONFIG_NEXUS_CHANNEL",
  "VITE_CHANNEL",
  "NEXUS_CHANNEL",
  "CHANNEL",
] as const;

const isValidEnvString = (val: unknown): val is string => {
  if (typeof val !== "string") {
    return false;
  }
  const trimmed = val.trim();
  return trimmed.length > 0 && trimmed !== "undefined" && trimmed !== "null";
};

/**
 * Safely inspects environment variables from import.meta.env (Vite)
 * with a fallback to process.env (Node / test environments).
 */
export const getEnvValue = (...keys: readonly string[]): string | undefined => {
  for (const key of keys) {
    try {
      const meta = import.meta as unknown as { env?: Record<string, unknown> };
      const metaVal = meta?.env?.[key];
      if (isValidEnvString(metaVal)) {
        return metaVal.trim();
      }
    } catch {
      // Ignore errors when accessing import.meta in environments where it's unavailable
    }

    try {
      if (typeof process !== "undefined" && process?.env) {
        const procVal = process.env[key];
        if (isValidEnvString(procVal)) {
          return procVal.trim();
        }
      }
    } catch {
      // Ignore errors when accessing process.env
    }
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
  const envVal = getEnvValue(...NETWORK_ENV_KEYS);
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
  const envVal = getEnvValue(...CHANNEL_ENV_KEYS);
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
