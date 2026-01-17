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
  OperatorGroupsPage,
  SLAPoliciesPage,
  RoutingRulesPage,
  AuditLogPage,
  RolesManagementPage,
  UserManagementPage,
  QueueManagementPage,
  SystemSettingsPage,
} from './pages';
import { RequireAuth } from '../lib/auth/RequireAuth';

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

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'tickets', element: <TicketsPage /> },
      { path: 'tickets/new', element: <TicketNewPage /> },
      { path: 'tickets/:id', element: <TicketDetailPage /> },
      { path: 'customer-queue', element: <CustomerQueuePage /> },
      { path: 'customer-queue/new', element: <TicketNewPage /> },
      { path: 'customer-queue/:id', element: <TicketDetailPage /> },
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
    element: <PlaceholderPage title="Login" />,
  },
]);
