from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics
from .models import Allergy, Medication, Patient, Visit, Vital
from .permissions import ViewModelPermissions
from .serializers import (
    AllergySerializer,
    MedicationSerializer,
    PatientDetailSerializer,
    PatientSerializer,
    VitalSerializer,
    VisitSerializer,
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
        "allergies",
        "visits",
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
