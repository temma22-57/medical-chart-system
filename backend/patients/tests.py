from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Allergy, Medication, Patient, Visit


def create_user_with_permissions(username, permission_codenames):
    user = get_user_model().objects.create_user(
        username=username,
        password="testpass",
    )
    group = Group.objects.create(name=f"{username}-role")
    permissions = Permission.objects.filter(codename__in=permission_codenames)
    group.permissions.set(permissions)
    user.groups.add(group)
    return user


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
    def setUp(self):
        self.doctor = create_user_with_permissions(
            "doctor",
            [
                "view_patient",
                "add_patient",
                "change_patient",
                "view_visit",
                "add_visit",
                "change_visit",
                "view_medication",
                "add_medication",
                "change_medication",
                "view_allergy",
                "add_allergy",
                "change_allergy",
            ],
        )
        self.nurse = create_user_with_permissions(
            "nurse",
            [
                "view_patient",
                "view_visit",
                "view_medication",
                "view_allergy",
            ],
        )

    def test_unauthenticated_users_cannot_access_patient_list(self):
        response = self.client.get(reverse("patients"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_and_list_patients(self):
        self.client.force_authenticate(user=self.doctor)
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

    def test_search_patients_by_first_or_last_name(self):
        self.client.force_authenticate(user=self.nurse)
        Patient.objects.create(first_name="Jordan", last_name="Kim")
        Patient.objects.create(first_name="Morgan", last_name="Smith")
        Patient.objects.create(first_name="Avery", last_name="Stone")

        response = self.client.get(reverse("patients"), {"search": "smith"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["last_name"], "Smith")

    def test_retrieve_patient_includes_related_record_sections(self):
        self.client.force_authenticate(user=self.nurse)
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
        self.client.force_authenticate(user=self.doctor)
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

    def test_nurse_cannot_create_visit_for_patient(self):
        self.client.force_authenticate(user=self.nurse)
        patient = Patient.objects.create(first_name="Riley", last_name="Brooks")
        payload = {
            "visit_date": "2026-04-13",
            "primary_care_physician": "Dr. Smith",
            "staff_assigned": "Nurse Gomez",
            "notes": "Restricted write attempt.",
        }

        response = self.client.post(
            reverse("patient-visits", kwargs={"patient_id": patient.id}),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(patient.visits.count(), 0)
