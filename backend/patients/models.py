from django.conf import settings
from django.db import models
from django.utils import timezone


class Patient(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    primary_language = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class AuthoredModel(models.Model):
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(app_label)s_%(class)s_created_records",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(app_label)s_%(class)s_updated_records",
    )

    class Meta:
        abstract = True


class Visit(AuthoredModel):
    patient = models.ForeignKey(Patient, related_name="visits", on_delete=models.CASCADE)
    visit_date = models.DateField()
    primary_care_physician = models.CharField(max_length=150)
    staff_assigned = models.CharField(max_length=150, blank=True)
    notes = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-visit_date", "-created_at"]

    def __str__(self):
        return f"{self.patient} visit on {self.visit_date}"


class Vital(AuthoredModel):
    visit = models.ForeignKey(Visit, related_name="vitals", on_delete=models.CASCADE)
    height = models.DecimalField(max_digits=5, decimal_places=2)
    weight = models.DecimalField(max_digits=6, decimal_places=2)
    blood_pressure = models.CharField(max_length=20)
    heart_rate = models.PositiveIntegerField()
    temperature = models.DecimalField(max_digits=5, decimal_places=2)
    collected_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-visit__visit_date", "-collected_at", "-id"]

    def __str__(self):
        return f"Vitals for {self.visit}"


class Medication(AuthoredModel):
    patient = models.ForeignKey(Patient, related_name="medications", on_delete=models.CASCADE)
    name = models.CharField(max_length=150)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} for {self.patient}"


class Allergy(AuthoredModel):
    patient = models.ForeignKey(Patient, related_name="allergies", on_delete=models.CASCADE)
    substance = models.CharField(max_length=150)
    reaction = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["substance"]

    def __str__(self):
        return f"{self.substance} allergy for {self.patient}"
