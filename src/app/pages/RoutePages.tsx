import { useParams } from "react-router-dom";
import { PlaceholderPage } from "./PlaceholderPage";

export function TicketsPage() {
  return <PlaceholderPage title="Tickets" subtitle="Agent ticket list" />;
}

export function TicketPage() {
  const { ticketId } = useParams();
  return <PlaceholderPage title={`Ticket ${ticketId ?? ""}`.trim()} subtitle="Agent ticket detail" />;
}

export function TicketNewPage() {
  const { templateId } = useParams();
  return <PlaceholderPage title="New ticket" subtitle={templateId ? `Template: ${templateId}` : ""} />;
}

export function DashboardPage() {
  return <PlaceholderPage title="Dashboard" subtitle="Agent dashboard" />;
}

export function SearchPage() {
  return <PlaceholderPage title="Search" subtitle="Search tickets and knowledge" />;
}

export function KnowledgeBaseAgentPage() {
  return <PlaceholderPage title="Knowledge Base" subtitle="Agent knowledge base" />;
}

export function KnowledgeBasePublicPage() {
  return <PlaceholderPage title="Knowledge Base" subtitle="Customer knowledge base" />;
}

export function KnowledgeBasePublicCategoryPage() {
  const { categoryId } = useParams();
  return <PlaceholderPage title="Knowledge Base" subtitle={`Category ${categoryId ?? ""}`.trim()} />;
}

export function KnowledgeBaseArticlePage() {
  const { articleId } = useParams();
  return <PlaceholderPage title={`Article ${articleId ?? ""}`.trim()} subtitle="Knowledge base article" />;
}

export function CustomersPage() {
  return <PlaceholderPage title="Customers" subtitle="Customer list" />;
}

export function ContactsPage() {
  return <PlaceholderPage title="Contacts" subtitle="Contacts list" />;
}

export function CallLogsPage() {
  return <PlaceholderPage title="Call logs" subtitle="Telephony" />;
}

export function MyTicketsPage() {
  return <PlaceholderPage title="My tickets" subtitle="Customer portal" />;
}

export function MyTicketPage() {
  const { ticketId } = useParams();
  return <PlaceholderPage title={`My ticket ${ticketId ?? ""}`.trim()} subtitle="Customer ticket detail" />;
}

export function MyTicketNewPage() {
  return <PlaceholderPage title="New request" subtitle="Customer portal" />;
}
