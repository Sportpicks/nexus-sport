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

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException

from backend.config import settings
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

async def require_admin(x_admin_key: str = Header(default=""), db=Depends(get_db)):
    if x_admin_key != settings.secret_key:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return db


# ── Dashboard & payment management ────────────────────────────────────────────

@router.get("/dashboard")
async def dashboard(db=Depends(require_admin)):
    cur = await db.execute("SELECT COUNT(*) FROM payments")
    total = (await cur.fetchone())[0]
    cur = await db.execute("SELECT COUNT(*) FROM payments WHERE status = 'pending'")
    pending = (await cur.fetchone())[0]
    cur = await db.execute("SELECT COUNT(*) FROM payments WHERE status = 'verified'")
    verified = (await cur.fetchone())[0]
    cur = await db.execute("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'verified'")
    revenue = (await cur.fetchone())[0]
    return {
        "total_pagos": total,
        "pagos_pendientes": pending,
        "pagos_verificados": verified,
        "ingresos_total_usd": round(float(revenue), 2),
    }


@router.get("/payments")
async def list_payments(db=Depends(require_admin)):
    cur = await db.execute(
        """
        SELECT p.id, p.op_number, p.method, p.amount, p.status, p.created_at,
               u.email,
               m.home_team || ' vs ' || m.away_team AS match_name
        FROM payments p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN matches m ON m.id = p.match_id
        ORDER BY p.created_at DESC
        """
    )
    rows = await cur.fetchall()
    return [
        {
            "id": r[0],
            "op_number": r[1],
            "method": r[2],
            "amount": r[3],
            "status": r[4],
            "created_at": r[5],
            "email": r[6],
            "match_name": r[7],
        }
        for r in rows
    ]


@router.post("/payments/{payment_id}/verify")
async def approve_payment(payment_id: int, db=Depends(require_admin)):
    cur = await db.execute("SELECT id, status, match_id FROM payments WHERE id = ?", (payment_id,))
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Payment not found")

    token = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    now = datetime.now(timezone.utc).isoformat()

    await db.execute(
        "UPDATE payments SET status = 'verified', verified_at = ? WHERE id = ?",
        (now, payment_id),
    )
    await db.execute(
        "INSERT INTO access_tokens (payment_id, token, expires_at) VALUES (?, ?, ?)",
        (payment_id, token, expires_at),
    )
    await db.commit()
    return {"status": "verified", "token": token, "expires_at": expires_at}


@router.post("/payments/{payment_id}/reject")
async def reject_payment(payment_id: int, db=Depends(require_admin)):
    cur = await db.execute("SELECT id FROM payments WHERE id = ?", (payment_id,))
    if not await cur.fetchone():
        raise HTTPException(status_code=404, detail="Payment not found")
    await db.execute("UPDATE payments SET status = 'rejected' WHERE id = ?", (payment_id,))
    await db.commit()
    return {"status": "rejected"}


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
