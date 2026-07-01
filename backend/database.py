import os
from pathlib import Path
from typing import AsyncGenerator

import aiosqlite

_DEFAULT_DB = Path(__file__).resolve().parent.parent / "db" / "nexus.db"
DB_PATH = Path(os.environ.get("DATABASE_URL", str(_DEFAULT_DB)))

DDL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS teams (
        id          INTEGER PRIMARY KEY,
        api_id      INTEGER UNIQUE,
        name        TEXT NOT NULL,
        country     TEXT,
        logo_url    TEXT,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS team_stats (
        id               INTEGER PRIMARY KEY,
        team_id          INTEGER REFERENCES teams(id),
        season           INTEGER,
        competition      TEXT,
        matches_played   INTEGER DEFAULT 0,
        goals_scored     REAL DEFAULT 0,
        goals_conceded   REAL DEFAULT 0,
        xg_for           REAL DEFAULT 0,
        xg_against       REAL DEFAULT 0,
        shots_pg         REAL DEFAULT 0,
        corners_pg       REAL DEFAULT 0,
        yellow_pg        REAL DEFAULT 0,
        red_pg           REAL DEFAULT 0,
        possession_avg   REAL DEFAULT 0,
        attack_strength  REAL DEFAULT 1.0,
        defense_weakness REAL DEFAULT 1.0,
        last_synced      TIMESTAMP,
        UNIQUE(team_id, season, competition)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS matches (
        id            INTEGER PRIMARY KEY,
        api_match_id  INTEGER UNIQUE,
        home_team_id  INTEGER REFERENCES teams(id),
        away_team_id  INTEGER REFERENCES teams(id),
        match_date    TIMESTAMP NOT NULL,
        stage         TEXT,
        venue         TEXT,
        status        TEXT DEFAULT 'scheduled',
        score_home    INTEGER,
        score_away    INTEGER,
        price_usd     REAL NOT NULL DEFAULT 3.00,
        is_published  INTEGER DEFAULT 0,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS predictions (
        id                 INTEGER PRIMARY KEY,
        match_id           INTEGER REFERENCES matches(id) UNIQUE,
        generated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        prob_home          REAL,
        prob_draw          REAL,
        prob_away          REAL,
        xg_home            REAL,
        xg_away            REAL,
        prob_over_25       REAL,
        prob_under_25      REAL,
        prob_over_35       REAL,
        asian_handicap     TEXT,
        corners_home_pred  REAL,
        corners_away_pred  REAL,
        yellow_home_pred   REAL,
        yellow_away_pred   REAL,
        prob_extra_time    REAL,
        prob_penalties     REAL,
        score_matrix       TEXT,
        combined_probs     TEXT,
        value_bets         TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS odds_snapshots (
        id           INTEGER PRIMARY KEY,
        match_id     INTEGER REFERENCES matches(id),
        bookmaker    TEXT,
        market       TEXT,
        outcome      TEXT,
        decimal_odd  REAL,
        captured_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY,
        email       TEXT UNIQUE NOT NULL,
        phone       TEXT,
        is_admin    INTEGER DEFAULT 0,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login  TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS payments (
        id          INTEGER PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id),
        match_id    INTEGER REFERENCES matches(id),
        op_number   TEXT UNIQUE NOT NULL,
        method      TEXT NOT NULL,
        amount      REAL NOT NULL,
        status      TEXT DEFAULT 'pending',
        verified_at TIMESTAMP,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS access_tokens (
        id          INTEGER PRIMARY KEY,
        payment_id  INTEGER REFERENCES payments(id),
        token       TEXT UNIQUE NOT NULL,
        expires_at  TIMESTAMP NOT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
]


async def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")
        for statement in DDL_STATEMENTS:
            await db.execute(statement)
        await db.commit()


async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")
        yield db
