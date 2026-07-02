import logging
from contextlib import asynccontextmanager

import aiosqlite
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database import DB_PATH, init_db
from backend.services.scheduler import create_scheduler

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    await init_db()

    # Auto-sync if the database has no matches (Railway ephemeral filesystem)
    try:
        async with aiosqlite.connect(settings.DATABASE_URL) as db:
            rows = await db.execute_fetchall("SELECT COUNT(*) FROM matches")
            count = rows[0][0]
            # Ensure admin user exists regardless
            await db.execute(
                "INSERT OR IGNORE INTO users (email, is_admin) VALUES ('admin@nexussport.com', 1)"
            )
            await db.commit()
        if count == 0:
            print("BD vacía — sincronizando partidos reales...")
            try:
                from backend.services.ingest_service import sync_wc_matches
                async with aiosqlite.connect(settings.DATABASE_URL) as db2:
                    result = await sync_wc_matches(db2)
                    print(f"Auto-sync: {result}")
            except Exception as e:
                print(f"Auto-sync error: {e}")
    except Exception as exc:
        logger.error("Auto-seed error (non-fatal): %s", exc)

    scheduler = create_scheduler()
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://nexus-sport-six.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

try:
    from backend.routers import matches
    app.include_router(matches.router, prefix="/matches", tags=["matches"])
except ImportError:
    pass

try:
    from backend.routers import payments
    app.include_router(payments.router, prefix="/payments", tags=["payments"])
except ImportError:
    pass

try:
    from backend.routers import predictions
    app.include_router(predictions.router, prefix="/predictions", tags=["predictions"])
except ImportError:
    pass

try:
    from backend.routers import admin
    app.include_router(admin.router)
except ImportError:
    pass


@app.get("/")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
