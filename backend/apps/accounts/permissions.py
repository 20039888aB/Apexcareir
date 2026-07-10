from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
    message = "Only SuperAdmin users can perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (getattr(user, "role", None) == "superadmin" or user.is_superuser)
        )


class HasBusinessPermission(BasePermission):
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "role", None) == "superadmin" or user.is_superuser:
            return True
        required_permission = getattr(view, "required_permission", None)
        required_any_permissions = getattr(view, "required_any_permissions", None)
        if required_any_permissions:
            return any(user.has_business_permission(permission_code) for permission_code in required_any_permissions)
        if not required_permission:
            return True
        return user.has_business_permission(required_permission)
