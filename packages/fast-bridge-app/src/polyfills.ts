import { Buffer } from "node:buffer";

interface BrowserPolyfillGlobals {
  Buffer?: typeof Buffer;
  global?: typeof globalThis;
  process?: {
    env: Record<string, string | undefined>;
  };
}

const browserGlobals = globalThis as unknown as BrowserPolyfillGlobals;

browserGlobals.Buffer ??= Buffer;
browserGlobals.global ??= globalThis;
browserGlobals.process ??= { env: {} };
