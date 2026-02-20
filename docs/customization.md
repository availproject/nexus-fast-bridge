# Chain Customization Playbook

This guide explains how to implement chain-specific behavior at the same level as MegaETH and beyond, without reintroducing duplicated apps.

## Customization Layers

Use the lightest layer that solves the requirement.

### Layer 1: Env/App Config (`appConfig`)

Location:
- `apps/<slug>/get-config.ts`
- `apps/<slug>/.env.<slug>`

Use for:
- Chain identity and metadata.
- RPC/explorer settings.
- Brand colors and labels.
- Default token/network values.

### Layer 2: Behavior Flags (`chainFeatures`)

Location:
- `apps/<slug>/src/runtime.ts`
- Type contract in `packages/fast-bridge-app/src/types/runtime.ts`

Use for:
- UI behavior toggles.
- Per-chain logic branch selectors.
- Feature differences like MegaETH promo, fee logic, wallet init timing.

### Layer 3: New Shared Extension Points

When existing flags are not enough:
1. Add a new field to `ChainFeatures` and `defaultChainFeatures`.
2. Consume it in shared code under `packages/fast-bridge-app/src/**`.
3. Set per-chain values in each `apps/<slug>/src/runtime.ts`.

This keeps one shared code path while supporting arbitrary chain differences.

## Existing `chainFeatures` Flags

Source of truth:
- `packages/fast-bridge-app/src/types/runtime.ts`

Current behavior map:

- `analyticsFastBridgeKey`
Used in PostHog tracking payload.
Consumed in `packages/fast-bridge-app/src/components/fast-bridge/hooks/use-bridge.ts`.

- `maxBridgeAmount`
Max allowed amount gate and default.
Consumed in `packages/fast-bridge-app/src/components/fast-bridge/hooks/use-bridge.ts` and `packages/fast-bridge-app/src/components/fast-bridge/fast-bridge.tsx`.

- `walletInitDelayMs`
Delays Nexus SDK auto-init after wallet connect.
Consumed in `packages/fast-bridge-app/src/components/wallet-connect.tsx`.

- `showFluffeyMascot`, `showPromoBanner`, `promoBannerLine1`, `promoBannerLine2`, `promoBannerImageUrl`
Controls promo hero treatment (MegaETH pattern).
Consumed in `packages/fast-bridge-app/src/components/fast-bridge/fast-bridge.tsx`.

- `pageDescription`, `showSupportCta`, `supportCtaHref`, `supportCtaLine1`, `supportCtaLine2`
Controls chain-specific page-level content and optional support CTA in the shared app shell.
Consumed in `packages/fast-bridge-app/src/app.tsx`.

- `postBridgeWatchAsset`
Triggers optional wallet asset watch flow after a successful bridge for specific destination chain/token pairs.
Consumed in `packages/fast-bridge-app/src/components/fast-bridge/fast-bridge.tsx`.

- `mapUsdmDisplaySymbolToUsdc`, `mapUsdmToUsdcBalance`
Display and balance mapping behavior for USDM.
Consumed in `packages/fast-bridge-app/src/components/fast-bridge/hooks/use-bridge.ts`, `packages/fast-bridge-app/src/components/fast-bridge/components/fee-breakdown.tsx`, and `packages/fast-bridge-app/src/components/fast-bridge/components/source-breakdown.tsx`.

- `tokenLogoOverrideBySymbol`
Overrides token logo URLs by symbol at runtime.
Consumed in `packages/fast-bridge-app/src/components/nexus/nexus-provider.tsx` and `packages/fast-bridge-app/src/components/view-history/view-history.tsx`.

- `denyIntentOnReset`
Controls intent reset behavior after flow interruption.
When a user edits bridge inputs after an intent exists, shared flow invalidates that intent and transitions back to `idle` before re-fetching; this flag controls whether `deny()` is called during that reset.
Consumed in `packages/fast-bridge-app/src/components/fast-bridge/hooks/use-bridge.ts`.

- `tokenDenyListByChainId`
Per-chain token filtering in token selector.
Consumed in `packages/fast-bridge-app/src/components/fast-bridge/components/token-select.tsx`.

- `allowanceLogoOverrideByChainId`
Overrides chain logos in allowance modal.
Consumed in `packages/fast-bridge-app/src/components/fast-bridge/components/allowance-modal.tsx`.

- `amountInputUseCalculatedMaxHeader`, `amountInputShowDestinationBadge`, `amountInputUseSourceSymbolInBreakdown`, `hideMegaethSourceForUsdm`
Amount/balance-breakdown display behavior.
Consumed in `packages/fast-bridge-app/src/components/fast-bridge/components/amount-input.tsx`.

- `feeBreakdownHideGasSupplied`, `feeBreakdownKeepZeroRows`, `feeBreakdownZeroForNonCaGasOnDestinationId`
Fee rows and zero-fee behavior.
Consumed in `packages/fast-bridge-app/src/components/fast-bridge/components/fee-breakdown.tsx`.

- `dialogShowCloseButton`
Transaction dialog chrome behavior.
Consumed in `packages/fast-bridge-app/src/components/fast-bridge/fast-bridge.tsx`.

## MegaETH-Level Example

`apps/megaeth/src/runtime.ts` demonstrates:
- higher bridge cap (`maxBridgeAmount: 5000`)
- delayed wallet init (`walletInitDelayMs: 500`)
- chain-specific page description + support CTA
- optional post-bridge wallet asset add flow
- USDM behavior remapping
- fee breakdown row overrides
- dialog close button disabled

Use this as the reference pattern for richer chain-specific behavior.

## How to Add a New Customization (Beyond Current Flags)

### Step 1: Extend type contract

Edit `packages/fast-bridge-app/src/types/runtime.ts`:

```ts
export interface ChainFeatures {
  ...
  showExperimentalNotice?: boolean;
}

export const defaultChainFeatures: ChainFeatures = {
  ...
  showExperimentalNotice: false,
};
```

### Step 2: Consume in shared code

Add guarded logic in shared component/hook:

```tsx
import { chainFeatures } from "@fastbridge/runtime";

{chainFeatures.showExperimentalNotice && <ExperimentalNotice />}
```

### Step 3: Configure per chain

Set the flag in each chain runtime file (`apps/<slug>/src/runtime.ts`):

```ts
export const chainFeatures: ChainFeatures = {
  ...,
  showExperimentalNotice: true,
};
```

### Step 4: Validate across chains

```bash
pnpm --filter @fastbridge/<slug> dev
pnpm build:all
```

## Asset and Base Path Rules

- `appConfig` image URLs can be external URLs or root-relative paths.
- For runtime image URLs in shared React code, call `withBasePath(...)` from `packages/fast-bridge-app/src/lib/utils.ts` to support subpath hosting (`/monad/`, `/citrea/`, etc.).

## Decision Rules for Maintainers

- If only one chain differs and behavior is small: add/consume a flag.
- If multiple related flags appear: group them under a coherent feature name.
- If logic becomes deeply chain-specific and hard to read: create a strategy/helper in shared code, selected by `chainFeatures.slug` or explicit feature fields.
- Do not copy shared components back into `apps/<slug>/src`.
