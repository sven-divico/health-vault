# Health Vault

Personal health-tracking vault. Input via a Telegram bot, browse/visualize in a web UI.

- **Stack:** Next.js 15 (App Router) + Tailwind + Recharts, SQLite via Drizzle, Anthropic vision for meal-photo recognition.
- **Deploy:** Single Docker container, fronted by host-native Caddy on `biztechbridge.com`. Reachable at https://health-vault.biztechbridge.com.

## Local development

```bash
npm install
cp .env.example .env.local
# fill in TELEGRAM_BOT_TOKEN, ANTHROPIC_API_KEY, SESSION_SECRET, ADMIN_SECRET
npm run db:generate  # generate migrations from schema (first time / on schema change)
npm run dev
```

DB and images live under `./data/` (gitignored).

## Onboarding a user

1. Create an invite:
   ```bash
   curl -X POST http://localhost:3000/api/admin/invite \
     -H "x-admin-secret: $ADMIN_SECRET" \
     -H "content-type: application/json" \
     -d '{"username":"sven"}'
   ```
2. In Telegram, send `/start <token>` to the bot.
3. On the web, visit `/login`, enter username, send the 2-digit code to the bot within 30 s.

## Telegram commands

| Command | Effect |
|---|---|
| `/start <token>` | Bind Telegram → vault account |
| `/weight 82.4` | Log weight (kg) |
| `/mood 1-5 [note]` | Log mood |
| `/activity ran 5km 28min` | Log activity |
| plain text | Log as food entry |
| photo (with optional caption) | Save + Claude vision → food entry |
| 2-digit number | Complete pending web login |
| `/help` | List commands |

## Deployment

```bash
docker compose up -d --build
```

Add the contents of `Caddyfile.snippet` to the host Caddyfile on the biztechbridge box, then `caddy reload`. Point the Telegram webhook at:

```
https://health-vault.biztechbridge.com/api/telegram/webhook
```

with secret header `X-Telegram-Bot-Api-Secret-Token: $TELEGRAM_WEBHOOK_SECRET`.

## Backups

`rsync -a ./data backups/` — the bind-mount contains both the SQLite file and image uploads.
