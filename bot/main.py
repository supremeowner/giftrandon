from __future__ import annotations

import asyncio

from aiogram import Bot, Dispatcher

from api import run_api_server
from bot_handlers import register_bot_handlers
from config import API_HOST, API_PORT, BOT_TOKEN, DB_PATH, validate_config
from database import Database

validate_config()


async def main() -> None:
    bot = Bot(BOT_TOKEN)
    dp = Dispatcher()
    db = Database(DB_PATH)
    await db.init()

    api_task = asyncio.create_task(run_api_server(bot, db, API_HOST, API_PORT))

    register_bot_handlers(dp, db)

    try:
        await dp.start_polling(bot)
    finally:
        api_task.cancel()


if __name__ == "__main__":
    asyncio.run(main())
