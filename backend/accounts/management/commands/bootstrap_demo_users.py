from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create Doctor/Nurse groups and demo users for local development."

    def handle(self, *args, **options):
        doctor_group = self.create_group(
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
            ],
        )
        nurse_group = self.create_group(
            "Nurse",
            [
                "view_patient",
                "view_visit",
                "view_medication",
                "view_allergy",
            ],
        )

        self.create_user("doctor", "doctorpass", doctor_group)
        self.create_user("nurse", "nursepass", nurse_group)

        self.stdout.write(self.style.SUCCESS("Created demo Doctor and Nurse users."))

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
