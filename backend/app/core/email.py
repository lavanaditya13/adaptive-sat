from __future__ import annotations

from typing import Any

import resend
from resend.exceptions import ResendError

from app.core.config import settings

DEFAULT_FROM_EMAIL = "Adaptive SAT <onboarding@resend.dev>"


class EmailConfigurationError(RuntimeError):
    """Raised when transactional email cannot be sent because config is missing."""


class EmailSendError(RuntimeError):
    """Raised when Resend rejects or fails to deliver a message."""


def send_email(
    to: str | list[str],
    subject: str,
    html: str,
    *,
    from_email: str = DEFAULT_FROM_EMAIL,
) -> Any:
    api_key = (settings.RESEND_API_KEY or "").strip()

    if not api_key:
        raise EmailConfigurationError(
            "RESEND_API_KEY is not configured. Set it before sending email."
        )

    resend.api_key = api_key

    try:
        return resend.Emails.send(
            {
                "from": from_email,
                "to": to,
                "subject": subject,
                "html": html,
            }
        )
    except ResendError as exc:
        raise EmailSendError(
            f"Failed to send email via Resend: {exc.message}"
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise EmailSendError(
            f"Failed to send email via Resend: {exc}"
        ) from exc