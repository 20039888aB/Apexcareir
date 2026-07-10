from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from apps.audit_logs.services import log_audit_event
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService

from .permission_matrix import PERMISSION_GROUPS
from .permissions import IsSuperAdmin
from .serializers import (
    AdminResetPasswordSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    PermissionMatrixSerializer,
    ProfileUpdateSerializer,
    ResetPasswordConfirmSerializer,
    UserCreateSerializer,
    UserPreferencesSerializer,
    UserSerializer,
    UserUpdateSerializer,
    build_password_reset_payload,
)

User = get_user_model()


class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_id = serializer.validated_data.get("user", {}).get("id")
        if user_id:
            user = User.objects.filter(id=user_id).first()
            if user:
                log_audit_event(
                    request=request,
                    action="login",
                    module="accounts",
                    description=f"User {user.email} logged in successfully.",
                    target=user,
                )
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class RefreshTokenAPIView(TokenRefreshView):
    permission_classes = [AllowAny]


class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"detail": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response({"detail": "Invalid refresh token."}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(
            request=request,
            action="logout",
            module="accounts",
            description=f"User {request.user.email} logged out.",
            target=request.user,
        )
        return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)


class ForgotPasswordAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email, is_active=True).first()

        if user:
            user.last_password_reset_request = timezone.now()
            user.save(update_fields=["last_password_reset_request"])

            frontend_reset_url = getattr(
                settings,
                "FRONTEND_PASSWORD_RESET_URL",
                "http://localhost:5173/admin1/reset-password",
            )
            payload = build_password_reset_payload(user, frontend_reset_url)
            NotificationService.send(
                title="Password Reset Request",
                message=f"Use this secure link to reset your password: {payload['reset_url']}",
                event_code="security.password_reset",
                notification_type=Notification.NotificationType.SECURITY,
                priority=Notification.Priority.HIGH,
                ui_type=Notification.Type.WARNING,
                dedup_key=f"password-reset-{user.id}-{timezone.now().strftime('%Y%m%d%H%M')}",
                related_module="accounts",
                reference_id=str(user.id),
                source_model="accounts.user",
                source_id=user.id,
                created_by=None,
                direct_users=[user],
                direct_emails=[user.email],
            )

        return Response(
            {"detail": "If this email exists, a password reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class ResetPasswordConfirmAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password reset successful."}, status=status.HTTP_200_OK)


class ChangePasswordAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        log_audit_event(
            request=request,
            action="password_change",
            module="accounts",
            description=f"User {user.email} changed password.",
            target=user,
        )
        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)


class ProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(instance=request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_audit_event(
            request=request,
            action="profile_update",
            module="accounts",
            description=f"User {request.user.email} updated profile details.",
            target=request.user,
        )
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class UserPreferencesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {"sidebar_navigation_mode": request.user.sidebar_navigation_mode},
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        serializer = UserPreferencesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        log_audit_event(
            request=request,
            action="user_preferences_update",
            module="accounts",
            description=f"User {request.user.email} updated sidebar navigation preference.",
            target=request.user,
            metadata={"sidebar_navigation_mode": request.user.sidebar_navigation_mode},
        )
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class PermissionMatrixAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = PermissionMatrixSerializer(data={"groups": PERMISSION_GROUPS})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = UserSerializer
    search_fields = ["first_name", "last_name", "email"]
    ordering_fields = ["date_joined", "email"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in {"update", "partial_update"}:
            return UserUpdateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        log_audit_event(
            request=self.request,
            action="user_create",
            module="accounts",
            description=f"Created user account {user.email}.",
            target=user,
        )
        NotificationService.send(
            title="Welcome to Apex Care IR",
            message=(
                f"Hello {user.first_name or user.email}, your account has been created successfully. "
                "You can now sign in to the Apex Care IR system."
            ),
            event_code="system.user_created",
            notification_type=Notification.NotificationType.SYSTEM,
            priority=Notification.Priority.MEDIUM,
            ui_type=Notification.Type.SUCCESS,
            dedup_key=f"user-welcome-{user.id}",
            related_module="accounts",
            reference_id=str(user.id),
            source_model="accounts.user",
            source_id=user.id,
            created_by=self.request.user,
            direct_users=[user],
            direct_emails=[user.email],
        )

    def perform_update(self, serializer):
        user = serializer.save()
        log_audit_event(
            request=self.request,
            action="user_update",
            module="accounts",
            description=f"Updated user account {user.email}.",
            target=user,
        )

    def perform_destroy(self, instance):
        log_audit_event(
            request=self.request,
            action="user_delete",
            module="accounts",
            description=f"Deleted user account {instance.email}.",
            target=instance,
        )
        instance.delete()

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])
        log_audit_event(
            request=request,
            action="user_toggle_active",
            module="accounts",
            description=f"Set user {user.email} active={user.is_active}.",
            target=user,
            metadata={"is_active": user.is_active},
        )
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        user = self.get_object()
        serializer = AdminResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        log_audit_event(
            request=request,
            action="user_reset_password",
            module="accounts",
            description=f"Admin reset password for {user.email}.",
            target=user,
        )
        return Response({"detail": "Password reset completed."}, status=status.HTTP_200_OK)
