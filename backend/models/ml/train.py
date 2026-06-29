"""
ML models for corners and cards prediction.

Corners → XGBoostRegressor  (total corners, then split by possession ratio)
Cards   → RandomForestRegressor (total yellows, split by aggression ratio)

Training data: historical matches joined with team_stats.
Fallback: stat-based estimate when no trained model exists.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import joblib
import numpy as np

logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
_MODEL_DIR = Path(__file__).resolve().parent / "saved"
_CORNERS_PATH = _MODEL_DIR / "corners_xgb.joblib"
_CARDS_PATH = _MODEL_DIR / "cards_rf.joblib"


# ── Feature engineering ───────────────────────────────────────────────────────

FEATURE_NAMES = [
    "home_corners_pg",
    "away_corners_pg",
    "home_shots_pg",
    "away_shots_pg",
    "home_possession",
    "away_possession",
    "home_attack",
    "away_attack",
    "home_defense",
    "away_defense",
    "home_xg",
    "away_xg",
    "xg_diff",
    "is_knockout",
]


def build_features(
    home: dict,
    away: dict,
    is_knockout: bool = False,
) -> np.ndarray:
    """Extract a 1-D feature vector from team_stats dicts."""
    h_corners = float(home.get("corners_pg") or 5.0)
    a_corners = float(away.get("corners_pg") or 5.0)
    h_shots   = float(home.get("shots_pg") or 12.0)
    a_shots   = float(away.get("shots_pg") or 12.0)
    h_poss    = float(home.get("possession_avg") or 50.0)
    a_poss    = float(away.get("possession_avg") or 50.0)
    h_atk     = float(home.get("attack_strength") or 1.0)
    a_atk     = float(away.get("attack_strength") or 1.0)
    h_def     = float(home.get("defense_weakness") or 1.0)
    a_def     = float(away.get("defense_weakness") or 1.0)
    h_xg      = float(home.get("xg_for") or 1.3)
    a_xg      = float(away.get("xg_for") or 1.3)

    return np.array([
        h_corners,
        a_corners,
        h_shots,
        a_shots,
        h_poss,
        a_poss,
        h_atk,
        a_atk,
        h_def,
        a_def,
        h_xg,
        a_xg,
        h_xg - a_xg,          # xg_diff
        float(is_knockout),
    ], dtype=np.float32)


# ── Training ──────────────────────────────────────────────────────────────────

def train_corners_model(X: np.ndarray, y: np.ndarray):
    """
    Fit an XGBoost regressor to predict total corners in a match.
    Returns trained estimator.
    """
    from xgboost import XGBRegressor

    model = XGBRegressor(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X, y)
    return model


def train_cards_model(X: np.ndarray, y: np.ndarray):
    """
    Fit a Random Forest regressor to predict total yellow cards in a match.
    Returns trained estimator.
    """
    from sklearn.ensemble import RandomForestRegressor

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=5,
        min_samples_leaf=3,
        max_features="sqrt",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X, y)
    return model


def save_models(corners_model, cards_model) -> None:
    _MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(corners_model, _CORNERS_PATH)
    joblib.dump(cards_model, _CARDS_PATH)
    logger.info("ML models saved to %s", _MODEL_DIR)


def load_models() -> tuple[Optional[object], Optional[object]]:
    """Return (corners_model, cards_model) or (None, None) if not trained yet."""
    try:
        corners_model = joblib.load(_CORNERS_PATH)
        cards_model   = joblib.load(_CARDS_PATH)
        return corners_model, cards_model
    except FileNotFoundError:
        return None, None


# ── Stat-based fallback ───────────────────────────────────────────────────────

def _stat_corners(home: dict, away: dict) -> tuple[float, float]:
    """Weighted blend of each team's corners-per-game average."""
    h_cpg = float(home.get("corners_pg") or 5.0)
    a_cpg = float(away.get("corners_pg") or 5.0)
    # Home advantage adds ~0.5 corners
    h_pred = round(h_cpg * 0.55 + a_cpg * 0.45 + 0.5, 2)
    a_pred = round(a_cpg * 0.55 + h_cpg * 0.45 - 0.3, 2)
    return max(h_pred, 1.0), max(a_pred, 1.0)


def _stat_cards(home: dict, away: dict) -> tuple[float, float]:
    """Weighted blend of each team's yellow-cards-per-game average."""
    h_ypg = float(home.get("yellow_pg") or 1.8)
    a_ypg = float(away.get("yellow_pg") or 1.8)
    # Away teams tend to receive slightly more yellows
    h_pred = round(h_ypg * 0.9, 2)
    a_pred = round(a_ypg * 1.1, 2)
    return max(h_pred, 0.2), max(a_pred, 0.2)


# ── Inference ─────────────────────────────────────────────────────────────────

def predict_corners(
    home: dict,
    away: dict,
    is_knockout: bool = False,
    model=None,
) -> dict[str, float]:
    """
    Predict home and away corners.
    Falls back to stat-based estimate when no model is provided.
    """
    if model is not None:
        feats = build_features(home, away, is_knockout).reshape(1, -1)
        total = float(np.clip(model.predict(feats)[0], 2.0, 20.0))
        # Split total by possession ratio
        h_poss = float(home.get("possession_avg") or 50.0)
        a_poss = float(away.get("possession_avg") or 50.0)
        total_poss = h_poss + a_poss or 100.0
        h_share = h_poss / total_poss
        h_corners = round(total * h_share + 0.3, 2)   # slight home boost
        a_corners = round(total * (1 - h_share), 2)
        return {"home": max(h_corners, 1.0), "away": max(a_corners, 1.0), "total": round(total, 2)}

    h, a = _stat_corners(home, away)
    return {"home": h, "away": a, "total": round(h + a, 2)}


def predict_cards(
    home: dict,
    away: dict,
    model=None,
) -> dict[str, float]:
    """
    Predict home and away yellow cards.
    Falls back to stat-based estimate when no model is provided.
    """
    if model is not None:
        feats = build_features(home, away).reshape(1, -1)
        total = float(np.clip(model.predict(feats)[0], 0.5, 10.0))
        h_ypg = float(home.get("yellow_pg") or 1.8)
        a_ypg = float(away.get("yellow_pg") or 1.8)
        total_avg = h_ypg + a_ypg or 3.6
        h_yellow = round(total * (h_ypg / total_avg) * 0.9, 2)
        a_yellow = round(total * (a_ypg / total_avg) * 1.1, 2)
        return {"home": max(h_yellow, 0.1), "away": max(a_yellow, 0.1), "total": round(total, 2)}

    h, a = _stat_cards(home, away)
    return {"home": h, "away": a, "total": round(h + a, 2)}


# ── Retraining entry point ─────────────────────────────────────────────────────

async def retrain_from_db(db) -> dict:
    """
    Pull historical match outcomes + team_stats from DB and retrain both models.
    Requires matches with known score_home/score_away and team_stats with
    corners_pg / yellow_pg.

    Returns {"corners_samples": int, "cards_samples": int, "status": str}
    """
    cur = await db.execute(
        """
        SELECT
            m.id, m.stage,
            hs.corners_pg  AS h_corners_pg,
            hs.shots_pg    AS h_shots_pg,
            hs.possession_avg AS h_possession,
            hs.attack_strength AS h_attack,
            hs.defense_weakness AS h_defense,
            hs.xg_for      AS h_xg,
            hs.yellow_pg   AS h_yellow_pg,
            as2.corners_pg AS a_corners_pg,
            as2.shots_pg   AS a_shots_pg,
            as2.possession_avg AS a_possession,
            as2.attack_strength AS a_attack,
            as2.defense_weakness AS a_defense,
            as2.xg_for     AS a_xg,
            as2.yellow_pg  AS a_yellow_pg,
            p.corners_home_pred + p.corners_away_pred AS total_corners,
            p.yellow_home_pred  + p.yellow_away_pred  AS total_yellows
        FROM matches m
        JOIN team_stats hs  ON hs.team_id  = m.home_team_id
        JOIN team_stats as2 ON as2.team_id = m.away_team_id
        JOIN predictions p  ON p.match_id  = m.id
        WHERE p.corners_home_pred IS NOT NULL
          AND p.yellow_home_pred  IS NOT NULL
        """
    )
    rows = await cur.fetchall()

    if len(rows) < 10:
        return {
            "corners_samples": 0,
            "cards_samples": 0,
            "status": f"insufficient data ({len(rows)} rows, need ≥ 10)",
        }

    X_list, y_corners, y_cards = [], [], []
    for row in rows:
        r = dict(row)
        home = {
            "corners_pg": r["h_corners_pg"], "shots_pg": r["h_shots_pg"],
            "possession_avg": r["h_possession"], "attack_strength": r["h_attack"],
            "defense_weakness": r["h_defense"], "xg_for": r["h_xg"],
        }
        away = {
            "corners_pg": r["a_corners_pg"], "shots_pg": r["a_shots_pg"],
            "possession_avg": r["a_possession"], "attack_strength": r["a_attack"],
            "defense_weakness": r["a_defense"], "xg_for": r["a_xg"],
        }
        is_ko = str(r.get("stage", "")).upper() not in ("GS", "GROUP", "GROUP_STAGE", "")
        X_list.append(build_features(home, away, is_ko))
        y_corners.append(float(r["total_corners"] or 10.0))
        y_cards.append(float(r["total_yellows"] or 3.6))

    X = np.vstack(X_list)
    corners_model = train_corners_model(X, np.array(y_corners))
    cards_model   = train_cards_model(X, np.array(y_cards))
    save_models(corners_model, cards_model)

    return {
        "corners_samples": len(y_corners),
        "cards_samples": len(y_cards),
        "status": "ok",
    }
