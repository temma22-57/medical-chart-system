from rest_framework import generics
from .models import Patient
from .serializers import PatientSerializer

class PatientListCreateView(generics.ListCreateAPIView):
    queryset = Patient.objects.all().order_by("-created_at")
    serializer_class = PatientSerializer
