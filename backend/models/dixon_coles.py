import math
from datetime import datetime, timezone
from typing import Any

import numpy as np
from scipy.optimize import minimize

_DEFAULT_PARAMS = {
    "attack":  {},   # team_id -> float
    "defense": {},
    "gamma":   0.25,
    "rho":    -0.13,
}


class DixonColesModel:

    def __init__(self):
        self.attack: dict[Any, float] = {}
        self.defense: dict[Any, float] = {}
        self.gamma: float = 0.25
        self.rho: float = -0.13
        self._fitted = False

    # --- Corrections & weights ---

    def rho_correction(
        self,
        home_goals: int,
        away_goals: int,
        lambda_h: float,
        lambda_a: float,
        rho: float,
    ) -> float:
        if home_goals == 0 and away_goals == 0:
            return 1 - lambda_h * lambda_a * rho
        if home_goals == 1 and away_goals == 0:
            return 1 + lambda_a * rho
        if home_goals == 0 and away_goals == 1:
            return 1 + lambda_h * rho
        if home_goals == 1 and away_goals == 1:
            return 1 - rho
        return 1.0

    def time_weight(self, match_date: datetime, xi: float = 0.0065) -> float:
        now = datetime.now(timezone.utc)
        if match_date.tzinfo is None:
            match_date = match_date.replace(tzinfo=timezone.utc)
        days_ago = max((now - match_date).days, 0)
        return math.exp(-xi * days_ago)

    # --- Fitting ---

    def fit(self, matches_list: list[dict]) -> None:
        if len(matches_list) < 5:
            self._fitted = False
            return

        team_ids = list(
            {m["home_id"] for m in matches_list} | {m["away_id"] for m in matches_list}
        )
        team_idx = {tid: i for i, tid in enumerate(team_ids)}
        n_teams = len(team_ids)

        weights = []
        for m in matches_list:
            d = m.get("date")
            if isinstance(d, str):
                d = datetime.fromisoformat(d)
            weights.append(self.time_weight(d) if d else 1.0)

        def neg_log_likelihood(params):
            attacks  = params[:n_teams]
            defenses = params[n_teams : 2 * n_teams]
            gamma    = params[-2]
            rho      = params[-1]
            ll = 0.0
            for m, w in zip(matches_list, weights):
                hi = team_idx[m["home_id"]]
                ai = team_idx[m["away_id"]]
                lh = math.exp(attacks[hi] + defenses[ai] + gamma)
                la = math.exp(attacks[ai] + defenses[hi])
                hg, ag = int(m["home_goals"]), int(m["away_goals"])
                from scipy.stats import poisson as _p
                tau = self.rho_correction(hg, ag, lh, la, rho)
                if tau <= 0:
                    return 1e9
                ll += w * (
                    _p.logpmf(hg, lh) + _p.logpmf(ag, la) + math.log(tau + 1e-10)
                )
            return -ll

        x0 = np.zeros(n_teams * 2 + 2)
        x0[-2] = 0.25   # gamma
        x0[-1] = -0.13  # rho

        bounds = (
            [(-3, 3)] * n_teams      # attacks
            + [(-3, 3)] * n_teams    # defenses
            + [(0, 1), (-0.5, 0)]    # gamma, rho
        )

        result = minimize(neg_log_likelihood, x0, method="L-BFGS-B", bounds=bounds)

        params = result.x
        for tid, i in team_idx.items():
            self.attack[tid]  = float(params[i])
            self.defense[tid] = float(params[n_teams + i])
        self.gamma = float(params[-2])
        self.rho   = float(params[-1])
        self._fitted = True

    # --- Prediction ---

    def predict(self, home_stats: dict, away_stats: dict) -> dict:
        home_id = home_stats.get("team_id")
        away_id = away_stats.get("team_id")

        if self._fitted and home_id in self.attack and away_id in self.attack:
            lh = math.exp(self.attack[home_id] + self.defense[away_id] + self.gamma)
            la = math.exp(self.attack[away_id] + self.defense[home_id])
        else:
            # Fall back to stats-based estimates
            lh = home_stats.get("attack_strength", 1.0) / away_stats.get("defense_weakness", 1.0) * self.gamma
            la = away_stats.get("attack_strength", 1.0) / home_stats.get("defense_weakness", 1.0)
            # Use xg_for when available for better calibration
            if home_stats.get("xg_for"):
                lh = (home_stats["xg_for"] * home_stats.get("attack_strength", 1.0)
                      / away_stats.get("defense_weakness", 1.0))
            if away_stats.get("xg_for"):
                la = (away_stats["xg_for"] * away_stats.get("attack_strength", 1.0)
                      / home_stats.get("defense_weakness", 1.0))
            lh *= (1 + self.gamma)  # home advantage

        return {"lambda_h": max(lh, 0.1), "lambda_a": max(la, 0.1)}
