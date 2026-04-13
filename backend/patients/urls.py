from django.urls import path
from .views import (
    PatientAllergyListCreateView,
    PatientDetailView,
    PatientLatestVitalsView,
    PatientListCreateView,
    PatientMedicationListCreateView,
    PatientVisitListCreateView,
)

urlpatterns = [
    path("", PatientListCreateView.as_view(), name="patients"),
    path("<int:pk>/", PatientDetailView.as_view(), name="patient-detail"),
    path(
        "<int:patient_id>/visits/",
        PatientVisitListCreateView.as_view(),
        name="patient-visits",
    ),
    path(
        "<int:patient_id>/medications/",
        PatientMedicationListCreateView.as_view(),
        name="patient-medications",
    ),
    path(
        "<int:patient_id>/allergies/",
        PatientAllergyListCreateView.as_view(),
        name="patient-allergies",
    ),
    path(
        "<int:patient_id>/latest-vitals/",
        PatientLatestVitalsView.as_view(),
        name="patient-latest-vitals",
    ),
]
