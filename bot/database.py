import asyncio
import logging
import sqlite3
import threading
from pathlib import Path


logger = logging.getLogger(__name__)


class Database:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = asyncio.Lock()
        self._conn: sqlite3.Connection | None = None
        self._conn_init_lock = threading.Lock()

    def _connect(self) -> sqlite3.Connection:
        if self._conn is not None:
            return self._conn

        with self._conn_init_lock:
            if self._conn is not None:
                return self._conn

            conn = sqlite3.connect(self.path, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
            conn.execute("PRAGMA temp_store=MEMORY")
            self._conn = conn

        return self._conn

    def _commit(self) -> None:
        self._connect().commit()

    async def close(self) -> None:
        async with self._lock:
            await asyncio.to_thread(self._close_sync)

    def _close_sync(self) -> None:
        conn = self._conn
        if conn is not None:
            conn.close()
            self._conn = None

    async def init(self) -> None:
        await asyncio.to_thread(self._init_sync)

    def _init_sync(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        conn = self._connect()
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                photo_url TEXT,
                spent_stars INTEGER NOT NULL DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_users_leaderboard
            ON users (spent_stars DESC, user_id ASC)
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS action_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                action_type TEXT NOT NULL CHECK(action_type IN ('won', 'received')),
                gift_key TEXT NOT NULL,
                gift_name TEXT NOT NULL,
                spin_price INTEGER,
                occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_action_history_user_time
            ON action_history (user_id, occurred_at DESC, id DESC)
            """
        )
        self._commit()

    async def upsert_user(self, user: dict) -> None:
        if not isinstance(user.get("id"), int):
            return

        async with self._lock:
            await asyncio.to_thread(self._upsert_user_sync, user)

    def _upsert_user_sync(self, user: dict) -> None:
        conn = self._connect()
        conn.execute(
            """
            INSERT INTO users (user_id, username, first_name, last_name, photo_url)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                username = COALESCE(excluded.username, users.username),
                first_name = COALESCE(excluded.first_name, users.first_name),
                last_name = COALESCE(excluded.last_name, users.last_name),
                photo_url = COALESCE(excluded.photo_url, users.photo_url),
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                user["id"],
                user.get("username"),
                user.get("first_name"),
                user.get("last_name"),
                user.get("photo_url"),
            ),
        )
        self._commit()

    async def add_spent_stars(self, user_id: int, amount: int) -> None:
        if amount <= 0:
            logger.warning("add_spent_stars_skipped", extra={"user_id": user_id, "amount": amount, "reason": "non_positive_amount"})
            return

        try:
            async with self._lock:
                await asyncio.to_thread(self._add_spent_stars_sync, user_id, amount)
        except Exception:
            logger.exception("add_spent_stars_failed", extra={"user_id": user_id, "amount": amount})
            raise

    def _add_spent_stars_sync(self, user_id: int, amount: int) -> None:
        conn = self._connect()
        cursor = conn.execute(
            """
            INSERT INTO users (user_id, spent_stars)
            VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                spent_stars = users.spent_stars + excluded.spent_stars,
                updated_at = CURRENT_TIMESTAMP
            RETURNING spent_stars
            """,
            (user_id, amount),
        )
        row = cursor.fetchone()
        self._commit()

        logger.info(
            "add_spent_stars_succeeded",
            extra={
                "user_id": user_id,
                "amount_added": amount,
                "current_spent_stars": row["spent_stars"] if row else None,
            },
        )


    async def add_action_history(
        self,
        *,
        user_id: int,
        action_type: str,
        gift_key: str,
        gift_name: str,
        spin_price: int | None = None,
    ) -> None:
        if action_type not in {"won", "received"}:
            logger.warning("add_action_history_skipped", extra={"reason": "invalid_action_type", "action_type": action_type})
            return

        async with self._lock:
            await asyncio.to_thread(
                self._add_action_history_sync,
                user_id,
                action_type,
                gift_key,
                gift_name,
                spin_price,
            )

    def _add_action_history_sync(
        self,
        user_id: int,
        action_type: str,
        gift_key: str,
        gift_name: str,
        spin_price: int | None,
    ) -> None:
        conn = self._connect()
        conn.execute(
            """
            INSERT INTO action_history (user_id, action_type, gift_key, gift_name, spin_price)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, action_type, gift_key, gift_name, spin_price),
        )
        self._commit()

    async def get_action_history(self, *, user_id: int, limit: int = 100, offset: int = 0) -> list[dict]:
        safe_limit = max(1, min(limit, 100))
        safe_offset = max(0, offset)

        async with self._lock:
            return await asyncio.to_thread(self._get_action_history_sync, user_id, safe_limit, safe_offset)

    def _get_action_history_sync(self, user_id: int, limit: int, offset: int) -> list[dict]:
        conn = self._connect()
        rows = conn.execute(
            """
            SELECT action_type, occurred_at, gift_key, gift_name, spin_price
            FROM action_history
            WHERE user_id = ?
            ORDER BY occurred_at DESC, id DESC
            LIMIT ? OFFSET ?
            """,
            (user_id, limit, offset),
        ).fetchall()

        return [
            {
                "type": row["action_type"],
                "occurredAt": row["occurred_at"],
                "giftId": row["gift_key"],
                "giftName": row["gift_name"],
                "spinPrice": row["spin_price"],
            }
            for row in rows
        ]

    async def get_leaderboard(self, limit: int = 100, offset: int = 0) -> list[dict]:
        safe_limit = max(1, min(limit, 100))
        safe_offset = max(0, offset)

        async with self._lock:
            return await asyncio.to_thread(self._get_leaderboard_sync, safe_limit, safe_offset)

    def _get_leaderboard_sync(self, limit: int, offset: int) -> list[dict]:
        conn = self._connect()
        rows = conn.execute(
            """
            SELECT user_id, username, first_name, last_name, photo_url, spent_stars
            FROM users
            ORDER BY spent_stars DESC, user_id ASC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        ).fetchall()

        logger.info("get_leaderboard_result", extra={"records_count": len(rows), "limit": limit, "offset": offset})

        return [
            {
                "userId": row["user_id"],
                "username": row["username"],
                "firstName": row["first_name"],
                "lastName": row["last_name"],
                "photoUrl": row["photo_url"],
                "spentStars": row["spent_stars"],
            }
            for row in rows
        ]
