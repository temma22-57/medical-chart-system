from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
from rest_framework import generics
from .models import Allergy, Diagnosis, Medication, Patient, Visit, VisitNote, Vital
from .permissions import ViewModelPermissions, VisitNotePermissions
from .serializers import (
    AllergySerializer,
    DiagnosisSerializer,
    MedicationSerializer,
    PatientDetailSerializer,
    PatientSerializer,
    VitalSerializer,
    VisitNoteSerializer,
    VisitSerializer,
    order_diagnoses,
)


class PatientListCreateView(generics.ListCreateAPIView):
    queryset = Patient.objects.all().order_by("-created_at")
    serializer_class = PatientSerializer
    permission_classes = [ViewModelPermissions]

    def get_queryset(self):
        queryset = Patient.objects.all().order_by("-created_at")
        search = self.request.query_params.get("search", "").strip()

        if not search:
            return queryset

        query = Q()
        for term in search.split():
            query |= Q(first_name__icontains=term) | Q(last_name__icontains=term)

        return queryset.filter(query).distinct()


class PatientDetailView(generics.RetrieveAPIView):
    queryset = Patient.objects.prefetch_related(
        "medications",
        "diagnoses",
        "allergies",
        "visits",
        "visits__note_entries",
        "visits__note_entries__author",
        "visits__vitals",
    )
    serializer_class = PatientDetailSerializer
    permission_classes = [ViewModelPermissions]


class PatientLatestVitalsView(generics.RetrieveAPIView):
    serializer_class = VitalSerializer
    permission_classes = [ViewModelPermissions]

    def get_queryset(self):
        return Vital.objects.filter(visit__patient_id=self.kwargs["patient_id"]).order_by(
            "-visit__visit_date",
            "-collected_at",
            "-id",
        )

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        latest = queryset.first()

        if latest is None:
            raise Http404

        self.check_object_permissions(self.request, latest)
        return latest


class PatientVisitListCreateView(generics.ListCreateAPIView):
    serializer_class = VisitSerializer
    permission_classes = [ViewModelPermissions]

    def get_queryset(self):
        return Visit.objects.filter(patient_id=self.kwargs["patient_id"]).order_by(
            "-visit_date",
            "-created_at",
        )

    def perform_create(self, serializer):
        patient = get_object_or_404(Patient, id=self.kwargs["patient_id"])
        serializer.save(patient=patient)


class VisitDetailView(generics.RetrieveUpdateAPIView):
    queryset = Visit.objects.all()
    serializer_class = VisitSerializer
    permission_classes = [ViewModelPermissions]


class VisitNoteListCreateView(generics.ListCreateAPIView):
    serializer_class = VisitNoteSerializer
    permission_classes = [VisitNotePermissions]

    def get_queryset(self):
        return (
            VisitNote.objects.filter(visit_id=self.kwargs["visit_id"])
            .select_related("author")
            .order_by("created_at", "id")
        )

    def perform_create(self, serializer):
        visit = get_object_or_404(Visit, id=self.kwargs["visit_id"])
        if VisitNote.objects.filter(visit=visit, author=self.request.user).exists():
            raise ValidationError("You already have a note for this visit.")

        serializer.save(visit=visit, author=self.request.user)


class VisitNoteDetailView(generics.RetrieveUpdateAPIView):
    queryset = VisitNote.objects.select_related("author", "visit")
    serializer_class = VisitNoteSerializer
    permission_classes = [VisitNotePermissions]


class PatientMedicationListCreateView(generics.ListCreateAPIView):
    serializer_class = MedicationSerializer
    permission_classes = [ViewModelPermissions]

    def get_queryset(self):
        return Medication.objects.filter(patient_id=self.kwargs["patient_id"]).order_by(
            "name",
        )

    def perform_create(self, serializer):
        patient = get_object_or_404(Patient, id=self.kwargs["patient_id"])
        serializer.save(patient=patient)


class MedicationDetailView(generics.RetrieveUpdateAPIView):
    queryset = Medication.objects.all()
    serializer_class = MedicationSerializer
    permission_classes = [ViewModelPermissions]


class PatientDiagnosisListCreateView(generics.ListCreateAPIView):
    serializer_class = DiagnosisSerializer
    permission_classes = [ViewModelPermissions]

    def get_queryset(self):
        return order_diagnoses(
            Diagnosis.objects.filter(patient_id=self.kwargs["patient_id"])
        )

    def perform_create(self, serializer):
        patient = get_object_or_404(Patient, id=self.kwargs["patient_id"])
        serializer.save(patient=patient)


class DiagnosisDetailView(generics.RetrieveUpdateAPIView):
    queryset = Diagnosis.objects.all()
    serializer_class = DiagnosisSerializer
    permission_classes = [ViewModelPermissions]


class PatientAllergyListCreateView(generics.ListCreateAPIView):
    serializer_class = AllergySerializer
    permission_classes = [ViewModelPermissions]

    def get_queryset(self):
        return Allergy.objects.filter(patient_id=self.kwargs["patient_id"]).order_by(
            "substance",
        )

    def perform_create(self, serializer):
        patient = get_object_or_404(Patient, id=self.kwargs["patient_id"])
        serializer.save(patient=patient)


class AllergyDetailView(generics.RetrieveUpdateAPIView):
    queryset = Allergy.objects.all()
    serializer_class = AllergySerializer
    permission_classes = [ViewModelPermissions]


class VisitVitalListCreateView(generics.ListCreateAPIView):
    serializer_class = VitalSerializer
    permission_classes = [ViewModelPermissions]

    def get_queryset(self):
        return Vital.objects.filter(visit_id=self.kwargs["visit_id"]).order_by(
            "-collected_at",
            "-id",
        )

    def perform_create(self, serializer):
        visit = get_object_or_404(Visit, id=self.kwargs["visit_id"])
        serializer.save(visit=visit)


class VitalDetailView(generics.RetrieveUpdateAPIView):
    queryset = Vital.objects.all()
    serializer_class = VitalSerializer
    permission_classes = [ViewModelPermissions]
