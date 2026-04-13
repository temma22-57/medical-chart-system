from django.urls import path
from .views import PatientDetailView, PatientListCreateView, PatientVisitListCreateView

urlpatterns = [
    path("", PatientListCreateView.as_view(), name="patients"),
    path("<int:pk>/", PatientDetailView.as_view(), name="patient-detail"),
    path(
        "<int:patient_id>/visits/",
        PatientVisitListCreateView.as_view(),
        name="patient-visits",
    ),
]
