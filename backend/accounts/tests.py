from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from patients.models import Allergy, Medication, Patient, Visit, Vital


class AuthApiTests(APITestCase):
    def test_login_returns_token_and_roles(self):
        user = get_user_model().objects.create_user(
            username="doctor",
            password="doctorpass",
        )
        doctor_group = Group.objects.create(name="Doctor")
        user.groups.add(doctor_group)

        response = self.client.post(
            reverse("auth-login"),
            {"username": "doctor", "password": "doctorpass"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["roles"], ["Doctor"])
        self.assertFalse(response.data["mfa_required"])

    def test_login_rejects_invalid_credentials(self):
        get_user_model().objects.create_user(
            username="doctor",
            password="doctorpass",
        )

        response = self.client.post(
            reverse("auth-login"),
            {"username": "doctor", "password": "wrongpass"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("token", response.data)
        self.assertIn("Invalid username or password", str(response.data))

    def test_me_requires_authentication(self):
        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DemoDataCommandTests(APITestCase):
    def test_bootstrap_demo_users_creates_demo_users_and_records_idempotently(self):
        call_command("bootstrap_demo_users")
        call_command("bootstrap_demo_users")

        User = get_user_model()

        self.assertTrue(User.objects.filter(username="doctor").exists())
        self.assertTrue(User.objects.filter(username="nurse").exists())
        self.assertEqual(
            list(User.objects.get(username="doctor").groups.values_list("name", flat=True)),
            ["Doctor"],
        )
        self.assertEqual(Patient.objects.count(), 2)
        self.assertEqual(Visit.objects.count(), 3)
        self.assertEqual(Medication.objects.count(), 3)
        self.assertEqual(Allergy.objects.count(), 3)
        self.assertEqual(Vital.objects.count(), 3)
        self.assertTrue(
            Patient.objects.filter(
                first_name="Jordan",
                last_name="Kim",
                medications__name="Lisinopril",
                allergies__substance="Penicillin",
                visits__vitals__blood_pressure="128/82",
            ).exists()
        )
