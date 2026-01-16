import { Navigate } from "react-router-dom";
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { RequireAuth } from "./layout/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import {
  CallLogsPage,
  ContactsPage,
  CustomersPage,
  DashboardPage,
  KnowledgeBaseAgentPage,
  KnowledgeBaseArticlePage,
  KnowledgeBasePublicCategoryPage,
  KnowledgeBasePublicPage,
  MyTicketNewPage,
  MyTicketPage,
  MyTicketsPage,
  SearchPage,
  TicketNewPage,
  TicketPage,
  TicketsPage,
} from "./pages/RoutePages";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/tickets" replace /> },

      {
        path: "tickets",
        element: (
          <RequireAuth requireAgent>
            <TicketsPage />
          </RequireAuth>
        ),
      },
      {
        path: "tickets/new/:templateId?",
        element: (
          <RequireAuth requireAgent>
            <TicketNewPage />
          </RequireAuth>
        ),
      },
      {
        path: "tickets/:ticketId",
        element: (
          <RequireAuth requireAgent>
            <TicketPage />
          </RequireAuth>
        ),
      },
      {
        path: "dashboard",
        element: (
          <RequireAuth requireAgent>
            <DashboardPage />
          </RequireAuth>
        ),
      },
      {
        path: "kb",
        element: (
          <RequireAuth requireAgent>
            <KnowledgeBaseAgentPage />
          </RequireAuth>
        ),
      },
      {
        path: "kb/articles/:articleId",
        element: (
          <RequireAuth requireAgent>
            <KnowledgeBaseArticlePage />
          </RequireAuth>
        ),
      },
      {
        path: "search",
        element: (
          <RequireAuth requireAgent>
            <SearchPage />
          </RequireAuth>
        ),
      },
      {
        path: "customers",
        element: (
          <RequireAuth requireAgent>
            <CustomersPage />
          </RequireAuth>
        ),
      },
      {
        path: "contacts",
        element: (
          <RequireAuth requireAgent>
            <ContactsPage />
          </RequireAuth>
        ),
      },
      {
        path: "call-logs",
        element: (
          <RequireAuth requireAgent>
            <CallLogsPage />
          </RequireAuth>
        ),
      },

      {
        path: "my-tickets",
        element: <MyTicketsPage />,
      },
      {
        path: "my-tickets/new",
        element: <MyTicketNewPage />,
      },
      {
        path: "my-tickets/:ticketId",
        element: <MyTicketPage />,
      },
      {
        path: "kb-public",
        element: <KnowledgeBasePublicPage />,
      },
      {
        path: "kb-public/:categoryId",
        element: <KnowledgeBasePublicCategoryPage />,
      },
      {
        path: "kb-public/articles/:articleId",
        element: <KnowledgeBaseArticlePage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
