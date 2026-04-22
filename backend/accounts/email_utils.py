import logging
import smtplib

from django.conf import settings
from django.core.mail import EmailMessage, get_connection


logger = logging.getLogger("accounts.email")


class EmailDeliveryError(Exception):
    pass


def _use_smtp_backend():
    return settings.EMAIL_BACKEND == "django.core.mail.backends.smtp.EmailBackend"


def _normalize_smtp_username(value):
    return (value or "").strip()


def _normalize_smtp_password(value):
    return (value or "").strip()


def _missing_smtp_settings():
    missing = []
    if not _normalize_smtp_username(settings.EMAIL_HOST_USER):
        missing.append("EMAIL_HOST_USER")
    if not _normalize_smtp_password(settings.EMAIL_HOST_PASSWORD):
        missing.append("EMAIL_HOST_PASSWORD")
    if not settings.DEFAULT_FROM_EMAIL:
        missing.append("DEFAULT_FROM_EMAIL")
    return missing


def _get_email_connection():
    if not _use_smtp_backend():
        return get_connection(
            backend=settings.EMAIL_BACKEND,
            fail_silently=False,
        )

    missing = _missing_smtp_settings()
    if missing:
        logger.warning(
            "SMTP email configuration is incomplete. Missing: %s",
            ", ".join(missing),
        )
        raise EmailDeliveryError(
            "Email delivery is unavailable because the SMTP configuration is incomplete."
        )

    return get_connection(
        backend=settings.EMAIL_BACKEND,
        host=settings.EMAIL_HOST,
        port=settings.EMAIL_PORT,
        username=_normalize_smtp_username(settings.EMAIL_HOST_USER),
        password=_normalize_smtp_password(settings.EMAIL_HOST_PASSWORD),
        use_tls=settings.EMAIL_USE_TLS,
        fail_silently=False,
    )


def send_plain_text_email(subject, message, recipient_list, from_email=None):
    try:
        connection = _get_email_connection()
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=(from_email or settings.DEFAULT_FROM_EMAIL).strip(),
            to=recipient_list,
            connection=connection,
        )
        return email.send(fail_silently=False)
    except (smtplib.SMTPException, OSError, ValueError) as exc:
        logger.exception(
            "Email delivery failed using backend=%s host=%s sender=%s recipients=%s",
            settings.EMAIL_BACKEND,
            settings.EMAIL_HOST,
            from_email or settings.DEFAULT_FROM_EMAIL,
            recipient_list,
        )
        raise EmailDeliveryError(
            "Email delivery is unavailable right now."
        ) from exc
