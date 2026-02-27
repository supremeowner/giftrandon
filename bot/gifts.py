from typing import TypedDict


class TelegramGift(TypedDict):
    name: str
    gift_id: str


# Единая таблица соответствия ключа подарка, его названия и Telegram gift_id.
# gift_id и названия взяты из реализации: https://github.com/ProbablyAnus/casik
TELEGRAM_GIFTS: dict[str, TelegramGift] = {
    "heart-box": {"name": "Heart", "gift_id": "5170145012310081615"},
    "teddy-bear": {"name": "Teddy Bear", "gift_id": "5170233102089322756"},
    "gift-box": {"name": "Gift Box", "gift_id": "5170250947678437525"},
    "rose": {"name": "Rose", "gift_id": "5168103777563050263"},
    "elka": {"name": "Elka", "gift_id": "5956217000635139069"},
    "newteddy": {"name": "New Teddy", "gift_id": "5956217000635139069"},
    "cake": {"name": "Cake", "gift_id": "5170144170496491616"},
    "bouquet": {"name": "Bouquet", "gift_id": "5170314324215857265"},
    "rocket": {"name": "Rocket", "gift_id": "5170564780938756245"},
    "champagne": {"name": "Champagne", "gift_id": "6028601630662853006"},
    "trophy": {"name": "Trophy", "gift_id": "5168043875654172773"},
    "ring": {"name": "Ring", "gift_id": "5170690322832818290"},
    "diamond": {"name": "Diamond", "gift_id": "5170521118301225164"},
}
