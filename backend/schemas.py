from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr


class MatchPreview(BaseModel):
    id: int
    home_team: str
    away_team: str
    match_date: str
    stage: Optional[str] = None
    price_usd: float
    is_published: bool
    # Prediction fields (nullable — populated when a prediction exists)
    prob_home: Optional[float] = None
    prob_draw: Optional[float] = None
    prob_away: Optional[float] = None
    prob_over_25: Optional[float] = None
    prob_btts: Optional[float] = None
    prob_extra_time: Optional[float] = None
    # Projected stats from ML model (nullable)
    xg_home: Optional[float] = None
    xg_away: Optional[float] = None
    corners_home_pred: Optional[float] = None
    corners_away_pred: Optional[float] = None
    yellow_home_pred: Optional[float] = None
    yellow_away_pred: Optional[float] = None
    # Real bookmaker odds (nullable — only present when odds are available)
    odds_home: Optional[float] = None
    odds_draw: Optional[float] = None
    odds_away: Optional[float] = None
    odds_source: Optional[str] = None


class PaymentSubmit(BaseModel):
    match_id: int
    op_number: str
    method: Literal["yape", "plin"]
    email: EmailStr


class PaymentVerify(BaseModel):
    op_number: str


class PaymentResponse(BaseModel):
    payment_id: int
    status: str
    token: Optional[str] = None
    expires_at: Optional[str] = None


class PredictionReport(BaseModel):
    id: int
    match_id: int
    home_team: str
    away_team: str
    generated_at: Optional[datetime] = None
    prob_home: Optional[float] = None
    prob_draw: Optional[float] = None
    prob_away: Optional[float] = None
    xg_home: Optional[float] = None
    xg_away: Optional[float] = None
    prob_over_25: Optional[float] = None
    prob_under_25: Optional[float] = None
    prob_over_35: Optional[float] = None
    asian_handicap: Optional[str] = None
    corners_home_pred: Optional[float] = None
    corners_away_pred: Optional[float] = None
    yellow_home_pred: Optional[float] = None
    yellow_away_pred: Optional[float] = None
    prob_extra_time: Optional[float] = None
    prob_penalties: Optional[float] = None
    score_matrix: Optional[str] = None
    combined_probs: Optional[str] = None
    value_bets: Optional[str] = None
