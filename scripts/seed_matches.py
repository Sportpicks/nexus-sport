import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import aiosqlite
from backend.database import DB_PATH, init_db


async def seed():
    await init_db()

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA foreign_keys=ON")

        # Admin user only — matches come from live API sync
        await db.execute(
            "INSERT OR IGNORE INTO users (email, is_admin) VALUES ('admin@nexussport.com', 1)"
        )

        await db.commit()
        print("Seed completado: usuario admin insertado.")


if __name__ == "__main__":
    asyncio.run(seed())
