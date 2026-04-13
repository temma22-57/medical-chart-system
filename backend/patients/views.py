from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework import generics
from .models import Allergy, Medication, Patient, Visit
from .permissions import ViewModelPermissions
from .serializers import (
    AllergySerializer,
    MedicationSerializer,
    PatientDetailSerializer,
    PatientSerializer,
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
    queryset = Patient.objects.prefetch_related("medications", "allergies", "visits")
    serializer_class = PatientDetailSerializer
    permission_classes = [ViewModelPermissions]


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
