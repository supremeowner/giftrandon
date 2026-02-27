import os
from pathlib import Path

from dotenv import load_dotenv


def _load_env_file() -> None:
    config_dir = Path(__file__).resolve().parent
    env_candidates = (
        config_dir / ".env",
        config_dir.parent / ".env",
        config_dir / ".evn",
        config_dir.parent / ".evn",
    )

    for env_path in env_candidates:
        if env_path.exists():
            load_dotenv(dotenv_path=env_path)
            return


_load_env_file()

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEB_APP_URL = os.getenv("WEB_APP_URL") or os.getenv("APP_PUBLIC_URL")
MINI_APP_URL = os.getenv("MINI_APP_URL") or WEB_APP_URL
MINI_APP_BUTTON = os.getenv("MINI_APP_BUTTON", "Открыть мини-приложение")
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8080"))
DB_PATH = Path(os.getenv("DB_PATH", Path(__file__).with_name("app.db")))
INIT_DATA_MAX_AGE_SECONDS = int(os.getenv("INIT_DATA_MAX_AGE_SECONDS", "86400"))
CORS_ALLOW_ORIGIN = os.getenv("CORS_ALLOW_ORIGIN")
ALLOWED_PRICES = {25, 50, 100}


def validate_config() -> None:
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN is not set. Add it to .env or the environment before starting the bot.")

    if not MINI_APP_URL:
        raise RuntimeError(
            "WEB_APP_URL is not set. Add WEB_APP_URL or MINI_APP_URL to .env so the bot can open your domain."
        )
