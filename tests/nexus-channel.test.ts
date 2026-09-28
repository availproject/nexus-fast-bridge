import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  DEFAULT_NEXUS_CHANNEL,
  DEFAULT_NEXUS_NETWORK,
  resolveNexusChannel,
  resolveNexusNetwork,
} from "../packages/fast-bridge-app/src/config/nexus-env";

const ENV_KEYS = [
  "VITE_NEXUS_NETWORK",
  "VITE_CONFIG_NEXUS_NETWORK",
  "VITE_NETWORK",
  "NEXUS_NETWORK",
  "NETWORK",
  "VITE_NEXUS_CHANNEL",
  "VITE_CONFIG_NEXUS_CHANNEL",
  "VITE_CHANNEL",
  "NEXUS_CHANNEL",
  "CHANNEL",
] as const;

const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
    Reflect.deleteProperty(process.env, key);
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] !== undefined) {
      process.env[key] = originalEnv[key];
    } else {
      Reflect.deleteProperty(process.env, key);
    }
  }
});

test("resolveNexusNetwork defaults to mainnet when env vars are absent", () => {
  assert.equal(resolveNexusNetwork(), DEFAULT_NEXUS_NETWORK);
  assert.equal(resolveNexusNetwork(), "mainnet");
});

test("resolveNexusNetwork resolves canary or testnet from environment variables", () => {
  process.env.VITE_NEXUS_NETWORK = "canary";
  assert.equal(resolveNexusNetwork(), "canary");

  Reflect.deleteProperty(process.env, "VITE_NEXUS_NETWORK");
  process.env.VITE_CONFIG_NEXUS_NETWORK = "testnet";
  assert.equal(resolveNexusNetwork(), "testnet");

  Reflect.deleteProperty(process.env, "VITE_CONFIG_NEXUS_NETWORK");
  process.env.VITE_NETWORK = "canary";
  assert.equal(resolveNexusNetwork(), "canary");

  Reflect.deleteProperty(process.env, "VITE_NETWORK");
  process.env.NETWORK = "testnet";
  assert.equal(resolveNexusNetwork(), "testnet");
});

test("resolveNexusNetwork prioritizes explicit argument over environment variables", () => {
  process.env.VITE_NEXUS_NETWORK = "testnet";
  assert.equal(resolveNexusNetwork("canary"), "canary");
});

test("resolveNexusChannel defaults to stable when env vars are absent", () => {
  assert.equal(resolveNexusChannel(), DEFAULT_NEXUS_CHANNEL);
  assert.equal(resolveNexusChannel(), "stable");
});

test("resolveNexusChannel resolves preview from environment variables", () => {
  process.env.VITE_NEXUS_CHANNEL = "preview";
  assert.equal(resolveNexusChannel(), "preview");

  Reflect.deleteProperty(process.env, "VITE_NEXUS_CHANNEL");
  process.env.VITE_CONFIG_NEXUS_CHANNEL = "preview";
  assert.equal(resolveNexusChannel(), "preview");

  Reflect.deleteProperty(process.env, "VITE_CONFIG_NEXUS_CHANNEL");
  process.env.VITE_CHANNEL = "preview";
  assert.equal(resolveNexusChannel(), "preview");

  Reflect.deleteProperty(process.env, "VITE_CHANNEL");
  process.env.CHANNEL = "preview";
  assert.equal(resolveNexusChannel(), "preview");
});

test("resolveNexusChannel is case-insensitive and trims whitespace", () => {
  process.env.VITE_NEXUS_CHANNEL = "  PREVIEW  ";
  assert.equal(resolveNexusChannel(), "preview");

  process.env.VITE_NEXUS_CHANNEL = "  STABLE  ";
  assert.equal(resolveNexusChannel(), "stable");
});

test("resolveNexusChannel falls back to stable when env var value is invalid", () => {
  process.env.VITE_NEXUS_CHANNEL = "invalid_channel_name";
  assert.equal(resolveNexusChannel(), "stable");
});

test("resolveNexusChannel prioritizes explicit argument over environment variables", () => {
  process.env.VITE_NEXUS_CHANNEL = "preview";
  assert.equal(resolveNexusChannel("stable"), "stable");
});
