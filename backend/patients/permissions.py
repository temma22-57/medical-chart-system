from datetime import timedelta

from django.utils import timezone
from rest_framework.permissions import DjangoModelPermissions


DELETE_WINDOW = timedelta(hours=8)


def can_delete_recent_own_record(user, obj):
    return bool(
        user
        and user.is_authenticated
        and getattr(obj, "created_by_id", None) == user.id
        and getattr(obj, "created_at", None)
        and timezone.now() - obj.created_at < DELETE_WINDOW
    )


class ViewModelPermissions(DjangoModelPermissions):
    perms_map = {
        **DjangoModelPermissions.perms_map,
        "GET": ["%(app_label)s.view_%(model_name)s"],
        "OPTIONS": ["%(app_label)s.view_%(model_name)s"],
        "HEAD": ["%(app_label)s.view_%(model_name)s"],
    }

    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            if request.user.groups.filter(name="Admin").exists():
                return False

        return super().has_permission(request, view)


class VisitNotePermissions(ViewModelPermissions):
    def has_object_permission(self, request, view, obj):
        if not super().has_object_permission(request, view, obj):
            return False

        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True

        return obj.author_id == request.user.id


class DiagnosisNotePermissions(ViewModelPermissions):
    def has_object_permission(self, request, view, obj):
        if not super().has_object_permission(request, view, obj):
            return False

        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True

        return obj.author_id == request.user.id


class PatientRecordMutationPermissions(ViewModelPermissions):
    def has_object_permission(self, request, view, obj):
        if not super().has_object_permission(request, view, obj):
            return False

        if request.method == "DELETE":
            return can_delete_recent_own_record(request.user, obj)

        return True
