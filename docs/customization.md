# Chain Customization Playbook

This guide explains how to add chain-specific behavior without duplicating the shared app.

## Customization Layers

Use the lightest layer that solves the requirement.

### Layer 1: `appConfig`

Location:
- `packages/fast-bridge-app/src/config/chain-settings.ts`

Use for:
- Chain identity and metadata.
- RPC and explorer settings.
- Brand colors, labels, and imagery.
- Nexus network, destination chain ID, and primary token defaults.

### Layer 2: `chainFeatures`

Location:
- `packages/fast-bridge-app/src/config/chain-settings.ts`
- Type contract in `packages/fast-bridge-app/src/types/runtime.ts`

Use for:
- UI behavior toggles.
- Per-chain logic selectors.
- Token filtering and display overrides.
- Route-specific amount, fee, dialog, analytics, and wallet behavior.

### Layer 3: New Shared Extension Points

When existing flags are not enough:

1. Add a new field to `ChainFeatures`.
2. Add a fallback value in `defaultChainFeatures`.
3. Consume it in shared code under `packages/fast-bridge-app/src/**` with `useRuntime()`.
4. Set per-chain values in `CHAIN_REGISTRY`.

## Runtime Access

Shared code should access chain-specific values through the runtime context:

```tsx
import { useRuntime } from "@/providers/runtime-context";

const { appConfig, chainFeatures, chainSlug, setChain } = useRuntime();
```

Do not import static config in shared components when the active route can change.

## Existing `chainFeatures` Flags

Source of truth:
- `packages/fast-bridge-app/src/types/runtime.ts`

Current behavior categories include:

- Analytics keying with `analyticsFastBridgeKey`.
- Amount limits with `maxBridgeAmount`, `maxBridgeAmountByDestinationChainId`, and `maxBridgeAmountByTokenAndChain`.
- Wallet initialization with `walletInitDelayMs`.
- Page and promo content with `pageDescription`, `showSupportCta`, `showPromoBanner`, and related text/image fields.
- Token display and mapping with `supportedTokens`, `tokenLogoOverrideBySymbol`, `mapUsdmDisplaySymbolToUsdc`, and `mapUsdmToUsdcBalance`.
- Token filtering with `tokenDenyListByChainId`.
- Allowance and fee presentation with `allowanceLogoOverrideByChainId`, `feeBreakdownHideGasSupplied`, `feeBreakdownKeepZeroRows`, and `feeBreakdownZeroForNonCaGasOnDestinationId`.
- Input and dialog behavior with `amountInputUseCalculatedMaxHeader`, `amountInputShowDestinationBadge`, `amountInputUseSourceSymbolInBreakdown`, `hideMegaethSourceForUsdm`, `denyIntentOnReset`, and `dialogShowCloseButton`.
- Optional post-transaction wallet asset watch behavior with `postBridgeWatchAsset`.

## How to Add a New Customization

### Step 1: Extend the type contract

Edit `packages/fast-bridge-app/src/types/runtime.ts`:

```ts
export interface ChainFeatures {
  showExperimentalNotice?: boolean;
}

export const defaultChainFeatures: ChainFeatures = {
  showExperimentalNotice: false,
};
```

### Step 2: Consume it in shared code

```tsx
const { chainFeatures } = useRuntime();

return chainFeatures.showExperimentalNotice ? <ExperimentalNotice /> : null;
```

### Step 3: Configure routes

Set the flag in each relevant `CHAIN_REGISTRY` entry:

```ts
chainFeatures: {
  slug: "example",
  showExperimentalNotice: true,
}
```

### Step 4: Validate

```bash
pnpm check
pnpm build
pnpm dev
```

Smoke test the affected route and at least one unaffected route.

## Asset Rules

- Prefer external asset URLs or public root-relative paths already used by the SPA.
- Keep route-specific assets referenced from `appConfig` or `chainFeatures`.
- If a shared component needs to render route-specific assets, read them through `useRuntime()`.

## Decision Rules

- If only data changes, update `appConfig`.
- If reusable behavior changes, add or use a `ChainFeatures` flag.
- If behavior depends on selected route state, read it from `useRuntime()`.
- Do not copy shared components into chain-specific folders.
- Do not use environment variables for chain-specific features.
