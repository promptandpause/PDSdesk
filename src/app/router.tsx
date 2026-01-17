import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import {
  DashboardPage,
  TicketsPage,
  TicketDetailPage,
  TicketNewPage,
  KnowledgeBasePage,
  KBArticleEditorPage,
  CustomersPage,
  ContactsPage,
  SettingsPage,
  MyTicketsPage,
  CustomerQueuePage,
  AssetsPage,
  SavedRepliesPage,
  PlannerPage,
  KanbanBoardPage,
  ProblemsPage,
  ServiceCatalogPage,
  TicketTemplatesPage,
  ReservationsPage,
  ReportsPage,
  CallLogsPage,
  QueuePage,
  OperatorGroupsPage,
  SLAPoliciesPage,
  RoutingRulesPage,
  AuditLogPage,
  RolesManagementPage,
  UserManagementPage,
  QueueManagementPage,
  SystemSettingsPage,
  ServiceCatalogAdminPage,
  LoginPage,
  TicketRatingPage,
} from './pages';
import { RequireAuth } from '../lib/auth/RequireAuth';

import { useAuth } from '../lib/auth/AuthProvider';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: 'var(--itsm-space-6)' }}>
      <h1 style={{ fontSize: 'var(--itsm-text-xl)', fontWeight: 600, color: 'var(--itsm-text-primary)' }}>
        {title}
      </h1>
      <p style={{ marginTop: 'var(--itsm-space-2)', color: 'var(--itsm-text-tertiary)' }}>
        This page is under construction.
      </p>
    </div>
  );
}

// Smart redirect based on user role
function RoleBasedRedirect() {
  const { roles, loading } = useAuth();
  
  if (loading) {
    return <div style={{ padding: 'var(--itsm-space-6)', color: 'var(--itsm-text-tertiary)' }}>Loading...</div>;
  }
  
  // Operators and admins go to dashboard
  const isOperator = roles.includes('global_admin') || roles.includes('service_desk_admin') || roles.includes('operator');
  
  if (isOperator) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Requesters (regular employees) go to service catalog
  return <Navigate to="/service-catalog" replace />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <RoleBasedRedirect /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'tickets', element: <TicketsPage /> },
      { path: 'tickets/new', element: <TicketNewPage /> },
      { path: 'tickets/:id', element: <TicketDetailPage /> },
      { path: 'customer-queue', element: <CustomerQueuePage /> },
      { path: 'customer-queue/new', element: <TicketNewPage /> },
      { path: 'customer-queue/:id', element: <TicketDetailPage /> },
      { path: ':queueKey', element: <QueuePage /> },
      { path: 'kb', element: <KnowledgeBasePage /> },
      { path: 'kb/new', element: <KBArticleEditorPage /> },
      { path: 'kb/:id', element: <KBArticleEditorPage /> },
      { path: 'kb-public', element: <KnowledgeBasePage /> },
      { path: 'saved-replies', element: <SavedRepliesPage /> },
      { path: 'planner', element: <PlannerPage /> },
      { path: 'kanban', element: <KanbanBoardPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'contacts', element: <ContactsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/operator-groups', element: <OperatorGroupsPage /> },
      { path: 'settings/sla-policies', element: <SLAPoliciesPage /> },
      { path: 'settings/routing-rules', element: <RoutingRulesPage /> },
      { path: 'settings/audit-log', element: <AuditLogPage /> },
      { path: 'settings/roles', element: <RolesManagementPage /> },
      { path: 'settings/users', element: <UserManagementPage /> },
      { path: 'settings/queues', element: <QueueManagementPage /> },
      { path: 'settings/system', element: <SystemSettingsPage /> },
      { path: 'settings/service-catalog', element: <ServiceCatalogAdminPage /> },
      { path: 'assets', element: <AssetsPage /> },
      { path: 'problems', element: <ProblemsPage /> },
      { path: 'service-catalog', element: <ServiceCatalogPage /> },
      { path: 'ticket-templates', element: <TicketTemplatesPage /> },
      { path: 'reservations', element: <ReservationsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'call-logs', element: <CallLogsPage /> },
      { path: 'my-tickets', element: <MyTicketsPage /> },
      { path: 'my-tickets/new', element: <TicketNewPage /> },
      { path: 'my-tickets/:id', element: <TicketDetailPage /> },
      { path: 'search', element: <PlaceholderPage title="Search" /> },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/rate-ticket/:ticketId',
    element: (
      <RequireAuth>
        <TicketRatingPage />
      </RequireAuth>
    ),
  },
], {
  future: {
    v7_relativeSplatPath: true,
  },
});
