"""Mobile money payments through PawaPay (collections / deposits)."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_current_user, get_patient
from app.core.config import settings
from app.db.session import get_db
from app.models.domain import Payment, Visit
from app.models.user import User, utcnow
from app.schemas.requests import DepositCreateRequest
from app.services import pawapay

logger = logging.getLogger("homecare.payments")

router = APIRouter()


def payment_out(payment: Payment) -> dict:
    return {
        "depositId": payment.id,
        "reference": payment.reference,
        "amount": payment.amount,
        "currency": payment.currency,
        "phoneNumber": payment.phone_number,
        "provider": payment.provider,
        "status": payment.status,
        "failureCode": payment.failure_code,
        "failureMessage": payment.failure_message,
        "providerTransactionId": payment.provider_transaction_id,
        "environment": payment.environment,
        "createdAt": payment.created_at.isoformat() if payment.created_at else None,
        "updatedAt": payment.updated_at.isoformat() if payment.updated_at else None,
        "completedAt": payment.completed_at.isoformat() if payment.completed_at else None,
    }


async def _sync_visit(db: AsyncSession, payment: Payment) -> None:
    """Mirror the deposit status onto the visit the payment belongs to."""
    if not payment.reference:
        return
    visit = await db.get(Visit, payment.reference)
    if not visit or visit.patient_id != payment.user_id:
        return
    if payment.status == "COMPLETED":
        visit.payment_status = "completed"
    elif payment.status == "FAILED":
        visit.payment_status = "failed"
    else:
        visit.payment_status = "pending"


def _apply_pawapay_result(payment: Payment, data: dict) -> None:
    payment.status = data.get("status") or payment.status
    failure = data.get("failureReason") or {}
    payment.failure_code = failure.get("failureCode")
    payment.failure_message = failure.get("failureMessage")
    payment.provider_transaction_id = data.get("providerTransactionId") or payment.provider_transaction_id
    if payment.status == "COMPLETED":
        payment.completed_at = utcnow()
        payment.failure_code = None
        payment.failure_message = None


@router.get("/config")
async def payment_config(
    country: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """Enabled mobile money providers, used to render the payment picker."""
    if not pawapay.is_configured():
        return {
            "enabled": False,
            "environment": settings.PAWAPAY_ENVIRONMENT,
            "providers": [],
            "message": "Mobile money is not enabled yet. Add PAWAPAY_API_TOKEN to the server environment.",
        }

    try:
        config = await pawapay.active_config(country)
    except pawapay.PawaPayError as exc:
        return {
            "enabled": True,
            "environment": settings.PAWAPAY_ENVIRONMENT,
            "providers": [],
            "message": exc.message,
        }

    return {
        "enabled": True,
        "environment": settings.PAWAPAY_ENVIRONMENT,
        "companyName": config.get("companyName"),
        "providers": pawapay.flatten_providers(config),
        "message": None,
    }


@router.post("/deposits")
async def create_deposit(
    payload: DepositCreateRequest,
    response: Response,
    patient: User = Depends(get_patient),
    db: AsyncSession = Depends(get_db),
):
    """Initiate a mobile money collection for the signed-in patient."""
    if not pawapay.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PawaPay is not configured yet. Add PAWAPAY_API_TOKEN to backend/.env.",
        )

    amount = payload.amount
    currency = (payload.currency or "").upper() or None
    reference = payload.reference

    if payload.visit_id:
        visit = await db.get(Visit, payload.visit_id)
        if not visit or visit.patient_id != patient.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found.")
        # Amount and currency always come from the visit, never from the client
        amount = float(visit.total_fee)
        currency = visit.currency
        reference = reference or visit.id

    if not amount or not currency:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An amount and currency are required when no visit is referenced.",
        )

    phone_number = pawapay.normalize_msisdn(payload.phone_number)
    # PawaPay needs the full MSISDN (country code, no leading zero)
    if phone_number.startswith("0") or len(phone_number) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enter the mobile money number in international format, e.g. +250 788 123 456.",
        )

    payment = Payment(
        user_id=patient.id,
        reference=reference,
        amount=int(round(amount)),
        currency=currency,
        phone_number=phone_number,
        provider=payload.provider,
        status="CREATED",
        environment=settings.PAWAPAY_ENVIRONMENT,
    )
    # Persist the depositId before calling PawaPay so a lost response is recoverable
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    try:
        result = await pawapay.initiate_deposit(
            deposit_id=payment.id,
            amount=amount,
            currency=currency,
            phone_number=phone_number,
            provider=payload.provider,
            client_reference_id=reference,
            customer_message=payload.customer_message,
            statement_description="HomeCare consult",
        )
    except pawapay.PawaPayError as exc:
        if exc.failure_code == "NOT_CONFIGURED":
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=exc.message)
        if exc.failure_code == "NETWORK_ERROR":
            # Unknown outcome: keep CREATED so the app can poll the status endpoint
            logger.warning("[Payments] Deposit %s outcome unknown: %s", payment.id, exc.message)
            response.status_code = status.HTTP_202_ACCEPTED
            return {**payment_out(payment), "message": exc.message}
        payment.status = "REJECTED"
        payment.failure_code = exc.failure_code
        payment.failure_message = exc.message
        await db.commit()
        await db.refresh(payment)
        response.status_code = status.HTTP_200_OK
        return payment_out(payment)

    _apply_pawapay_result(payment, result)
    await db.commit()
    await db.refresh(payment)
    response.status_code = (
        status.HTTP_201_CREATED if payment.status in {"ACCEPTED", "PROCESSING"} else status.HTTP_200_OK
    )
    return payment_out(payment)


@router.get("/deposits")
async def list_deposits(
    patient: User = Depends(get_patient),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(Payment).where(Payment.user_id == patient.id).order_by(Payment.created_at.desc()).limit(20)
        )
    ).scalars().all()
    return [payment_out(p) for p in rows]


@router.get("/deposits/{deposit_id}")
async def deposit_status(
    deposit_id: str,
    patient: User = Depends(get_patient),
    db: AsyncSession = Depends(get_db),
):
    payment = await db.get(Payment, deposit_id)
    if not payment or payment.user_id != patient.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found.")

    if payment.status not in pawapay.FINAL_STATUSES and pawapay.is_configured():
        try:
            result = await pawapay.check_deposit(payment.id)
        except pawapay.PawaPayError as exc:
            logger.warning("[Payments] Status check failed for %s: %s", payment.id, exc.message)
            return payment_out(payment)

        if result.get("status") == "FOUND":
            _apply_pawapay_result(payment, result.get("data") or {})
        elif result.get("status") == "NOT_FOUND":
            # PawaPay never received it; only then is it safe to call it failed
            payment.status = "FAILED"
            payment.failure_code = "NOT_FOUND"
            payment.failure_message = "PawaPay has no record of this payment."
        await db.commit()
        await _sync_visit(db, payment)
        await db.commit()
        await db.refresh(payment)

    return payment_out(payment)


@router.post("/callback")
async def deposit_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """PawaPay deposit webhook.

    The body is not trusted: the status is re-read from the PawaPay API, so a
    spoofed callback cannot mark a payment as completed.
    """
    try:
        body = await request.json()
    except Exception:
        return {"status": "IGNORED"}

    deposit_id = (body or {}).get("depositId")
    if not deposit_id:
        return {"status": "IGNORED"}

    payment = await db.get(Payment, deposit_id)
    if not payment:
        logger.warning("[Payments] Callback for unknown deposit %s", deposit_id)
        return {"status": "IGNORED"}

    if pawapay.is_configured():
        try:
            result = await pawapay.check_deposit(deposit_id)
            if result.get("status") == "FOUND":
                _apply_pawapay_result(payment, result.get("data") or {})
                await db.commit()
                await _sync_visit(db, payment)
                await db.commit()
        except pawapay.PawaPayError as exc:
            logger.error("[Payments] Callback verification failed for %s: %s", deposit_id, exc.message)

    return {"status": "ACCEPTED"}
