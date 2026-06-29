import json
from datetime import datetime, timezone

import aiosqlite

from backend.models.dixon_coles import DixonColesModel
from backend.models.ml.train import load_models, predict_cards, predict_corners
from backend.models.monte_carlo import simulate
from backend.models.odds_parser import find_value_bets, strip_margin
from backend.models.poisson import PoissonModel

# Load ML models once at import time (None if not yet trained)
_corners_model, _cards_model = load_models()


async def _load_match(match_id: int, db: aiosqlite.Connection) -> dict:
    cur = await db.execute(
        """
        SELECT m.*, ht.name AS home_team, at.name AS away_team
        FROM matches m
        JOIN teams ht ON ht.id = m.home_team_id
        JOIN teams at ON at.id = m.away_team_id
        WHERE m.id = ?
        """,
        (match_id,),
    )
    row = await cur.fetchone()
    if not row:
        raise ValueError(f"Match {match_id} not found")
    return dict(row)


async def _load_team_stats(team_id: int, db: aiosqlite.Connection) -> dict:
    cur = await db.execute(
        """
        SELECT * FROM team_stats
        WHERE team_id = ?
        ORDER BY season DESC LIMIT 1
        """,
        (team_id,),
    )
    row = await cur.fetchone()
    return dict(row) if row else {"team_id": team_id}


async def _load_odds(match_id: int, db: aiosqlite.Connection) -> dict:
    cur = await db.execute(
        """
        SELECT market, outcome, decimal_odd
        FROM odds_snapshots
        WHERE match_id = ?
        ORDER BY captured_at DESC
        """,
        (match_id,),
    )
    rows = await cur.fetchall()
    odds: dict[str, dict[str, float]] = {}
    for row in rows:
        market = row["market"]
        odds.setdefault(market, {})[row["outcome"]] = row["decimal_odd"]
    return odds


def _asian_handicap(prob_home: float, score_matrix) -> dict:
    import numpy as np

    n = score_matrix.shape[0]
    prob_home_by_1 = float(sum(
        score_matrix[i, j]
        for i in range(n) for j in range(n) if i - j >= 1
    ))
    prob_home_by_2 = float(sum(
        score_matrix[i, j]
        for i in range(n) for j in range(n) if i - j >= 2
    ))
    return {
        "-0.5": round(prob_home, 4),
        "+0.5": round(1 - prob_home, 4),
        "-1.5": round(prob_home_by_2, 4),
        "+1.5": round(1 - prob_home_by_2, 4),
    }


async def generate_report(match_id: int, db: aiosqlite.Connection) -> dict:
    db.row_factory = aiosqlite.Row

    match = await _load_match(match_id, db)
    home_stats = await _load_team_stats(match["home_team_id"], db)
    away_stats = await _load_team_stats(match["away_team_id"], db)

    is_knockout = match.get("stage", "").upper() not in ("GS", "GROUP", "GROUP_STAGE", "")

    # --- Dixon-Coles prediction ---
    dc = DixonColesModel()
    lambdas = dc.predict(home_stats, away_stats)
    lambda_h, lambda_a = lambdas["lambda_h"], lambdas["lambda_a"]

    # --- Poisson score matrix ---
    pm = PoissonModel()
    matrix = pm.score_matrix(lambda_h, lambda_a)
    marginals = pm.marginals(matrix)
    xg = pm.expected_goals(lambda_h, lambda_a)
    ou25 = pm.over_under(matrix, 2.5)
    ou35 = pm.over_under(matrix, 3.5)

    # --- Monte Carlo simulation ---
    mc = simulate(lambda_h, lambda_a, n=10_000, is_knockout=is_knockout)

    # Blend Poisson marginals (50%) with MC (50%) for smoother estimates
    prob_home = round((marginals["prob_home"] + mc["prob_home"]) / 2, 4)
    prob_draw = round((marginals["prob_draw"] + mc["prob_draw"]) / 2, 4)
    prob_away = round((marginals["prob_away"] + mc["prob_away"]) / 2, 4)

    # --- ML: corners & cards ---
    corners = predict_corners(home_stats, away_stats, is_knockout, model=_corners_model)
    cards   = predict_cards(home_stats, away_stats, model=_cards_model)

    # --- Asian handicap ---
    asian_hc = _asian_handicap(marginals["prob_home"], matrix)

    # --- Value bets ---
    our_probs_1x2 = {"1": prob_home, "X": prob_draw, "2": prob_away}
    value_bets: list = []
    odds_data = await _load_odds(match_id, db)
    for market, bk_odds in odds_data.items():
        if not bk_odds:
            continue
        if market == "1X2":
            vb = find_value_bets(our_probs_1x2, bk_odds)
        elif market == "OU25":
            our = {"over": round(ou25["prob_over"], 4), "under": round(ou25["prob_under"], 4)}
            vb = find_value_bets(our, bk_odds)
        else:
            continue
        for v in vb:
            v["market"] = market
        value_bets.extend(vb)

    # --- Persist to predictions table ---
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        """
        INSERT INTO predictions
            (match_id, generated_at,
             prob_home, prob_draw, prob_away,
             xg_home, xg_away,
             prob_over_25, prob_under_25, prob_over_35,
             asian_handicap,
             corners_home_pred, corners_away_pred,
             yellow_home_pred, yellow_away_pred,
             prob_extra_time, prob_penalties,
             score_matrix, combined_probs, value_bets)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(match_id) DO UPDATE SET
            generated_at=excluded.generated_at,
            prob_home=excluded.prob_home, prob_draw=excluded.prob_draw, prob_away=excluded.prob_away,
            xg_home=excluded.xg_home, xg_away=excluded.xg_away,
            prob_over_25=excluded.prob_over_25, prob_under_25=excluded.prob_under_25,
            prob_over_35=excluded.prob_over_35,
            asian_handicap=excluded.asian_handicap,
            corners_home_pred=excluded.corners_home_pred,
            corners_away_pred=excluded.corners_away_pred,
            yellow_home_pred=excluded.yellow_home_pred,
            yellow_away_pred=excluded.yellow_away_pred,
            prob_extra_time=excluded.prob_extra_time, prob_penalties=excluded.prob_penalties,
            score_matrix=excluded.score_matrix,
            combined_probs=excluded.combined_probs,
            value_bets=excluded.value_bets
        """,
        (
            match_id, now,
            prob_home, prob_draw, prob_away,
            round(xg["xg_home"], 3), round(xg["xg_away"], 3),
            round(ou25["prob_over"], 4), round(ou25["prob_under"], 4),
            round(ou35["prob_over"], 4),
            json.dumps(asian_hc),
            corners["home"], corners["away"],
            cards["home"], cards["away"],
            round(mc["prob_extra_time"], 4), round(mc["prob_penalties"], 4),
            json.dumps(matrix.tolist()),
            json.dumps(mc),
            json.dumps(value_bets),
        ),
    )
    await db.commit()

    return {
        "match_id":        match_id,
        "home_team":       match["home_team"],
        "away_team":       match["away_team"],
        "xg_home":         round(xg["xg_home"], 3),
        "xg_away":         round(xg["xg_away"], 3),
        "prob_home":       prob_home,
        "prob_draw":       prob_draw,
        "prob_away":       prob_away,
        "prob_over_25":    round(ou25["prob_over"], 4),
        "prob_under_25":   round(ou25["prob_under"], 4),
        "prob_over_35":    round(ou35["prob_over"], 4),
        "asian_handicap":  asian_hc,
        "prob_extra_time": round(mc["prob_extra_time"], 4),
        "prob_penalties":  round(mc["prob_penalties"], 4),
        "prob_btts":       round(mc["prob_btts"], 4),
        "corners":         corners,
        "cards":           cards,
        "score_matrix":    matrix.tolist(),
        "combined_probs":  mc,
        "value_bets":      value_bets,
    }
