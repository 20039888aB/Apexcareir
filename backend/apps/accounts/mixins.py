from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import HasBusinessPermission


class SuperAdminDestroyMixin:
    """
    Destructive actions (destroy/purge/force_delete) are allowed for users who
    hold the view's required business permission. Superadmins always pass.
    """

    mutating_actions = {"destroy", "purge", "force_delete", "purge_history"}

    def get_permissions(self):
        return [IsAuthenticated(), HasBusinessPermission()]
