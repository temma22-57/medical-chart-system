from rest_framework.permissions import SAFE_METHODS, BasePermission


def is_admin(user):
    return bool(
        user
        and user.is_authenticated
        and user.groups.filter(name="Admin").exists()
    )


def is_doctor(user):
    return bool(
        user
        and user.is_authenticated
        and user.groups.filter(name="Doctor").exists()
    )


def is_nurse(user):
    return bool(
        user
        and user.is_authenticated
        and user.groups.filter(name="Nurse").exists()
    )


class PatientDomainPermission(BasePermission):
    allow_nurse_write = False
    allow_doctor_create = False
    allow_nurse_create = False
    enforce_ownership_on_write = False

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if is_admin(user):
            return False

        if request.method in SAFE_METHODS:
            return is_doctor(user) or is_nurse(user)

        if request.method == "POST":
            if is_doctor(user) and self.allow_doctor_create:
                return True
            if is_nurse(user) and self.allow_nurse_create:
                return True
            return False

        if request.method in {"PUT", "PATCH"}:
            if is_doctor(user):
                return True
            if is_nurse(user) and self.allow_nurse_write:
                return True
            return False

        return False

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        if not self.enforce_ownership_on_write:
            return self.has_permission(request, view)

        if is_admin(request.user):
            return True

        return obj.created_by_id == request.user.id


class PatientPermission(PatientDomainPermission):
    allow_doctor_create = True


class VisitPermission(PatientDomainPermission):
    allow_doctor_create = True
    allow_nurse_create = True
    allow_nurse_write = True
    enforce_ownership_on_write = True


class OwnedPatientRecordPermission(PatientDomainPermission):
    allow_doctor_create = True
    allow_nurse_create = True
    allow_nurse_write = True
    enforce_ownership_on_write = True
