"""Transactional email delivery over SMTP (Gmail by default).

Only one kind of message is sent today: the one-time verification / password
reset code.  Sending is blocking, so it runs in a worker thread and never
takes the request down with it — a failed delivery is logged and reported to
the caller instead of raising.
"""
import asyncio
import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("homecare.mail")

SMTP_TIMEOUT_SECONDS = 20


def _send_sync(message: EmailMessage) -> None:
    password = settings.SMTP_PASS.replace(" ", "")
    context = ssl.create_default_context()

    if settings.SMTP_PORT == 465:
        with smtplib.SMTP_SSL(
            settings.SMTP_HOST, settings.SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS, context=context
        ) as smtp:
            smtp.login(settings.SMTP_USER, password)
            smtp.send_message(message)
        return

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS) as smtp:
        smtp.ehlo()
        if settings.SMTP_STARTTLS:
            smtp.starttls(context=context)
            smtp.ehlo()
        smtp.login(settings.SMTP_USER, password)
        smtp.send_message(message)


async def send_email(to: str, subject: str, text: str, html: str | None = None) -> bool:
    """Send one message. Returns True when the SMTP server accepted it."""
    if not to:
        logger.warning("[Mail] Skipped '%s': no recipient address.", subject)
        return False
    if not settings.smtp_configured:
        logger.warning("[Mail] Skipped '%s': SMTP is not configured.", subject)
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM or settings.SMTP_USER
    message["To"] = to
    message.set_content(text)
    if html:
        message.add_alternative(html, subtype="html")

    try:
        await asyncio.wait_for(asyncio.to_thread(_send_sync, message), timeout=SMTP_TIMEOUT_SECONDS + 10)
        logger.info("[Mail] Sent '%s' to %s", subject, to)
        return True
    except Exception as exc:  # network, auth, quota — never break the request
        logger.error("[Mail] Failed to send '%s' to %s: %s", subject, to, exc)
        return False


def otp_email(code: str, purpose: str) -> tuple[str, str, str]:
    """Return (subject, text, html) for a one-time code message."""
    is_verify = purpose == "verify"
    action = "verify your email address" if is_verify else "reset your password"
    minutes = settings.OTP_EXPIRE_MINUTES
    subject = (
        "Your HomeCare verification code"
        if is_verify
        else "Your HomeCare password reset code"
    )

    text = (
        f"Your HomeCare one-time code is {code}.\n\n"
        f"Use it to {action}. The code expires in {minutes} minutes and can only be used once.\n\n"
        "If you did not request this code, you can safely ignore this email."
    )

    html = f"""\
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#F4F7FB;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#0F766E;font-weight:700;">HomeCare</p>
        <h1 style="margin:0 0 12px;font-size:22px;color:#0F172A;">Confirm your identity</h1>
        <p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#475569;">
          Use the one-time code below to {action}. It expires in {minutes} minutes and can only be used once.
        </p>
        <p style="margin:0 0 20px;padding:18px 0;text-align:center;background:#F0FDFA;border:1px solid #CCFBF1;border-radius:12px;font-size:34px;letter-spacing:10px;font-weight:800;color:#0F172A;">{code}</p>
        <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#64748B;">
          Never share this code. HomeCare staff will not ask you for it.
        </p>
        <p style="margin:0;font-size:13px;line-height:20px;color:#64748B;">
          If you did not request this code, you can safely ignore this email.
        </p>
      </td></tr>
    </table>
  </body>
</html>"""
    return subject, text, html
