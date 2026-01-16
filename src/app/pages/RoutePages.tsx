import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { PlaceholderPage } from "./PlaceholderPage";

type TicketRow = {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  updated_at: string;
};

type TicketCommentRow = {
  id: string;
  author_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  author?: { full_name: string | null; email: string | null }[] | null;
};

type SavedReplyRow = {
  id: string;
  name: string;
  content: string;
  visibility: string;
};

type UserNotificationRow = {
  id: string;
  ticket_id: string | null;
  title: string | null;
  body: string | null;
  event_type: string;
  is_read: boolean;
  created_at: string;
};

type KnowledgeArticleRow = {
  id: string;
  title: string;
  category: string | null;
  status: string;
  updated_at: string;
  view_count: number;
  like_count: number;
};

const STATUS_COLORS: Record<string, string> = {
  open: "info",
  pending: "warning",
  resolved: "success",
  closed: "neutral",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "danger",
};

export function TicketsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [sortField, setSortField] = useState<string>("updated_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      let q = supabase
        .from("tickets")
        .select("id,ticket_number,title,status,priority,updated_at", { count: "exact" })
        .order(sortField, { ascending: sortAsc })
        .limit(50);

      const trimmed = query.trim();
      if (trimmed) {
        q = q.or(`title.ilike.%${trimmed}%,ticket_number.ilike.%${trimmed}%,external_number.ilike.%${trimmed}%`);
      }
      if (statusFilter) {
        q = q.eq("status", statusFilter);
      }
      if (priorityFilter) {
        q = q.eq("priority", priorityFilter);
      }

      const { data, error, count } = await q;
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setTickets([]);
        setTotalCount(0);
      } else {
        setTickets((data as TicketRow[]) ?? []);
        setTotalCount(count ?? 0);
      }
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [query, statusFilter, priorityFilter, sortField, sortAsc, supabase]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc((v) => !v);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="pds-page">
      {/* Header */}
      <div className="pds-page-header">
        <div className="pds-toolbar">
          <div className="flex items-center gap-3">
            <span className="pds-page-title">Tickets</span>
            <span className="pds-text-muted" style={{ fontSize: 12 }}>
              {totalCount} total
            </span>
          </div>
          <div className="pds-toolbar-actions">
            <button
              type="button"
              className="pds-btn pds-btn--primary pds-focus"
              onClick={() => navigate("/tickets/new")}
            >
              + Create
            </button>
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className="flex items-center justify-between gap-2 px-5 pb-4 pt-3">
        <input
          className="pds-input"
          placeholder="Search tickets..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <div className="flex items-center gap-2">
          <select
            className="pds-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 120 }}
          >
            <option value="">All status</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="pds-input"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ width: 120 }}
          >
            <option value="">All priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {error ? (
        <div className="pds-text-muted" style={{ fontSize: 13, padding: 16 }}>
          {error}
        </div>
      ) : loading ? (
        <div className="pds-text-muted" style={{ fontSize: 13, padding: 16 }}>
          Loading...
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="pds-text-muted" style={{ fontSize: 14 }}>No tickets found.</div>
          <button
            type="button"
            className="pds-btn pds-btn--primary pds-focus"
            onClick={() => navigate("/tickets/new")}
          >
            Create your first ticket
          </button>
        </div>
      ) : (
        <div className="pds-table-wrap">
          <table className="pds-table">
            <thead className="pds-thead">
              <tr>
                <th
                  className="pds-th"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("ticket_number")}
                >
                  # {sortField === "ticket_number" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th
                  className="pds-th"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("title")}
                >
                  Subject {sortField === "title" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th
                  className="pds-th"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("status")}
                >
                  Status {sortField === "status" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th
                  className="pds-th"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("priority")}
                >
                  Priority {sortField === "priority" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th
                  className="pds-th"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("updated_at")}
                >
                  Updated {sortField === "updated_at" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  className="pds-row"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                >
                  <td className="pds-td">
                    <span className="pds-link">{t.ticket_number}</span>
                  </td>
                  <td className="pds-td" style={{ fontWeight: 500 }}>
                    {t.title}
                  </td>
                  <td className="pds-td">
                    <span className={`pds-badge pds-badge--${STATUS_COLORS[t.status] ?? "neutral"}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="pds-td">
                    <span className={`pds-badge pds-badge--${PRIORITY_COLORS[t.priority] ?? "neutral"}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="pds-td pds-text-muted" style={{ fontSize: 12 }}>
                    {new Date(t.updated_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {!loading && tickets.length > 0 ? (
        <div className="pds-statbar" style={{ marginTop: "auto" }}>
          <div className="pds-stat">
            <span className="pds-stat-label">Showing</span>
            <span className="pds-stat-value">{tickets.length}</span>
          </div>
          <div className="pds-stat">
            <span className="pds-stat-label">of</span>
            <span className="pds-stat-value">{totalCount}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TicketPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();
  const { ticketId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<any | null>(null);
  const [comments, setComments] = useState<TicketCommentRow[]>([]);
  const [savedReplies, setSavedReplies] = useState<SavedReplyRow[]>([]);

  const [reloadNonce, setReloadNonce] = useState(0);

  const [newBody, setNewBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<"activity" | "comments">("activity");
  const [sidebarTab, setSidebarTab] = useState<"details" | "contact">("details");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!ticketId) return;

      setLoading(true);
      setError(null);

      const [{ data: ticket, error: ticketError }, { data: comments, error: commentsError }, { data: replies, error: repliesError }] =
        await Promise.all([
          supabase
            .from("tickets")
            .select(
              "id,ticket_number,title,description,status,priority,category,created_at,updated_at,requester_email,requester_name,assignee_id",
            )
            .eq("id", ticketId)
            .maybeSingle(),
          supabase
            .from("ticket_comments")
            .select("id,author_id,body,is_internal,created_at,author:profiles(full_name,email)")
            .eq("ticket_id", ticketId)
            .order("created_at", { ascending: true }),
          supabase
            .from("saved_replies")
            .select("id,name,content,visibility")
            .order("updated_at", { ascending: false })
            .limit(50),
        ]);

      if (cancelled) return;

      if (ticketError) {
        setError(ticketError.message);
        setTicket(null);
        setComments([]);
        setSavedReplies([]);
        setLoading(false);
        return;
      }

      if (commentsError) {
        setError(commentsError.message);
      }

      if (repliesError) {
        setError(repliesError.message);
      }

      setTicket(ticket ?? null);
      setComments((comments as TicketCommentRow[]) ?? []);
      setSavedReplies((replies as SavedReplyRow[]) ?? []);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [supabase, ticketId, reloadNonce]);

  async function submitComment() {
    if (!ticketId || !user) return;
    const body = newBody.trim();
    if (!body) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase.from("ticket_comments").insert({
      ticket_id: ticketId,
      author_id: user.id,
      body,
      is_internal: isInternal,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    const { data: refreshed, error: refreshError } = await supabase
      .from("ticket_comments")
      .select("id,author_id,body,is_internal,created_at,author:profiles(full_name,email)")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (refreshError) {
      setError(refreshError.message);
    } else {
      setComments((refreshed as TicketCommentRow[]) ?? []);
      setNewBody("");
      setIsInternal(false);
    }
    setSaving(false);
  }

  async function updateStatus(newStatus: string) {
    if (!ticketId) return;
    const { error } = await supabase.from("tickets").update({ status: newStatus }).eq("id", ticketId);
    if (error) {
      setError(error.message);
    } else {
      setTicket((prev: any) => (prev ? { ...prev, status: newStatus } : prev));
    }
  }

  if (!ticketId) {
    return <PlaceholderPage title="Ticket" subtitle="Missing ticket id" />;
  }

  const title = ticket?.ticket_number ? `${ticket.ticket_number} - ${ticket.title ?? ""}` : `Ticket ${ticketId}`;

  return (
    <div className="pds-page">
      {/* Header */}
      <div className="pds-page-header">
        <div className="pds-toolbar">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="pds-btn pds-btn--ghost pds-focus"
              onClick={() => navigate("/tickets")}
              title="Back to tickets"
            >
              ←
            </button>
            <span className="pds-page-title">{title}</span>
          </div>
          <div className="pds-toolbar-actions">
            <button
              type="button"
              className="pds-btn pds-btn--outline pds-focus"
              onClick={() => setReloadNonce((v) => v + 1)}
            >
              Refresh
            </button>
            {ticket ? (
              <select
                className="pds-input"
                value={ticket.status}
                onChange={(e) => void updateStatus(e.target.value)}
                style={{ width: 130 }}
              >
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div className="pds-text-muted" style={{ fontSize: 13, padding: 16 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="pds-text-muted" style={{ fontSize: 14 }}>Loading...</div>
        </div>
      ) : !ticket ? (
        <div className="flex items-center justify-center flex-1">
          <div className="pds-text-muted" style={{ fontSize: 14 }}>Ticket not found.</div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Main Activity Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="pds-subtabs">
              <button
                type="button"
                className="pds-subtab"
                data-active={activeTab === "activity"}
                onClick={() => setActiveTab("activity")}
              >
                Activity
              </button>
              <button
                type="button"
                className="pds-subtab"
                data-active={activeTab === "comments"}
                onClick={() => setActiveTab("comments")}
              >
                Comments ({comments.length})
              </button>
            </div>

            {/* Activity/Comments Panel */}
            <div className="flex-1 overflow-auto p-4">
              {activeTab === "activity" ? (
                <div className="flex flex-col gap-4">
                  {/* Description */}
                  <div className="pds-panel" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 650, color: "var(--pds-text)", marginBottom: 8 }}>Description</div>
                    <div className="pds-text-muted" style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
                      {ticket.description || "(no description)"}
                    </div>
                  </div>

                  {/* Timeline */}
                  {comments.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {comments.map((c) => {
                        const author = Array.isArray(c.author) ? c.author[0] : null;
                        const authorLabel = author?.full_name || author?.email || c.author_id;
                        return (
                          <div
                            key={c.id}
                            className="pds-panel"
                            style={{ padding: 12 }}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex items-center justify-center rounded-full bg-gray-200 text-gray-600"
                                  style={{ width: 28, height: 28, fontSize: 12, fontWeight: 600 }}
                                >
                                  {(authorLabel as string)?.charAt(0)?.toUpperCase() ?? "?"}
                                </div>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{authorLabel}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {c.is_internal ? (
                                  <span className="pds-badge pds-badge--warning">Internal</span>
                                ) : (
                                  <span className="pds-badge pds-badge--info">Public</span>
                                )}
                                <span className="pds-text-muted" style={{ fontSize: 12 }}>
                                  {new Date(c.created_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "var(--pds-text)" }}>
                              {c.body}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="pds-text-muted" style={{ fontSize: 13 }}>No activity yet.</div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {comments.filter((c) => !c.is_internal).length === 0 ? (
                    <div className="pds-text-muted" style={{ fontSize: 13 }}>No public comments yet.</div>
                  ) : (
                    comments
                      .filter((c) => !c.is_internal)
                      .map((c) => {
                        const author = Array.isArray(c.author) ? c.author[0] : null;
                        const authorLabel = author?.full_name || author?.email || c.author_id;
                        return (
                          <div key={c.id} className="pds-panel" style={{ padding: 12 }}>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{authorLabel}</span>
                              <span className="pds-text-muted" style={{ fontSize: 12 }}>
                                {new Date(c.created_at).toLocaleString()}
                              </span>
                            </div>
                            <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "var(--pds-text)" }}>
                              {c.body}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t p-4 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <select
                  className="pds-input"
                  value=""
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const reply = savedReplies.find((r) => r.id === selectedId);
                    if (reply) {
                      setNewBody((prev) => (prev ? `${prev}\n\n${reply.content}` : reply.content));
                    }
                  }}
                  style={{ width: 200 }}
                >
                  <option value="">Insert saved reply...</option>
                  {savedReplies.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <label className="pds-text-muted flex items-center gap-1" style={{ fontSize: 12 }}>
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                  Internal note
                </label>
              </div>
              <textarea
                className="pds-input w-full"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Write a reply..."
                style={{ minHeight: 80, resize: "vertical" }}
              />
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  className="pds-btn pds-btn--primary pds-focus"
                  onClick={() => void submitComment()}
                  disabled={saving || !newBody.trim()}
                >
                  {saving ? "Sending..." : isInternal ? "Add Note" : "Send Reply"}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-[320px] border-l flex flex-col bg-white">
            <div className="pds-subtabs">
              <button
                type="button"
                className="pds-subtab"
                data-active={sidebarTab === "details"}
                onClick={() => setSidebarTab("details")}
              >
                Details
              </button>
              <button
                type="button"
                className="pds-subtab"
                data-active={sidebarTab === "contact"}
                onClick={() => setSidebarTab("contact")}
              >
                Contact
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {sidebarTab === "details" ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="pds-text-muted" style={{ fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Status
                    </div>
                    <span className={`pds-badge pds-badge--${STATUS_COLORS[ticket.status] ?? "neutral"}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <div>
                    <div className="pds-text-muted" style={{ fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Priority
                    </div>
                    <span className={`pds-badge pds-badge--${PRIORITY_COLORS[ticket.priority] ?? "neutral"}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <div>
                    <div className="pds-text-muted" style={{ fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Category
                    </div>
                    <div style={{ fontSize: 13 }}>{ticket.category || "—"}</div>
                  </div>
                  <div>
                    <div className="pds-text-muted" style={{ fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Created
                    </div>
                    <div style={{ fontSize: 13 }}>{new Date(ticket.created_at).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="pds-text-muted" style={{ fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Updated
                    </div>
                    <div style={{ fontSize: 13 }}>{new Date(ticket.updated_at).toLocaleString()}</div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="pds-text-muted" style={{ fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Requester Name
                    </div>
                    <div style={{ fontSize: 13 }}>{ticket.requester_name || "—"}</div>
                  </div>
                  <div>
                    <div className="pds-text-muted" style={{ fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Requester Email
                    </div>
                    <div style={{ fontSize: 13 }}>{ticket.requester_email || "—"}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function NotificationsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<UserNotificationRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) return;
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("user_notifications")
        .select("id,ticket_id,title,body,event_type,is_read,created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data as UserNotificationRow[]) ?? []);
      }
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  async function markRead(id: string) {
    setError(null);
    const { error } = await supabase
      .from("user_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)));
  }

  return (
    <PlaceholderPage title="Notifications" subtitle="Agent notifications">
      {error ? (
        <div className="pds-text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          Loading...
        </div>
      ) : rows.length === 0 ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          No notifications.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((n) => (
            <div
              key={n.id}
              className="pds-panel"
              style={{ padding: 12, display: "flex", justifyContent: "space-between", gap: 12 }}
            >
              <button
                type="button"
                className="pds-btn pds-btn--ghost pds-focus"
                style={{ justifyContent: "flex-start", flex: 1, textAlign: "left", padding: 0 }}
                onClick={() => {
                  if (n.ticket_id) navigate(`/tickets/${n.ticket_id}`);
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontWeight: n.is_read ? 550 : 750, color: "var(--pds-text)" }}>
                    {n.title || n.event_type}
                  </div>
                  {n.body ? (
                    <div className="pds-text-muted" style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
                      {n.body}
                    </div>
                  ) : null}
                  <div className="pds-text-muted" style={{ fontSize: 12 }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {!n.is_read ? (
                  <button
                    type="button"
                    className="pds-btn pds-btn--outline pds-focus"
                    onClick={() => void markRead(n.id)}
                  >
                    Mark read
                  </button>
                ) : (
                  <span className="pds-text-muted" style={{ fontSize: 12, alignSelf: "flex-end" }}>
                    Read
                  </span>
                )}
                {n.ticket_id ? (
                  <button
                    type="button"
                    className="pds-btn pds-btn--outline pds-focus"
                    onClick={() => navigate(`/tickets/${n.ticket_id}`)}
                  >
                    Open ticket
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pds-btn pds-btn--outline pds-focus"
                    onClick={() => navigate("/tickets")}
                  >
                    Tickets
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PlaceholderPage>
  );
}

export function TicketNewPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { templateId } = useParams();

  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [category, setCategory] = useState("General");
  const [ticketType, setTicketType] = useState("itsm_incident");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requesterName, setRequesterName] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTemplate() {
      if (!templateId) return;

      setLoadingTemplate(true);
      setError(null);

      const { data, error } = await supabase
        .from("ticket_templates")
        .select("id,name,defaults")
        .eq("id", templateId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setLoadingTemplate(false);
        return;
      }

      const defaults = (data as any)?.defaults as Record<string, unknown> | undefined;
      if (defaults) {
        if (typeof defaults.title === "string") setTitle(defaults.title);
        if (typeof defaults.description === "string") setDescription(defaults.description);
        if (typeof defaults.category === "string") setCategory(defaults.category);
        if (typeof defaults.ticket_type === "string") setTicketType(defaults.ticket_type);
        if (typeof defaults.requester_email === "string") setRequesterEmail(defaults.requester_email);
        if (typeof defaults.requester_name === "string") setRequesterName(defaults.requester_name);

        const p = defaults.priority;
        if (p === "low" || p === "medium" || p === "high" || p === "urgent") {
          setPriority(p);
        }
      }

      setLoadingTemplate(false);
    }

    void loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [supabase, templateId]);

  async function createTicket() {
    if (!user) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError(null);

    const insertPayload: Record<string, unknown> = {
      title: trimmedTitle,
      description: description.trim() || null,
      priority,
      category: category.trim() || "General",
      requester_id: user.id,
      created_by: user.id,
      ticket_type: ticketType,
      channel: "web",
    };

    const re = requesterEmail.trim();
    const rn = requesterName.trim();
    if (re) insertPayload.requester_email = re;
    if (rn) insertPayload.requester_name = rn;

    const { data, error } = await supabase
      .from("tickets")
      .insert(insertPayload)
      .select("id")
      .maybeSingle();

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    const newId = (data as any)?.id as string | undefined;
    if (!newId) {
      setError("Ticket created but no id returned");
      setSaving(false);
      return;
    }

    setSaving(false);
    navigate(`/tickets/${newId}`);
  }

  return (
    <PlaceholderPage title="New ticket" subtitle={templateId ? `Template: ${templateId}` : ""}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button type="button" className="pds-btn pds-btn--outline pds-focus" onClick={() => navigate("/tickets")}>Return</button>
      </div>

      {loadingTemplate ? (
        <div className="pds-text-muted" style={{ fontSize: 13, marginBottom: 10 }}>
          Loading template...
        </div>
      ) : null}

      {error ? (
        <div className="pds-text-muted" style={{ fontSize: 13, marginBottom: 10 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        <div className="pds-panel" style={{ padding: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div className="pds-text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
                Title
              </div>
              <input className="pds-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" />
            </div>

            <div>
              <div className="pds-text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
                Description
              </div>
              <textarea
                className="pds-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details"
                style={{ minHeight: 160, resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                className="pds-btn pds-btn--solid pds-focus"
                onClick={() => void createTicket()}
                disabled={saving || !user}
              >
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="pds-panel" style={{ padding: 12 }}>
            <div style={{ fontWeight: 650, color: "var(--pds-text)", marginBottom: 10 }}>Defaults</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div className="pds-text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
                  Ticket type
                </div>
                <input className="pds-input" value={ticketType} onChange={(e) => setTicketType(e.target.value)} placeholder="itsm_incident" />
              </div>

              <div>
                <div className="pds-text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
                  Category
                </div>
                <input className="pds-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="General" />
              </div>

              <div>
                <div className="pds-text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
                  Priority
                </div>
                <select className="pds-input" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
              </div>

              <div>
                <div className="pds-text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
                  Requester name
                </div>
                <input className="pds-input" value={requesterName} onChange={(e) => setRequesterName(e.target.value)} placeholder="Optional" />
              </div>

              <div>
                <div className="pds-text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
                  Requester email
                </div>
                <input className="pds-input" value={requesterEmail} onChange={(e) => setRequesterEmail(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PlaceholderPage>
  );
}

export function DashboardPage() {
  return <PlaceholderPage title="Dashboard" subtitle="Agent dashboard" />;
}

export function SearchPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(qParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketResults, setTicketResults] = useState<TicketRow[]>([]);
  const [articleResults, setArticleResults] = useState<KnowledgeArticleRow[]>([]);

  useEffect(() => {
    if (qParam !== query) {
      setQuery(qParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = query.trim();
      if (!trimmed) {
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ q: trimmed }, { replace: true });
      }
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [query, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();

    async function run() {
      setError(null);

      if (!q) {
        setTicketResults([]);
        setArticleResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const [{ data: tickets, error: tErr }, { data: articles, error: aErr }] = await Promise.all([
        supabase
          .from("tickets")
          .select("id,ticket_number,title,status,priority,updated_at")
          .textSearch("search_tsv", q, { type: "websearch" })
          .order("updated_at", { ascending: false })
          .limit(25),
        supabase
          .from("knowledge_articles")
          .select("id,title,category,status,updated_at,view_count,like_count")
          .textSearch("search_tsv", q, { type: "websearch" })
          .order("updated_at", { ascending: false })
          .limit(25),
      ]);

      if (cancelled) return;

      if (tErr) {
        setError(tErr.message);
        setTicketResults([]);
      } else {
        setTicketResults((tickets as TicketRow[]) ?? []);
      }

      if (aErr) {
        setError((prev) => prev ?? aErr.message);
        setArticleResults([]);
      } else {
        setArticleResults((articles as KnowledgeArticleRow[]) ?? []);
      }

      setLoading(false);
    }

    const timer = setTimeout(() => {
      void run();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, supabase]);

  return (
    <PlaceholderPage title="Search" subtitle="Search tickets and knowledge">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input
          className="pds-input"
          placeholder="Search (supports natural language)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
      </div>

      {error ? (
        <div className="pds-text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          Searching...
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="pds-panel" style={{ padding: 12 }}>
          <div style={{ fontWeight: 650, color: "var(--pds-text)", marginBottom: 10 }}>Tickets</div>
          {ticketResults.length === 0 ? (
            <div className="pds-text-muted" style={{ fontSize: 13 }}>
              {query.trim() ? "No ticket matches." : "Type to search."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ticketResults.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="pds-btn pds-btn--outline pds-focus"
                  style={{ justifyContent: "space-between", textAlign: "left" }}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ fontWeight: 650, color: "var(--pds-text)" }}>
                      {t.ticket_number} - {t.title}
                    </div>
                    <div className="pds-text-muted" style={{ fontSize: 12 }}>
                      {t.status} - {t.priority} - {new Date(t.updated_at).toLocaleString()}
                    </div>
                  </div>
                  <span className="pds-text-muted" style={{ fontSize: 12 }}>
                    Open
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pds-panel" style={{ padding: 12 }}>
          <div style={{ fontWeight: 650, color: "var(--pds-text)", marginBottom: 10 }}>Knowledge Base</div>
          {articleResults.length === 0 ? (
            <div className="pds-text-muted" style={{ fontSize: 13 }}>
              {query.trim() ? "No article matches." : "Type to search."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {articleResults.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="pds-btn pds-btn--outline pds-focus"
                  style={{ justifyContent: "space-between", textAlign: "left" }}
                  onClick={() => navigate(`/kb/articles/${a.id}`)}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ fontWeight: 650, color: "var(--pds-text)" }}>{a.title}</div>
                    <div className="pds-text-muted" style={{ fontSize: 12 }}>
                      {(a.category ?? "Uncategorized")} - {a.status} - {new Date(a.updated_at).toLocaleString()}
                    </div>
                  </div>
                  <span className="pds-text-muted" style={{ fontSize: 12 }}>
                    Open
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </PlaceholderPage>
  );
}

export function KnowledgeBaseAgentPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("published");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<KnowledgeArticleRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      let q = supabase
        .from("knowledge_articles")
        .select("id,title,category,status,updated_at,view_count,like_count")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (status) {
        q = q.eq("status", status);
      }

      const trimmed = query.trim();
      if (trimmed) {
        q = q.textSearch("search_tsv", trimmed, { type: "websearch" });
      }

      const { data, error } = await q;
      if (cancelled) return;

      if (error) {
        setError(error.message);
        setArticles([]);
      } else {
        setArticles((data as KnowledgeArticleRow[]) ?? []);
      }
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [query, status, supabase]);

  return (
    <PlaceholderPage title="Knowledge Base" subtitle="Agent knowledge base">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input
          className="pds-input"
          placeholder="Search articles"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <select className="pds-input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 160 }}>
          <option value="published">published</option>
          <option value="draft">draft</option>
          <option value="">all</option>
        </select>
      </div>

      {error ? (
        <div className="pds-text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          Loading...
        </div>
      ) : articles.length === 0 ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          No articles.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {articles.map((a) => (
            <button
              key={a.id}
              type="button"
              className="pds-btn pds-btn--outline pds-focus"
              style={{ justifyContent: "space-between", textAlign: "left" }}
              onClick={() => navigate(`/kb/articles/${a.id}`)}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontWeight: 650, color: "var(--pds-text)" }}>{a.title}</div>
                <div className="pds-text-muted" style={{ fontSize: 12 }}>
                  {(a.category ?? "Uncategorized")} - {a.status} - {new Date(a.updated_at).toLocaleString()}
                </div>
              </div>
              <span className="pds-text-muted" style={{ fontSize: 12 }}>
                Open
              </span>
            </button>
          ))}
        </div>
      )}
    </PlaceholderPage>
  );
}

export function KnowledgeBasePublicPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("knowledge_articles")
        .select("category")
        .eq("status", "published")
        .order("category", { ascending: true })
        .limit(500);

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setCategories([]);
        setLoading(false);
        return;
      }

      const unique = new Set<string>();
      for (const row of (data as any[]) ?? []) {
        const c = (row?.category as string | null) ?? "Uncategorized";
        if (c.trim()) unique.add(c);
      }
      setCategories(Array.from(unique).sort((a, b) => a.localeCompare(b)));
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <PlaceholderPage title="Knowledge Base" subtitle="Customer knowledge base">
      {error ? (
        <div className="pds-text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          Loading...
        </div>
      ) : categories.length === 0 ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          No published articles.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className="pds-btn pds-btn--outline pds-focus"
              style={{ justifyContent: "space-between", textAlign: "left" }}
              onClick={() => navigate(`/kb-public/${encodeURIComponent(c)}`)}
            >
              <div style={{ fontWeight: 650, color: "var(--pds-text)" }}>{c}</div>
              <span className="pds-text-muted" style={{ fontSize: 12 }}>
                View
              </span>
            </button>
          ))}
        </div>
      )}
    </PlaceholderPage>
  );
}

export function KnowledgeBasePublicCategoryPage() {
  const { categoryId } = useParams();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const navigate = useNavigate();

  const decodedCategory = categoryId ? decodeURIComponent(categoryId) : "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<KnowledgeArticleRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      let q = supabase
        .from("knowledge_articles")
        .select("id,title,category,status,updated_at,view_count,like_count")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(100);

      if (decodedCategory && decodedCategory !== "Uncategorized") {
        q = q.eq("category", decodedCategory);
      }
      if (decodedCategory === "Uncategorized") {
        q = q.is("category", null);
      }

      const { data, error } = await q;
      if (cancelled) return;

      if (error) {
        setError(error.message);
        setArticles([]);
      } else {
        setArticles((data as KnowledgeArticleRow[]) ?? []);
      }
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [decodedCategory, supabase]);

  return (
    <PlaceholderPage title="Knowledge Base" subtitle={`Category ${decodedCategory}`.trim()}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button type="button" className="pds-btn pds-btn--outline pds-focus" onClick={() => navigate("/kb-public")}>Return</button>
      </div>

      {error ? (
        <div className="pds-text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          Loading...
        </div>
      ) : articles.length === 0 ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          No articles.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {articles.map((a) => (
            <button
              key={a.id}
              type="button"
              className="pds-btn pds-btn--outline pds-focus"
              style={{ justifyContent: "space-between", textAlign: "left" }}
              onClick={() => navigate(`/kb-public/articles/${a.id}`)}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontWeight: 650, color: "var(--pds-text)" }}>{a.title}</div>
                <div className="pds-text-muted" style={{ fontSize: 12 }}>
                  {new Date(a.updated_at).toLocaleString()}
                </div>
              </div>
              <span className="pds-text-muted" style={{ fontSize: 12 }}>
                Open
              </span>
            </button>
          ))}
        </div>
      )}
    </PlaceholderPage>
  );
}

export function KnowledgeBaseArticlePage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { articleId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [article, setArticle] = useState<any | null>(null);
  const [liked, setLiked] = useState(false);
  const [togglingLike, setTogglingLike] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!articleId) return;
      setLoading(true);
      setError(null);

      const [{ data: article, error: aErr }, { data: likeRow, error: lErr }] = await Promise.all([
        supabase
          .from("knowledge_articles")
          .select("id,slug,title,body,status,category,updated_at,view_count,like_count")
          .eq("id", articleId)
          .maybeSingle(),
        user
          ? supabase
              .from("knowledge_article_likes")
              .select("article_id")
              .eq("article_id", articleId)
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
      ]);

      if (cancelled) return;

      if (aErr) {
        setError(aErr.message);
        setArticle(null);
        setLiked(false);
        setLoading(false);
        return;
      }

      if (lErr) {
        setError((prev) => prev ?? lErr.message);
      }

      setArticle(article ?? null);
      setLiked(Boolean(likeRow));
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [articleId, reloadNonce, supabase, user]);

  useEffect(() => {
    if (!articleId) return;
    void supabase.rpc("increment_knowledge_article_view", { article_id: articleId });
  }, [articleId, supabase]);

  async function toggleLike() {
    if (!articleId) return;
    setTogglingLike(true);
    setError(null);

    const { data, error } = await supabase.rpc("toggle_knowledge_article_like", { article_id: articleId });
    if (error) {
      setError(error.message);
      setTogglingLike(false);
      return;
    }
    setLiked(Boolean(data));
    setTogglingLike(false);
    setReloadNonce((v) => v + 1);
  }

  if (!articleId) {
    return <PlaceholderPage title="Article" subtitle="Missing article id" />;
  }

  return (
    <PlaceholderPage title={article?.title ? article.title : `Article ${articleId}`} subtitle="Knowledge base article">
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button type="button" className="pds-btn pds-btn--outline pds-focus" onClick={() => navigate(-1 as any)}>
          Return
        </button>
        <button type="button" className="pds-btn pds-btn--outline pds-focus" onClick={() => setReloadNonce((v) => v + 1)}>
          Refresh
        </button>
      </div>

      {error ? (
        <div className="pds-text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          Loading...
        </div>
      ) : !article ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          Article not found.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
          <div className="pds-panel" style={{ padding: 12 }}>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "var(--pds-text)" }}>{article.body}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="pds-panel" style={{ padding: 12 }}>
              <div style={{ fontWeight: 650, color: "var(--pds-text)", marginBottom: 8 }}>Details</div>
              <div className="pds-text-muted" style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
                <div>Status: {article.status}</div>
                <div>Category: {article.category ?? "Uncategorized"}</div>
                <div>Updated: {new Date(article.updated_at).toLocaleString()}</div>
                <div>Views: {article.view_count}</div>
                <div>Likes: {article.like_count}</div>
              </div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="pds-btn pds-btn--outline pds-focus"
                  onClick={() => void toggleLike()}
                  disabled={togglingLike}
                >
                  {togglingLike ? "Saving..." : liked ? "Unlike" : "Like"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PlaceholderPage>
  );
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
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) return;
      setLoading(true);
      setError(null);

      let q = supabase
        .from("tickets")
        .select("id,ticket_number,title,status,priority,updated_at")
        .eq("requester_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50);

      const trimmed = query.trim();
      if (trimmed) {
        q = q.or(`title.ilike.%${trimmed}%,ticket_number.ilike.%${trimmed}%,external_number.ilike.%${trimmed}%`);
      }

      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setTickets([]);
      } else {
        setTickets((data as TicketRow[]) ?? []);
      }
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [query, supabase, user]);

  return (
    <PlaceholderPage title="My tickets" subtitle="Customer portal">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input
          className="pds-input"
          placeholder="Search my tickets"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="pds-btn pds-btn--outline pds-focus"
          onClick={() => navigate("/my-tickets/new")}
        >
          New request
        </button>
      </div>

      {error ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          {error}
        </div>
      ) : loading ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          Loading...
        </div>
      ) : tickets.length === 0 ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          No tickets yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tickets.map((t) => (
            <button
              key={t.id}
              type="button"
              className="pds-btn pds-btn--outline pds-focus"
              style={{ justifyContent: "space-between", textAlign: "left" }}
              onClick={() => navigate(`/my-tickets/${t.id}`)}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontWeight: 650, color: "var(--pds-text)" }}>
                  {t.ticket_number} - {t.title}
                </div>
                <div className="pds-text-muted" style={{ fontSize: 12 }}>
                  {t.status} - {t.priority} - {new Date(t.updated_at).toLocaleString()}
                </div>
              </div>
              <span className="pds-text-muted" style={{ fontSize: 12 }}>
                Open
              </span>
            </button>
          ))}
        </div>
      )}
    </PlaceholderPage>
  );
}

export function MyTicketPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { ticketId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<any | null>(null);
  const [comments, setComments] = useState<TicketCommentRow[]>([]);

  const [newBody, setNewBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!ticketId || !user) return;

      setLoading(true);
      setError(null);

      const [{ data: ticket, error: ticketError }, { data: comments, error: commentsError }] = await Promise.all([
        supabase
          .from("tickets")
          .select("id,ticket_number,title,description,status,priority,category,created_at,updated_at")
          .eq("id", ticketId)
          .maybeSingle(),
        supabase
          .from("ticket_comments")
          .select("id,author_id,body,is_internal,created_at,author:profiles(full_name,email)")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true }),
      ]);

      if (cancelled) return;

      if (ticketError) {
        setError(ticketError.message);
        setTicket(null);
        setComments([]);
        setLoading(false);
        return;
      }

      if (commentsError) {
        setError(commentsError.message);
      }

      setTicket(ticket ?? null);
      setComments((comments as TicketCommentRow[]) ?? []);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [reloadNonce, supabase, ticketId, user]);

  async function submitComment() {
    if (!ticketId || !user) return;
    const body = newBody.trim();
    if (!body) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase.from("ticket_comments").insert({
      ticket_id: ticketId,
      author_id: user.id,
      body,
      is_internal: false,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setNewBody("");
    setSaving(false);
    setReloadNonce((v) => v + 1);
  }

  if (!ticketId) {
    return <PlaceholderPage title="My ticket" subtitle="Missing ticket id" />;
  }

  const pageTitle = ticket?.ticket_number ? `${ticket.ticket_number} - ${ticket.title ?? ""}` : `My ticket ${ticketId}`;

  return (
    <PlaceholderPage title={pageTitle} subtitle="Customer ticket detail">
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button type="button" className="pds-btn pds-btn--outline pds-focus" onClick={() => navigate("/my-tickets")}>Return</button>
        <button type="button" className="pds-btn pds-btn--outline pds-focus" onClick={() => setReloadNonce((v) => v + 1)}>Refresh</button>
      </div>

      {error ? (
        <div className="pds-text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          Loading...
        </div>
      ) : !ticket ? (
        <div className="pds-text-muted" style={{ fontSize: 13 }}>
          Ticket not found.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="pds-panel" style={{ padding: 12 }}>
              <div style={{ fontWeight: 650, color: "var(--pds-text)", marginBottom: 6 }}>Description</div>
              <div className="pds-text-muted" style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
                {ticket.description || "(no description)"}
              </div>
            </div>

            <div className="pds-panel" style={{ padding: 12 }}>
              <div style={{ fontWeight: 650, color: "var(--pds-text)", marginBottom: 10 }}>Conversation</div>

              {comments.length === 0 ? (
                <div className="pds-text-muted" style={{ fontSize: 13 }}>
                  No messages yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {comments.map((c) => {
                    const author = Array.isArray(c.author) ? c.author[0] : null;
                    const authorLabel = author?.full_name || author?.email || c.author_id;
                    return (
                      <div key={c.id} style={{ border: "1px solid var(--pds-border)", borderRadius: 10, padding: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                          <div style={{ fontWeight: 600, color: "var(--pds-text)", fontSize: 13 }}>{authorLabel}</div>
                          <div className="pds-text-muted" style={{ fontSize: 12 }}>
                            {new Date(c.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "var(--pds-text)" }}>{c.body}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  className="pds-input"
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Write a message"
                  style={{ minHeight: 110, resize: "vertical" }}
                />

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="pds-btn pds-btn--solid pds-focus"
                    onClick={() => void submitComment()}
                    disabled={saving}
                  >
                    {saving ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="pds-panel" style={{ padding: 12 }}>
              <div style={{ fontWeight: 650, color: "var(--pds-text)", marginBottom: 8 }}>Details</div>
              <div className="pds-text-muted" style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
                <div>Status: {ticket.status}</div>
                <div>Priority: {ticket.priority}</div>
                <div>Category: {ticket.category}</div>
                <div>Updated: {new Date(ticket.updated_at).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PlaceholderPage>
  );
}

export function MyTicketNewPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createTicket() {
    if (!user) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        title: trimmedTitle,
        description: description.trim() || null,
        priority: "medium",
        category: "General",
        requester_id: user.id,
        created_by: user.id,
        ticket_type: "itsm_incident",
        channel: "portal",
      })
      .select("id")
      .maybeSingle();

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    const newId = (data as any)?.id as string | undefined;
    if (!newId) {
      setError("Ticket created but no id returned");
      setSaving(false);
      return;
    }

    setSaving(false);
    navigate(`/my-tickets/${newId}`);
  }

  return (
    <PlaceholderPage title="New request" subtitle="Customer portal">
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button type="button" className="pds-btn pds-btn--outline pds-focus" onClick={() => navigate("/my-tickets")}>Return</button>
      </div>

      {error ? (
        <div className="pds-text-muted" style={{ fontSize: 13, marginBottom: 10 }}>
          {error}
        </div>
      ) : null}

      <div className="pds-panel" style={{ padding: 12, maxWidth: 880 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div className="pds-text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
              Subject
            </div>
            <input className="pds-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" />
          </div>
          <div>
            <div className="pds-text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
              Details
            </div>
            <textarea
              className="pds-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue"
              style={{ minHeight: 180, resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="pds-btn pds-btn--solid pds-focus" onClick={() => void createTicket()} disabled={saving || !user}>
              {saving ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </PlaceholderPage>
  );
}
