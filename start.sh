#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Load .env (optional)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# ---- Required env for bot ----
if [ -z "${BOT_TOKEN:-}" ]; then
  echo "ERROR: BOT_TOKEN is not set. Put it in .env (token from @BotFather)." >&2
  exit 1
fi

# Public HTTPS URL that Telegram will open (served by Caddy)
WEB_URL="${WEB_APP_URL:-${MINI_APP_URL:-${APP_PUBLIC_URL:-}}}"
if [ -z "${WEB_URL:-}" ]; then
  echo "ERROR: WEB_APP_URL (or MINI_APP_URL / APP_PUBLIC_URL) is not set." >&2
  echo "Set it to your public HTTPS domain, e.g.: WEB_APP_URL=https://your-domain.com" >&2
  exit 1
fi

echo "==> Building фронт (Vite) ..."
if [ ! -d node_modules ]; then
  echo "==> Installing Node deps (npm ci) ..."
  npm ci
fi
npm run build

echo "==> Build done. Caddy should serve: $ROOT_DIR/dist"
echo "    Example Caddyfile is in: $ROOT_DIR/Caddyfile.prod.example"

echo "==> Starting bot ..."
PYTHON_BIN="${PYTHON_BIN:-python3}"
BOT_VENV_DIR="${BOT_VENV_DIR:-$ROOT_DIR/bot/.venv}"

if [ ! -x "$BOT_VENV_DIR/bin/python" ]; then
  echo "==> Creating venv for bot at: $BOT_VENV_DIR"
  "$PYTHON_BIN" -m venv "$BOT_VENV_DIR"
fi

# shellcheck disable=SC1090
source "$BOT_VENV_DIR/bin/activate"
pip install -q --upgrade pip
pip install -q -r "$ROOT_DIR/bot/requirements.txt"

# Run bot in foreground (so systemd/pm2/docker can supervise it)
exec python -u "$ROOT_DIR/bot/main.py"
