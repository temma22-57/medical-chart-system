from django.urls import path
from .views import PatientListCreateView

urlpatterns = [
    path("", PatientListCreateView.as_view(), name="patients"),
]
