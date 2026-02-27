import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl


def verify_telegram_init_data(init_data: str, bot_token: str, max_age_seconds: int) -> dict | None:
    data = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = data.pop("hash", None)
    if not received_hash:
        return None

    auth_date_raw = data.get("auth_date")
    if not auth_date_raw:
        return None

    try:
        auth_date = int(auth_date_raw)
    except ValueError:
        return None

    now = int(time.time())
    if auth_date < now - max_age_seconds or auth_date > now + 30:
        return None

    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(data.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if calculated_hash != received_hash:
        return None

    return data


def extract_user_from_init_data(parsed_init_data: dict) -> dict | None:
    user_raw = parsed_init_data.get("user")
    if not user_raw:
        return None

    try:
        user = json.loads(user_raw)
    except json.JSONDecodeError:
        return None

    if not isinstance(user, dict) or not isinstance(user.get("id"), int):
        return None

    return user
