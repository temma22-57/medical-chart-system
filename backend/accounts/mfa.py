import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

from .email_utils import EmailDeliveryError, send_plain_text_email
from .models import AccountProfile, MfaLoginChallenge


EMAIL_METHOD = MfaLoginChallenge.METHOD_EMAIL

MFA_CODE_TTL_MINUTES = getattr(settings, "MFA_CODE_TTL_MINUTES", 10)
MFA_RESEND_THROTTLE_SECONDS = getattr(settings, "MFA_RESEND_THROTTLE_SECONDS", 30)
MFA_MAX_FAILED_ATTEMPTS = getattr(settings, "MFA_MAX_FAILED_ATTEMPTS", 5)

email_logger = logging.getLogger("accounts.mfa.email")


class MfaError(Exception):
    def __init__(self, detail, code, status_code, payload=None):
        super().__init__(detail)
        self.detail = detail
        self.code = code
        self.status_code = status_code
        self.payload = payload or {}

    def as_response_data(self):
        data = {"detail": self.detail, "code": self.code}
        data.update(self.payload)
        return data


def normalize_phone(value):
    digits = "".join(char for char in (value or "") if char.isdigit())
    return digits


def mask_phone(phone):
    digits = normalize_phone(phone)
    if len(digits) >= 10:
        return f"XXX-XXX-{digits[-4:]}"
    return f"XXXXXX{digits[-4:]}" if digits else ""


def mask_email(email):
    if "@" not in email:
        return ""

    local_part, domain = email.split("@", 1)
    domain_name, _, suffix = domain.partition(".")
    visible_local = local_part[:2] if len(local_part) > 2 else local_part[:1]
    masked_local = f"{visible_local}{'*' * max(3, len(local_part) - len(visible_local))}"
    masked_domain = "x" * max(5, len(domain_name))
    masked_suffix = f".{suffix}" if suffix else ""
    return f"{masked_local}@{masked_domain}{masked_suffix}"


def get_profile(user):
    profile, _ = AccountProfile.objects.get_or_create(user=user)
    return profile


def get_available_methods(user):
    if user.email:
        return [
            {
                "type": EMAIL_METHOD,
                "label": "Email",
                "masked_destination": mask_email(user.email),
            }
        ]

    return []


def invalidate_existing_challenges(user):
    now = timezone.now()
    user.mfa_login_challenges.filter(
        used_at__isnull=True,
        invalidated_at__isnull=True,
    ).update(invalidated_at=now)


def get_active_challenge(challenge_id):
    try:
        challenge = MfaLoginChallenge.objects.select_related("user").get(
            challenge_id=challenge_id
        )
    except MfaLoginChallenge.DoesNotExist as exc:
        raise MfaError(
            "This sign-in verification request is no longer available.",
            "challenge_not_found",
            400,
        ) from exc

    if challenge.used_at or challenge.invalidated_at:
        raise MfaError(
            "This sign-in verification request is no longer active.",
            "challenge_inactive",
            400,
        )

    if challenge.expires_at and challenge.expires_at <= timezone.now():
        challenge.invalidated_at = timezone.now()
        challenge.save(update_fields=["invalidated_at"])
        raise MfaError(
            "This verification code has expired. Request a new code to continue.",
            "challenge_expired",
            400,
        )

    return challenge


def build_challenge_response(challenge, next_step, detail, methods):
    response = {
        "mfa_required": True,
        "challenge_id": str(challenge.challenge_id),
        "next_step": next_step,
        "detail": detail,
        "available_methods": methods,
    }

    if challenge.selected_method:
        response["selected_method"] = next(
            (method for method in methods if method["type"] == challenge.selected_method),
            None,
        )

    return response


def generate_otp():
    return f"{secrets.randbelow(90000000) + 10000000:08d}"


def deliver_email_code(user, code):
    send_plain_text_email(
        subject="Your medical chart sign-in code",
        message=(
            f"Your one-time sign-in code is {code}. "
            f"It expires in {MFA_CODE_TTL_MINUTES} minutes."
        ),
        recipient_list=[user.email],
    )


def send_code(challenge, method, enforce_throttle=True):
    now = timezone.now()
    if (
        enforce_throttle
        and challenge.last_sent_at
        and now - challenge.last_sent_at < timedelta(seconds=MFA_RESEND_THROTTLE_SECONDS)
    ):
        raise MfaError(
            "Please wait a moment before requesting another verification code.",
            "resend_throttled",
            429,
        )

    methods = {item["type"]: item for item in get_available_methods(challenge.user)}
    if method not in methods:
        raise MfaError(
            "That verification method is not available for this account.",
            "method_unavailable",
            400,
        )

    code = generate_otp()
    try:
        deliver_email_code(challenge.user, code)
    except EmailDeliveryError as exc:
        methods_list = get_available_methods(challenge.user)
        payload = {
            "mfa_required": True,
            "challenge_id": str(challenge.challenge_id),
            "available_methods": methods_list,
            "selected_method": methods.get(method),
        }
        payload["next_step"] = "delivery_failed"
        detail = (
            "We couldn't send your verification code by email right now. "
            "Please contact an administrator or verify the MFA email configuration."
        )
        code_name = "mfa_delivery_failed"

        email_logger.warning(
            "MFA delivery failed for user=%s method=%s",
            challenge.user.username,
            method,
        )
        raise MfaError(detail, code_name, 503, payload=payload) from exc

    challenge.selected_method = method
    challenge.code_hash = make_password(code)
    challenge.expires_at = now + timedelta(minutes=MFA_CODE_TTL_MINUTES)
    challenge.last_sent_at = now
    challenge.resend_count += 1
    challenge.save(
        update_fields=[
            "selected_method",
            "code_hash",
            "expires_at",
            "last_sent_at",
            "resend_count",
            "updated_at",
        ]
    )

    return methods[method]


def start_login_mfa(user):
    methods = get_available_methods(user)
    if not methods:
        raise MfaError(
            "You cannot complete sign-in because no MFA email is configured. "
            "Please contact IT or an administrator to add an email address to your account.",
            "mfa_unavailable",
            403,
        )

    invalidate_existing_challenges(user)
    challenge = MfaLoginChallenge.objects.create(user=user)

    selected_method = send_code(challenge, EMAIL_METHOD, enforce_throttle=False)
    return build_challenge_response(
        challenge,
        "verify",
        f"We sent an 8-digit verification code to {selected_method['masked_destination']}.",
        methods,
    )


def resend_code(challenge_id):
    challenge = get_active_challenge(challenge_id)
    if not challenge.selected_method:
        raise MfaError(
            "Request a verification code before asking for another one.",
            "method_required",
            400,
        )

    selected_method = send_code(challenge, challenge.selected_method, enforce_throttle=True)
    methods = get_available_methods(challenge.user)
    return build_challenge_response(
        challenge,
        "verify",
        f"We sent a new 8-digit verification code to {selected_method['masked_destination']}.",
        methods,
    )


def verify_code(challenge_id, code):
    challenge = get_active_challenge(challenge_id)
    if not challenge.selected_method or not challenge.code_hash:
        raise MfaError(
            "Request a verification code before entering one.",
            "verification_not_started",
            400,
        )

    if challenge.failed_attempts >= MFA_MAX_FAILED_ATTEMPTS:
        challenge.invalidated_at = timezone.now()
        challenge.save(update_fields=["invalidated_at"])
        raise MfaError(
            "Too many incorrect verification attempts. Please sign in again to request a new code.",
            "attempt_limit_exceeded",
            429,
        )

    if not check_password(code, challenge.code_hash):
        challenge.failed_attempts += 1
        update_fields = ["failed_attempts", "updated_at"]
        if challenge.failed_attempts >= MFA_MAX_FAILED_ATTEMPTS:
            challenge.invalidated_at = timezone.now()
            update_fields.append("invalidated_at")
        challenge.save(update_fields=update_fields)
        if challenge.failed_attempts >= MFA_MAX_FAILED_ATTEMPTS:
            raise MfaError(
                "Too many incorrect verification attempts. Please sign in again to request a new code.",
                "attempt_limit_exceeded",
                429,
            )
        raise MfaError(
            "The verification code you entered is not valid.",
            "invalid_code",
            400,
        )

    now = timezone.now()
    challenge.used_at = now
    challenge.code_hash = ""
    challenge.save(update_fields=["used_at", "code_hash", "updated_at"])
    challenge.user.mfa_login_challenges.filter(
        used_at__isnull=True,
        invalidated_at__isnull=True,
    ).exclude(id=challenge.id).update(invalidated_at=now)
    return challenge.user
