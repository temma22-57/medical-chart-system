from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand

from patients.models import Allergy, Diagnosis, DiagnosisNote, Medication, Patient, Visit, VisitNote, Vital


class Command(BaseCommand):
    help = "Create Admin/Doctor/Nurse groups, demo users, and demo patient data for local development."

    def handle(self, *args, **options):
        admin_group = self.create_group("Admin", [])
        doctor_group = self.create_group(
            "Doctor",
            [
                "view_patient",
                "add_patient",
                "change_patient",
                "view_visit",
                "add_visit",
                "change_visit",
                "delete_visit",
                "view_visitnote",
                "add_visitnote",
                "change_visitnote",
                "view_medication",
                "add_medication",
                "change_medication",
                "delete_medication",
                "view_diagnosis",
                "add_diagnosis",
                "change_diagnosis",
                "delete_diagnosis",
                "view_diagnosisnote",
                "add_diagnosisnote",
                "change_diagnosisnote",
                "view_allergy",
                "add_allergy",
                "change_allergy",
                "delete_allergy",
                "view_vital",
                "add_vital",
                "change_vital",
            ],
        )
        nurse_group = self.create_group(
            "Nurse",
            [
                "view_patient",
                "view_visit",
                "view_visitnote",
                "add_visitnote",
                "change_visitnote",
                "view_medication",
                "view_diagnosis",
                "view_diagnosisnote",
                "add_diagnosisnote",
                "change_diagnosisnote",
                "view_allergy",
                "view_vital",
            ],
        )

        self.create_user("admin", "adminpass", admin_group)
        doctor = self.create_user("doctor", "doctorpass", doctor_group)
        nurse = self.create_user("nurse", "nursepass", nurse_group)
        self.create_demo_medical_records(doctor, nurse)

        self.stdout.write(
            self.style.SUCCESS("Created demo users and demo patient medical records.")
        )

    def create_group(self, name, permission_codenames):
        group, _ = Group.objects.get_or_create(name=name)
        permissions = Permission.objects.filter(codename__in=permission_codenames)
        group.permissions.set(permissions)
        return group

    def create_user(self, username, password, group):
        User = get_user_model()
        user, created = User.objects.get_or_create(username=username)

        if created:
            user.set_password(password)
            user.save()

        user.groups.set([group])
        return user

    def create_demo_medical_records(self, doctor, nurse):
        jordan, _ = Patient.objects.update_or_create(
            first_name="Jordan",
            last_name="Kim",
            date_of_birth="1984-02-14",
            phone="555-0101",
            defaults={
                "primary_language": "English",
                "notes": "Demo patient with hypertension follow-up history.",
            },
        )
        avery, _ = Patient.objects.update_or_create(
            first_name="Avery",
            last_name="Stone",
            date_of_birth="1991-09-22",
            phone="555-0102",
            defaults={
                "primary_language": "Spanish",
                "notes": "Demo patient with asthma and seasonal allergy history.",
            },
        )

        self.create_related_records(
            jordan,
            visits=[
                {
                    "visit_date": "2026-04-10",
                    "primary_care_physician": "Dr. Morgan Patel",
                    "staff_assigned": "Nurse Lee",
                    "notes": [
                        {
                            "author": doctor,
                            "content": "Blood pressure check and medication review.",
                        },
                        {
                            "author": nurse,
                            "content": "Reviewed home blood pressure log with patient.",
                        },
                    ],
                    "vitals": {
                        "height": "70.00",
                        "weight": "181.50",
                        "blood_pressure": "128/82",
                        "heart_rate": 72,
                        "temperature": "98.60",
                        "collected_at": "2026-04-10T15:00:00Z",
                    },
                },
                {
                    "visit_date": "2026-03-15",
                    "primary_care_physician": "Dr. Morgan Patel",
                    "staff_assigned": "Nurse Lee",
                    "notes": [
                        {
                            "author": doctor,
                            "content": "Initial intake visit for recurring headaches.",
                        }
                    ],
                    "vitals": {
                        "height": "70.00",
                        "weight": "183.00",
                        "blood_pressure": "134/86",
                        "heart_rate": 76,
                        "temperature": "98.80",
                        "collected_at": "2026-03-15T14:30:00Z",
                    },
                },
            ],
            creator=doctor,
            medications=[
                {
                    "name": "Lisinopril",
                    "dosage": "10 mg",
                    "frequency": "Daily",
                    "duration": "Ongoing",
                    "is_active": True,
                },
                {
                    "name": "Ibuprofen",
                    "dosage": "200 mg",
                    "frequency": "As needed",
                    "duration": "Short term",
                    "is_active": False,
                },
            ],
            diagnoses=[
                {
                    "name": "Hypertension",
                    "status": Diagnosis.Status.CURRENT,
                    "date_diagnosed": "2026-03-15",
                    "diagnosis_code": "I10",
                    "provider_name": "Dr. Morgan Patel",
                    "notes": [
                        {
                            "author": doctor,
                            "content": "Monitor blood pressure and medication response.",
                        },
                        {
                            "author": nurse,
                            "content": "Reviewed lifestyle changes and home readings.",
                        },
                    ],
                },
                {
                    "name": "Tension headache",
                    "status": Diagnosis.Status.RESOLVED,
                    "date_diagnosed": "2026-03-15",
                    "diagnosis_code": "G44.209",
                    "provider_name": "Dr. Morgan Patel",
                    "resolution_date": "2026-04-10",
                    "notes": [
                        {
                            "author": doctor,
                            "content": "Symptoms improved with conservative care.",
                        }
                    ],
                },
            ],
            allergies=[
                {
                    "substance": "Penicillin",
                    "reaction": "Rash",
                }
            ],
        )

        self.create_related_records(
            avery,
            visits=[
                {
                    "visit_date": "2026-04-12",
                    "primary_care_physician": "Dr. Elena Smith",
                    "staff_assigned": "Nurse Gomez",
                    "notes": [
                        {
                            "author": doctor,
                            "content": "Asthma follow-up. Symptoms controlled with current inhaler.",
                        }
                    ],
                    "vitals": {
                        "height": "66.50",
                        "weight": "142.25",
                        "blood_pressure": "118/76",
                        "heart_rate": 68,
                        "temperature": "98.40",
                        "collected_at": "2026-04-12T16:00:00Z",
                    },
                }
            ],
            creator=doctor,
            medications=[
                {
                    "name": "Albuterol inhaler",
                    "dosage": "90 mcg",
                    "frequency": "As needed",
                    "duration": "Ongoing",
                    "is_active": True,
                }
            ],
            diagnoses=[
                {
                    "name": "Asthma",
                    "status": Diagnosis.Status.CHRONIC,
                    "date_diagnosed": "2024-08-18",
                    "diagnosis_code": "J45.909",
                    "provider_name": "Dr. Elena Smith",
                    "notes": [
                        {
                            "author": doctor,
                            "content": "Controlled with rescue inhaler.",
                        }
                    ],
                },
                {
                    "name": "Seasonal allergic rhinitis",
                    "status": Diagnosis.Status.CURRENT,
                    "date_diagnosed": "2026-04-12",
                    "diagnosis_code": "J30.2",
                    "provider_name": "Dr. Elena Smith",
                    "notes": [
                        {
                            "author": doctor,
                            "content": "Spring pollen triggers congestion.",
                        },
                        {
                            "author": nurse,
                            "content": "Patient reports worse symptoms after outdoor activity.",
                        },
                    ],
                },
            ],
            allergies=[
                {
                    "substance": "Latex",
                    "reaction": "Hives",
                },
                {
                    "substance": "Seasonal pollen",
                    "reaction": "Congestion",
                },
            ],
        )

    def create_related_records(self, patient, visits, medications, diagnoses, allergies, creator):
        for visit_data in visits:
            vitals_data = visit_data.pop("vitals")
            notes_data = visit_data.pop("notes")
            visit, _ = Visit.objects.update_or_create(
                patient=patient,
                visit_date=visit_data["visit_date"],
                primary_care_physician=visit_data["primary_care_physician"],
                defaults={
                    "staff_assigned": visit_data["staff_assigned"],
                    "created_by": creator,
                },
            )
            for note_data in notes_data:
                VisitNote.objects.update_or_create(
                    visit=visit,
                    author=note_data["author"],
                    defaults={"content": note_data["content"]},
                )
            Vital.objects.update_or_create(
                visit=visit,
                collected_at=vitals_data["collected_at"],
                defaults={
                    "height": vitals_data["height"],
                    "weight": vitals_data["weight"],
                    "blood_pressure": vitals_data["blood_pressure"],
                    "heart_rate": vitals_data["heart_rate"],
                    "temperature": vitals_data["temperature"],
                },
            )

        for medication_data in medications:
            Medication.objects.update_or_create(
                patient=patient,
                name=medication_data["name"],
                defaults={
                    "dosage": medication_data["dosage"],
                    "frequency": medication_data["frequency"],
                    "duration": medication_data.get("duration", ""),
                    "is_active": medication_data.get("is_active", True),
                    "created_by": creator,
                },
            )

        for diagnosis_data in diagnoses:
            notes_data = diagnosis_data.pop("notes")
            diagnosis, _ = Diagnosis.objects.update_or_create(
                patient=patient,
                name=diagnosis_data["name"],
                date_diagnosed=diagnosis_data["date_diagnosed"],
                defaults={
                    "status": diagnosis_data["status"],
                    "diagnosis_code": diagnosis_data.get("diagnosis_code", ""),
                    "provider_name": diagnosis_data.get("provider_name", ""),
                    "resolution_date": diagnosis_data.get("resolution_date"),
                    "created_by": creator,
                },
            )
            for note_data in notes_data:
                DiagnosisNote.objects.update_or_create(
                    diagnosis=diagnosis,
                    author=note_data["author"],
                    defaults={"content": note_data["content"]},
                )

        for allergy_data in allergies:
            Allergy.objects.update_or_create(
                patient=patient,
                substance=allergy_data["substance"],
                defaults={
                    "reaction": allergy_data["reaction"],
                    "created_by": creator,
                },
            )
