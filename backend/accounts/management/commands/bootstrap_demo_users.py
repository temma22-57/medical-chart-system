from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand

from accounts.mfa import get_profile


class Command(BaseCommand):
    help = "Create demo users with blank MFA contact details for local development."

    def handle(self, *args, **options):
        self.create_group("Admin", [])
        self.create_group("Doctor", [])
        self.create_group("Nurse", [])
        self.ensure_user("admin", "adminpass", "Admin")
        self.ensure_user("doctor", "doctorpass", "Doctor")
        self.ensure_user("nurse", "nursepass", "Nurse")

        self.stdout.write(
            self.style.SUCCESS(
                "Created demo users with blank email and phone fields for MFA enrollment."
            )
        )

    def create_group(self, name, permission_codenames):
        group, _ = Group.objects.get_or_create(name=name)
        permissions = Permission.objects.filter(codename__in=permission_codenames)
        group.permissions.set(permissions)
        return group

    def ensure_user(self, username, password, role):
        User = get_user_model()
        group, _ = Group.objects.get_or_create(name=role)
        user, _ = User.objects.get_or_create(username=username, defaults={"is_active": True})
        user.is_active = True
        user.email = ""
        user.set_password(password)
        user.save(update_fields=["is_active", "email", "password"])
        user.groups.set([group])

        profile = get_profile(user)
        profile.phone = ""
        profile.save(update_fields=["phone", "updated_at"])
        return user
