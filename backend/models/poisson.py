import numpy as np
from scipy.stats import poisson


class PoissonModel:

    def score_matrix(self, lambda_h: float, lambda_a: float, max_goals: int = 6) -> np.ndarray:
        goals = np.arange(max_goals + 1)
        home_probs = poisson.pmf(goals, lambda_h)
        away_probs = poisson.pmf(goals, lambda_a)
        return np.outer(home_probs, away_probs)

    def marginals(self, matrix: np.ndarray) -> dict:
        prob_home = float(np.sum(np.tril(matrix, -1)))
        prob_draw = float(np.sum(np.diag(matrix)))
        prob_away = float(np.sum(np.triu(matrix, 1)))
        return {"prob_home": prob_home, "prob_draw": prob_draw, "prob_away": prob_away}

    def expected_goals(self, lambda_h: float, lambda_a: float) -> dict:
        return {"xg_home": lambda_h, "xg_away": lambda_a}

    def over_under(self, matrix: np.ndarray, threshold: float = 2.5) -> dict:
        n = matrix.shape[0]
        prob_over = 0.0
        for i in range(n):
            for j in range(n):
                if i + j > threshold:
                    prob_over += matrix[i, j]
        return {"prob_over": float(prob_over), "prob_under": float(1.0 - prob_over)}
