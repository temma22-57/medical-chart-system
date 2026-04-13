from django.shortcuts import get_object_or_404
from rest_framework import generics
from .models import Patient, Visit
from .serializers import PatientDetailSerializer, PatientSerializer, VisitSerializer


class PatientListCreateView(generics.ListCreateAPIView):
    queryset = Patient.objects.all().order_by("-created_at")
    serializer_class = PatientSerializer


class PatientDetailView(generics.RetrieveAPIView):
    queryset = Patient.objects.prefetch_related("medications", "allergies", "visits")
    serializer_class = PatientDetailSerializer


class PatientVisitListCreateView(generics.ListCreateAPIView):
    serializer_class = VisitSerializer

    def get_queryset(self):
        return Visit.objects.filter(patient_id=self.kwargs["patient_id"]).order_by(
            "-visit_date",
            "-created_at",
        )

    def perform_create(self, serializer):
        patient = get_object_or_404(Patient, id=self.kwargs["patient_id"])
        serializer.save(patient=patient)
