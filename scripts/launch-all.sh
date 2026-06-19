#!/usr/bin/env bash
# Full launch orchestration — runs every step that can be automated locally.
# Requires: gh (logged in), wrangler (logged in), flyctl (logged in), api/.env secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> 1/7 Security audit"
./scripts/security-audit.sh

echo "==> 2/7 GitHub repository"
if ! git remote get-url origin &>/dev/null; then
  ./scripts/github-setup.sh
fi
git push -u origin main 2>/dev/null || git push origin main

echo "==> 3/7 Fly.io API (api.cortex.bio)"
if command -v flyctl &>/dev/null || command -v fly &>/dev/null; then
  FLY="$(command -v flyctl || command -v fly)"
  if ! $FLY apps list 2>/dev/null | grep -q cortex-bio-api; then
    $FLY apps create cortex-bio-api --org personal 2>/dev/null || $FLY apps create cortex-bio-api
  fi
  # Secrets from api/.env (never echo values)
  set -a
  # shellcheck disable=SC1091
  source api/.env
  set +a
  $FLY secrets set \
    DATABASE_URL="$DATABASE_URL" \
    API_KEY_PEPPER="$API_KEY_PEPPER" \
    SUPABASE_URL="${SUPABASE_URL:-}" \
    SUPABASE_JWKS_URL="${SUPABASE_JWKS_URL:-https://${SUPABASE_URL#https://}/auth/v1/.well-known/jwks.json}" \
    ADMIN_SECRET="${ADMIN_SECRET:-change-me-ops-dashboard}" \
    --app cortex-bio-api
  $FLY deploy --config fly.toml --remote-only
  echo "Add DNS: api.cortex.bio CNAME → cortex-bio-api.fly.dev"
else
  echo "SKIP: install flyctl → https://fly.io/docs/hands-on/install-flyctl/"
fi

echo "==> 4/7 Cloudflare Workers (docs + status)"
for worker in docs-proxy status-proxy; do
  (cd "infra/cloudflare/$worker" && npm install && npx wrangler deploy)
done

echo "==> 5/7 Cloudflare Pages project"
if ! npx wrangler pages project list 2>/dev/null | grep -q atriveo-bio; then
  npx wrangler pages project create atriveo-bio --production-branch=main
fi

echo "==> 6/7 Frontend build + deploy"
export $(grep -v '^#' frontend/.env.production | xargs)
./scripts/deploy-frontend.sh

echo "==> 7/7 Post-deploy checks"
for url in \
  "https://api.cortex.bio/health" \
  "https://bio.atriveo.com" \
  "https://docs.cortex.bio/docs" \
  "https://status.cortex.bio"; do
  echo -n "$url → "
  curl -sS -o /dev/null -w "%{http_code}\n" -m 15 "$url" || echo "FAIL"
done

echo ""
echo "Manual steps remaining:"
echo "  • Rotate Neon password (Neon dashboard)"
echo "  • Attach custom domains in Cloudflare (bio, preview.bio, docs.cortex, status.cortex, api.cortex)"
echo "  • Supabase redirect URLs: https://bio.atriveo.com/auth/*"
echo "  • Connect GitHub → Cloudflare Pages for auto-deploy"
