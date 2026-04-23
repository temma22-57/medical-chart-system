from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework import generics
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth import get_user_model

from .mfa import (
    MfaError,
    get_available_methods,
    get_profile,
    resend_code,
    start_login_mfa,
    verify_code,
)
from .serializers import (
    LoginSerializer,
    ManagedUserSerializer,
    ManagedUserWriteSerializer,
    MfaResendSerializer,
    MfaVerificationSerializer,
    PatientCardOrderSerializer,
    PasswordResetSerializer,
    UserSerializer,
)


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.groups.filter(name="Admin").exists()
        )


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        methods = get_available_methods(user)

        if not methods:
            Token.objects.filter(user=user).delete()
            token = Token.objects.create(user=user)
            return Response(
                {
                    "token": token.key,
                    "user": UserSerializer(user).data,
                    "mfa_required": False,
                    "warning": (
                        "No MFA email is configured for this account. "
                        "Please contact an administrator or update your account information "
                        "to add an email address for MFA."
                    ),
                },
                status=status.HTTP_200_OK,
            )

        try:
            mfa_response = start_login_mfa(user)
        except MfaError as exc:
            return Response(exc.as_response_data(), status=exc.status_code)

        return Response(mfa_response, status=status.HTTP_200_OK)


class MfaResendView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MfaResendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            response_data = resend_code(serializer.validated_data["challenge_id"])
        except MfaError as exc:
            return Response(exc.as_response_data(), status=exc.status_code)

        return Response(response_data, status=status.HTTP_200_OK)


class MfaVerificationView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MfaVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = verify_code(
                serializer.validated_data["challenge_id"],
                serializer.validated_data["code"],
            )
        except MfaError as exc:
            return Response(exc.as_response_data(), status=exc.status_code)

        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)
        return Response(
            {
                "token": token.key,
                "user": UserSerializer(user).data,
                "mfa_required": False,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class PatientCardOrderPreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_profile(request.user)
        return Response({"card_order": profile.get_patient_card_order()})

    def patch(self, request):
        profile = get_profile(request.user)
        serializer = PatientCardOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile.patient_card_order = serializer.validated_data["card_order"]
        profile.save(update_fields=["patient_card_order", "updated_at"])
        return Response({"card_order": profile.get_patient_card_order()})


class ManagedUserListCreateView(generics.ListCreateAPIView):
    queryset = get_user_model().objects.all().order_by("username")
    permission_classes = [IsAdminRole]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ManagedUserWriteSerializer
        return ManagedUserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(ManagedUserSerializer(user).data, status=status.HTTP_201_CREATED)


class ManagedUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = get_user_model().objects.all().order_by("username")
    permission_classes = [IsAdminRole]

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return ManagedUserWriteSerializer
        return ManagedUserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(ManagedUserSerializer(user).data)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()

        if user.id == request.user.id:
            return Response(
                {"detail": "Admins cannot delete their own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ManagedUserPasswordResetView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        user = generics.get_object_or_404(get_user_model(), pk=pk)
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["password"])
        user.save()
        Token.objects.filter(user=user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
