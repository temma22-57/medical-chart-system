from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Allergy, Medication, Patient, Visit, Vital


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

    def test_visit_has_related_vitals(self):
        patient = Patient.objects.create(first_name="Avery", last_name="Stone")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-12",
            primary_care_physician="Dr. Patel",
            notes="Routine follow-up.",
        )
        Vital.objects.create(
            visit=visit,
            height="68.00",
            weight="160.50",
            blood_pressure="120/80",
            heart_rate=72,
            temperature="98.60",
        )

        self.assertEqual(visit.vitals.count(), 1)
        self.assertEqual(patient.visits.first().vitals.first().blood_pressure, "120/80")


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
                "view_vital",
                "add_vital",
                "change_vital",
            ],
        )
        self.nurse = create_user_with_permissions(
            "nurse",
            [
                "view_patient",
                "view_visit",
                "view_medication",
                "view_allergy",
                "view_vital",
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
            "phone": "555-0100",
        }

        create_response = self.client.post(reverse("patients"), payload, format="json")
        list_response = self.client.get(reverse("patients"))

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["first_name"], "Taylor")

    def test_create_patient_blocks_exact_duplicate(self):
        self.client.force_authenticate(user=self.doctor)
        payload = {
            "first_name": "Taylor",
            "last_name": "Morgan",
            "date_of_birth": "1985-06-20",
            "phone": "555-0100",
        }
        Patient.objects.create(**payload)

        response = self.client.post(reverse("patients"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Patient.objects.count(), 1)
        self.assertIn("identical patient", str(response.data))

    def test_create_patient_allows_same_name_with_different_dob_or_phone(self):
        self.client.force_authenticate(user=self.doctor)
        Patient.objects.create(
            first_name="Taylor",
            last_name="Morgan",
            date_of_birth="1985-06-20",
            phone="555-0100",
        )
        payload = {
            "first_name": "Taylor",
            "last_name": "Morgan",
            "date_of_birth": "1990-01-15",
            "phone": "555-0100",
        }

        response = self.client.post(reverse("patients"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Patient.objects.count(), 2)

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
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-10",
            primary_care_physician="Dr. Nguyen",
            staff_assigned="MA Carter",
            notes="Blood pressure check.",
        )
        Vital.objects.create(
            visit=visit,
            height="70.00",
            weight="180.00",
            blood_pressure="118/76",
            heart_rate=68,
            temperature="98.40",
            collected_at="2026-04-10T10:00:00Z",
        )

        response = self.client.get(reverse("patient-detail", kwargs={"pk": patient.id}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "Jordan")
        self.assertEqual(response.data["medications"][0]["name"], "Lisinopril")
        self.assertEqual(response.data["allergies"][0]["substance"], "Latex")
        self.assertEqual(response.data["visits"][0]["primary_care_physician"], "Dr. Nguyen")
        self.assertEqual(response.data["visits"][0]["vitals"][0]["blood_pressure"], "118/76")
        self.assertEqual(response.data["latest_vitals"]["heart_rate"], 68)

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

    def test_doctor_can_update_visit(self):
        self.client.force_authenticate(user=self.doctor)
        patient = Patient.objects.create(first_name="Casey", last_name="Rivera")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
            notes="Medication review.",
        )

        response = self.client.patch(
            reverse("visit-detail", kwargs={"pk": visit.id}),
            {"notes": "Updated visit notes."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        visit.refresh_from_db()
        self.assertEqual(visit.notes, "Updated visit notes.")

    def test_create_vitals_for_visit(self):
        self.client.force_authenticate(user=self.doctor)
        patient = Patient.objects.create(first_name="Casey", last_name="Rivera")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
            notes="Medication review.",
        )
        payload = {
            "height": "67.50",
            "weight": "145.25",
            "blood_pressure": "122/78",
            "heart_rate": 74,
            "temperature": "98.70",
            "collected_at": "2026-04-13T16:30:00Z",
        }

        response = self.client.post(
            reverse("visit-vitals", kwargs={"visit_id": visit.id}),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(visit.vitals.count(), 1)
        self.assertEqual(response.data["blood_pressure"], "122/78")

    def test_latest_vitals_uses_most_recent_visit_and_collected_time(self):
        self.client.force_authenticate(user=self.nurse)
        patient = Patient.objects.create(first_name="Riley", last_name="Brooks")
        older_visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-12",
            primary_care_physician="Dr. Smith",
            notes="Older visit.",
        )
        newer_visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
            notes="Newer visit.",
        )
        Vital.objects.create(
            visit=newer_visit,
            height="68.00",
            weight="150.00",
            blood_pressure="119/79",
            heart_rate=70,
            temperature="98.60",
            collected_at="2026-04-13T09:00:00Z",
        )
        Vital.objects.create(
            visit=older_visit,
            height="68.00",
            weight="151.00",
            blood_pressure="130/85",
            heart_rate=80,
            temperature="99.10",
            collected_at="2026-04-12T14:00:00Z",
        )
        latest_same_visit = Vital.objects.create(
            visit=newer_visit,
            height="68.00",
            weight="149.50",
            blood_pressure="116/74",
            heart_rate=66,
            temperature="98.20",
            collected_at="2026-04-13T11:00:00Z",
        )

        response = self.client.get(
            reverse("patient-latest-vitals", kwargs={"patient_id": patient.id})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], latest_same_visit.id)
        self.assertEqual(response.data["blood_pressure"], "116/74")

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
