def strip_margin(odds_dict: dict[str, float]) -> dict[str, float]:
    raw = {outcome: 1.0 / odd for outcome, odd in odds_dict.items() if odd > 0}
    total = sum(raw.values())
    if total == 0:
        return {}
    return {outcome: prob / total for outcome, prob in raw.items()}


def value_edge(our_prob: float, decimal_odd: float) -> float:
    return our_prob * decimal_odd - 1.0


def find_value_bets(
    our_probs: dict[str, float],
    bookmaker_odds: dict[str, float],
    min_edge: float = 0.05,
) -> list[dict]:
    value_bets = []
    for outcome, odd in bookmaker_odds.items():
        if outcome not in our_probs or odd <= 0:
            continue
        edge = value_edge(our_probs[outcome], odd)
        if edge > min_edge:
            value_bets.append({
                "outcome": outcome,
                "our_prob": round(our_probs[outcome], 4),
                "bookmaker_odd": odd,
                "edge": round(edge, 4),
            })
    return sorted(value_bets, key=lambda x: x["edge"], reverse=True)
