"""PawaPay Merchant API v2 client — mobile money collections (deposits).

Docs: https://docs.pawapay.io/v2/api-reference/deposits/initiate-deposit
Never call this from the mobile app: the Bearer token must stay on the server.
"""
import logging
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger("homecare.pawapay")

SANDBOX_BASE_URL = "https://api.sandbox.pawapay.io"
PRODUCTION_BASE_URL = "https://api.pawapay.io"

# Statuses PawaPay can return for a deposit
FINAL_STATUSES = {"COMPLETED", "FAILED"}
PENDING_STATUSES = {"CREATED", "ACCEPTED", "PROCESSING", "IN_RECONCILIATION"}


class PawaPayError(Exception):
    """A failure we can explain to the client."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int = 502,
        failure_code: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.failure_code = failure_code


def is_configured() -> bool:
    return bool(settings.PAWAPAY_API_TOKEN)


def base_url() -> str:
    if settings.PAWAPAY_BASE_URL:
        return settings.PAWAPAY_BASE_URL.rstrip("/")
    return PRODUCTION_BASE_URL if settings.PAWAPAY_ENVIRONMENT == "production" else SANDBOX_BASE_URL


def normalize_msisdn(phone: str, prefix: Optional[str] = None) -> str:
    """Return the MSISDN form PawaPay expects, e.g. 0788 123 456 -> 250788123456."""
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if digits.startswith("00"):
        digits = digits[2:]
    if prefix:
        country = "".join(ch for ch in prefix if ch.isdigit())
        if country:
            if digits.startswith("0"):
                digits = country + digits.lstrip("0")
            elif not digits.startswith(country) and len(digits) <= 9:
                digits = country + digits
    return digits


def format_amount(amount: float) -> str:
    """PawaPay takes amounts as strings; whole numbers must not carry decimals."""
    if float(amount).is_integer():
        return str(int(amount))
    return f"{amount:.2f}"


async def _request(method: str, path: str, payload: Optional[dict] = None) -> Any:
    if not is_configured():
        raise PawaPayError(
            "PawaPay is not configured yet. Add PAWAPAY_API_TOKEN to backend/.env.",
            status_code=503,
            failure_code="NOT_CONFIGURED",
        )

    url = f"{base_url()}{path}"
    headers = {
        "Authorization": f"Bearer {settings.PAWAPAY_API_TOKEN}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.request(method, url, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        logger.error("[PawaPay] %s %s failed: %s", method, path, exc)
        raise PawaPayError(
            "Could not reach PawaPay. Check the connection and try again.",
            status_code=502,
            failure_code="NETWORK_ERROR",
        ) from exc

    try:
        body = response.json()
    except ValueError:
        body = {}

    if response.status_code >= 400:
        reason = body.get("failureReason") or {}
        message = (
            reason.get("failureMessage")
            or body.get("message")
            or f"PawaPay returned HTTP {response.status_code}."
        )
        logger.error("[PawaPay] %s %s -> %s: %s", method, path, response.status_code, message)
        raise PawaPayError(
            message,
            status_code=502 if response.status_code >= 500 else 400,
            failure_code=reason.get("failureCode"),
        )

    return body


async def initiate_deposit(
    *,
    deposit_id: str,
    amount: float,
    currency: str,
    phone_number: str,
    provider: str,
    client_reference_id: Optional[str] = None,
    customer_message: Optional[str] = None,
    statement_description: Optional[str] = None,
) -> dict:
    """Ask PawaPay to collect money from a mobile wallet."""
    payer = {
        "type": "MMO",
        "accountDetails": {
            "phoneNumber": phone_number,
            "provider": provider,
        },
    }
    body: dict[str, Any] = {
        "depositId": deposit_id,
        "amount": format_amount(amount),
        "currency": currency.upper(),
        "payer": payer,
    }
    if client_reference_id:
        body["clientReferenceId"] = client_reference_id[:64]
    if customer_message:
        body["customerMessage"] = customer_message[:64]
    if statement_description:
        body["statementDescription"] = statement_description[:22]

    return await _request("POST", "/v2/deposits", body)


async def check_deposit(deposit_id: str) -> dict:
    """Return {'status': 'FOUND', 'data': {...}} or {'status': 'NOT_FOUND'}."""
    return await _request("GET", f"/v2/deposits/{deposit_id}")


async def predict_provider(phone_number: str) -> dict:
    return await _request("POST", "/v2/predict-provider", {"phoneNumber": phone_number})


async def active_config(country: Optional[str] = None, operation_type: str = "DEPOSIT") -> dict:
    query = f"?operationType={operation_type}"
    if country:
        query += f"&country={country.upper()}"
    return await _request("GET", f"/v2/active-conf{query}")


def flatten_providers(config: dict) -> list[dict]:
    """Turn the active-conf payload into one flat entry per country/provider/currency."""
    entries: list[dict] = []
    for country in config.get("countries") or []:
        prefix = country.get("prefix")
        for provider in country.get("providers") or []:
            for currency in provider.get("currencies") or []:
                deposit = (currency.get("operationTypes") or {}).get("DEPOSIT") or {}
                entries.append(
                    {
                        "country": country.get("country"),
                        "prefix": prefix,
                        "provider": provider.get("provider"),
                        "displayName": provider.get("displayName") or provider.get("provider"),
                        "currency": currency.get("currency"),
                        "minAmount": deposit.get("minAmount"),
                        "maxAmount": deposit.get("maxAmount"),
                        "decimalsInAmount": deposit.get("decimalsInAmount"),
                        "status": deposit.get("status") or "UNKNOWN",
                    }
                )
    return entries
