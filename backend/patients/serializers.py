from rest_framework import serializers
from .models import Allergy, Medication, Patient, Visit


class VisitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Visit
        fields = [
            "id",
            "patient",
            "visit_date",
            "primary_care_physician",
            "staff_assigned",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "patient", "created_at", "updated_at"]


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = [
            "id",
            "patient",
            "name",
            "dosage",
            "frequency",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "patient", "created_at", "updated_at"]


class AllergySerializer(serializers.ModelSerializer):
    class Meta:
        model = Allergy
        fields = [
            "id",
            "patient",
            "substance",
            "reaction",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "patient", "created_at", "updated_at"]


class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = "__all__"


class PatientDetailSerializer(serializers.ModelSerializer):
    medications = MedicationSerializer(many=True, read_only=True)
    allergies = AllergySerializer(many=True, read_only=True)
    visits = VisitSerializer(many=True, read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id",
            "first_name",
            "last_name",
            "date_of_birth",
            "phone",
            "notes",
            "created_at",
            "updated_at",
            "medications",
            "allergies",
            "visits",
        ]
