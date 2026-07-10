import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const user = useAuthStore((state) => state.user);
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);
  const clearTokens = useAuthStore((state) => state.clearTokens);

  return useMemo(
    () => ({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: Boolean(accessToken),
      isSuperAdmin: user?.role === 'superadmin',
      hasPermission: (permissionCode: string) =>
        user?.role === 'superadmin' || Boolean(user?.permissions?.includes(permissionCode)),
      setTokens,
      setUser,
      clearTokens,
    }),
    [accessToken, refreshToken, user, setTokens, setUser, clearTokens],
  );
}
