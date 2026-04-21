from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Allergy, Medication, Patient, Visit, Vital
from .serializers import PatientDetailSerializer, PatientSerializer, VisitSerializer


def create_user_with_role(username, role_name, permission_codenames):
    user = get_user_model().objects.create_user(
        username=username,
        password="testpass",
    )
    group, _ = Group.objects.get_or_create(name=role_name)
    permissions = Permission.objects.filter(codename__in=permission_codenames)
    group.permissions.set(permissions)
    user.groups.add(group)
    return user


def create_user_with_group(username, group_name):
    user = get_user_model().objects.create_user(
        username=username,
        password="testpass",
    )
    group, _ = Group.objects.get_or_create(name=group_name)
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
            notes="Annual visit.",
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
            notes="Annual visit.",
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
        self.doctor = create_user_with_role(
            "doctor",
            "Doctor",
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
        self.other_doctor = create_user_with_role(
            "doctor2",
            "Doctor",
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
        self.nurse = create_user_with_role(
            "nurse",
            "Nurse",
            [
                "view_patient",
                "view_visit",
                "add_visit",
                "change_visit",
                "view_medication",
                "view_allergy",
                "view_vital",
                "add_medication",
                "change_medication",
                "add_allergy",
                "change_allergy",
                "add_vital",
                "change_vital",
            ],
        )
        self.other_nurse = create_user_with_role(
            "nurse2",
            "Nurse",
            [
                "view_patient",
                "view_visit",
                "add_visit",
                "change_visit",
                "view_medication",
                "view_allergy",
                "view_vital",
                "add_medication",
                "change_medication",
                "add_allergy",
                "change_allergy",
                "add_vital",
                "change_vital",
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
            notes="Admin should not see this.",
        )
        medication = Medication.objects.create(
            patient=patient,
            name="Lisinopril",
            dosage="10 mg",
            frequency="Daily",
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
            reverse("patient-medications", kwargs={"patient_id": patient.id}),
            reverse("medication-detail", kwargs={"pk": medication.id}),
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
        self.assertIn("primary_language", response.data)
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
        created_visit = Visit.objects.get(patient=patient)
        self.assertEqual(created_visit.created_by, self.doctor)
        self.assertEqual(created_visit.updated_by, self.doctor)

    def test_doctor_can_update_visit(self):
        self.client.force_authenticate(user=self.doctor)
        patient = Patient.objects.create(first_name="Casey", last_name="Rivera")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
            notes="Medication review.",
            created_by=self.doctor,
            updated_by=self.doctor,
        )

        response = self.client.patch(
            reverse("visit-detail", kwargs={"pk": visit.id}),
            {"notes": "Updated visit notes."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        visit.refresh_from_db()
        self.assertEqual(visit.notes, "Updated visit notes.")
        self.assertEqual(visit.updated_by, self.doctor)

    def test_nurse_cannot_update_visit(self):
        self.client.force_authenticate(user=self.nurse)
        patient = Patient.objects.create(first_name="Casey", last_name="Rivera")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
            notes="Medication review.",
            created_by=self.doctor,
            updated_by=self.doctor,
        )

        response = self.client.patch(
            reverse("visit-detail", kwargs={"pk": visit.id}),
            {"notes": "Nurse edit attempt."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        visit.refresh_from_db()
        self.assertEqual(visit.notes, "Medication review.")

    def test_create_vitals_for_visit(self):
        self.client.force_authenticate(user=self.doctor)
        patient = Patient.objects.create(first_name="Casey", last_name="Rivera")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
            notes="Medication review.",
            created_by=self.doctor,
            updated_by=self.doctor,
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
        created_vital = visit.vitals.get()
        self.assertEqual(created_vital.created_by, self.doctor)
        self.assertEqual(created_vital.updated_by, self.doctor)

    def test_latest_vitals_uses_most_recent_visit_and_collected_time(self):
        self.client.force_authenticate(user=self.nurse)
        patient = Patient.objects.create(first_name="Riley", last_name="Brooks")
        older_visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-12",
            primary_care_physician="Dr. Smith",
            notes="Older visit.",
            created_by=self.doctor,
            updated_by=self.doctor,
        )
        newer_visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
            notes="Newer visit.",
            created_by=self.doctor,
            updated_by=self.doctor,
        )
        Vital.objects.create(
            visit=newer_visit,
            height="68.00",
            weight="150.00",
            blood_pressure="119/79",
            heart_rate=70,
            temperature="98.60",
            collected_at="2026-04-13T09:00:00Z",
            created_by=self.nurse,
            updated_by=self.nurse,
        )
        Vital.objects.create(
            visit=older_visit,
            height="68.00",
            weight="151.00",
            blood_pressure="130/85",
            heart_rate=80,
            temperature="99.10",
            collected_at="2026-04-12T14:00:00Z",
            created_by=self.nurse,
            updated_by=self.nurse,
        )
        latest_same_visit = Vital.objects.create(
            visit=newer_visit,
            height="68.00",
            weight="149.50",
            blood_pressure="116/74",
            heart_rate=66,
            temperature="98.20",
            collected_at="2026-04-13T11:00:00Z",
            created_by=self.nurse,
            updated_by=self.nurse,
        )

        response = self.client.get(
            reverse("patient-latest-vitals", kwargs={"patient_id": patient.id})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], latest_same_visit.id)
        self.assertEqual(response.data["blood_pressure"], "116/74")

    def test_doctor_and_nurse_can_view_all_patients(self):
        Patient.objects.create(first_name="Jordan", last_name="Kim")
        Patient.objects.create(first_name="Morgan", last_name="Smith")

        self.client.force_authenticate(user=self.doctor)
        doctor_response = self.client.get(reverse("patients"))

        self.client.force_authenticate(user=self.nurse)
        nurse_response = self.client.get(reverse("patients"))

        self.assertEqual(doctor_response.status_code, status.HTTP_200_OK)
        self.assertEqual(nurse_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(doctor_response.data), 2)
        self.assertEqual(len(nurse_response.data), 2)

    def test_nurse_cannot_update_restricted_patient_demographic_fields(self):
        self.client.force_authenticate(user=self.nurse)
        patient = Patient.objects.create(
            first_name="Jordan",
            last_name="Kim",
            date_of_birth="1984-02-14",
            phone="555-0101",
            primary_language="English",
            notes="Original patient note.",
        )

        response = self.client.patch(
            reverse("patient-detail", kwargs={"pk": patient.id}),
            {"phone": "555-9999", "notes": "Nurse should not update this."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        patient.refresh_from_db()
        self.assertEqual(patient.phone, "555-0101")
        self.assertEqual(patient.notes, "Original patient note.")

    def test_nurse_can_update_allowed_allergy_medication_and_vital_fields(self):
        patient = Patient.objects.create(first_name="Jordan", last_name="Kim")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-10",
            primary_care_physician="Dr. Nguyen",
            notes="Vitals follow-up.",
            created_by=self.doctor,
            updated_by=self.doctor,
        )
        medication = Medication.objects.create(
            patient=patient,
            name="Lisinopril",
            dosage="10 mg",
            frequency="Daily",
            created_by=self.nurse,
            updated_by=self.nurse,
        )
        allergy = Allergy.objects.create(
            patient=patient,
            substance="Latex",
            reaction="Hives",
            created_by=self.nurse,
            updated_by=self.nurse,
        )
        vital = Vital.objects.create(
            visit=visit,
            height="70.00",
            weight="180.00",
            blood_pressure="118/76",
            heart_rate=68,
            temperature="98.40",
            created_by=self.nurse,
            updated_by=self.nurse,
        )

        self.client.force_authenticate(user=self.nurse)
        medication_response = self.client.patch(
            reverse("medication-detail", kwargs={"pk": medication.id}),
            {"dosage": "20 mg"},
            format="json",
        )
        allergy_response = self.client.patch(
            reverse("allergy-detail", kwargs={"pk": allergy.id}),
            {"reaction": "Mild rash"},
            format="json",
        )
        vital_response = self.client.patch(
            reverse("vital-detail", kwargs={"pk": vital.id}),
            {"weight": "176.50", "blood_pressure": "116/72"},
            format="json",
        )

        self.assertEqual(medication_response.status_code, status.HTTP_200_OK)
        self.assertEqual(allergy_response.status_code, status.HTTP_200_OK)
        self.assertEqual(vital_response.status_code, status.HTTP_200_OK)

        medication.refresh_from_db()
        allergy.refresh_from_db()
        vital.refresh_from_db()
        self.assertEqual(medication.dosage, "20 mg")
        self.assertEqual(allergy.reaction, "Mild rash")
        self.assertEqual(str(vital.weight), "176.50")
        self.assertEqual(vital.blood_pressure, "116/72")
        self.assertEqual(medication.updated_by, self.nurse)
        self.assertEqual(allergy.updated_by, self.nurse)
        self.assertEqual(vital.updated_by, self.nurse)

    def test_doctor_cannot_edit_another_doctors_visit(self):
        self.client.force_authenticate(user=self.doctor)
        patient = Patient.objects.create(first_name="Casey", last_name="Rivera")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
            notes="Original visit note.",
            created_by=self.other_doctor,
            updated_by=self.other_doctor,
        )

        response = self.client.patch(
            reverse("visit-detail", kwargs={"pk": visit.id}),
            {"notes": "Attempted overwrite."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        visit.refresh_from_db()
        self.assertEqual(visit.notes, "Original visit note.")

    def test_nurse_cannot_edit_another_nurses_entry(self):
        patient = Patient.objects.create(first_name="Jordan", last_name="Kim")
        medication = Medication.objects.create(
            patient=patient,
            name="Metformin",
            dosage="500 mg",
            frequency="Twice daily",
            created_by=self.other_nurse,
            updated_by=self.other_nurse,
        )
        self.client.force_authenticate(user=self.nurse)

        response = self.client.patch(
            reverse("medication-detail", kwargs={"pk": medication.id}),
            {"frequency": "Once daily"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        medication.refresh_from_db()
        self.assertEqual(medication.frequency, "Twice daily")

    def test_doctor_cannot_edit_nurse_owned_entry(self):
        patient = Patient.objects.create(first_name="Jordan", last_name="Kim")
        allergy = Allergy.objects.create(
            patient=patient,
            substance="Latex",
            reaction="Hives",
            created_by=self.nurse,
            updated_by=self.nurse,
        )
        self.client.force_authenticate(user=self.doctor)

        response = self.client.patch(
            reverse("allergy-detail", kwargs={"pk": allergy.id}),
            {"reaction": "Severe hives"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        allergy.refresh_from_db()
        self.assertEqual(allergy.reaction, "Hives")

    def test_nurse_can_create_visit_for_patient(self):
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

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_visit = patient.visits.get()
        self.assertEqual(created_visit.created_by, self.nurse)
        self.assertEqual(created_visit.updated_by, self.nurse)
        self.assertEqual(created_visit.notes, "Restricted write attempt.")

    def test_nurse_can_edit_own_visit(self):
        self.client.force_authenticate(user=self.nurse)
        patient = Patient.objects.create(first_name="Riley", last_name="Brooks")
        visit = Visit.objects.create(
            patient=patient,
            visit_date="2026-04-13",
            primary_care_physician="Dr. Smith",
            staff_assigned="Nurse Gomez",
            notes="Initial nurse consult note.",
            created_by=self.nurse,
            updated_by=self.nurse,
        )

        response = self.client.patch(
            reverse("visit-detail", kwargs={"pk": visit.id}),
            {"notes": "Updated nurse-authored visit note."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        visit.refresh_from_db()
        self.assertEqual(visit.notes, "Updated nurse-authored visit note.")
        self.assertEqual(visit.updated_by, self.nurse)
