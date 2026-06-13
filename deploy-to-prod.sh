#!/usr/bin/env bash
# deploy-to-prod.sh — build and redeploy health-vault on the production server
# Usage: ./deploy-to-prod.sh
set -euo pipefail

SERVER="btbadmin@178.104.157.139"
REMOTE_DIR="/home/btbadmin/health-vault"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "→ Syncing source to server (excluding node_modules, .next, data, .git)..."
rsync -az --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='data' \
  --exclude='.DS_Store' \
  --exclude='.env*' \
  "$LOCAL_DIR/" "$SERVER:$REMOTE_DIR/"

echo "→ Building Docker image and restarting container..."
# shellcheck disable=SC2087
ssh "$SERVER" bash <<'REMOTE'
set -euo pipefail
cd /home/btbadmin/health-vault

# Build new image and restart (zero-downtime swap via compose)
sudo -n docker compose up --build -d --remove-orphans

# Clean up dangling images to reclaim disk space
sudo -n docker image prune -f
REMOTE

echo ""
echo "✓ Deployed successfully → https://health-vault.biztechbridge.com"
