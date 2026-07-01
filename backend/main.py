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

    # Auto-seed if the database has no matches (Railway ephemeral filesystem)
    try:
        async with aiosqlite.connect(DB_PATH) as _db:
            cur = await _db.execute("SELECT COUNT(*) FROM matches")
            (count,) = await cur.fetchone()
        if count == 0:
            logger.info("Database empty — running auto-seed …")
            from scripts.seed_matches import seed as _seed
            await _seed()
            logger.info("Auto-seed complete. Starting live sync …")
            try:
                from backend.services.ingest_service import sync_wc_matches
                async with aiosqlite.connect(DB_PATH) as _db2:
                    await sync_wc_matches(_db2)
                logger.info("Live sync complete.")
            except Exception as exc:
                logger.warning("Live sync failed (non-fatal): %s", exc)
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
