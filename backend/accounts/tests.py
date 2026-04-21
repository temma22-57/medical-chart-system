import smtplib
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from accounts.mfa import get_profile
from accounts.models import MfaFactorChangeAudit, MfaLoginChallenge


class AuthApiTests(APITestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.admin_group, _ = Group.objects.get_or_create(name="Admin")
        self.doctor_group, _ = Group.objects.get_or_create(name="Doctor")
        self.nurse_group, _ = Group.objects.get_or_create(name="Nurse")

    def create_user(self, username="doctor", password="doctorpass", role="Doctor", email="", phone=""):
        user = self.user_model.objects.create_user(
            username=username,
            password=password,
            email=email,
        )
        group = {
            "Admin": self.admin_group,
            "Doctor": self.doctor_group,
            "Nurse": self.nurse_group,
        }[role]
        user.groups.add(group)
        profile = get_profile(user)
        profile.phone = phone
        profile.save(update_fields=["phone", "updated_at"])
        return user

    def test_admin_created_account_can_log_in_successfully(self):
        admin = self.create_user(username="admin", password="adminpass", role="Admin")
        self.client.force_authenticate(user=admin)

        create_response = self.client.post(
            reverse("managed-users"),
            {
                "username": "newdoctor",
                "password": "doctorpass",
                "first_name": "New",
                "last_name": "Doctor",
                "email": "",
                "phone": "",
                "role": "Doctor",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.client.force_authenticate(user=None)

        login_response = self.client.post(
            reverse("auth-login"),
            {"username": "newdoctor", "password": "doctorpass"},
            format="json",
        )

        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertFalse(login_response.data["mfa_required"])
        self.assertIn("token", login_response.data)
        self.assertIn("warning", login_response.data)
        self.assertEqual(login_response.data["user"]["username"], "newdoctor")

    def test_user_with_no_email_and_phone_can_log_in_with_warning(self):
        self.create_user()

        response = self.client.post(
            reverse("auth-login"),
            {"username": "doctor", "password": "doctorpass"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["mfa_required"])
        self.assertIn("token", response.data)
        self.assertIn("warning", response.data)
        self.assertIn("No MFA email is configured", response.data["warning"])

    def test_user_with_email_gets_mfa_by_email(self):
        user = self.create_user(email="doctor@example.com", phone="5551234567")

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
        self.assertEqual(len(response.data["available_methods"]), 1)
        self.assertEqual(response.data["available_methods"][0]["type"], "email")
        self.assertNotIn("token", response.data)
        send_email.assert_called_once()
        self.assertEqual(get_profile(user).phone, "5551234567")

    def test_invalid_smtp_credentials_do_not_raise_uncaught_500(self):
        self.create_user(email="doctor@example.com")

        with patch(
            "accounts.email_utils._get_email_connection",
            side_effect=smtplib.SMTPAuthenticationError(535, b"bad credentials"),
        ):
            response = self.client.post(
                reverse("auth-login"),
                {"username": "doctor", "password": "doctorpass"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["code"], "mfa_delivery_failed")
        self.assertTrue(response.data["mfa_required"])
        self.assertNotIn("token", response.data)
        self.assertFalse(Token.objects.filter(user__username="doctor").exists())

    def test_mfa_send_failure_returns_controlled_error_response(self):
        self.create_user(email="doctor@example.com")

        with patch(
            "accounts.email_utils._get_email_connection",
            side_effect=smtplib.SMTPAuthenticationError(535, b"bad credentials"),
        ):
            response = self.client.post(
                reverse("auth-login"),
                {"username": "doctor", "password": "doctorpass"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("couldn't send", response.data["detail"].lower())
        self.assertEqual(response.data["next_step"], "delivery_failed")

    def test_phone_only_does_not_create_mfa_option(self):
        self.create_user(phone="5551234567")

        response = self.client.post(
            reverse("auth-login"),
            {"username": "doctor", "password": "doctorpass"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["mfa_required"])
        self.assertIn("token", response.data)
        self.assertIn("warning", response.data)
        self.assertNotIn("available_methods", response.data)

    def test_mfa_method_selection_is_no_longer_shown(self):
        self.create_user(email="doctor@example.com", phone="5551234567")

        response = self.client.post(
            reverse("auth-login"),
            {"username": "doctor", "password": "doctorpass"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["mfa_required"])
        self.assertEqual(response.data["next_step"], "verify")
        self.assertEqual(response.data["selected_method"]["type"], "email")
        self.assertEqual(len(response.data["available_methods"]), 1)
        self.assertNotIn("token", response.data)

    def test_correct_otp_completes_login(self):
        self.create_user(email="doctor@example.com")
        captured = {}

        def capture_email_code(user, code):
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
        self.assertEqual(verify_response.data["user"]["username"], "doctor")
        self.assertTrue(
            MfaLoginChallenge.objects.filter(
                challenge_id=login_response.data["challenge_id"],
                used_at__isnull=False,
            ).exists()
        )

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
                "email": "",
                "phone": "",
                "role": "Doctor",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["roles"], ["Doctor"])
        self.assertEqual(create_response.data["phone"], "")
        user_id = create_response.data["id"]

        list_response = self.client.get(reverse("managed-users"))

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(user["username"] == "newdoctor" for user in list_response.data))

        update_response = self.client.patch(
            reverse("managed-user-detail", kwargs={"pk": user_id}),
            {
                "email": "updated@example.com",
                "phone": "(555) 999-1234",
                "role": "Doctor",
            },
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["email"], "updated@example.com")
        self.assertEqual(update_response.data["phone"], "5559991234")
        self.assertTrue(
            MfaFactorChangeAudit.objects.filter(
                user_id=user_id,
                old_email="",
                new_email="updated@example.com",
                old_phone="",
                new_phone="5559991234",
            ).exists()
        )

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

    def test_account_creation_can_include_phone_as_employee_info(self):
        self.client.force_authenticate(user=self.admin)

        create_response = self.client.post(
            reverse("managed-users"),
            {
                "username": "newnurse",
                "password": "nursepass",
                "first_name": "New",
                "last_name": "Nurse",
                "email": "nurse@example.com",
                "phone": "(555) 333-4444",
                "role": "Nurse",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["phone"], "5553334444")
        created_user = get_user_model().objects.get(username="newnurse")
        self.assertEqual(get_profile(created_user).phone, "5553334444")

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
    def test_bootstrap_demo_users_sets_seeded_accounts_to_blank_contact_fields(self):
        User = get_user_model()
        admin_group = Group.objects.create(name="Admin")
        doctor_group = Group.objects.create(name="Doctor")
        nurse_group = Group.objects.create(name="Nurse")

        admin = User.objects.create_user(
            username="admin",
            password="oldpass",
            email="admin@example.com",
        )
        admin.groups.add(admin_group)
        admin_profile = get_profile(admin)
        admin_profile.phone = "5551112222"
        admin_profile.save(update_fields=["phone", "updated_at"])

        doctor = User.objects.create_user(
            username="doctor",
            password="doctorpass",
            email="doctor@example.com",
        )
        doctor.groups.add(doctor_group)
        doctor_profile = get_profile(doctor)
        doctor_profile.phone = "5551234567"
        doctor_profile.save(update_fields=["phone", "updated_at"])

        nurse = User.objects.create_user(
            username="nurse",
            password="nursepass",
            email="nurse@example.com",
        )
        nurse.groups.add(nurse_group)
        nurse_profile = get_profile(nurse)
        nurse_profile.phone = "5559876543"
        nurse_profile.save(update_fields=["phone", "updated_at"])

        call_command("bootstrap_demo_users")

        for username, expected_password, expected_role in [
            ("admin", "adminpass", "Admin"),
            ("doctor", "doctorpass", "Doctor"),
            ("nurse", "nursepass", "Nurse"),
        ]:
            user = User.objects.get(username=username)
            self.assertTrue(user.is_active)
            self.assertTrue(user.check_password(expected_password))
            self.assertEqual(user.email, "")
            self.assertEqual(get_profile(user).phone, "")
            self.assertEqual(list(user.groups.values_list("name", flat=True)), [expected_role])

    def test_bootstrap_demo_users_is_idempotent(self):
        call_command("bootstrap_demo_users")
        call_command("bootstrap_demo_users")

        User = get_user_model()
        self.assertEqual(User.objects.filter(username="admin").count(), 1)
        self.assertEqual(User.objects.filter(username="doctor").count(), 1)
        self.assertEqual(User.objects.filter(username="nurse").count(), 1)
