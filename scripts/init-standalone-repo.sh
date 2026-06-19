#!/usr/bin/env bash
# Initialize cortex-bio as a standalone git repo (separate from health-auto-export-server).
# Run from cortex-bio/

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -d .git ]]; then
  echo "Already a git repository."
  exit 0
fi

chmod +x scripts/security-audit.sh 2>/dev/null || true

git init -b main
git add .
# Verify no secrets staged
if git diff --cached --name-only | grep -qE '^(\.env|api/\.env|frontend/\.env|frontend/\.env\.production)$'; then
  echo "ERROR: secret files staged — check .gitignore"
  exit 1
fi

git -c user.name="Atishay Kasliwal" -c user.email="katishay@gmail.com" commit -m "$(cat <<'EOF'
Initial public release of Cortex Bio.

Wearable intelligence API for cognitive readiness, chronotype, and performance forecasting.
EOF
)"

echo ""
echo "Standalone repo initialized at ${ROOT}"
echo "Next: ./scripts/github-setup.sh"
