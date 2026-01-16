import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

export function TicketsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      let q = supabase
        .from("tickets")
        .select("id,ticket_number,title,status,priority,updated_at")
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
  }, [query, supabase]);

  return (
    <PlaceholderPage title="Tickets" subtitle="Agent ticket list">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input
          className="pds-input"
          placeholder="Search tickets"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="pds-btn pds-btn--outline pds-focus"
          onClick={() => navigate("/tickets/new")}
        >
          New ticket
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
          No tickets found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tickets.map((t) => (
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
    </PlaceholderPage>
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

  if (!ticketId) {
    return <PlaceholderPage title="Ticket" subtitle="Missing ticket id" />;
  }

  const title = ticket?.ticket_number ? `${ticket.ticket_number} - ${ticket.title ?? ""}` : `Ticket ${ticketId}`;

  return (
    <PlaceholderPage title={title} subtitle="Agent ticket detail">
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button type="button" className="pds-btn pds-btn--outline pds-focus" onClick={() => navigate("/tickets")}>Return</button>
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
                            {c.is_internal ? "Internal" : "Public"} - {new Date(c.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "var(--pds-text)" }}>{c.body}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    className="pds-input"
                    value={""}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const reply = savedReplies.find((r) => r.id === selectedId);
                      if (reply) {
                        setNewBody((prev) => (prev ? `${prev}\n\n${reply.content}` : reply.content));
                      }
                    }}
                    style={{ flex: 1 }}
                  >
                    <option value="">Insert saved reply...</option>
                    {savedReplies.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <label className="pds-text-muted" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                    Internal
                  </label>
                </div>

                <textarea
                  className="pds-input"
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Write a reply"
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
                {ticket.requester_email ? <div>Requester: {ticket.requester_name ? `${ticket.requester_name} <${ticket.requester_email}>` : ticket.requester_email}</div> : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </PlaceholderPage>
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
