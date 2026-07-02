from datetime import datetime, timezone, timedelta
from typing import List, Optional

import aiosqlite
from dateutil.parser import parse as parse_date
from fastapi import APIRouter, Depends, HTTPException, status

from backend.database import get_db
from backend.schemas import MatchPreview

router = APIRouter()

_MATCH_PREVIEW_SQL = """
    SELECT
        m.id,
        m.status,
        m.match_date,
        m.stage,
        m.price_usd,
        m.is_published,
        t1.name AS home_team,
        t2.name AS away_team,
        p.prob_home,
        p.prob_draw,
        p.prob_away,
        p.prob_over_25,
        p.prob_btts,
        p.prob_extra_time,
        p.xg_home,
        p.xg_away,
        p.corners_home_pred,
        p.corners_away_pred,
        p.yellow_home_pred,
        p.yellow_away_pred
    FROM matches m
    LEFT JOIN teams t1 ON m.home_team_id = t1.id
    LEFT JOIN teams t2 ON m.away_team_id = t2.id
    LEFT JOIN predictions p ON p.match_id = m.id
    WHERE m.is_published = 1
    ORDER BY m.match_date ASC
"""

# Best real odds per outcome from odds_snapshots (1X2 market, max decimal odd)
_ODDS_SQL = """
    SELECT outcome, MAX(decimal_odd) AS best_odd, bookmaker
    FROM odds_snapshots
    WHERE match_id = ? AND market = '1X2'
    GROUP BY outcome
"""

# Map outcome names returned by The Odds API to home/draw/away
_OUTCOME_HOME = {"home", "1", "home team"}
_OUTCOME_DRAW = {"draw", "x", "tie"}
_OUTCOME_AWAY = {"away", "2", "away team"}


async def _fetch_real_odds(db: aiosqlite.Connection, match_id: int) -> dict:
    """Return best real odds from odds_snapshots for a match, or empty dict."""
    cur = await db.execute(_ODDS_SQL, (match_id,))
    rows = await cur.fetchall()
    if not rows:
        return {}

    odds: dict = {}
    source: Optional[str] = None
    for row in rows:
        label = (row["outcome"] or "").lower().strip()
        odd   = row["best_odd"]
        bk    = row["bookmaker"] or ""
        if not source:
            source = bk
        if label in _OUTCOME_HOME:
            odds["odds_home"] = odd
        elif label in _OUTCOME_DRAW:
            odds["odds_draw"] = odd
        elif label in _OUTCOME_AWAY:
            odds["odds_away"] = odd

    if odds:
        odds["odds_source"] = source
    return odds


@router.get("/", response_model=List[MatchPreview])
async def list_matches(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(_MATCH_PREVIEW_SQL)
    rows = await cursor.fetchall()

    now_utc = datetime.now(timezone.utc)
    cutoff = now_utc - timedelta(hours=3)

    filtered = []
    for row in rows:
        match_date_str = row["match_date"]
        row_status = row["status"]

        # Excluir partidos terminados
        if row_status == "FINISHED":
            continue

        # Parsear fecha con manejo robusto de timezone
        try:
            match_date = parse_date(match_date_str)
            if match_date.tzinfo is None:
                match_date = match_date.replace(tzinfo=timezone.utc)
            if match_date >= cutoff:
                filtered.append(row)
        except Exception as e:
            print(f"Error parsing date {match_date_str}: {e}")
            filtered.append(row)  # fallback: incluir

    try:
        result = [MatchPreview(**{k: row[k] for k in row.keys() if k != "status"}) for row in filtered]
        return result
    except Exception as e:
        print(f"ERROR construyendo MatchPreview: {e}")
        import traceback
        traceback.print_exc()
        raise


@router.get("/{match_id}/preview", response_model=MatchPreview)
async def get_match_preview(
    match_id: int,
    db: aiosqlite.Connection = Depends(get_db),
):
    cursor = await db.execute(
        _MATCH_PREVIEW_SQL.replace("WHERE m.is_published = 1", "WHERE m.id = ? AND m.is_published = 1"),
        (match_id,),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found or not published",
        )

    data = {k: row[k] for k in row.keys() if k != "status"}

    # Enrich with real bookmaker odds if available
    real_odds = await _fetch_real_odds(db, match_id)
    data.update(real_odds)

    return MatchPreview(**data)
