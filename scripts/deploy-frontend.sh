#!/usr/bin/env bash
# Deploy Atriveo Bio frontend to Cloudflare Pages (dry-run or production).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"
DRY_RUN="${1:-}"

cd "$FRONTEND"

if [[ ! -d node_modules ]]; then
  echo "==> Installing dependencies…"
  npm ci
fi

echo "==> Building TanStack Start app…"
export VITE_API_URL="${VITE_API_URL:-https://api.cortex.bio}"
export VITE_DOCS_API_URL="${VITE_DOCS_API_URL:-https://api.cortex.bio}"
npm run build

OUT="$FRONTEND/.output"
if [[ ! -d "$OUT/server" ]]; then
  echo "Nitro output not found at $OUT/server — ensure vite.config.ts has nitro: true"
  exit 1
fi

echo "==> Build OK (server + public)"

if ! command -v wrangler &>/dev/null; then
  echo "Install wrangler: npm i -g wrangler  (or npx wrangler)"
  echo "Deploy: cd $OUT && npx wrangler deploy --domain bio.atriveo.com"
  exit 0
fi

if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "==> Dry-run: would deploy $OUT via wrangler (worker + assets)"
else
  (cd "$OUT" && npx wrangler deploy --domain bio.atriveo.com)
fi
