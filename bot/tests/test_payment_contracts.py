import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, call, patch

from bot.api import _create_invoice_response, handle_action_history, handle_invoice_get, handle_roulette_win
from bot.bot_handlers import process_pre_checkout_query, process_successful_payment
from bot.payments import build_invoice_payload


class _FakePreCheckoutQuery:
    def __init__(self, *, user_id: int, payload_user_id: int, amount: int):
        self.id = "query-1"
        self.currency = "XTR"
        self.total_amount = amount
        self.from_user = SimpleNamespace(id=user_id)
        self.invoice_payload = build_invoice_payload(amount, payload_user_id)
        self.answer = AsyncMock()


class PaymentContractsTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.bot = AsyncMock()
        self.bot.create_invoice_link = AsyncMock(return_value="https://t.me/invoice/test-link")
        self.db = AsyncMock()
        self.app = {"bot": self.bot, "db": self.db}

    async def test_invoice_endpoint_returns_invoice_link_for_valid_init_data_and_amount(self):
        with (
            patch("bot.api.verify_telegram_init_data", return_value={"user": '{"id": 777}'}),
            patch("bot.api.extract_user_from_init_data", return_value={"id": 777}),
        ):
            response = await _create_invoice_response(
                app=self.app,
                amount=50,
                init_data="valid_init_data",
                x_telegram_init_data=None,
            )

        self.assertEqual(response.status, 200)
        self.assertEqual(json.loads(response.text)["invoice_link"], "https://t.me/invoice/test-link")
        self.bot.create_invoice_link.assert_awaited_once()
        self.db.upsert_user.assert_called_once_with({"id": 777})

    async def test_invoice_get_endpoint_rejects_invalid_amount_type(self):
        request = SimpleNamespace(
            query={"amount": "not-a-number"},
            headers={},
            app=self.app,
        )

        response = await handle_invoice_get(request)

        self.assertEqual(response.status, 400)
        self.assertEqual(json.loads(response.text), {"error": "invalid_amount"})

    async def test_pre_checkout_accepts_matching_user_id(self):
        query = _FakePreCheckoutQuery(user_id=777, payload_user_id=777, amount=50)

        await process_pre_checkout_query(query)

        query.answer.assert_awaited_once_with(ok=True)

    async def test_pre_checkout_rejects_mismatched_user_id(self):
        query = _FakePreCheckoutQuery(user_id=777, payload_user_id=888, amount=50)

        await process_pre_checkout_query(query)

        query.answer.assert_awaited_once_with(ok=False, error_message="Платеж от другого пользователя.")

    async def test_successful_payment_updates_spent_stars_for_payload_user(self):
        db = AsyncMock()
        message = SimpleNamespace(
            message_id=123,
            from_user=SimpleNamespace(
                id=777,
                username="tester",
                first_name="Test",
                last_name="User",
            ),
            successful_payment=SimpleNamespace(
                invoice_payload=build_invoice_payload(50, 777),
                telegram_payment_charge_id="charge-1",
            ),
        )

        await process_successful_payment(message, db)

        db.upsert_user.assert_awaited_once_with(
            {
                "id": 777,
                "username": "tester",
                "first_name": "Test",
                "last_name": "User",
                "photo_url": None,
            }
        )
        db.add_spent_stars.assert_awaited_once_with(777, 50)

    async def test_successful_payment_ignores_invalid_payload(self):
        db = AsyncMock()
        message = SimpleNamespace(
            message_id=123,
            from_user=SimpleNamespace(
                id=777,
                username="tester",
                first_name="Test",
                last_name="User",
            ),
            successful_payment=SimpleNamespace(
                invoice_payload="not-json",
                telegram_payment_charge_id="charge-1",
            ),
        )

        await process_successful_payment(message, db)

        db.upsert_user.assert_not_awaited()
        db.add_spent_stars.assert_not_awaited()

    async def test_roulette_win_sends_telegram_gift_for_verified_user(self):
        request = SimpleNamespace(
            json=AsyncMock(return_value={"gift_key": "rose"}),
            headers={"X-Telegram-Init-Data": "valid"},
            app=self.app,
        )

        with (
            patch("bot.api.verify_telegram_init_data", return_value={"user": '{"id": 777}'}),
            patch("bot.api.extract_user_from_init_data", return_value={"id": 777}),
            patch("bot.api.TELEGRAM_GIFTS", {"rose": {"name": "Rose", "gift_id": "gift_rose"}}),
        ):
            response = await handle_roulette_win(request)

        self.assertEqual(response.status, 200)
        self.bot.send_gift.assert_awaited_once_with(user_id=777, gift_id="gift_rose")
        self.db.add_action_history.assert_has_awaits(
            [
                call(
                    user_id=777,
                    action_type="won",
                    gift_key="rose",
                    gift_name="Rose",
                    spin_price=None,
                ),
                call(
                    user_id=777,
                    action_type="received",
                    gift_key="rose",
                    gift_name="Rose",
                    spin_price=None,
                ),
            ]
        )

    async def test_roulette_win_rejects_unknown_gift_key(self):
        request = SimpleNamespace(
            json=AsyncMock(return_value={"gift_key": "rose"}),
            headers={"X-Telegram-Init-Data": "valid"},
            app=self.app,
        )

        with (
            patch("bot.api.verify_telegram_init_data", return_value={"user": '{"id": 777}'}),
            patch("bot.api.extract_user_from_init_data", return_value={"id": 777}),
            patch("bot.api.TELEGRAM_GIFTS", {}),
        ):
            response = await handle_roulette_win(request)

        self.assertEqual(response.status, 400)
        self.bot.send_gift.assert_not_called()

    async def test_action_history_returns_history_for_verified_user(self):
        self.db.get_action_history = AsyncMock(return_value=[{"type": "won"}])
        request = SimpleNamespace(
            query={},
            headers={"X-Telegram-Init-Data": "valid"},
            app=self.app,
        )

        with (
            patch("bot.api.verify_telegram_init_data", return_value={"user": '{"id": 777}'}),
            patch("bot.api.extract_user_from_init_data", return_value={"id": 777}),
        ):
            response = await handle_action_history(request)

        self.assertEqual(response.status, 200)
        self.db.get_action_history.assert_awaited_once_with(user_id=777, limit=100, offset=0)



if __name__ == "__main__":
    unittest.main()
