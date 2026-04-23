from django.conf import settings
from django.db import models
from django.utils import timezone
from security.fields import EncryptedCharField, EncryptedDateField, EncryptedTextField


class Patient(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = EncryptedDateField(null=True, blank=True)
    phone = EncryptedCharField(max_length=20, blank=True)
    primary_language = EncryptedCharField(max_length=100, blank=True)
    notes = EncryptedTextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Visit(models.Model):
    patient = models.ForeignKey(Patient, related_name="visits", on_delete=models.CASCADE)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_visits",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    visit_date = models.DateField()
    primary_care_physician = EncryptedCharField(max_length=150)
    staff_assigned = EncryptedCharField(max_length=150, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-visit_date", "-created_at"]

    def __str__(self):
        return f"{self.patient} visit on {self.visit_date}"


class VisitNote(models.Model):
    visit = models.ForeignKey(Visit, related_name="note_entries", on_delete=models.CASCADE)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="visit_notes",
        on_delete=models.CASCADE,
    )
    content = EncryptedTextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["visit", "author"],
                name="unique_visit_note_per_author",
            )
        ]

    def __str__(self):
        return f"Note by {self.author} for {self.visit}"


class Vital(models.Model):
    visit = models.ForeignKey(Visit, related_name="vitals", on_delete=models.CASCADE)
    height = models.DecimalField(max_digits=5, decimal_places=2)
    weight = models.DecimalField(max_digits=6, decimal_places=2)
    blood_pressure = EncryptedCharField(max_length=20)
    heart_rate = models.PositiveIntegerField()
    temperature = models.DecimalField(max_digits=5, decimal_places=2)
    collected_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-visit__visit_date", "-collected_at", "-id"]

    def __str__(self):
        return f"Vitals for {self.visit}"


class Medication(models.Model):
    patient = models.ForeignKey(Patient, related_name="medications", on_delete=models.CASCADE)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_medications",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    name = models.CharField(max_length=150)
    dosage = EncryptedCharField(max_length=100)
    frequency = EncryptedCharField(max_length=100)
    duration = EncryptedCharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_active", "name"]

    def __str__(self):
        return f"{self.name} for {self.patient}"


class Diagnosis(models.Model):
    class Status(models.TextChoices):
        CURRENT = "current", "Current"
        CHRONIC = "chronic", "Chronic"
        REMISSION = "remission", "Remission"
        RESOLVED = "resolved", "Resolved"

    patient = models.ForeignKey(Patient, related_name="diagnoses", on_delete=models.CASCADE)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_diagnoses",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    name = models.CharField(max_length=150)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CURRENT,
    )
    date_diagnosed = models.DateField()
    diagnosis_code = EncryptedCharField(max_length=30, blank=True)
    provider_name = EncryptedCharField(max_length=150, blank=True)
    resolution_date = EncryptedDateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date_diagnosed", "name"]

    def __str__(self):
        return f"{self.name} diagnosis for {self.patient}"


class DiagnosisNote(models.Model):
    diagnosis = models.ForeignKey(
        Diagnosis,
        related_name="note_entries",
        on_delete=models.CASCADE,
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="diagnosis_notes",
        on_delete=models.CASCADE,
    )
    content = EncryptedTextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["diagnosis", "author"],
                name="unique_diagnosis_note_per_author",
            )
        ]

    def __str__(self):
        return f"Note by {self.author} for {self.diagnosis}"


class Allergy(models.Model):
    patient = models.ForeignKey(Patient, related_name="allergies", on_delete=models.CASCADE)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_allergies",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    substance = models.CharField(max_length=150)
    reaction = EncryptedCharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["substance"]

    def __str__(self):
        return f"{self.substance} allergy for {self.patient}"
