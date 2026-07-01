"""
Data ingestion from three sports APIs.

Sources
-------
1. football-data.org  — canonical match list & team roster
2. The Odds API       — bookmaker odds for value-bet detection
3. API-Football       — granular team stats (corners, cards, possession)
   Rate-limited to 100 req/day; only called when last_synced > 24 h.

All HTTP responses store remaining-request headers in a module-level dict
so GET /admin/api-status can read them without extra network calls.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any

import httpx

from backend.config import settings
from backend.models.odds_parser import find_value_bets

logger = logging.getLogger(__name__)

# ── API quota tracking (updated on every response) ───────────────────────────
api_quota: dict[str, Any] = {
    "football_data": {"remaining": None, "reset": None},
    "odds_api":      {"remaining": None, "reset": None},
    "api_football":  {"remaining": None, "reset": None},
}

_TIMEOUT = httpx.Timeout(20.0)

# Stages that count as knockout (not group stage)
_KNOCKOUT_STAGES = {
    "LAST_32", "LAST_16", "ROUND_OF_16",
    "QUARTER_FINALS", "SEMI_FINALS",
    "THIRD_PLACE", "FINAL",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(s: str | None) -> str | None:
    """Normalise ISO-8601 string to UTC isoformat, or return None."""
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc).isoformat()
    except ValueError:
        return s


async def _get(client: httpx.AsyncClient, url: str, **kwargs) -> httpx.Response:
    resp = await client.get(url, **kwargs)
    resp.raise_for_status()
    return resp


# ── 1. football-data.org ─────────────────────────────────────────────────────

_FD_HEADERS = {"X-Auth-Token": settings.FOOTBALL_DATA_KEY}


async def _upsert_team(db, api_id: int, name: str, country: str) -> int:
    """Insert or ignore team; return internal id."""
    await db.execute(
        """
        INSERT INTO teams (api_id, name, country)
        VALUES (?, ?, ?)
        ON CONFLICT(api_id) DO UPDATE SET
            name    = excluded.name,
            country = excluded.country
        """,
        (api_id, name, country),
    )
    cur = await db.execute("SELECT id FROM teams WHERE api_id = ?", (api_id,))
    row = await cur.fetchone()
    return row[0]


async def sync_wc_matches(db) -> dict:
    """
    Fetch all WC 2026 matches from football-data.org and upsert into DB.
    Only knockout-stage matches are kept (GROUP_STAGE is filtered out).
    Returns {"inserted": int, "updated": int, "total_fetched": int}.
    """
    url = f"{settings.FOOTBALL_DATA_URL}/competitions/WC/matches"
    inserted = updated = 0

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await _get(client, url, headers=_FD_HEADERS)

    # Store quota info from headers
    api_quota["football_data"]["remaining"] = resp.headers.get("X-Requests-Available-Minute")
    api_quota["football_data"]["reset"]     = resp.headers.get("X-RequestCounter-Reset")

    data = resp.json()
    matches = data.get("matches", [])
    logger.info("football-data.org returned %d matches for WC", len(matches))

    knockout_matches = [
        m for m in matches
        if m.get("stage", "").upper() in _KNOCKOUT_STAGES
    ]
    logger.info("%d knockout matches after filter", len(knockout_matches))

    for m in knockout_matches:
        home_t = m.get("homeTeam", {})
        away_t = m.get("awayTeam", {})

        # Skip placeholder TBD teams (id is None before draw)
        if not home_t.get("id") or not away_t.get("id"):
            continue

        home_id = await _upsert_team(
            db, home_t["id"], home_t.get("name", "TBD"), home_t.get("area", {}).get("name", "")
        )
        away_id = await _upsert_team(
            db, away_t["id"], away_t.get("name", "TBD"), away_t.get("area", {}).get("name", "")
        )

        score_h = (m.get("score", {}).get("fullTime") or {}).get("home")
        score_a = (m.get("score", {}).get("fullTime") or {}).get("away")
        match_date = _parse_dt(m.get("utcDate"))
        stage      = m.get("stage", "")
        status     = m.get("status", "SCHEDULED")
        price      = settings.PRICE_KNOCKOUT

        cur = await db.execute(
            "SELECT id FROM matches WHERE api_match_id = ?", (m["id"],)
        )
        existing = await cur.fetchone()

        if existing:
            await db.execute(
                """
                UPDATE matches SET
                    home_team_id = ?, away_team_id = ?,
                    match_date = ?, stage = ?, status = ?,
                    score_home = ?, score_away = ?
                WHERE api_match_id = ?
                """,
                (home_id, away_id, match_date, stage, status, score_h, score_a, m["id"]),
            )
            updated += 1
        else:
            await db.execute(
                """
                INSERT INTO matches
                    (api_match_id, home_team_id, away_team_id,
                     match_date, stage, status,
                     score_home, score_away, price_usd, is_published)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                """,
                (m["id"], home_id, away_id, match_date, stage, status,
                 score_h, score_a, price),
            )
            inserted += 1

    await db.commit()
    return {"inserted": inserted, "updated": updated, "total_fetched": len(matches),
            "knockout_processed": len(knockout_matches)}


async def sync_team_stats(db, team_api_id: int) -> dict:
    """
    Fetch last 10 WC matches for a team and derive basic stats.
    Upserts into team_stats with season=2026, competition='WC_KNOCKOUT'.
    """
    url = f"{settings.FOOTBALL_DATA_URL}/teams/{team_api_id}/matches"
    params = {"competitions": "WC", "limit": 10}

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await _get(client, url, headers=_FD_HEADERS, params=params)

    api_quota["football_data"]["remaining"] = resp.headers.get("X-Requests-Available-Minute")

    data  = resp.json()
    ms    = data.get("matches", [])
    played = [m for m in ms if m.get("status") == "FINISHED"]
    n = len(played)
    if n == 0:
        return {"team_api_id": team_api_id, "matches_used": 0}

    goals_for     = 0.0
    goals_against = 0.0

    for m in played:
        is_home = m.get("homeTeam", {}).get("id") == team_api_id
        ft      = (m.get("score", {}).get("fullTime") or {})
        gf = ft.get("home" if is_home else "away") or 0
        ga = ft.get("away" if is_home else "home") or 0
        goals_for     += gf
        goals_against += ga

    gf_pg = round(goals_for / n, 3)
    ga_pg = round(goals_against / n, 3)
    # Rough xG estimate: 0.85 × goals (regression-to-mean factor)
    xg_for = round(gf_pg * 0.85, 3)

    # Get internal team id
    cur = await db.execute("SELECT id FROM teams WHERE api_id = ?", (team_api_id,))
    row = await cur.fetchone()
    if not row:
        return {"team_api_id": team_api_id, "matches_used": 0, "error": "team not in DB"}
    team_id = row[0]

    await db.execute(
        """
        INSERT INTO team_stats
            (team_id, season, competition,
             matches_played, goals_scored, goals_conceded,
             xg_for, xg_against,
             attack_strength, defense_weakness, last_synced)
        VALUES (?, 2026, 'WC_KNOCKOUT', ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(team_id, season, competition) DO UPDATE SET
            matches_played   = excluded.matches_played,
            goals_scored     = excluded.goals_scored,
            goals_conceded   = excluded.goals_conceded,
            xg_for           = excluded.xg_for,
            xg_against       = excluded.xg_against,
            attack_strength  = excluded.attack_strength,
            defense_weakness = excluded.defense_weakness,
            last_synced      = excluded.last_synced
        """,
        (
            team_id, n, gf_pg, ga_pg,
            xg_for, round(ga_pg * 0.85, 3),
            round(gf_pg / 1.4, 3),   # attack_strength (league avg ≈ 1.4 g/game)
            round(ga_pg / 1.4, 3),   # defense_weakness
            _now_utc().isoformat(),
        ),
    )
    await db.commit()
    return {"team_api_id": team_api_id, "matches_used": n,
            "goals_scored_pg": gf_pg, "goals_conceded_pg": ga_pg}


# ── 2. The Odds API ───────────────────────────────────────────────────────────

async def sync_odds(db, match_api_id: int) -> dict:
    """
    Fetch h2h + asian_handicap odds for a WC match and upsert into odds_snapshots.
    Also runs find_value_bets() if a prediction already exists.
    """
    url    = f"{settings.ODDS_API_URL}/sports/soccer_fifa_world_cup/odds/"
    params = {
        "apiKey":  settings.ODDS_API_KEY,
        "regions": "eu",
        "markets": "h2h,asian_handicap",
        "eventIds": str(match_api_id),  # filter to specific match when API supports it
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await _get(client, url, params=params)

    api_quota["odds_api"]["remaining"] = resp.headers.get("x-requests-remaining")
    api_quota["odds_api"]["reset"]     = resp.headers.get("x-requests-reset")

    events = resp.json()  # list of events
    if not events:
        # Odds API doesn't support eventIds filter on all plans — fall back to
        # matching by home/away team name comparison (done at call site if needed)
        logger.warning("sync_odds: no events returned for match_api_id=%s", match_api_id)
        return {"match_api_id": match_api_id, "rows_upserted": 0}

    # Get internal match id
    cur = await db.execute(
        "SELECT id FROM matches WHERE api_match_id = ?", (match_api_id,)
    )
    match_row = await cur.fetchone()
    if not match_row:
        return {"match_api_id": match_api_id, "rows_upserted": 0, "error": "match not in DB"}
    match_id = match_row[0]

    rows_upserted = 0
    now_iso = _now_utc().isoformat()

    for event in events:
        for bookmaker in event.get("bookmakers", []):
            bk_key = bookmaker.get("key", "unknown")
            for market in bookmaker.get("markets", []):
                mkt_key = market.get("key", "")
                # Normalise market key to our schema
                if mkt_key == "h2h":
                    mkt_label = "1X2"
                elif mkt_key == "asian_handicap":
                    mkt_label = "AH"
                else:
                    continue

                for outcome in market.get("outcomes", []):
                    await db.execute(
                        """
                        INSERT INTO odds_snapshots
                            (match_id, bookmaker, market, outcome, decimal_odd, captured_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (
                            match_id, bk_key, mkt_label,
                            outcome.get("name", ""),
                            float(outcome.get("price", 0)),
                            now_iso,
                        ),
                    )
                    rows_upserted += 1

    await db.commit()

    # Run value-bet detection if a prediction exists
    value_bets: list = []
    cur = await db.execute(
        "SELECT prob_home, prob_draw, prob_away FROM predictions WHERE match_id = ?",
        (match_id,),
    )
    pred = await cur.fetchone()
    if pred:
        our = {"1": pred[0], "X": pred[1], "2": pred[2]}
        cur2 = await db.execute(
            """
            SELECT outcome, MAX(decimal_odd) AS best_odd
            FROM odds_snapshots
            WHERE match_id = ? AND market = '1X2'
            GROUP BY outcome
            """,
            (match_id,),
        )
        bk_odds = {r[0]: r[1] async for r in cur2}
        if bk_odds:
            value_bets = find_value_bets(our, bk_odds)

    return {
        "match_api_id":  match_api_id,
        "match_id":      match_id,
        "rows_upserted": rows_upserted,
        "value_bets":    value_bets,
    }


# ── 3. API-Football (api-sports.io) ──────────────────────────────────────────

_AF_HEADERS = {"x-apisports-key": settings.SPORTS_API_KEY}
_AF_STALENESS_HOURS = 24


def _is_stale(last_synced_iso: str | None) -> bool:
    if not last_synced_iso:
        return True
    try:
        last = datetime.fromisoformat(last_synced_iso)
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        return (_now_utc() - last) > timedelta(hours=_AF_STALENESS_HOURS)
    except ValueError:
        return True


async def sync_advanced_stats(db, team_id: int) -> dict:
    """
    Fetch granular stats (corners, cards, possession, shots) from API-Football.
    Guards against repeated calls: skips if last_synced < 24 h ago.
    `team_id` is our internal DB id (not api_id).
    """
    # Check staleness before spending a request
    cur = await db.execute(
        "SELECT api_id, last_synced FROM team_stats ts "
        "JOIN teams t ON t.id = ts.team_id "
        "WHERE ts.team_id = ? ORDER BY ts.season DESC LIMIT 1",
        (team_id,),
    )
    row = await cur.fetchone()

    if row and not _is_stale(row[1]):
        return {"team_id": team_id, "skipped": True, "reason": "synced < 24 h ago"}

    # Resolve api_id for API-Football
    cur2 = await db.execute("SELECT api_id FROM teams WHERE id = ?", (team_id,))
    team_row = await cur2.fetchone()
    if not team_row or not team_row[0]:
        return {"team_id": team_id, "skipped": True, "reason": "no api_id"}

    api_team_id = team_row[0]
    url    = f"{settings.SPORTS_API_URL}/teams/statistics"
    params = {"league": 1, "season": 2026, "team": api_team_id}

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await _get(client, url, headers=_AF_HEADERS, params=params)

    api_quota["api_football"]["remaining"] = resp.headers.get("x-ratelimit-requests-remaining")
    api_quota["api_football"]["reset"]     = resp.headers.get("x-ratelimit-reset")

    data   = resp.json()
    stats  = data.get("response", {})
    if not stats:
        return {"team_id": team_id, "skipped": True, "reason": "empty response"}

    fixtures = stats.get("fixtures", {})
    played   = fixtures.get("played", {}).get("total") or 0

    goals    = stats.get("goals", {})
    gf       = (goals.get("for", {}).get("average") or {}).get("total") or 0
    ga       = (goals.get("against", {}).get("average") or {}).get("total") or 0

    cards_y  = stats.get("cards", {}).get("yellow", {})
    total_y  = sum(
        v.get("total") or 0
        for v in cards_y.values()
        if isinstance(v, dict)
    )
    yellow_pg = round(total_y / played, 3) if played else 1.8

    # Possession comes as "XX%" string
    poss_str = (stats.get("fixtures", {}) or {})
    poss_raw = stats.get("lineups", [{}])[0].get("percent", "50%") if stats.get("lineups") else "50%"
    try:
        possession = float(str(poss_raw).replace("%", ""))
    except ValueError:
        possession = 50.0

    # Shots
    shots_raw = (stats.get("shots", {}).get("total", {}) or {}).get("average") or 12.0
    try:
        shots_pg = float(shots_raw)
    except (TypeError, ValueError):
        shots_pg = 12.0

    # Corners — API-Football doesn't expose corners/pg directly;
    # approximate from shots (historical ratio ≈ 0.4 corners per shot on target)
    sot_raw  = (stats.get("shots", {}).get("on", {}) or {}).get("average") or 4.5
    try:
        sot_pg   = float(sot_raw)
    except (TypeError, ValueError):
        sot_pg = 4.5
    corners_pg = round(sot_pg * 0.9, 2)  # empirical ratio

    await db.execute(
        """
        INSERT INTO team_stats
            (team_id, season, competition,
             matches_played, goals_scored, goals_conceded,
             corners_pg, yellow_pg, possession_avg, shots_pg,
             attack_strength, defense_weakness, last_synced)
        VALUES (?, 2026, 'WC_KNOCKOUT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(team_id, season, competition) DO UPDATE SET
            matches_played   = excluded.matches_played,
            goals_scored     = excluded.goals_scored,
            goals_conceded   = excluded.goals_conceded,
            corners_pg       = excluded.corners_pg,
            yellow_pg        = excluded.yellow_pg,
            possession_avg   = excluded.possession_avg,
            shots_pg         = excluded.shots_pg,
            attack_strength  = excluded.attack_strength,
            defense_weakness = excluded.defense_weakness,
            last_synced      = excluded.last_synced
        """,
        (
            team_id, played, float(gf), float(ga),
            corners_pg, yellow_pg, possession, shots_pg,
            round(float(gf) / 1.4, 3),
            round(float(ga) / 1.4, 3),
            _now_utc().isoformat(),
        ),
    )
    await db.commit()

    return {
        "team_id":       team_id,
        "api_team_id":   api_team_id,
        "matches_played": played,
        "corners_pg":    corners_pg,
        "yellow_pg":     yellow_pg,
        "possession":    possession,
        "shots_pg":      shots_pg,
    }
