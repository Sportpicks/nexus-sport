import numpy as np


def simulate(
    lambda_h: float,
    lambda_a: float,
    n: int = 10_000,
    is_knockout: bool = True,
) -> dict:
    rng = np.random.default_rng()

    home_goals = rng.poisson(lambda_h, n)
    away_goals = rng.poisson(lambda_a, n)

    home_wins = home_goals > away_goals
    draws      = home_goals == away_goals
    away_wins  = home_goals < away_goals

    total_goals = home_goals + away_goals
    over_25 = total_goals > 2.5
    over_35 = total_goals > 3.5
    btts    = (home_goals > 0) & (away_goals > 0)

    if is_knockout:
        draw_mask = draws.copy()
        n_draws   = int(draw_mask.sum())

        if n_draws > 0:
            # Extra time: 30 min extra ~ 1/3 of 90-min rate
            et_lambda_h = lambda_h * (30 / 90)
            et_lambda_a = lambda_a * (30 / 90)

            et_home = rng.poisson(et_lambda_h, n_draws)
            et_away = rng.poisson(et_lambda_a, n_draws)

            et_home_win = et_home > et_away
            et_away_win = et_home < et_away
            et_draw     = et_home == et_away

            # Penalties: slight edge to whichever team scored more in ET
            pen_home_win = rng.random(int(et_draw.sum())) < 0.5

            draw_indices = np.where(draw_mask)[0]
            et_draw_indices = draw_indices[et_draw]

            home_wins[draw_indices[et_home_win]] = True
            away_wins[draw_indices[et_away_win]] = True
            home_wins[et_draw_indices[pen_home_win]]  = True
            away_wins[et_draw_indices[~pen_home_win]] = True
            draws[:] = False

        prob_extra_time = float(n_draws / n)
        # Penalty subset: those extra-time draws
        et_draw_count = int(et_draw.sum()) if n_draws > 0 else 0
        prob_penalties = float(et_draw_count / n)
    else:
        prob_extra_time = 0.0
        prob_penalties  = 0.0

    return {
        "prob_home":       float(home_wins.sum() / n),
        "prob_draw":       float(draws.sum() / n),
        "prob_away":       float(away_wins.sum() / n),
        "prob_over_25":    float(over_25.sum() / n),
        "prob_under_25":   float((~over_25).sum() / n),
        "prob_over_35":    float(over_35.sum() / n),
        "prob_btts":       float(btts.sum() / n),
        "prob_extra_time": prob_extra_time,
        "prob_penalties":  prob_penalties,
    }
