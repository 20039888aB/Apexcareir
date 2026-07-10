from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import HasBusinessPermission, IsSuperAdmin


class SuperAdminDestroyMixin:
    superadmin_only_actions = {"destroy", "purge", "force_delete", "purge_history"}

    def get_permissions(self):
        action = getattr(self, "action", None)
        if action in self.superadmin_only_actions:
            return [IsAuthenticated(), IsSuperAdmin()]
        return [IsAuthenticated(), HasBusinessPermission()]
