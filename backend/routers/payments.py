from datetime import datetime, timedelta, timezone

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, status

from backend.auth import generate_token
from backend.database import get_db
from backend.schemas import PaymentResponse, PaymentSubmit, PaymentVerify

router = APIRouter()

TOKEN_TTL_HOURS = 48


async def _get_or_create_user(email: str, db: aiosqlite.Connection) -> int:
    cursor = await db.execute("SELECT id FROM users WHERE email = ?", (email,))
    row = await cursor.fetchone()
    if row:
        return row["id"]
    cursor = await db.execute(
        "INSERT INTO users (email) VALUES (?)",
        (email,),
    )
    await db.commit()
    return cursor.lastrowid


@router.post("/submit", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def submit_payment(
    body: PaymentSubmit,
    db: aiosqlite.Connection = Depends(get_db),
):
    # Verify match exists and is published
    cursor = await db.execute(
        "SELECT id, price_usd FROM matches WHERE id = ? AND is_published = 1",
        (body.match_id,),
    )
    match = await cursor.fetchone()
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found or not published",
        )

    # Reject duplicate operation numbers
    cursor = await db.execute(
        "SELECT id FROM payments WHERE op_number = ?",
        (body.op_number,),
    )
    if await cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Operation number already registered",
        )

    user_id = await _get_or_create_user(body.email, db)

    cursor = await db.execute(
        """
        INSERT INTO payments (user_id, match_id, op_number, method, amount, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
        """,
        (user_id, body.match_id, body.op_number, body.method, match["price_usd"]),
    )
    await db.commit()
    payment_id = cursor.lastrowid

    return PaymentResponse(payment_id=payment_id, status="pending")


@router.post("/verify", response_model=PaymentResponse)
async def verify_payment(
    body: PaymentVerify,
    db: aiosqlite.Connection = Depends(get_db),
):
    # 1. Find payment by op_number
    cursor = await db.execute(
        "SELECT id, status FROM payments WHERE op_number = ?",
        (body.op_number,),
    )
    payment = await cursor.fetchone()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    payment_id = payment["id"]
    pmt_status = payment["status"]

    # 2. Rejected → 400
    if pmt_status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment was rejected",
        )

    # 3. Already verified → return existing token
    if pmt_status == "verified":
        cursor = await db.execute(
            """
            SELECT token, expires_at FROM access_tokens
            WHERE payment_id = ?
            ORDER BY created_at DESC LIMIT 1
            """,
            (payment_id,),
        )
        row = await cursor.fetchone()
        return PaymentResponse(
            payment_id=payment_id,
            status="verified",
            token=row["token"] if row else None,
            expires_at=row["expires_at"] if row else None,
        )

    # 4. Pending → verify, generate token, return it
    if pmt_status == "pending":
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=TOKEN_TTL_HOURS)
        token = generate_token()

        await db.execute(
            "UPDATE payments SET status = 'verified', verified_at = ? WHERE id = ?",
            (now.isoformat(), payment_id),
        )
        await db.execute(
            "INSERT INTO access_tokens (payment_id, token, expires_at) VALUES (?, ?, ?)",
            (payment_id, token, expires_at.isoformat()),
        )
        await db.commit()

        return PaymentResponse(
            payment_id=payment_id,
            status="verified",
            token=token,
            expires_at=expires_at.isoformat(),
        )

    # 5. Unknown status
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Payment status '{pmt_status}' cannot be verified",
    )
