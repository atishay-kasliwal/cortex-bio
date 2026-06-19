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

OUT="$FRONTEND/.output/public"
if [[ ! -d "$OUT" ]]; then
  echo "Build output not found at $OUT"
  exit 1
fi

echo "==> Build OK ($(du -sh "$OUT" | cut -f1))"

if ! command -v wrangler &>/dev/null; then
  echo "Install wrangler: npm i -g wrangler  (or npx wrangler)"
  echo "Dry-run complete — upload $OUT manually or connect GitHub in Cloudflare Pages."
  exit 0
fi

if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "==> Dry-run: would deploy $OUT to Cloudflare Pages project 'atriveo-bio'"
  wrangler pages deploy "$OUT" --project-name=atriveo-bio --dry-run 2>/dev/null || {
    echo "Note: create the Pages project first:"
    echo "  wrangler pages project create atriveo-bio --production-branch=main"
    echo "Then: wrangler pages deploy $OUT --project-name=atriveo-bio"
  }
else
  wrangler pages deploy "$OUT" --project-name=atriveo-bio --branch=main
fi
