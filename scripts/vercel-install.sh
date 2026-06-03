#!/bin/sh
set -e

echo "VERCEL-INSTALL-SCRIPT: Starting..."

if [ -z "$GH_PAT" ]; then
  echo "VERCEL-INSTALL-SCRIPT: ERROR: GH_PAT is not set in Vercel environment variables."
  exit 1
fi

echo "VERCEL-INSTALL-SCRIPT: Configuring git auth..."
git config --global url."https://${GH_PAT}@github.com/".insteadOf "git@github.com:"
git config --global url."https://${GH_PAT}@github.com/".insteadOf "ssh://git@github.com/"
git config --global url."https://${GH_PAT}@github.com/".insteadOf "https://github.com/"

echo "VERCEL-INSTALL-SCRIPT: Installing dependencies..."
pnpm install
echo "VERCEL-INSTALL-SCRIPT: Done!"