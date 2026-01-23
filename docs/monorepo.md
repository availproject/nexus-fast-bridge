# Fast Bridge Monorepo Plan

## Layout
- `apps/root` – landing that lists chains and serves static bundles under subpaths.
- `apps/monad` – existing bridge app (Vite) mounted at `/monad/`.
- `chains.config.json` – source of truth for chain slugs, base paths, and app dirs.
- `scripts/prepare-env.mjs` – filters env vars by prefix and writes `.env.production` for a chain app.
- `scripts/collect-chains.mjs` – copies each chain app’s `dist` into `apps/root/public/<slug>` before building the root app.
- `pnpm-workspace.yaml` + `turbo.json` – workspace + pipeline wiring (root depends on chain builds via workspace devDependency).

## Env strategy (per-chain prefixes)
- In Vercel, set variables with prefixes per chain: e.g. `MONAD_VITE_CONFIG_CHAIN_ID`, `MONAD_VITE_WALLET_CONNECT_ID`, etc.
- `prepare-env.mjs <slug>` strips the prefix and writes `VITE_*` keys to `apps/<slug>/.env.production` so Vite exposes only that chain’s vars.
- For local dev, you can drop a `.env.monad` file in `apps/monad` (or set shell envs) and skip the script.

## Build/serve
- Install once at repo root: `pnpm install`.
- Dev root landing: `pnpm --filter root dev` (or `pnpm dev:root` at root package).
- Dev monad app: `pnpm --filter @fastbridge/monad dev`.
- Full build: `pnpm build:all` (runs Turborepo, builds chain apps, copies dists, builds root). Root `build` script calls `collect-chains` before `vite build`.
- Local env options:
  - Drop per-chain files: `apps/monad/.env.monad`, `apps/megaeth/.env.megaeth`, etc. The build prep script will copy them to `.env.production` automatically.
  - Or export prefixed vars and rely on the prep script to strip prefixes: `source scripts/set-sample-env.sh` as a starting point, then override with real RPC/IDs.

## Adding a new chain app
1) Copy `apps/monad` to `apps/<slug>` and update its `package.json` name, default base path, config defaults, and branding.
2) Add an entry to `chains.config.json` with `slug`, `name`, `description`, `basePath`, and `appDir`.
3) Prefix env vars in Vercel with `<SLUG>_` and add a `build` script in the new app that runs `node ../../scripts/prepare-env.mjs <slug> && vite build`.
4) Add a workspace devDependency in `apps/root/package.json` for the new chain to keep the Turbo dependency graph intact (e.g. `"@fastbridge/<slug>": "workspace:*"`).
5) Run `pnpm build:all` to verify the chain bundle is copied into `apps/root/public/<slug>`.

## Deployment (Vercel)
- Single Vercel project at repo root. Build command: `pnpm build:all`; Output dir: `apps/root/dist`.
- Rewrites (in `vercel.json` or project settings) for each chain to support SPA history:
  - `{ "source": "/<slug>", "destination": "/<slug>/index.html" }`
  - `{ "source": "/<slug>/(.*)", "destination": "/<slug>/index.html" }`
- Ensure `VITE_APP_BASE_PATH` (or defaults in Vite config) matches the `basePath` in `chains.config.json` so assets load under subpaths.

## Notes
- Root app currently lists chains and links to each subpath; wallet/Nexus providers can be centralized later in a shared package and reused across chain apps.
- Assets are copied from each chain’s `dist`; root `public` holds shared files like `faviconV2.png`.
