import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import DashboardPage from './pages/Dashboard/DashboardPage';
import DocumentsPage from './pages/Documents/DocumentsPage';
import ProjectsPage from './pages/Projects/ProjectsPage';
import ProjectDetailPage from './pages/Projects/ProjectDetailPage';
import PaymentsPage from './pages/Payments/PaymentsPage';
import PaymentDetailPage from './pages/Payments/PaymentDetailPage';
import PaymentAdvicesPage from './pages/PaymentAdvices/PaymentAdvicesPage';
import ReconciliationPage from './pages/Reconciliation/ReconciliationPage';
import ReportsPage from './pages/Reports/ReportsPage';
import ExceptionsPage from './pages/Exceptions/ExceptionsPage';
import SettingsPage from './pages/Settings/SettingsPage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="payments/:id" element={<PaymentDetailPage />} />
        <Route path="payment-advices" element={<PaymentAdvicesPage />} />
        <Route path="reconciliation" element={<ReconciliationPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="exceptions" element={<ExceptionsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
