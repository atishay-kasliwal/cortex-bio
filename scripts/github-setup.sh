#!/usr/bin/env bash
# Create github.com/OWNER/cortex-bio and push.
# Preferred owner: Atriveo — falls back to personal account.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REPO_NAME="cortex-bio"
DESCRIPTION="Open-source wearable intelligence platform for cognitive readiness, performance forecasting, and human optimization."
TOPICS="apple-health,healthkit,wearables,apple-watch,biometrics,chronotype,productivity,deep-work,forecasting,neon,postgres,typescript,swiftui,api,openapi,hrv,sleep"

if ! command -v gh &>/dev/null; then
  echo "Install GitHub CLI: https://cli.github.com/"
  exit 1
fi

OWNER=""
for candidate in Atriveo atriveo atishay-kasliwal; do
  if gh api "users/${candidate}" --jq .login &>/dev/null 2>&1 || gh api "orgs/${candidate}" --jq .login &>/dev/null 2>&1; then
    if gh api "repos/${candidate}/${REPO_NAME}" &>/dev/null 2>&1; then
      OWNER="$candidate"
      break
    fi
    if gh api "users/${candidate}" &>/dev/null 2>&1 || gh api "orgs/${candidate}" &>/dev/null 2>&1; then
      OWNER="$candidate"
      break
    fi
  fi
done

if [[ -z "$OWNER" ]]; then
  OWNER="$(gh api user --jq .login)"
fi

REPO="${OWNER}/${REPO_NAME}"
echo "==> Target repository: ${REPO}"

./scripts/security-audit.sh

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "Run ./scripts/init-standalone-repo.sh first"
  exit 1
fi

if gh repo view "$REPO" &>/dev/null; then
  echo "Repository exists: https://github.com/${REPO}"
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/${REPO}.git"
else
  echo "Creating repository..."
  gh repo create "$REPO" \
    --public \
    --description "$DESCRIPTION" \
    --source=. \
    --remote=origin \
    --push
fi

echo "==> Setting topics..."
TOPIC_ARGS=()
while IFS= read -r topic; do
  topic="${topic// /}"
  [[ -n "$topic" ]] && TOPIC_ARGS+=(-f "names[]=${topic}")
done < <(echo "$TOPICS" | tr ',' '\n')
gh api -X PUT "repos/${REPO}/topics" \
  -H "Accept: application/vnd.github+json" \
  "${TOPIC_ARGS[@]}"

echo "==> Enabling vulnerability alerts..."
gh api -X PUT "repos/${REPO}/vulnerability-alerts" 2>/dev/null || true

echo ""
echo "Done: https://github.com/${REPO}"
echo "Push: git push -u origin main"
