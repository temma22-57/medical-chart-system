from rest_framework.permissions import DjangoModelPermissions


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
