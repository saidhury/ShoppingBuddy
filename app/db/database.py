from pathlib import Path
from typing import Optional

import aiosqlite

_db: Optional[aiosqlite.Connection] = None


async def init_db(db_path: Path) -> aiosqlite.Connection:
    global _db
    if _db is not None:
        return _db

    db_path.parent.mkdir(parents=True, exist_ok=True)
    _db = await aiosqlite.connect(db_path.as_posix())
    await _db.execute(
        """
        CREATE TABLE IF NOT EXISTS customer_profiles (
            customer_id TEXT PRIMARY KEY,
            profile_summary TEXT,
            last_updated TEXT
        )
        """
    )
    await _db.commit()
    return _db


def get_db() -> aiosqlite.Connection:
    if _db is None:
        raise RuntimeError("Database not initialized")
    return _db


async def get_profile_from_db(customer_id: str) -> Optional[str]:
    db = get_db()
    async with db.execute(
        "SELECT profile_summary FROM customer_profiles WHERE customer_id = ?",
        (customer_id,),
    ) as cursor:
        row = await cursor.fetchone()
    return row[0] if row else None


async def save_profile_to_db(customer_id: str, profile_summary: str) -> bool:
    db = get_db()
    try:
        await db.execute(
            """
            INSERT OR REPLACE INTO customer_profiles (customer_id, profile_summary, last_updated)
            VALUES (?, ?, datetime('now'))
            """,
            (customer_id, profile_summary),
        )
        await db.commit()
        return True
    except Exception:
        return False


async def close_db() -> None:
    global _db
    if _db is None:
        return
    await _db.close()
    _db = None
