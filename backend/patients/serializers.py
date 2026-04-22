from django.db.models import Case, IntegerField, Value, When
from rest_framework import serializers
from .models import Allergy, Diagnosis, DiagnosisNote, Medication, Patient, Visit, VisitNote, Vital


def order_diagnoses(queryset):
    return queryset.annotate(
        current_sort=Case(
            When(status=Diagnosis.Status.CURRENT, then=Value(0)),
            default=Value(1),
            output_field=IntegerField(),
        )
    ).order_by("current_sort", "-date_diagnosed", "name")


class VitalSerializer(serializers.ModelSerializer):
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
        ]
        read_only_fields = ["id", "visit", "patient", "created_at", "updated_at"]


class VisitNoteSerializer(serializers.ModelSerializer):
    author = serializers.IntegerField(source="author_id", read_only=True)
    author_username = serializers.CharField(source="author.username", read_only=True)
    author_display_name = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    def get_author_display_name(self, note):
        full_name = note.author.get_full_name()
        return full_name or note.author.username

    def get_can_edit(self, note):
        request = self.context.get("request")
        return bool(
            request
            and request.user
            and request.user.is_authenticated
            and note.author_id == request.user.id
        )

    class Meta:
        model = VisitNote
        fields = [
            "id",
            "visit",
            "author",
            "author_username",
            "author_display_name",
            "content",
            "can_edit",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "visit",
            "author",
            "author_username",
            "author_display_name",
            "can_edit",
            "created_at",
            "updated_at",
        ]


class DiagnosisNoteSerializer(serializers.ModelSerializer):
    author = serializers.IntegerField(source="author_id", read_only=True)
    author_username = serializers.CharField(source="author.username", read_only=True)
    author_display_name = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    def get_author_display_name(self, note):
        full_name = note.author.get_full_name()
        return full_name or note.author.username

    def get_can_edit(self, note):
        request = self.context.get("request")
        return bool(
            request
            and request.user
            and request.user.is_authenticated
            and note.author_id == request.user.id
        )

    class Meta:
        model = DiagnosisNote
        fields = [
            "id",
            "diagnosis",
            "author",
            "author_username",
            "author_display_name",
            "content",
            "can_edit",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "diagnosis",
            "author",
            "author_username",
            "author_display_name",
            "can_edit",
            "created_at",
            "updated_at",
        ]


class VisitSerializer(serializers.ModelSerializer):
    vitals = VitalSerializer(many=True, read_only=True)
    notes = VisitNoteSerializer(source="note_entries", many=True, read_only=True)

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
            "duration",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "patient", "created_at", "updated_at"]


class DiagnosisSerializer(serializers.ModelSerializer):
    notes = DiagnosisNoteSerializer(source="note_entries", many=True, read_only=True)

    class Meta:
        model = Diagnosis
        fields = [
            "id",
            "patient",
            "name",
            "status",
            "date_diagnosed",
            "diagnosis_code",
            "provider_name",
            "resolution_date",
            "notes",
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
    def validate(self, attrs):
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
    diagnoses = serializers.SerializerMethodField()
    allergies = AllergySerializer(many=True, read_only=True)
    visits = VisitSerializer(many=True, read_only=True)
    latest_vitals = serializers.SerializerMethodField()

    def get_diagnoses(self, patient):
        diagnoses = order_diagnoses(patient.diagnoses.all())
        return DiagnosisSerializer(
            diagnoses,
            many=True,
            context=self.context,
        ).data

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
            "diagnoses",
            "allergies",
            "visits",
            "latest_vitals",
        ]
