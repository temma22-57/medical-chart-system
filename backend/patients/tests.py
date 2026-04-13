from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Allergy, Medication, Patient, Visit


class PatientRelationshipTests(APITestCase):
    def test_patient_has_related_medications_allergies_and_visits(self):
        patient = Patient.objects.create(
            first_name="Avery",
            last_name="Stone",
            date_of_birth="1990-04-12",
        )
        Medication.objects.create(
            patient=patient,
            name="Metformin",
            dosage="500 mg",
            frequency="Twice daily",
        )
        Allergy.objects.create(
            patient=patient,
            substance="Penicillin",
            reaction="Rash",
        )
        Visit.objects.create(
            patient=patient,
            visit_date="2026-04-12",
            primary_care_physician="Dr. Patel",
            staff_assigned="Nurse Lee",
            notes="Routine follow-up.",
        )

        self.assertEqual(patient.medications.count(), 1)
        self.assertEqual(patient.allergies.count(), 1)
        self.assertEqual(patient.visits.count(), 1)


class PatientApiTests(APITestCase):
    def test_create_and_list_patients(self):
        payload = {
            "first_name": "Taylor",
            "last_name": "Morgan",
            "date_of_birth": "1985-06-20",
        }

        create_response = self.client.post(reverse("patients"), payload, format="json")
        list_response = self.client.get(reverse("patients"))

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["first_name"], "Taylor")

    def test_retrieve_patient_includes_related_record_sections(self):
        patient = Patient.objects.create(first_name="Jordan", last_name="Kim")
        Medication.objects.create(
            patient=patient,
            name="Lisinopril",
            dosage="10 mg",
            frequency="Daily",
        )
        Allergy.objects.create(patient=patient, substance="Latex", reaction="Hives")
        Visit.objects.create(
            patient=patient,
            visit_date="2026-04-10",
            primary_care_physician="Dr. Nguyen",
            staff_assigned="MA Carter",
            notes="Blood pressure check.",
        )

        response = self.client.get(reverse("patient-detail", kwargs={"pk": patient.id}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "Jordan")
        self.assertEqual(response.data["medications"][0]["name"], "Lisinopril")
        self.assertEqual(response.data["allergies"][0]["substance"], "Latex")
        self.assertEqual(response.data["visits"][0]["primary_care_physician"], "Dr. Nguyen")

    def test_create_visit_for_patient(self):
        patient = Patient.objects.create(first_name="Casey", last_name="Rivera")
        payload = {
            "visit_date": "2026-04-13",
            "primary_care_physician": "Dr. Smith",
            "staff_assigned": "Nurse Gomez",
            "notes": "Medication review.",
        }

        response = self.client.post(
            reverse("patient-visits", kwargs={"patient_id": patient.id}),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(patient.visits.count(), 1)
        self.assertEqual(response.data["notes"], "Medication review.")
