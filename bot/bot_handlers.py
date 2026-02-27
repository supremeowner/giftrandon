import logging

from aiogram import Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.utils.keyboard import InlineKeyboardBuilder

from config import ALLOWED_PRICES, MINI_APP_BUTTON, MINI_APP_URL
from database import Database
from payments import parse_invoice_payload, validate_payment_request


logger = logging.getLogger(__name__)


def build_start_keyboard() -> types.InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=MINI_APP_BUTTON, web_app=types.WebAppInfo(url=MINI_APP_URL))
    builder.adjust(1)
    return builder.as_markup()


async def process_pre_checkout_query(pre_checkout_query: types.PreCheckoutQuery) -> None:
    logger.info(
        "pre_checkout_query_received",
        extra={
            "query_id": pre_checkout_query.id,
            "user_id": pre_checkout_query.from_user.id,
            "currency": pre_checkout_query.currency,
            "total_amount": pre_checkout_query.total_amount,
        },
    )
    payload = parse_invoice_payload(pre_checkout_query.invoice_payload)
    logger.info(
        "pre_checkout_query_payload_parsed",
        extra={
            "query_id": pre_checkout_query.id,
            "payload_is_valid": bool(payload),
            "payload": payload,
        },
    )
    if not payload:
        logger.warning(
            "pre_checkout_query_rejected",
            extra={"query_id": pre_checkout_query.id, "reason": "invalid_payload"},
        )
        await pre_checkout_query.answer(ok=False, error_message="Некорректные данные платежа.")
        return

    validation = validate_payment_request(
        payload,
        allowed_amounts=ALLOWED_PRICES,
        currency=pre_checkout_query.currency,
        expected_currency="XTR",
        total_amount=pre_checkout_query.total_amount,
        from_user_id=pre_checkout_query.from_user.id,
    )
    if not validation.ok:
        logger.warning(
            "pre_checkout_query_rejected",
            extra={
                "query_id": pre_checkout_query.id,
                "reason": "payment_validation_failed",
                "currency": pre_checkout_query.currency,
                "total_amount": pre_checkout_query.total_amount,
                "payload": payload,
            },
        )
        await pre_checkout_query.answer(ok=False, error_message=validation.error_message)
        return

    await pre_checkout_query.answer(ok=True)


async def process_successful_payment(message: types.Message, db: Database) -> None:
    successful_payment = message.successful_payment
    if not successful_payment:
        return

    payload = parse_invoice_payload(successful_payment.invoice_payload)
    if not payload:
        logger.warning(
            "successful_payment_payload_invalid",
            extra={
                "message_id": message.message_id,
                "user_id": message.from_user.id,
            },
        )
        return

    logger.info(
        "successful_payment_received",
        extra={
            "message_id": message.message_id,
            "user_id": payload["user_id"],
            "amount": payload["amount"],
            "payload_id": payload.get("id"),
            "correlation_id": payload.get("correlation_id")
            or successful_payment.telegram_payment_charge_id,
        },
    )

    await db.upsert_user(
        {
            "id": message.from_user.id,
            "username": message.from_user.username,
            "first_name": message.from_user.first_name,
            "last_name": message.from_user.last_name,
            "photo_url": None,
        }
    )
    await db.add_spent_stars(payload["user_id"], payload["amount"])


def register_bot_handlers(dp: Dispatcher, db: Database) -> None:
    @dp.message(CommandStart())
    async def handle_start(message: types.Message) -> None:
        await db.upsert_user(
            {
                "id": message.from_user.id,
                "username": message.from_user.username,
                "first_name": message.from_user.first_name,
                "last_name": message.from_user.last_name,
                "photo_url": None,
            }
        )
        text = (
            "Привет! 🎁\n"
            "Жми на кнопку ниже, чтобы открыть мини-приложение и забрать подарки."
        )
        await message.answer(text, reply_markup=build_start_keyboard())

    @dp.pre_checkout_query()
    async def handle_pre_checkout(pre_checkout_query: types.PreCheckoutQuery) -> None:
        await process_pre_checkout_query(pre_checkout_query)

    @dp.message(lambda message: message.successful_payment is not None)
    async def handle_successful_payment(message: types.Message) -> None:
        await process_successful_payment(message, db)
