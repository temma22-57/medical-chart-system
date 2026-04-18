from django.urls import path

from .views import (
    LoginView,
    LogoutView,
    ManagedUserDetailView,
    ManagedUserListCreateView,
    ManagedUserPasswordResetView,
    MeView,
)


urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("users/", ManagedUserListCreateView.as_view(), name="managed-users"),
    path("users/<int:pk>/", ManagedUserDetailView.as_view(), name="managed-user-detail"),
    path(
        "users/<int:pk>/reset-password/",
        ManagedUserPasswordResetView.as_view(),
        name="managed-user-reset-password",
    ),
]
