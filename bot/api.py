import asyncio
import json
import logging

from aiohttp import web
from aiogram import Bot
from aiogram.types import LabeledPrice

from config import ALLOWED_PRICES, BOT_TOKEN, CORS_ALLOW_ORIGIN, INIT_DATA_MAX_AGE_SECONDS
from gifts import TELEGRAM_GIFTS
from payments import build_invoice_payload
from security import extract_user_from_init_data, verify_telegram_init_data


logger = logging.getLogger(__name__)

def _fire_and_forget(coro, *, label: str) -> None:
    task = asyncio.create_task(coro)

    def _log_result(done_task: asyncio.Task) -> None:
        try:
            done_task.result()
        except Exception:
            logger.exception("background_task_failed", extra={"label": label})

    task.add_done_callback(_log_result)


def _json_error(error: str, status: int) -> web.Response:
    return web.json_response({"error": error}, status=status)


async def create_stars_invoice(bot: Bot, amount: int, user_id: int) -> str:
    prices = [
        LabeledPrice(
            label=f"{amount} ⭐",
            amount=amount,
        )
    ]

    return await bot.create_invoice_link(
        title="Random Gift",
        description=f"Покупка подарка за {amount} звезд.",
        payload=build_invoice_payload(amount, user_id),
        currency="XTR",
        prices=prices,
    )


def _resolve_init_data(
    init_data: str | None,
    x_telegram_init_data: str | None,
) -> tuple[str | None, str]:
    if x_telegram_init_data:
        return x_telegram_init_data, "header"
    if init_data:
        return init_data, "query_or_body"
    return None, "missing"


async def _create_invoice_response(
    *,
    app: web.Application,
    amount: int,
    init_data: str | None,
    x_telegram_init_data: str | None,
) -> web.Response:
    effective_init_data, init_data_source = _resolve_init_data(init_data, x_telegram_init_data)

    logger.info(
        "invoice_request_received",
        extra={
            "amount": amount,
            "has_init_data": bool(effective_init_data),
            "init_data_source": init_data_source,
        },
    )

    if amount not in ALLOWED_PRICES:
        logger.warning("invoice_request_invalid_amount", extra={"amount": amount})
        return _json_error("invalid_amount", 400)

    if not effective_init_data:
        logger.warning("invoice_request_missing_init_data")
        return _json_error("invalid_init_data", 401)

    parsed_init_data = verify_telegram_init_data(
        effective_init_data,
        BOT_TOKEN,
        INIT_DATA_MAX_AGE_SECONDS,
    )
    if not parsed_init_data:
        logger.warning("invoice_request_invalid_init_data")
        return _json_error("invalid_init_data", 401)

    user = extract_user_from_init_data(parsed_init_data)
    if not user:
        logger.warning("invoice_request_user_missing_in_init_data")
        return _json_error("invalid_init_data", 401)

    db = app["db"]
    bot = app["bot"]

    _fire_and_forget(db.upsert_user(user), label="upsert_user_invoice")

    try:
        invoice_link = await create_stars_invoice(bot, amount, int(user["id"]))
    except Exception:
        logger.exception("invoice_creation_failed", extra={"user_id": user.get("id"), "amount": amount})
        return _json_error("invoice_creation_failed", 500)

    return web.json_response(
        {
            "invoice_link": invoice_link,
            "invoiceLink": invoice_link,
        }
    )


async def handle_invoice_get(request: web.Request) -> web.Response:
    amount_raw = request.query.get("amount")
    init_data = request.query.get("init_data")
    x_telegram_init_data = request.headers.get("X-Telegram-Init-Data")

    if amount_raw is None:
        return _json_error("invalid_amount", 400)

    try:
        amount = int(amount_raw)
    except ValueError:
        return _json_error("invalid_amount", 400)

    return await _create_invoice_response(
        app=request.app,
        amount=amount,
        init_data=init_data,
        x_telegram_init_data=x_telegram_init_data,
    )




async def handle_leaderboard(request: web.Request) -> web.Response:
    init_data = request.query.get("init_data")
    x_telegram_init_data = request.headers.get("X-Telegram-Init-Data")
    effective_init_data, _ = _resolve_init_data(init_data, x_telegram_init_data)

    if not effective_init_data:
        return _json_error("invalid_init_data", 401)

    parsed_init_data = verify_telegram_init_data(
        effective_init_data,
        BOT_TOKEN,
        INIT_DATA_MAX_AGE_SECONDS,
    )
    if not parsed_init_data:
        return _json_error("invalid_init_data", 401)

    user = extract_user_from_init_data(parsed_init_data)
    if not user:
        return _json_error("invalid_init_data", 401)

    limit_raw = request.query.get("limit", "50")
    offset_raw = request.query.get("offset", "0")

    try:
        limit = int(limit_raw)
        offset = int(offset_raw)
    except ValueError:
        return _json_error("invalid_pagination", 400)

    if limit < 1 or limit > 100 or offset < 0:
        return _json_error("invalid_pagination", 400)

    _fire_and_forget(request.app["db"].upsert_user(user), label="upsert_user_leaderboard")
    leaderboard = await request.app["db"].get_leaderboard(limit=limit, offset=offset)
    return web.json_response(
        {
            "leaderboard": leaderboard,
            "pagination": {
                "limit": limit,
                "offset": offset,
            },
        }
    )


async def handle_action_history(request: web.Request) -> web.Response:
    init_data = request.query.get("init_data")
    x_telegram_init_data = request.headers.get("X-Telegram-Init-Data")
    effective_init_data, _ = _resolve_init_data(init_data, x_telegram_init_data)

    if not effective_init_data:
        return _json_error("invalid_init_data", 401)

    parsed_init_data = verify_telegram_init_data(
        effective_init_data,
        BOT_TOKEN,
        INIT_DATA_MAX_AGE_SECONDS,
    )
    if not parsed_init_data:
        return _json_error("invalid_init_data", 401)

    user = extract_user_from_init_data(parsed_init_data)
    if not user:
        return _json_error("invalid_init_data", 401)

    limit_raw = request.query.get("limit", "100")
    offset_raw = request.query.get("offset", "0")

    try:
        limit = int(limit_raw)
        offset = int(offset_raw)
    except ValueError:
        return _json_error("invalid_pagination", 400)

    if limit < 1 or limit > 100 or offset < 0:
        return _json_error("invalid_pagination", 400)

    _fire_and_forget(request.app["db"].upsert_user(user), label="upsert_user_history")
    history = await request.app["db"].get_action_history(user_id=int(user["id"]), limit=limit, offset=offset)

    return web.json_response(
        {
            "history": history,
            "pagination": {
                "limit": limit,
                "offset": offset,
            },
        }
    )


async def handle_roulette_win(request: web.Request) -> web.Response:
    try:
        payload = await request.json()
    except json.JSONDecodeError:
        return _json_error("invalid_json", 400)

    gift_key = payload.get("gift_key")
    spin_price = payload.get("spin_price")
    init_data = payload.get("init_data")
    x_telegram_init_data = request.headers.get("X-Telegram-Init-Data")

    if not isinstance(gift_key, str) or not gift_key:
        return _json_error("invalid_gift_key", 400)

    if init_data is not None and not isinstance(init_data, str):
        return _json_error("invalid_init_data", 400)

    if spin_price is not None and (not isinstance(spin_price, int) or spin_price <= 0):
        return _json_error("invalid_spin_price", 400)

    effective_init_data, _ = _resolve_init_data(init_data, x_telegram_init_data)
    if not effective_init_data:
        return _json_error("invalid_init_data", 401)

    parsed_init_data = verify_telegram_init_data(
        effective_init_data,
        BOT_TOKEN,
        INIT_DATA_MAX_AGE_SECONDS,
    )
    if not parsed_init_data:
        return _json_error("invalid_init_data", 401)

    user = extract_user_from_init_data(parsed_init_data)
    if not user:
        return _json_error("invalid_init_data", 401)

    gift = TELEGRAM_GIFTS.get(gift_key)
    if not gift:
        logger.warning("gift_not_supported", extra={"gift_key": gift_key})
        return _json_error("gift_not_supported", 400)

    await request.app["db"].upsert_user(user)

    try:
        await request.app["bot"].send_gift(user_id=int(user["id"]), gift_id=gift["gift_id"])
    except Exception:
        logger.exception("gift_send_failed", extra={"user_id": user.get("id"), "gift_key": gift_key, "gift_name": gift["name"]})
        return _json_error("gift_send_failed", 500)

    await request.app["db"].add_action_history(
        user_id=int(user["id"]),
        action_type="won",
        gift_key=gift_key,
        gift_name=gift["name"],
        spin_price=spin_price,
    )
    await request.app["db"].add_action_history(
        user_id=int(user["id"]),
        action_type="received",
        gift_key=gift_key,
        gift_name=gift["name"],
        spin_price=spin_price,
    )

    logger.info("gift_sent", extra={"user_id": user.get("id"), "gift_key": gift_key, "gift_name": gift["name"], "gift_id": gift["gift_id"]})
    return web.json_response({"ok": True})


@web.middleware
async def cors_middleware(request: web.Request, handler):
    if request.method == "OPTIONS":
        response = web.Response(status=204)
    else:
        response = await handler(request)

    allow_origins = [origin.strip() for origin in (CORS_ALLOW_ORIGIN or "").split(",") if origin.strip()]
    response.headers["Access-Control-Allow-Origin"] = allow_origins[0] if allow_origins else "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Telegram-Init-Data"
    return response


async def run_api_server(bot_instance, db_instance, host, port):
    app = web.Application(middlewares=[cors_middleware])
    app["bot"] = bot_instance
    app["db"] = db_instance

    app.router.add_get("/api/invoice", handle_invoice_get)
    app.router.add_get("/api/leaderboard", handle_leaderboard)
    app.router.add_get("/api/history", handle_action_history)
    app.router.add_post("/api/roulette/win", handle_roulette_win)

    app.router.add_options("/api/invoice", lambda request: web.Response(status=204))
    app.router.add_options("/api/leaderboard", lambda request: web.Response(status=204))
    app.router.add_options("/api/history", lambda request: web.Response(status=204))
    app.router.add_options("/api/roulette/win", lambda request: web.Response(status=204))

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host, port)
    await site.start()

    logger.info("api_server_started", extra={"host": host, "port": port})
