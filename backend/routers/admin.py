"""Admin endpoints — not exposed publicly in production."""

from fastapi import APIRouter, Depends
from backend.database import get_db
from backend.models.ml.train import retrain_from_db

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/retrain")
async def retrain_models(db=Depends(get_db)):
    """Retrain ML corners/cards models from stored prediction history."""
    result = await retrain_from_db(db)
    return result
