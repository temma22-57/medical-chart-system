from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from accounts.models import MfaLoginChallenge
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
        self.assertIn("warning", response.data)

    def test_user_with_email_gets_mfa_by_email(self):
        user = get_user_model().objects.create_user(
            username="doctor",
            password="doctorpass",
            email="doctor@example.com",
        )
        doctor_group = Group.objects.create(name="Doctor")
        user.groups.add(doctor_group)

        with patch("accounts.mfa.deliver_email_code") as send_email:
            response = self.client.post(
                reverse("auth-login"),
                {"username": "doctor", "password": "doctorpass"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["mfa_required"])
        self.assertEqual(response.data["next_step"], "verify")
        self.assertEqual(response.data["selected_method"]["type"], "email")
        self.assertNotIn("token", response.data)
        send_email.assert_called_once()

    def test_correct_mfa_code_completes_login(self):
        user = get_user_model().objects.create_user(
            username="doctor",
            password="doctorpass",
            email="doctor@example.com",
        )
        doctor_group = Group.objects.create(name="Doctor")
        user.groups.add(doctor_group)
        captured = {}

        def capture_email_code(_user, code):
            captured["code"] = code

        with patch("accounts.mfa.deliver_email_code", side_effect=capture_email_code):
            login_response = self.client.post(
                reverse("auth-login"),
                {"username": "doctor", "password": "doctorpass"},
                format="json",
            )

        verify_response = self.client.post(
            reverse("auth-mfa-verify"),
            {
                "challenge_id": login_response.data["challenge_id"],
                "code": captured["code"],
            },
            format="json",
        )

        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)
        self.assertFalse(verify_response.data["mfa_required"])
        self.assertIn("token", verify_response.data)
        self.assertEqual(verify_response.data["user"]["roles"], ["Doctor"])
        self.assertTrue(Token.objects.filter(user=user).exists())
        self.assertTrue(
            MfaLoginChallenge.objects.filter(
                challenge_id=login_response.data["challenge_id"],
                used_at__isnull=False,
            ).exists()
        )

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


class AdminUserManagementApiTests(APITestCase):
    def setUp(self):
        self.admin_group = Group.objects.create(name="Admin")
        self.doctor_group = Group.objects.create(name="Doctor")
        self.nurse_group = Group.objects.create(name="Nurse")
        self.admin = get_user_model().objects.create_user(
            username="admin",
            password="adminpass",
        )
        self.admin.groups.add(self.admin_group)

    def test_admin_can_create_list_update_reset_password_and_delete_user(self):
        self.client.force_authenticate(user=self.admin)

        create_response = self.client.post(
            reverse("managed-users"),
            {
                "username": "newdoctor",
                "password": "doctorpass",
                "first_name": "New",
                "last_name": "Doctor",
                "email": "newdoctor@example.com",
                "role": "Doctor",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["roles"], ["Doctor"])
        user_id = create_response.data["id"]

        list_response = self.client.get(reverse("managed-users"))

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(user["username"] == "newdoctor" for user in list_response.data))

        update_response = self.client.patch(
            reverse("managed-user-detail", kwargs={"pk": user_id}),
            {"role": "Nurse"},
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["roles"], ["Nurse"])

        reset_response = self.client.post(
            reverse("managed-user-reset-password", kwargs={"pk": user_id}),
            {"password": "newpass"},
            format="json",
        )

        self.assertEqual(reset_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(get_user_model().objects.get(id=user_id).check_password("newpass"))

        delete_response = self.client.delete(
            reverse("managed-user-detail", kwargs={"pk": user_id})
        )

        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(get_user_model().objects.filter(id=user_id).exists())

    def test_doctor_cannot_manage_users(self):
        doctor = get_user_model().objects.create_user(
            username="doctor",
            password="doctorpass",
        )
        doctor.groups.add(self.doctor_group)
        self.client.force_authenticate(user=doctor)

        response = self.client.get(reverse("managed-users"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class DemoDataCommandTests(APITestCase):
    def test_bootstrap_demo_users_creates_demo_users_and_records_idempotently(self):
        call_command("bootstrap_demo_users")
        call_command("bootstrap_demo_users")

        User = get_user_model()

        self.assertTrue(User.objects.filter(username="doctor").exists())
        self.assertTrue(User.objects.filter(username="nurse").exists())
        self.assertTrue(User.objects.filter(username="admin").exists())
        self.assertEqual(
            list(User.objects.get(username="admin").groups.values_list("name", flat=True)),
            ["Admin"],
        )
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
