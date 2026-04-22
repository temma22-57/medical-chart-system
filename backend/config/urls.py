"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from patients.views import (
    AllergyDetailView,
    DiagnosisDetailView,
    DiagnosisNoteDetailView,
    DiagnosisNoteListCreateView,
    MedicationDetailView,
    VisitDetailView,
    VisitNoteDetailView,
    VisitNoteListCreateView,
    VisitVitalListCreateView,
    VitalDetailView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/patients/", include("patients.urls")),
    path("api/visits/<int:pk>/", VisitDetailView.as_view(), name="visit-detail"),
    path("api/visits/<int:visit_id>/notes/", VisitNoteListCreateView.as_view(), name="visit-notes"),
    path("api/visit-notes/<int:pk>/", VisitNoteDetailView.as_view(), name="visit-note-detail"),
    path("api/visits/<int:visit_id>/vitals/", VisitVitalListCreateView.as_view(), name="visit-vitals"),
    path("api/medications/<int:pk>/", MedicationDetailView.as_view(), name="medication-detail"),
    path("api/diagnoses/<int:pk>/", DiagnosisDetailView.as_view(), name="diagnosis-detail"),
    path("api/diagnoses/<int:diagnosis_id>/notes/", DiagnosisNoteListCreateView.as_view(), name="diagnosis-notes"),
    path("api/diagnosis-notes/<int:pk>/", DiagnosisNoteDetailView.as_view(), name="diagnosis-note-detail"),
    path("api/allergies/<int:pk>/", AllergyDetailView.as_view(), name="allergy-detail"),
    path("api/vitals/<int:pk>/", VitalDetailView.as_view(), name="vital-detail"),
]
