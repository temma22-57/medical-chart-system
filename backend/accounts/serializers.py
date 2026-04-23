from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import serializers

from .mfa import EMAIL_METHOD, get_profile, normalize_phone
from .models import AccountProfile, MfaFactorChangeAudit


ROLE_NAMES = ["Admin", "Doctor", "Nurse"]


def ensure_debug_admin_account():
    user_model = get_user_model()
    admin_group, _ = Group.objects.get_or_create(name="Admin")
    user, created = user_model.objects.get_or_create(
        username="admin",
        defaults={
            "is_active": True,
        },
    )

    if created or not user.has_usable_password():
        user.set_password("adminpass")

    if not user.is_active:
        user.is_active = True

    user.save()
    user.groups.set([admin_group])
    return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        ensure_debug_admin_account()
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["username"],
            password=attrs["password"],
        )

        if not user:
            raise serializers.ValidationError("Invalid username or password.")

        if not user.is_active:
            raise serializers.ValidationError("This user account is inactive.")

        attrs["user"] = user
        return attrs


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    def get_roles(self, user):
        return list(user.groups.values_list("name", flat=True))

    def get_phone(self, user):
        return get_profile(user).phone


class ManagedUserSerializer(serializers.ModelSerializer):
    phone = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ["id", "username", "first_name", "last_name", "email", "phone", "roles"]

    def get_roles(self, user):
        return list(user.groups.values_list("name", flat=True))

    def get_phone(self, user):
        return get_profile(user).phone


class ManagedUserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)
    role = serializers.ChoiceField(choices=ROLE_NAMES, write_only=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = get_user_model()
        fields = ["username", "password", "first_name", "last_name", "email", "phone", "role"]
        extra_kwargs = {
            "username": {"required": False},
            "first_name": {"required": False, "allow_blank": True},
            "last_name": {"required": False, "allow_blank": True},
            "email": {"required": False, "allow_blank": True},
        }

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password is required."})

        if self.instance is None and not attrs.get("username"):
            raise serializers.ValidationError({"username": "Username is required."})

        if "email" in attrs:
            attrs["email"] = (attrs["email"] or "").strip().lower()

        if "phone" in attrs:
            phone = normalize_phone(attrs["phone"])
            if phone and len(phone) < 10:
                raise serializers.ValidationError(
                    {"phone": "Enter a valid phone number with at least 10 digits."}
                )
            attrs["phone"] = phone

        return attrs

    def create(self, validated_data):
        role = validated_data.pop("role")
        password = validated_data.pop("password")
        phone = validated_data.pop("phone", "")
        user = get_user_model().objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        self.set_phone(user, phone)
        self.assign_role(user, role)
        return user

    def update(self, instance, validated_data):
        role = validated_data.pop("role", None)
        password = validated_data.pop("password", None)
        phone = validated_data.pop("phone", None)
        old_email = instance.email or ""
        old_phone = get_profile(instance).phone

        for field, value in validated_data.items():
            setattr(instance, field, value)

        if password:
            instance.set_password(password)

        instance.save()
        if phone is not None:
            self.set_phone(instance, phone)

        if role:
            self.assign_role(instance, role)

        new_phone = get_profile(instance).phone
        if old_email != (instance.email or "") or old_phone != new_phone:
            MfaFactorChangeAudit.objects.create(
                user=instance,
                changed_by=self.context["request"].user,
                old_email=old_email,
                new_email=instance.email or "",
                old_phone=old_phone,
                new_phone=new_phone,
            )

        return instance

    def assign_role(self, user, role):
        group, _ = Group.objects.get_or_create(name=role)
        user.groups.set([group])

    def set_phone(self, user, phone):
        profile = get_profile(user)
        profile.phone = phone
        profile.save(update_fields=["phone", "updated_at"])


class PasswordResetSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_password(self, value):
        if not value:
            raise serializers.ValidationError("Password is required.")
        return value


class MfaMethodSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=[EMAIL_METHOD])
    label = serializers.CharField()
    masked_destination = serializers.CharField()


class MfaVerificationSerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()
    code = serializers.CharField(min_length=8, max_length=8, trim_whitespace=True)


class MfaResendSerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()


class PatientCardOrderSerializer(serializers.Serializer):
    card_order = serializers.ListField(
        child=serializers.ChoiceField(choices=AccountProfile.DEFAULT_PATIENT_CARD_ORDER),
        allow_empty=False,
    )

    def validate_card_order(self, value):
        default_order = AccountProfile.DEFAULT_PATIENT_CARD_ORDER

        if sorted(value) != sorted(default_order):
            raise serializers.ValidationError(
                "Card order must include medications, diagnoses, allergies, and visits exactly once."
            )

        return value
