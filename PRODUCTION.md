# Production (Caddy + Telegram Mini App)

## 1) Env
Create `.env` in repo root:

```env
BOT_TOKEN=123456:AAAA...
WEB_APP_URL=https://your-domain.com

# Frontend
TELEGRAM_APP_URL="https://t.me/your_bot/your_startapp"
NEWS_URL="https://t.me/your_news_channel"
SUPPORT_URL="https://t.me/your_support_account"
```

## 2) Caddy
Copy example and edit domain/path:

```bash
sudo cp ./Caddyfile.prod.example /etc/caddy/Caddyfile
sudo caddy reload --config /etc/caddy/Caddyfile
```

The example Caddyfile also proxies `/api/*` to the bot's API server on port 8080.
If you changed `API_PORT`, update the `reverse_proxy` target accordingly.

## 3) Run
```bash
./start.sh
```

Caddy serves the built фронт from `dist/`.
The bot runs in the foreground (good for systemd/pm2).
