"""
Admin endpoints — requires is_admin = 1 on the user account.

Routes
------
POST /admin/sync/matches               — manual trigger: sync WC matches
POST /admin/sync/odds/{match_id}       — manual trigger: sync odds for one match
POST /admin/sync/stats/{team_id}       — manual trigger: sync advanced stats for one team
POST /admin/retrain                    — retrain ML corners/cards models
GET  /admin/api-status                 — remaining API requests (live quota cache)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from backend.database import get_db
from backend.models.ml.train import retrain_from_db
from backend.services.ingest_service import (
    api_quota,
    sync_advanced_stats,
    sync_odds,
    sync_wc_matches,
)

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Auth dependency ────────────────────────────────────────────────────────────

async def require_admin(db=Depends(get_db)):
    """
    Placeholder: in production, decode Bearer JWT and verify users.is_admin = 1.
    For now returns db so downstream handlers can use it directly.
    """
    # TODO: decode token, load user, assert user.is_admin == 1
    return db


# ── Sync endpoints ─────────────────────────────────────────────────────────────

@router.post("/sync/matches")
async def trigger_sync_matches(db=Depends(require_admin)):
    """Manually trigger sync of WC 2026 matches from football-data.org."""
    try:
        result = await sync_wc_matches(db)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return result


@router.post("/sync/odds/{match_id}")
async def trigger_sync_odds(match_id: int, db=Depends(require_admin)):
    """Manually trigger odds sync for a specific match (internal DB id)."""
    cur = await db.execute(
        "SELECT api_match_id FROM matches WHERE id = ?", (match_id,)
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Match not found")
    if not row["api_match_id"]:
        raise HTTPException(status_code=422, detail="Match has no api_match_id")

    try:
        result = await sync_odds(db, row["api_match_id"])
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return result


@router.post("/sync/stats/{team_id}")
async def trigger_sync_stats(team_id: int, db=Depends(require_admin)):
    """Manually trigger advanced-stats sync for a team (internal DB id)."""
    cur = await db.execute("SELECT id FROM teams WHERE id = ?", (team_id,))
    if not await cur.fetchone():
        raise HTTPException(status_code=404, detail="Team not found")

    try:
        result = await sync_advanced_stats(db, team_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return result


@router.post("/retrain")
async def retrain_models(db=Depends(require_admin)):
    """Retrain ML corners/cards models from stored prediction history."""
    result = await retrain_from_db(db)
    return result


# ── Status endpoint ────────────────────────────────────────────────────────────

@router.get("/api-status")
async def api_status():
    """
    Return cached API quota info (updated after each real request).
    Does not consume any API calls.
    """
    return {
        "football_data_org": {
            "base_url":         "https://api.football-data.org/v4",
            "remaining_minute": api_quota["football_data"]["remaining"],
            "counter_reset":    api_quota["football_data"]["reset"],
        },
        "the_odds_api": {
            "base_url":   "https://api.the-odds-api.com/v4",
            "remaining":  api_quota["odds_api"]["remaining"],
            "reset":      api_quota["odds_api"]["reset"],
        },
        "api_football": {
            "base_url":   "https://v3.football.api-sports.io",
            "remaining":  api_quota["api_football"]["remaining"],
            "reset":      api_quota["api_football"]["reset"],
        },
    }
