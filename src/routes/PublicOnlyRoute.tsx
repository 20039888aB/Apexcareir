import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store';

export default function PublicOnlyRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return accessToken ? <Navigate to="/apexcareir-main/app/dashboard" replace /> : <Outlet />;
}
