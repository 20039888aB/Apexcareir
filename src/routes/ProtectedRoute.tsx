import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getMe } from '../services';
import { useAuthStore } from '../store';

type ProtectedRouteProps = {
  requiredPermission?: string;
  requiredAnyPermissions?: string[];
  superAdminOnly?: boolean;
};

export default function ProtectedRoute({
  requiredPermission,
  requiredAnyPermissions,
  superAdminOnly = false,
}: ProtectedRouteProps) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearTokens = useAuthStore((state) => state.clearTokens);

  const shouldFetchUser = Boolean(accessToken) && !user;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getMe,
    enabled: shouldFetchUser,
    retry: false,
  });

  const resolvedUser = user ?? data ?? null;

  useEffect(() => {
    if (data) {
      setUser(data);
    }
  }, [data, setUser]);

  useEffect(() => {
    if (isError && shouldFetchUser) {
      queryClient.removeQueries({ queryKey: ['auth', 'me'] });
      clearTokens();
    }
  }, [isError, shouldFetchUser, clearTokens, queryClient]);

  if (!accessToken) {
    return <Navigate to="/apexcareir-main/login" state={{ from: location }} replace />;
  }

  if (shouldFetchUser && isLoading) {
    return <div className="p-6 text-sm text-slate-600">Loading your account...</div>;
  }

  if (shouldFetchUser && isError) {
    return <Navigate to="/apexcareir-main/login" replace />;
  }

  if (!resolvedUser) {
    return <Navigate to="/apexcareir-main/login" replace />;
  }

  if (superAdminOnly && resolvedUser.role !== 'superadmin') {
    return <Navigate to="/apexcareir-main/unauthorized" replace />;
  }

  if (requiredAnyPermissions?.length && resolvedUser.role !== 'superadmin') {
    const hasAny = requiredAnyPermissions.some((permission) => resolvedUser.permissions.includes(permission));
    if (!hasAny) {
      return <Navigate to="/apexcareir-main/unauthorized" replace />;
    }
  }

  if (requiredPermission && resolvedUser.role !== 'superadmin' && !resolvedUser.permissions.includes(requiredPermission)) {
    return <Navigate to="/apexcareir-main/unauthorized" replace />;
  }

  return <Outlet />;
}
