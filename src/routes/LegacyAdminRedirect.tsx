import { Navigate, useLocation } from 'react-router-dom';
import { ADMIN_BASE } from '../constants/adminRoutes';

function mapLegacyAdminPath(pathname: string) {
  if (pathname === '/apexcareir-main' || pathname === '/apexcareir-main/login') {
    return ADMIN_BASE;
  }
  if (pathname.startsWith('/apexcareir-main/app/')) {
    return pathname.replace('/apexcareir-main/app', ADMIN_BASE);
  }
  if (pathname.startsWith('/apexcareir-main/')) {
    return pathname.replace('/apexcareir-main', ADMIN_BASE);
  }
  return ADMIN_BASE;
}

export default function LegacyAdminRedirect() {
  const location = useLocation();
  const nextPath = mapLegacyAdminPath(location.pathname);
  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />;
}
