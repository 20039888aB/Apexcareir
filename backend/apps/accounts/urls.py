from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ChangePasswordAPIView,
    ForgotPasswordAPIView,
    LoginAPIView,
    LogoutAPIView,
    PermissionMatrixAPIView,
    ProfileAPIView,
    RefreshTokenAPIView,
    ResetPasswordConfirmAPIView,
    UserPreferencesAPIView,
    UserViewSet,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")

urlpatterns = [
    path("auth/login/", LoginAPIView.as_view(), name="login"),
    path("auth/refresh/", RefreshTokenAPIView.as_view(), name="token-refresh"),
    path("auth/logout/", LogoutAPIView.as_view(), name="logout"),
    path("auth/forgot-password/", ForgotPasswordAPIView.as_view(), name="forgot-password"),
    path("auth/reset-password/", ResetPasswordConfirmAPIView.as_view(), name="reset-password"),
    path("auth/change-password/", ChangePasswordAPIView.as_view(), name="change-password"),
    path("auth/me/", ProfileAPIView.as_view(), name="me"),
    path("auth/me/preferences/", UserPreferencesAPIView.as_view(), name="me-preferences"),
    path("auth/permission-matrix/", PermissionMatrixAPIView.as_view(), name="permission-matrix"),
    path("", include(router.urls)),
]
