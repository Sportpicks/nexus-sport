"""
APScheduler background jobs for automatic data ingestion.

Jobs
----
1. sync_wc_matches   — daily 06:00 America/Lima
2. sync_odds_today   — every 4 h (next-day matches)
3. sync_advanced_stats — daily 07:00, max 5 teams per run
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

import aiosqlite
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from backend.config import settings
from backend.database import DB_PATH
from backend.services.ingest_service import (
    sync_advanced_stats,
    sync_odds,
    sync_wc_matches,
)

logger = logging.getLogger(__name__)


# ── Job implementations ────────────────────────────────────────────────────────

async def _job_sync_matches() -> None:
    logger.info("[scheduler] sync_wc_matches starting")
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        result = await sync_wc_matches(db)
    logger.info("[scheduler] sync_wc_matches done: %s", result)


async def _job_sync_odds() -> None:
    """Sync odds for matches scheduled within the next 36 hours."""
    logger.info("[scheduler] sync_odds starting")
    window_end = (datetime.now(timezone.utc) + timedelta(hours=36)).isoformat()

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            """
            SELECT api_match_id FROM matches
            WHERE is_published = 1
              AND status = 'SCHEDULED'
              AND match_date <= ?
            """,
            (window_end,),
        )
        rows = await cur.fetchall()

    for row in rows:
        if not row["api_match_id"]:
            continue
        try:
            async with aiosqlite.connect(DB_PATH) as db:
                db.row_factory = aiosqlite.Row
                result = await sync_odds(db, row["api_match_id"])
            logger.info("[scheduler] odds synced for api_match_id=%s: %s",
                        row["api_match_id"], result)
        except Exception as exc:
            logger.warning("[scheduler] odds sync failed for %s: %s",
                           row["api_match_id"], exc)


async def _job_sync_stats() -> None:
    """Sync advanced stats for up to 5 stale teams."""
    logger.info("[scheduler] sync_advanced_stats starting")
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            """
            SELECT DISTINCT t.id AS team_id
            FROM teams t
            LEFT JOIN team_stats ts ON ts.team_id = t.id
            WHERE ts.last_synced IS NULL
               OR (strftime('%s','now') - strftime('%s', ts.last_synced)) > 86400
            LIMIT 5
            """
        )
        rows = await cur.fetchall()

    for row in rows:
        try:
            async with aiosqlite.connect(DB_PATH) as db:
                db.row_factory = aiosqlite.Row
                result = await sync_advanced_stats(db, row["team_id"])
            logger.info("[scheduler] stats synced team_id=%s: %s", row["team_id"], result)
        except Exception as exc:
            logger.warning("[scheduler] stats sync failed team_id=%s: %s",
                           row["team_id"], exc)


# ── Scheduler factory ──────────────────────────────────────────────────────────

def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone="America/Lima")

    scheduler.add_job(
        _job_sync_matches,
        trigger=CronTrigger(hour=6, minute=0, timezone="America/Lima"),
        id="sync_wc_matches",
        name="Sync WC matches (football-data.org)",
        replace_existing=True,
        misfire_grace_time=300,
    )

    scheduler.add_job(
        _job_sync_odds,
        trigger=IntervalTrigger(hours=4),
        id="sync_odds",
        name="Sync odds (The Odds API)",
        replace_existing=True,
        misfire_grace_time=120,
    )

    scheduler.add_job(
        _job_sync_stats,
        trigger=CronTrigger(hour=7, minute=0, timezone="America/Lima"),
        id="sync_advanced_stats",
        name="Sync advanced stats (API-Football)",
        replace_existing=True,
        misfire_grace_time=300,
    )

    return scheduler
