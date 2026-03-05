#!/usr/bin/env bash
# Source this file to load sample env vars for local smoke tests.
# Usage: source scripts/set-sample-env.sh

set -euo pipefail

# Only set values if not already provided by the shell
export MONAD_VITE_CONFIG_CHAIN_ID="${MONAD_VITE_CONFIG_CHAIN_ID:-143}"
export MONAD_VITE_CONFIG_CHAIN_NAME="${MONAD_VITE_CONFIG_CHAIN_NAME:-Monad}"
export MONAD_VITE_CONFIG_CHAIN_RPC_URL="${MONAD_VITE_CONFIG_CHAIN_RPC_URL:-https://rpcs.avail.so/monad}"
export MONAD_VITE_WALLET_CONNECT_ID="${MONAD_VITE_WALLET_CONNECT_ID:-sample-walletconnect-id}"
export MONAD_VITE_MAINNET_RPC="${MONAD_VITE_MAINNET_RPC:-https://example.invalid/mainnet}"
export MONAD_VITE_BASE_RPC="${MONAD_VITE_BASE_RPC:-https://example.invalid/base}"
export MONAD_VITE_ARBITRUM_RPC="${MONAD_VITE_ARBITRUM_RPC:-https://example.invalid/arbitrum}"
export MONAD_VITE_OPTIMISM_RPC="${MONAD_VITE_OPTIMISM_RPC:-https://example.invalid/optimism}"
export MONAD_VITE_POLYGON_RPC="${MONAD_VITE_POLYGON_RPC:-https://example.invalid/polygon}"
export MONAD_VITE_SCROLL_RPC="${MONAD_VITE_SCROLL_RPC:-https://example.invalid/scroll}"
export MONAD_VITE_AVALANCHE_RPC="${MONAD_VITE_AVALANCHE_RPC:-https://example.invalid/avalanche}"
export MONAD_VITE_SOPHON_RPC="${MONAD_VITE_SOPHON_RPC:-https://example.invalid/sophon}"
export MONAD_VITE_KAIA_RPC="${MONAD_VITE_KAIA_RPC:-https://example.invalid/kaia}"

export MEGAETH_VITE_CONFIG_CHAIN_ID="${MEGAETH_VITE_CONFIG_CHAIN_ID:-999}"
export MEGAETH_VITE_CONFIG_CHAIN_NAME="${MEGAETH_VITE_CONFIG_CHAIN_NAME:-MegaETH}"
export MEGAETH_VITE_CONFIG_CHAIN_RPC_URL="${MEGAETH_VITE_CONFIG_CHAIN_RPC_URL:-https://example.invalid/megaeth}"
export MEGAETH_VITE_WALLET_CONNECT_ID="${MEGAETH_VITE_WALLET_CONNECT_ID:-sample-walletconnect-id}"
export MEGAETH_VITE_MAINNET_RPC="${MEGAETH_VITE_MAINNET_RPC:-https://example.invalid/mainnet}"
export MEGAETH_VITE_BASE_RPC="${MEGAETH_VITE_BASE_RPC:-https://example.invalid/base}"
export MEGAETH_VITE_ARBITRUM_RPC="${MEGAETH_VITE_ARBITRUM_RPC:-https://example.invalid/arbitrum}"
export MEGAETH_VITE_OPTIMISM_RPC="${MEGAETH_VITE_OPTIMISM_RPC:-https://example.invalid/optimism}"
export MEGAETH_VITE_POLYGON_RPC="${MEGAETH_VITE_POLYGON_RPC:-https://example.invalid/polygon}"
export MEGAETH_VITE_SCROLL_RPC="${MEGAETH_VITE_SCROLL_RPC:-https://example.invalid/scroll}"
export MEGAETH_VITE_AVALANCHE_RPC="${MEGAETH_VITE_AVALANCHE_RPC:-https://example.invalid/avalanche}"
export MEGAETH_VITE_SOPHON_RPC="${MEGAETH_VITE_SOPHON_RPC:-https://example.invalid/sophon}"
export MEGAETH_VITE_KAIA_RPC="${MEGAETH_VITE_KAIA_RPC:-https://example.invalid/kaia}"

echo "Loaded sample env for MONAD_* and MEGAETH_* (override in your shell as needed)."
