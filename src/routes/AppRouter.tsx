import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import PageLoader from '../components/PageLoader';
import Layout from '../components/layout/Layout';
import BusinessLayout from '../layouts/apexcareir/BusinessLayout';
import ProtectedRoute from './ProtectedRoute';
import PublicOnlyRoute from './PublicOnlyRoute';
import LegacyAdminRedirect from './LegacyAdminRedirect';

const HomePage = lazy(() => import('../pages/HomePage'));
const AboutPage = lazy(() => import('../pages/AboutPage'));
const ServicesPage = lazy(() => import('../pages/ServicesPage'));
const ServiceDetailPage = lazy(() => import('../pages/ServiceDetailPage'));
const FAQPage = lazy(() => import('../pages/FAQPage'));
const BlogPage = lazy(() => import('../pages/BlogPage'));
const BlogPostPage = lazy(() => import('../pages/BlogPostPage'));
const ContactPage = lazy(() => import('../pages/ContactPage'));
const BookAppointmentPage = lazy(() => import('../pages/BookAppointmentPage'));
const ApexcareAIAssistantPage = lazy(() => import('../pages/ApexcareAIAssistantPage'));

const LoginPage = lazy(() => import('../pages/apexcareir/LoginPage'));
const ForgotPasswordPage = lazy(() => import('../pages/apexcareir/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/apexcareir/ResetPasswordPage'));
const UnauthorizedPage = lazy(() => import('../pages/apexcareir/UnauthorizedPage'));
const DashboardPage = lazy(() => import('../pages/apexcareir/DashboardPage'));
const InventoryPage = lazy(() => import('../pages/apexcareir/InventoryPage'));
const SalesPage = lazy(() => import('../pages/apexcareir/SalesPage'));
const InvoicesPage = lazy(() => import('../pages/apexcareir/InvoicesPage'));
const CustomersPage = lazy(() => import('../pages/apexcareir/CustomersPage'));
const CustomerProfilePage = lazy(() => import('../pages/apexcareir/CustomerProfilePage'));
const FinancePage = lazy(() => import('../pages/apexcareir/FinancePage'));
const SuppliersPage = lazy(() => import('../pages/apexcareir/SuppliersPage'));
const ReportsPage = lazy(() => import('../pages/apexcareir/ReportsPage'));
const NotificationsPage = lazy(() => import('../pages/apexcareir/NotificationsPage'));
const SchedulerControlPage = lazy(() => import('../pages/apexcareir/SchedulerControlPage'));
const AuditLogsPage = lazy(() => import('../pages/apexcareir/AuditLogsPage'));
const AppointmentsPage = lazy(() => import('../pages/apexcareir/AppointmentsPage'));
const ContactRequestsPage = lazy(() => import('../pages/apexcareir/ContactRequestsPage'));
const UsersManagementPage = lazy(() => import('../pages/apexcareir/UsersManagementPage'));
const CompanySettingsPage = lazy(() => import('../pages/apexcareir/CompanySettingsPage'));
const ProfilePage = lazy(() => import('../pages/apexcareir/ProfilePage'));
const ChangePasswordPage = lazy(() => import('../pages/apexcareir/ChangePasswordPage'));

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LazyPage><HomePage /></LazyPage>} />
        <Route path="about" element={<LazyPage><AboutPage /></LazyPage>} />
        <Route path="services" element={<LazyPage><ServicesPage /></LazyPage>} />
        <Route path="services/:slug" element={<LazyPage><ServiceDetailPage /></LazyPage>} />
        <Route path="faq" element={<LazyPage><FAQPage /></LazyPage>} />
        <Route path="blog" element={<LazyPage><BlogPage /></LazyPage>} />
        <Route path="blog/:slug" element={<LazyPage><BlogPostPage /></LazyPage>} />
        <Route path="contact" element={<LazyPage><ContactPage /></LazyPage>} />
        <Route path="book-appointment" element={<LazyPage><BookAppointmentPage /></LazyPage>} />
        <Route path="apexcareir-ai" element={<LazyPage><ApexcareAIAssistantPage /></LazyPage>} />
      </Route>

      <Route path="apexcareir-main/*" element={<LegacyAdminRedirect />} />

      <Route path="admin1">
        <Route element={<PublicOnlyRoute />}>
          <Route index element={<LazyPage><LoginPage /></LazyPage>} />
          <Route path="forgot-password" element={<LazyPage><ForgotPasswordPage /></LazyPage>} />
          <Route path="reset-password" element={<LazyPage><ResetPasswordPage /></LazyPage>} />
        </Route>

        <Route path="unauthorized" element={<LazyPage><UnauthorizedPage /></LazyPage>} />

        <Route element={<ProtectedRoute />}>
          <Route element={<BusinessLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />

            <Route element={<ProtectedRoute requiredPermission="dashboard.dashboard" />}>
              <Route path="dashboard" element={<LazyPage><DashboardPage /></LazyPage>} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="inventory.product_management" />}>
              <Route path="inventory" element={<LazyPage><InventoryPage /></LazyPage>} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="sales.sales_management" />}>
              <Route path="sales" element={<LazyPage><SalesPage /></LazyPage>} />
              <Route path="invoices" element={<LazyPage><InvoicesPage /></LazyPage>} />
              <Route path="customers" element={<LazyPage><CustomersPage /></LazyPage>} />
              <Route path="customers/:customerId" element={<LazyPage><CustomerProfilePage /></LazyPage>} />
            </Route>

            <Route element={<ProtectedRoute requiredAnyPermissions={['finance.expense_tracking', 'finance.payroll']} />}>
              <Route path="finance" element={<LazyPage><FinancePage /></LazyPage>} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="suppliers.supplier_management" />}>
              <Route path="suppliers" element={<LazyPage><SuppliersPage /></LazyPage>} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="reports.reports" />}>
              <Route path="reports" element={<LazyPage><ReportsPage /></LazyPage>} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="notifications.notifications" />}>
              <Route path="notifications" element={<LazyPage><NotificationsPage /></LazyPage>} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="notifications.notifications" />}>
              <Route path="scheduler" element={<LazyPage><SchedulerControlPage /></LazyPage>} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="audit_logs.audit_logs" />}>
              <Route path="audit-logs" element={<LazyPage><AuditLogsPage /></LazyPage>} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="appointments.appointment_management" />}>
              <Route path="appointments" element={<LazyPage><AppointmentsPage /></LazyPage>} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="appointments.appointment_management" />}>
              <Route path="contact-requests" element={<LazyPage><ContactRequestsPage /></LazyPage>} />
            </Route>

            <Route element={<ProtectedRoute superAdminOnly />}>
              <Route path="users" element={<LazyPage><UsersManagementPage /></LazyPage>} />
              <Route path="settings" element={<LazyPage><CompanySettingsPage /></LazyPage>} />
            </Route>

            <Route path="profile" element={<LazyPage><ProfilePage /></LazyPage>} />
            <Route path="change-password" element={<LazyPage><ChangePasswordPage /></LazyPage>} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
