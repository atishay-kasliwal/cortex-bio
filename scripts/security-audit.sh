#!/usr/bin/env bash
# Scan for leaked secrets before push.
set -eo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FAIL=0

echo "==> Secret scan (cortex-bio)"

FORBIDDEN=(
  api/.env
  db/.env
  frontend/.env
  frontend/.env.local
  frontend/.env.production
  .env
)

if git rev-parse --is-inside-work-tree &>/dev/null; then
  for path in "${FORBIDDEN[@]}"; do
    if git ls-files --error-unmatch "$path" &>/dev/null; then
      echo "FAIL: tracked forbidden file: $path"
      FAIL=1
    fi
  done
  SCAN=()
  while IFS= read -r line; do SCAN+=("$line"); done < <(git ls-files)
else
  SCAN=()
  while IFS= read -r line; do SCAN+=("$line"); done < <(find . -type f \
    ! -path '*/node_modules/*' \
    ! -path './.git/*' \
    ! -name 'package-lock.json' \
    ! -name 'bun.lock' \
    ! -name 'security-audit.sh')
fi

for f in "${SCAN[@]}"; do
  [[ -f "$f" ]] || continue
  case "$f" in
    *.env|*.env.local|*.env.production) echo "FAIL: env file in scan list: $f"; FAIL=1; continue ;;
    */.env.example|*.env.example|*LAUNCH*|*README*|*SECURITY*|docs/*|.github/workflows/*|scripts/security-audit.sh) continue ;;
  esac
  if grep -qE 'npg_[A-Za-z0-9]{8,}' "$f" 2>/dev/null; then
    echo "FAIL: Neon credential pattern in $f"
    FAIL=1
  fi
  if grep -qE 'postgresql://[^:]+:[^@/]+@' "$f" 2>/dev/null; then
    echo "FAIL: Postgres URL with password in $f"
    FAIL=1
  fi
  if grep -qE 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' "$f" 2>/dev/null; then
    echo "FAIL: JWT token in $f"
    FAIL=1
  fi
done

if [[ $FAIL -eq 0 ]]; then
  echo "PASS: no secrets detected"
  exit 0
fi
echo "Fix issues above before pushing."
exit 1
