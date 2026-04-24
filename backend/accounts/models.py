import uuid

from django.conf import settings
from django.db import models
from security.fields import EncryptedCharField


class AccountProfile(models.Model):
    DEFAULT_PATIENT_CARD_ORDER = ["medications", "diagnoses", "allergies", "visits"]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="account_profile",
    )
    phone = EncryptedCharField(max_length=32, blank=True)
    patient_card_order = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_patient_card_order(self):
        if sorted(self.patient_card_order) == sorted(self.DEFAULT_PATIENT_CARD_ORDER):
            return self.patient_card_order

        return self.DEFAULT_PATIENT_CARD_ORDER.copy()

    def __str__(self):
        return f"Profile for {self.user.username}"


class MfaLoginChallenge(models.Model):
    METHOD_EMAIL = "email"
    METHOD_SMS = "sms"
    METHOD_CHOICES = [
        (METHOD_EMAIL, "Email"),
        (METHOD_SMS, "SMS"),
    ]

    challenge_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mfa_login_challenges",
    )
    selected_method = models.CharField(max_length=16, choices=METHOD_CHOICES, blank=True)
    code_hash = models.CharField(max_length=255, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    last_sent_at = models.DateTimeField(null=True, blank=True)
    resend_count = models.PositiveIntegerField(default=0)
    failed_attempts = models.PositiveIntegerField(default=0)
    used_at = models.DateTimeField(null=True, blank=True)
    invalidated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"MFA challenge for {self.user.username}"


class MfaFactorChangeAudit(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mfa_factor_change_audits",
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mfa_factor_changes_made",
    )
    old_email = models.EmailField(blank=True)
    new_email = models.EmailField(blank=True)
    old_phone = models.CharField(max_length=32, blank=True)
    new_phone = models.CharField(max_length=32, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"MFA factor change for {self.user.username}"
