from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


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

    def test_me_requires_authentication(self):
        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
