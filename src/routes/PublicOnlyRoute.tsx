import { Navigate, Outlet } from 'react-router-dom';
import { ADMIN_ROUTES } from '../constants/adminRoutes';
import { useAuthStore } from '../store';

export default function PublicOnlyRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return accessToken ? <Navigate to={ADMIN_ROUTES.dashboard} replace /> : <Outlet />;
}
