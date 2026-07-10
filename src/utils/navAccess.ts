import { businessNavGroups, type NavChild, type NavGroup } from '../data/businessNav';
import type { AuthUser } from '../store/authStore';

export function canAccessNavItem(
  user: AuthUser | null,
  permission?: string,
  permissionsAny?: string[],
  superadminOnly?: boolean,
): boolean {
  if (superadminOnly) {
    return user?.role === 'superadmin';
  }
  if (!permission && !permissionsAny?.length) {
    return true;
  }
  if (!user) {
    return false;
  }
  if (user.role === 'superadmin') {
    return true;
  }
  if (permissionsAny?.length) {
    return permissionsAny.some((permissionCode) => user.permissions.includes(permissionCode));
  }
  return Boolean(permission && user.permissions.includes(permission));
}

export function filterVisibleNavChild(user: AuthUser | null, child: NavChild): boolean {
  return canAccessNavItem(user, child.permission, child.permissionsAny, child.superadminOnly);
}

export function filterVisibleNavGroups(user: AuthUser | null): NavGroup[] {
  return businessNavGroups
    .map((group) => ({
      ...group,
      children: group.children.filter((child) => filterVisibleNavChild(user, child)),
    }))
    .filter((group) => group.children.length > 0);
}
