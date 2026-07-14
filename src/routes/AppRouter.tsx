import { Navigate, Route, Routes } from 'react-router-dom';

import Layout from '../components/layout/Layout';

import AboutPage from '../pages/AboutPage';

import ApexcareAIAssistantPage from '../pages/ApexcareAIAssistantPage';

import BlogPage from '../pages/BlogPage';

import BlogPostPage from '../pages/BlogPostPage';

import BookAppointmentPage from '../pages/BookAppointmentPage';

import ContactPage from '../pages/ContactPage';

import FAQPage from '../pages/FAQPage';

import HomePage from '../pages/HomePage';

import ServiceDetailPage from '../pages/ServiceDetailPage';

import ServicesPage from '../pages/ServicesPage';

import BusinessLayout from '../layouts/apexcareir/BusinessLayout';

import AuditLogsPage from '../pages/apexcareir/AuditLogsPage';

import AppointmentsPage from '../pages/apexcareir/AppointmentsPage';

import ChangePasswordPage from '../pages/apexcareir/ChangePasswordPage';

import ContactRequestsPage from '../pages/apexcareir/ContactRequestsPage';

import CustomersPage from '../pages/apexcareir/CustomersPage';

import CustomerProfilePage from '../pages/apexcareir/CustomerProfilePage';

import CompanySettingsPage from '../pages/apexcareir/CompanySettingsPage';

import DashboardPage from '../pages/apexcareir/DashboardPage';

import FinancePage from '../pages/apexcareir/FinancePage';

import ForgotPasswordPage from '../pages/apexcareir/ForgotPasswordPage';

import InventoryPage from '../pages/apexcareir/InventoryPage';

import InvoicesPage from '../pages/apexcareir/InvoicesPage';

import LoginPage from '../pages/apexcareir/LoginPage';

import NotificationsPage from '../pages/apexcareir/NotificationsPage';

import ProfilePage from '../pages/apexcareir/ProfilePage';

import ReportsPage from '../pages/apexcareir/ReportsPage';

import SchedulerControlPage from '../pages/apexcareir/SchedulerControlPage';

import ResetPasswordPage from '../pages/apexcareir/ResetPasswordPage';

import SalesPage from '../pages/apexcareir/SalesPage';

import SuppliersPage from '../pages/apexcareir/SuppliersPage';

import UnauthorizedPage from '../pages/apexcareir/UnauthorizedPage';

import UsersManagementPage from '../pages/apexcareir/UsersManagementPage';

import ProtectedRoute from './ProtectedRoute';

import PublicOnlyRoute from './PublicOnlyRoute';

import LegacyAdminRedirect from './LegacyAdminRedirect';



export default function AppRouter() {

  return (

    <Routes>

      <Route element={<Layout />}>

        <Route index element={<HomePage />} />

        <Route path="about" element={<AboutPage />} />

        <Route path="services" element={<ServicesPage />} />

        <Route path="services/:slug" element={<ServiceDetailPage />} />

        <Route path="faq" element={<FAQPage />} />

        <Route path="blog" element={<BlogPage />} />

        <Route path="blog/:slug" element={<BlogPostPage />} />

        <Route path="contact" element={<ContactPage />} />

        <Route path="book-appointment" element={<BookAppointmentPage />} />

        <Route path="apexcareir-ai" element={<ApexcareAIAssistantPage />} />

      </Route>



      <Route path="apexcareir-main/*" element={<LegacyAdminRedirect />} />



      <Route path="admin1">

        <Route element={<PublicOnlyRoute />}>

          <Route index element={<LoginPage />} />

          <Route path="forgot-password" element={<ForgotPasswordPage />} />

          <Route path="reset-password" element={<ResetPasswordPage />} />

        </Route>



        <Route path="unauthorized" element={<UnauthorizedPage />} />



        <Route element={<ProtectedRoute />}>

          <Route element={<BusinessLayout />}>

            <Route index element={<Navigate to="dashboard" replace />} />

            <Route element={<ProtectedRoute requiredPermission="dashboard.dashboard" />}>

              <Route path="dashboard" element={<DashboardPage />} />

            </Route>

            <Route element={<ProtectedRoute requiredPermission="inventory.product_management" />}>

              <Route path="inventory" element={<InventoryPage />} />

            </Route>

            <Route element={<ProtectedRoute requiredPermission="sales.sales_management" />}>

              <Route path="sales" element={<SalesPage />} />

              <Route path="invoices" element={<InvoicesPage />} />

              <Route path="customers" element={<CustomersPage />} />

              <Route path="customers/:customerId" element={<CustomerProfilePage />} />

            </Route>

            <Route

              element={

                <ProtectedRoute requiredAnyPermissions={['finance.expense_tracking', 'finance.payroll']} />

              }

            >

              <Route path="finance" element={<FinancePage />} />

            </Route>

            <Route element={<ProtectedRoute requiredPermission="suppliers.supplier_management" />}>

              <Route path="suppliers" element={<SuppliersPage />} />

            </Route>

            <Route element={<ProtectedRoute requiredPermission="reports.reports" />}>

              <Route path="reports" element={<ReportsPage />} />

            </Route>

            <Route element={<ProtectedRoute requiredPermission="notifications.notifications" />}>

              <Route path="notifications" element={<NotificationsPage />} />

            </Route>

            <Route element={<ProtectedRoute requiredPermission="notifications.notifications" />}>

              <Route path="scheduler" element={<SchedulerControlPage />} />

            </Route>

            <Route element={<ProtectedRoute requiredPermission="audit_logs.audit_logs" />}>

              <Route path="audit-logs" element={<AuditLogsPage />} />

            </Route>

            <Route element={<ProtectedRoute requiredPermission="appointments.appointment_management" />}>

              <Route path="appointments" element={<AppointmentsPage />} />

            </Route>

            <Route element={<ProtectedRoute requiredPermission="appointments.appointment_management" />}>

              <Route path="contact-requests" element={<ContactRequestsPage />} />

            </Route>

            <Route element={<ProtectedRoute superAdminOnly />}>

              <Route path="users" element={<UsersManagementPage />} />

              <Route path="settings" element={<CompanySettingsPage />} />

            </Route>

            <Route path="profile" element={<ProfilePage />} />

            <Route path="change-password" element={<ChangePasswordPage />} />

          </Route>

        </Route>

      </Route>

    </Routes>

  );

}


