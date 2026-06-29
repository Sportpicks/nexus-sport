import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import aiosqlite
from backend.database import DB_PATH, init_db

TEAMS = [
    (1, "Brasil",    "Brazil",  "https://media.api-sports.io/football/teams/6.png"),
    (2, "Argentina", "Argentina","https://media.api-sports.io/football/teams/26.png"),
    (3, "Francia",   "France",  "https://media.api-sports.io/football/teams/2.png"),
    (4, "Alemania",  "Germany", "https://media.api-sports.io/football/teams/25.png"),
]

TEAM_STATS = [
    # (api_id, goals_scored, goals_conceded, xg_for, xg_against, shots_pg, corners_pg, yellow_pg, red_pg, possession_avg, attack_strength, defense_weakness)
    (1, 2.4, 0.8, 2.1, 0.9, 16.2, 6.5, 1.8, 0.1, 58.3, 1.35, 0.72),
    (2, 2.2, 1.0, 2.0, 1.1, 15.8, 5.8, 2.1, 0.2, 55.7, 1.28, 0.80),
    (3, 1.9, 0.9, 1.7, 1.0, 14.5, 5.2, 1.5, 0.1, 56.4, 1.18, 0.78),
    (4, 1.6, 1.1, 1.4, 1.2, 13.9, 4.6, 2.5, 0.3, 53.1, 1.05, 0.88),
]

# (home api_id, away api_id, date, stage, price)
MATCHES_DEF = [
    (1, 2, "2026-07-05 20:00:00", "QF", 5.00),
    (3, 4, "2026-07-06 20:00:00", "QF", 5.00),
    (1, 3, "2026-07-09 20:00:00", "QF", 5.00),
]


async def seed():
    await init_db()

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys=ON")

        # Teams
        await db.executemany(
            "INSERT OR IGNORE INTO teams (api_id, name, country, logo_url) VALUES (?,?,?,?)",
            TEAMS,
        )

        # Team stats (need internal team ids)
        for api_id, gs, gc, xgf, xga, spg, cpg, ypg, rpg, poss, atk, dfw in TEAM_STATS:
            cur = await db.execute("SELECT id FROM teams WHERE api_id=?", (api_id,))
            row = await cur.fetchone()
            team_id = row["id"]
            await db.execute(
                """
                INSERT OR IGNORE INTO team_stats
                    (team_id, season, competition,
                     goals_scored, goals_conceded,
                     xg_for, xg_against,
                     shots_pg, corners_pg, yellow_pg, red_pg,
                     possession_avg, attack_strength, defense_weakness)
                VALUES (?,2026,'WC_KNOCKOUT',?,?,?,?,?,?,?,?,?,?,?)
                """,
                (team_id, gs, gc, xgf, xga, spg, cpg, ypg, rpg, poss, atk, dfw),
            )

        # Matches
        for home_api, away_api, date, stage, price in MATCHES_DEF:
            cur = await db.execute("SELECT id FROM teams WHERE api_id=?", (home_api,))
            home_id = (await cur.fetchone())["id"]
            cur = await db.execute("SELECT id FROM teams WHERE api_id=?", (away_api,))
            away_id = (await cur.fetchone())["id"]
            await db.execute(
                """
                INSERT OR IGNORE INTO matches
                    (home_team_id, away_team_id, match_date, stage, price_usd, is_published)
                VALUES (?,?,?,?,?,1)
                """,
                (home_id, away_id, date, stage, price),
            )

        # Admin user
        await db.execute(
            "INSERT OR IGNORE INTO users (email, is_admin) VALUES ('admin@nexussport.com', 1)"
        )

        await db.commit()

        # Report
        print("\n=== Seed completado ===")
        for table in ("teams", "team_stats", "matches", "predictions",
                      "odds_snapshots", "users", "payments", "access_tokens"):
            cur = await db.execute(f"SELECT COUNT(*) AS n FROM {table}")
            n = (await cur.fetchone())["n"]
            print(f"  {table:<20} {n:>3} registro(s)")


if __name__ == "__main__":
    asyncio.run(seed())
