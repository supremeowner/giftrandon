import json
from dataclasses import dataclass


@dataclass(frozen=True)
class PaymentValidationResult:
    ok: bool
    error_message: str | None = None


def build_invoice_payload(amount: int, user_id: int) -> str:
    return json.dumps({"amount": amount, "user_id": user_id})


def parse_invoice_payload(payload: str) -> dict | None:
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return None

    if not isinstance(data, dict):
        return None

    amount = data.get("amount")
    user_id = data.get("user_id")
    if not isinstance(amount, int) or not isinstance(user_id, int):
        return None

    payload_id = data.get("id")
    if payload_id is not None and not isinstance(payload_id, (str, int)):
        return None

    correlation_id = data.get("correlation_id")
    if correlation_id is not None and not isinstance(correlation_id, str):
        return None

    return {
        "amount": amount,
        "user_id": user_id,
        "id": str(payload_id) if payload_id is not None else None,
        "correlation_id": correlation_id,
    }


def validate_payment_request(
    payload: dict,
    *,
    allowed_amounts: set[int],
    currency: str,
    expected_currency: str,
    total_amount: int,
    from_user_id: int,
) -> PaymentValidationResult:
    if currency != expected_currency:
        return PaymentValidationResult(ok=False, error_message="Неверная валюта.")

    if payload["amount"] not in allowed_amounts:
        return PaymentValidationResult(ok=False, error_message="Некорректная сумма.")

    if total_amount != payload["amount"]:
        return PaymentValidationResult(ok=False, error_message="Несовпадение суммы.")

    if from_user_id != payload["user_id"]:
        return PaymentValidationResult(ok=False, error_message="Платеж от другого пользователя.")

    return PaymentValidationResult(ok=True)
