from typing import List

import aiosqlite
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
        m.is_published
    FROM matches m
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
"""


@router.get("/", response_model=List[MatchPreview])
async def list_matches(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        _MATCH_PREVIEW_SQL + " WHERE m.is_published = 1 ORDER BY m.match_date ASC"
    )
    rows = await cursor.fetchall()
    return [MatchPreview(**dict(row)) for row in rows]


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
