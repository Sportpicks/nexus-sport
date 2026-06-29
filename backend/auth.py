import uuid
from datetime import datetime, timezone
from typing import Optional

import aiosqlite
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.database import get_db

bearer_scheme = HTTPBearer(auto_error=False)


def generate_token() -> str:
    return str(uuid.uuid4())


async def verify_token(
    token: str,
    db: aiosqlite.Connection,
) -> Optional[dict]:
    cursor = await db.execute(
        "SELECT * FROM access_tokens WHERE token = ? AND expires_at > ?",
        (token, datetime.now(timezone.utc).isoformat()),
    )
    row = await cursor.fetchone()
    return dict(row) if row else None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = await verify_token(credentials.credentials, db)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return token_data
