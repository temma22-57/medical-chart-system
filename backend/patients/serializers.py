from rest_framework import serializers
from .models import Allergy, Medication, Patient, Visit, Vital


def user_is_nurse(user):
    return bool(
        user
        and user.is_authenticated
        and user.groups.filter(name="Nurse").exists()
    )


class AuthoredModelSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["created_by"] = user
        validated_data["updated_by"] = user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data["updated_by"] = self.context["request"].user
        return super().update(instance, validated_data)


class VitalSerializer(AuthoredModelSerializer):
    patient = serializers.IntegerField(source="visit.patient_id", read_only=True)

    class Meta:
        model = Vital
        fields = [
            "id",
            "visit",
            "patient",
            "height",
            "weight",
            "blood_pressure",
            "heart_rate",
            "temperature",
            "collected_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "visit",
            "patient",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class VisitSerializer(AuthoredModelSerializer):
    vitals = VitalSerializer(many=True, read_only=True)

    class Meta:
        model = Visit
        fields = [
            "id",
            "patient",
            "visit_date",
            "primary_care_physician",
            "staff_assigned",
            "notes",
            "vitals",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "patient",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class MedicationSerializer(AuthoredModelSerializer):
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
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "patient",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class AllergySerializer(AuthoredModelSerializer):
    class Meta:
        model = Allergy
        fields = [
            "id",
            "patient",
            "substance",
            "reaction",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "patient",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class PatientSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        request = self.context.get("request")
        if request and user_is_nurse(request.user) and attrs:
            raise serializers.ValidationError(
                "Nurses cannot modify patient demographic fields."
            )

        if self.instance is not None:
            return attrs

        first_name = attrs.get("first_name")
        last_name = attrs.get("last_name")
        date_of_birth = attrs.get("date_of_birth")
        phone = attrs.get("phone") or ""

        if Patient.objects.filter(
            first_name=first_name,
            last_name=last_name,
            date_of_birth=date_of_birth,
            phone=phone,
        ).exists():
            raise serializers.ValidationError(
                "An identical patient record already exists."
            )

        return attrs

    class Meta:
        model = Patient
        fields = "__all__"


class PatientDetailSerializer(serializers.ModelSerializer):
    medications = MedicationSerializer(many=True, read_only=True)
    allergies = AllergySerializer(many=True, read_only=True)
    visits = VisitSerializer(many=True, read_only=True)
    latest_vitals = serializers.SerializerMethodField()

    def validate(self, attrs):
        request = self.context.get("request")
        if request and user_is_nurse(request.user) and attrs:
            raise serializers.ValidationError(
                "Nurses cannot modify patient demographic fields."
            )

        return attrs

    def get_latest_vitals(self, patient):
        latest = (
            Vital.objects.filter(visit__patient=patient)
            .select_related("visit")
            .order_by("-visit__visit_date", "-collected_at", "-id")
            .first()
        )

        if latest is None:
            return None

        return VitalSerializer(latest).data

    class Meta:
        model = Patient
        fields = [
            "id",
            "first_name",
            "last_name",
            "date_of_birth",
            "phone",
            "primary_language",
            "notes",
            "created_at",
            "updated_at",
            "medications",
            "allergies",
            "visits",
            "latest_vitals",
        ]
