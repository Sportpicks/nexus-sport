from datetime import datetime, timezone, timedelta
from typing import List

import aiosqlite
from dateutil.parser import parse as parse_dt
from fastapi import APIRouter, Depends, HTTPException, status

from backend.database import get_db
from backend.schemas import MatchPreview

router = APIRouter()

_MATCH_PREVIEW_SQL = """
    SELECT
        m.id,
        ht.name  AS home_team,
        at.name  AS away_team,
        m.match_date,
        m.stage,
        m.price_usd,
        m.is_published,
        p.prob_home,
        p.prob_draw,
        p.prob_away,
        p.prob_over_25,
        p.prob_btts,
        p.prob_extra_time
    FROM matches m
    JOIN  teams ht ON ht.id = m.home_team_id
    JOIN  teams at ON at.id = m.away_team_id
    LEFT JOIN predictions p ON p.match_id = m.id
"""


def _parse_match_date(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    try:
        dt = parse_dt(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


@router.get("/", response_model=List[MatchPreview])
async def list_matches(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        _MATCH_PREVIEW_SQL
        + " WHERE m.is_published = 1 AND (m.status != 'FINISHED' OR m.status IS NULL)"
        + " ORDER BY m.match_date ASC"
    )
    rows = await cursor.fetchall()

    cutoff = datetime.now(timezone.utc) - timedelta(hours=3)
    filtered = []
    for row in rows:
        dt = _parse_match_date(row["match_date"])
        if dt is None or dt >= cutoff:
            filtered.append(row)

    return [MatchPreview(**dict(row)) for row in filtered]


@router.get("/{match_id}/preview", response_model=MatchPreview)
async def get_match_preview(
    match_id: int,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        _MATCH_PREVIEW_SQL + " WHERE m.id = ? AND m.is_published = 1",
        (match_id,),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found or not published",
        )
    return MatchPreview(**dict(row))
