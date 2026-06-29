import json
from datetime import datetime, timedelta, timezone

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, status

from backend.auth import get_current_user
from backend.database import get_db
from backend.models.engine import generate_report

router = APIRouter()

CACHE_TTL_HOURS = 6


async def _verify_token_for_match(token_data: dict, match_id: int, db: aiosqlite.Connection) -> None:
    cur = await db.execute(
        """
        SELECT p.match_id FROM payments p
        JOIN access_tokens at ON at.payment_id = p.id
        WHERE at.token = ? AND p.match_id = ?
        """,
        (token_data["token"], match_id),
    )
    if not await cur.fetchone():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token not authorized for this match",
        )


async def _get_cached(match_id: int, db: aiosqlite.Connection) -> dict | None:
    cur = await db.execute(
        "SELECT * FROM predictions WHERE match_id = ?",
        (match_id,),
    )
    row = await cur.fetchone()
    if not row:
        return None

    generated_at = row["generated_at"]
    if isinstance(generated_at, str):
        generated_at = datetime.fromisoformat(generated_at)
    if generated_at.tzinfo is None:
        generated_at = generated_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) - generated_at > timedelta(hours=CACHE_TTL_HOURS):
        return None

    # Load team names for cached response
    cur2 = await db.execute(
        """
        SELECT ht.name AS home_team, at.name AS away_team
        FROM matches m
        JOIN teams ht ON ht.id = m.home_team_id
        JOIN teams at ON at.id = m.away_team_id
        WHERE m.id = ?
        """,
        (match_id,),
    )
    teams = await cur2.fetchone()

    d = dict(row)
    d["home_team"] = teams["home_team"] if teams else ""
    d["away_team"] = teams["away_team"] if teams else ""

    # Deserialize JSON fields
    for field in ("asian_handicap", "score_matrix", "combined_probs", "value_bets"):
        if isinstance(d.get(field), str):
            try:
                d[field] = json.loads(d[field])
            except (json.JSONDecodeError, TypeError):
                pass

    d["cached"] = True
    return d


@router.get("/{match_id}")
async def get_prediction(
    match_id: int,
    token_data: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    await _verify_token_for_match(token_data, match_id, db)

    cached = await _get_cached(match_id, db)
    if cached:
        return cached

    result = await generate_report(match_id, db)
    result["cached"] = False
    return result
