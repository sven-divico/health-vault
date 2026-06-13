#!/usr/bin/env bash
# setup-server.sh — one-time server setup for health-vault
# Safe to re-run; will not overwrite an existing .env.
#
# Usage:
#   TELEGRAM_BOT_TOKEN=... ANTHROPIC_API_KEY=... ./setup-server.sh
#
# Or set them interactively when prompted.
set -euo pipefail

SERVER="btbadmin@178.104.157.139"
REMOTE_DIR="/home/btbadmin/health-vault"
CADDYFILE="/etc/caddy/Caddyfile"
PUBLIC_HOST="health-vault.biztechbridge.com"

# ---------- Collect secrets locally ----------
prompt_if_unset() {
  local var="$1" label="$2"
  if [[ -z "${!var:-}" ]]; then
    read -r -p "$label: " value
    printf -v "$var" '%s' "$value"
  fi
}

prompt_if_unset TELEGRAM_BOT_TOKEN "Telegram bot token (from BotFather)"
prompt_if_unset ANTHROPIC_API_KEY  "Anthropic API key (sk-ant-...)"

TELEGRAM_WEBHOOK_SECRET="${TELEGRAM_WEBHOOK_SECRET:-$(openssl rand -hex 32)}"
SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -hex 32)}"
ADMIN_SECRET="${ADMIN_SECRET:-$(openssl rand -hex 32)}"

echo
echo "Generated secrets (save these somewhere safe — printed once):"
echo "  TELEGRAM_WEBHOOK_SECRET=$TELEGRAM_WEBHOOK_SECRET"
echo "  SESSION_SECRET=$SESSION_SECRET"
echo "  ADMIN_SECRET=$ADMIN_SECRET"
echo

# ---------- Run on server ----------
ssh "$SERVER" \
  TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN" \
  ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  TELEGRAM_WEBHOOK_SECRET="$TELEGRAM_WEBHOOK_SECRET" \
  SESSION_SECRET="$SESSION_SECRET" \
  ADMIN_SECRET="$ADMIN_SECRET" \
  PUBLIC_HOST="$PUBLIC_HOST" \
  REMOTE_DIR="$REMOTE_DIR" \
  CADDYFILE="$CADDYFILE" \
  bash <<'REMOTE'
set -euo pipefail

echo "→ Creating $REMOTE_DIR (and data/)..."
mkdir -p "$REMOTE_DIR/data"

ENV_FILE="$REMOTE_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
  echo "→ $ENV_FILE already exists — leaving it untouched."
else
  echo "→ Writing $ENV_FILE..."
  umask 077
  cat > "$ENV_FILE" <<EOF
PUBLIC_BASE_URL=https://$PUBLIC_HOST
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET=$TELEGRAM_WEBHOOK_SECRET
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
DATABASE_URL=file:/data/vault.sqlite
IMAGE_DIR=/data/images
SESSION_SECRET=$SESSION_SECRET
ADMIN_SECRET=$ADMIN_SECRET
EOF
  chmod 600 "$ENV_FILE"
fi

echo "→ Ensuring Caddy entry for $PUBLIC_HOST..."
if sudo -n grep -q "^$PUBLIC_HOST" "$CADDYFILE"; then
  echo "  Caddy block already present — skipping."
else
  sudo -n tee -a "$CADDYFILE" >/dev/null <<EOF

$PUBLIC_HOST {
    encode gzip zstd
    reverse_proxy 127.0.0.1:8082
}
EOF
  echo "  Appended block. Validating + reloading Caddy..."
  sudo -n caddy validate --config "$CADDYFILE"
  sudo -n systemctl reload caddy
fi

echo "✓ Server setup complete."
REMOTE

echo
echo "Next steps:"
echo "  1. Add DNS A record:   $PUBLIC_HOST  →  178.104.157.139"
echo "  2. Run:                ./deploy-to-prod.sh"
echo "  3. Register webhook:   see README.md"
