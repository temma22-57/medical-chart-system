from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


ENCRYPTED_PREFIX = "enc::"


@lru_cache(maxsize=1)
def get_fernet():
    key = getattr(settings, "DATA_ENCRYPTION_KEY", "").strip()
    if not key:
        raise ImproperlyConfigured(
            "DATA_ENCRYPTION_KEY must be configured to use encrypted model fields."
        )

    return Fernet(key.encode("utf-8"))


def encrypt_string(value):
    if value in (None, ""):
        return value

    token = get_fernet().encrypt(str(value).encode("utf-8")).decode("utf-8")
    return f"{ENCRYPTED_PREFIX}{token}"


def decrypt_string(value):
    if value in (None, ""):
        return value

    if not isinstance(value, str) or not value.startswith(ENCRYPTED_PREFIX):
        return value

    token = value[len(ENCRYPTED_PREFIX) :]
    try:
        return get_fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ImproperlyConfigured(
            "Unable to decrypt stored encrypted data with the configured DATA_ENCRYPTION_KEY."
        ) from exc


def is_encrypted_value(value):
    return isinstance(value, str) and value.startswith(ENCRYPTED_PREFIX)

