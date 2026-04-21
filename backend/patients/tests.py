from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Allergy, Diagnosis, Medication, Patient, Visit, VisitNote, Vital
from .serializers import PatientDetailSerializer, PatientSerializer, VisitSerializer


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


def create_user_with_group(username, group_name):
    user = get_user_model().objects.create_user(
        username=username,
        password="testpass",
    )
    group = Group.objects.create(name=group_name)
    user.groups.add(group)
    return user


class PatientRelationshipTests(APITestCase):
    def test_patient_string_representation_uses_full_name(self):
        patient = Patient.objects.create(first_name="Avery", last_name="Stone")

        self.assertEqual(str(patient), "Avery Stone")

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
        Diagnosis.objects.create(
            patient=patient,
            name="Type 2 diabetes",
            status=Diagnosis.Status.CURRENT,
            date_diagnosed="2026-04-12",
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
        )

        self.assertEqual(patient.medications.count(), 1)
        self.assertEqual(patient.diagnoses.count(), 1)
        self.assertEqual(patient.allergies.count(), 1)
        self.assertEqual(patient.visits.count(), 1)

    def test_visit_has_related_vitals(self):
        patient = Patient.objects.create(first_name="Avery", last_name="Stone")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-12",
            primary_care_physician="Dr. Patel",
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


class PatientSerializerTests(APITestCase):
    def test_patient_serializer_accepts_valid_payload(self):
        serializer = PatientSerializer(
            data={
                "first_name": "Taylor",
                "last_name": "Morgan",
                "date_of_birth": "1985-06-20",
                "phone": "555-0100",
                "primary_language": "English",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        patient = serializer.save()
        self.assertEqual(patient.first_name, "Taylor")
        self.assertEqual(patient.phone, "555-0100")
        self.assertEqual(patient.primary_language, "English")

    def test_patient_serializer_rejects_exact_duplicate(self):
        Patient.objects.create(
            first_name="Taylor",
            last_name="Morgan",
            date_of_birth="1985-06-20",
            phone="555-0100",
        )
        serializer = PatientSerializer(
            data={
                "first_name": "Taylor",
                "last_name": "Morgan",
                "date_of_birth": "1985-06-20",
                "phone": "555-0100",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("identical patient", str(serializer.errors))

    def test_visit_serializer_includes_nested_vitals(self):
        patient = Patient.objects.create(first_name="Riley", last_name="Brooks")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
        )
        Vital.objects.create(
            visit=visit,
            height="67.50",
            weight="145.25",
            blood_pressure="122/78",
            heart_rate=74,
            temperature="98.70",
        )

        data = VisitSerializer(visit).data

        self.assertEqual(data["patient"], patient.id)
        self.assertEqual(data["vitals"][0]["blood_pressure"], "122/78")

    def test_patient_detail_serializer_includes_latest_vitals(self):
        patient = Patient.objects.create(first_name="Riley", last_name="Brooks")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
        )
        Vital.objects.create(
            visit=visit,
            height="67.50",
            weight="145.25",
            blood_pressure="122/78",
            heart_rate=74,
            temperature="98.70",
        )

        data = PatientDetailSerializer(patient).data

        self.assertEqual(data["latest_vitals"]["heart_rate"], 74)
        self.assertEqual(data["visits"][0]["vitals"][0]["temperature"], "98.70")


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
                "view_visitnote",
                "add_visitnote",
                "change_visitnote",
                "view_medication",
                "add_medication",
                "change_medication",
                "view_diagnosis",
                "add_diagnosis",
                "change_diagnosis",
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
                "view_visitnote",
                "add_visitnote",
                "change_visitnote",
                "view_medication",
                "view_diagnosis",
                "view_allergy",
                "view_vital",
            ],
        )
        self.admin = create_user_with_group("admin", "Admin")

    def test_unauthenticated_users_cannot_access_patient_list(self):
        response = self.client.get(reverse("patients"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_cannot_access_patient_data_endpoints(self):
        self.client.force_authenticate(user=self.admin)
        patient = Patient.objects.create(first_name="Jordan", last_name="Kim")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
        )
        note = VisitNote.objects.create(
            visit=visit,
            author=self.doctor,
            content="Admin should not see this.",
        )
        medication = Medication.objects.create(
            patient=patient,
            name="Lisinopril",
            dosage="10 mg",
            frequency="Daily",
        )
        diagnosis = Diagnosis.objects.create(
            patient=patient,
            name="Hypertension",
            status=Diagnosis.Status.CURRENT,
            date_diagnosed="2026-04-13",
        )
        allergy = Allergy.objects.create(patient=patient, substance="Latex")
        vital = Vital.objects.create(
            visit=visit,
            height="68.00",
            weight="160.00",
            blood_pressure="120/80",
            heart_rate=70,
            temperature="98.60",
        )

        endpoints = [
            reverse("patients"),
            reverse("patient-detail", kwargs={"pk": patient.id}),
            reverse("patient-visits", kwargs={"patient_id": patient.id}),
            reverse("visit-detail", kwargs={"pk": visit.id}),
            reverse("visit-notes", kwargs={"visit_id": visit.id}),
            reverse("visit-note-detail", kwargs={"pk": note.id}),
            reverse("patient-medications", kwargs={"patient_id": patient.id}),
            reverse("medication-detail", kwargs={"pk": medication.id}),
            reverse("patient-diagnoses", kwargs={"patient_id": patient.id}),
            reverse("diagnosis-detail", kwargs={"pk": diagnosis.id}),
            reverse("patient-allergies", kwargs={"patient_id": patient.id}),
            reverse("allergy-detail", kwargs={"pk": allergy.id}),
            reverse("patient-latest-vitals", kwargs={"patient_id": patient.id}),
            reverse("visit-vitals", kwargs={"visit_id": visit.id}),
            reverse("vital-detail", kwargs={"pk": vital.id}),
        ]

        for endpoint in endpoints:
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_and_list_patients(self):
        self.client.force_authenticate(user=self.doctor)
        payload = {
            "first_name": "Taylor",
            "last_name": "Morgan",
            "date_of_birth": "1985-06-20",
            "phone": "555-0100",
            "primary_language": "English",
        }

        create_response = self.client.post(reverse("patients"), payload, format="json")
        list_response = self.client.get(reverse("patients"))

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["first_name"], "Taylor")
        self.assertEqual(list_response.data[0]["primary_language"], "English")

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
        Diagnosis.objects.create(
            patient=patient,
            name="Hypertension",
            status=Diagnosis.Status.CURRENT,
            date_diagnosed="2026-04-10",
            diagnosis_code="I10",
        )
        Allergy.objects.create(patient=patient, substance="Latex", reaction="Hives")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-10",
            primary_care_physician="Dr. Nguyen",
            staff_assigned="MA Carter",
        )
        VisitNote.objects.create(
            visit=visit,
            author=self.doctor,
            content="Blood pressure check.",
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
        self.assertIn("primary_language", response.data)
        self.assertEqual(response.data["medications"][0]["name"], "Lisinopril")
        self.assertEqual(response.data["diagnoses"][0]["name"], "Hypertension")
        self.assertEqual(response.data["diagnoses"][0]["diagnosis_code"], "I10")
        self.assertEqual(response.data["allergies"][0]["substance"], "Latex")
        self.assertEqual(response.data["visits"][0]["primary_care_physician"], "Dr. Nguyen")
        self.assertEqual(response.data["visits"][0]["notes"][0]["content"], "Blood pressure check.")
        self.assertEqual(response.data["visits"][0]["vitals"][0]["blood_pressure"], "118/76")
        self.assertEqual(response.data["latest_vitals"]["heart_rate"], 68)

    def test_create_visit_for_patient(self):
        self.client.force_authenticate(user=self.doctor)
        patient = Patient.objects.create(first_name="Casey", last_name="Rivera")
        payload = {
            "visit_date": "2026-04-13",
            "primary_care_physician": "Dr. Smith",
            "staff_assigned": "Nurse Gomez",
        }

        response = self.client.post(
            reverse("patient-visits", kwargs={"patient_id": patient.id}),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(patient.visits.count(), 1)
        self.assertEqual(response.data["notes"], [])

    def test_doctor_can_update_visit(self):
        self.client.force_authenticate(user=self.doctor)
        patient = Patient.objects.create(first_name="Casey", last_name="Rivera")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
        )

        response = self.client.patch(
            reverse("visit-detail", kwargs={"pk": visit.id}),
            {"staff_assigned": "Nurse Gomez"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        visit.refresh_from_db()
        self.assertEqual(visit.staff_assigned, "Nurse Gomez")

    def test_create_and_list_visit_notes_for_visit(self):
        self.client.force_authenticate(user=self.doctor)
        patient = Patient.objects.create(first_name="Casey", last_name="Rivera")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
        )
        VisitNote.objects.create(
            visit=visit,
            author=self.nurse,
            content="Nurse note remains visible.",
        )

        create_response = self.client.post(
            reverse("visit-notes", kwargs={"visit_id": visit.id}),
            {"content": "Doctor note for this visit."},
            format="json",
        )
        list_response = self.client.get(reverse("visit-notes", kwargs={"visit_id": visit.id}))

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(visit.note_entries.count(), 2)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["content"], "Nurse note remains visible.")
        self.assertEqual(list_response.data[1]["content"], "Doctor note for this visit.")
        self.assertTrue(list_response.data[1]["can_edit"])
        self.assertFalse(list_response.data[0]["can_edit"])

    def test_user_can_update_only_own_visit_note(self):
        self.client.force_authenticate(user=self.doctor)
        patient = Patient.objects.create(first_name="Casey", last_name="Rivera")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
        )
        own_note = VisitNote.objects.create(
            visit=visit,
            author=self.doctor,
            content="Original doctor note.",
        )
        nurse_note = VisitNote.objects.create(
            visit=visit,
            author=self.nurse,
            content="Original nurse note.",
        )

        own_response = self.client.patch(
            reverse("visit-note-detail", kwargs={"pk": own_note.id}),
            {"content": "Updated doctor note."},
            format="json",
        )
        other_response = self.client.patch(
            reverse("visit-note-detail", kwargs={"pk": nurse_note.id}),
            {"content": "Doctor edit attempt."},
            format="json",
        )

        self.assertEqual(own_response.status_code, status.HTTP_200_OK)
        self.assertEqual(other_response.status_code, status.HTTP_403_FORBIDDEN)
        own_note.refresh_from_db()
        nurse_note.refresh_from_db()
        self.assertEqual(own_note.content, "Updated doctor note.")
        self.assertEqual(nurse_note.content, "Original nurse note.")

    def test_nurse_cannot_update_visit(self):
        self.client.force_authenticate(user=self.nurse)
        patient = Patient.objects.create(first_name="Casey", last_name="Rivera")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
            staff_assigned="Original staff",
        )

        response = self.client.patch(
            reverse("visit-detail", kwargs={"pk": visit.id}),
            {"staff_assigned": "Nurse edit attempt."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        visit.refresh_from_db()
        self.assertEqual(visit.staff_assigned, "Original staff")

    def test_create_and_list_diagnoses_current_first(self):
        self.client.force_authenticate(user=self.doctor)
        patient = Patient.objects.create(first_name="Casey", last_name="Rivera")
        Diagnosis.objects.create(
            patient=patient,
            name="Migraine",
            status=Diagnosis.Status.RESOLVED,
            date_diagnosed="2026-04-20",
        )
        payload = {
            "name": "Hypertension",
            "status": Diagnosis.Status.CURRENT,
            "date_diagnosed": "2026-03-10",
            "diagnosis_code": "I10",
            "provider_name": "Dr. Smith",
            "notes": "Monitor blood pressure.",
        }

        create_response = self.client.post(
            reverse("patient-diagnoses", kwargs={"patient_id": patient.id}),
            payload,
            format="json",
        )
        list_response = self.client.get(
            reverse("patient-diagnoses", kwargs={"patient_id": patient.id})
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(patient.diagnoses.count(), 2)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["name"], "Hypertension")
        self.assertEqual(list_response.data[0]["status"], Diagnosis.Status.CURRENT)

    def test_doctor_can_update_diagnosis(self):
        self.client.force_authenticate(user=self.doctor)
        patient = Patient.objects.create(first_name="Casey", last_name="Rivera")
        diagnosis = Diagnosis.objects.create(
            patient=patient,
            name="Asthma",
            status=Diagnosis.Status.CURRENT,
            date_diagnosed="2026-04-13",
        )

        response = self.client.patch(
            reverse("diagnosis-detail", kwargs={"pk": diagnosis.id}),
            {"status": Diagnosis.Status.RESOLVED, "resolution_date": "2026-04-20"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        diagnosis.refresh_from_db()
        self.assertEqual(diagnosis.status, Diagnosis.Status.RESOLVED)
        self.assertEqual(str(diagnosis.resolution_date), "2026-04-20")

    def test_create_vitals_for_visit(self):
        self.client.force_authenticate(user=self.doctor)
        patient = Patient.objects.create(first_name="Casey", last_name="Rivera")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
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
        )
        newer_visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
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
        }

        response = self.client.post(
            reverse("patient-visits", kwargs={"patient_id": patient.id}),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(patient.visits.count(), 0)
