import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Send,
  Save,
  MoreHorizontal,
  ChevronDown,
  Copy,
  Plus,
  User,
} from "lucide-react";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/auth/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type ProfileRef = {
  full_name: string | null;
  email: string | null;
};

type Ticket = {
  id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  due_at: string;
  requester_email: string | null;
  requester_name: string | null;
  requester: ProfileRef | null;
  assignee: ProfileRef | null;
};

type Comment = {
  id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  author: ProfileRef | null;
};

type RawTicket = Omit<Ticket, "requester" | "assignee"> & {
  requester: ProfileRef | ProfileRef[] | null;
  assignee: ProfileRef | ProfileRef[] | null;
};

type RawComment = Omit<Comment, "author"> & {
  author: ProfileRef | ProfileRef[] | null;
};

function toDateTimeLocalValue(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDateTimeLocalValue(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function priorityLabel(priority: string): "P1" | "P2" | "P3" | "P4" {
  switch (priority) {
    case "urgent":
      return "P1";
    case "high":
      return "P2";
    case "medium":
      return "P3";
    case "low":
    default:
      return "P4";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "new":
      return "New";
    case "open":
      return "Open";
    case "in_progress":
      return "In Progress";
    case "pending":
      return "On Hold";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

export function TicketDetailViewV1({
  ticketId,
  onBack,
  initialNotice,
  onOpenTicket,
  onNewTicket,
}: {
  ticketId: string;
  onBack: () => void;
  initialNotice?: string;
  onOpenTicket?: (ticketId: string, notice?: string) => void;
  onNewTicket?: () => void;
}) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user, roles } = useAuth();

  const canWorkTickets =
    roles.includes("global_admin") ||
    roles.includes("service_desk_admin") ||
    roles.includes("operator");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  const [activeTab, setActiveTab] = useState<
    | "general"
    | "information"
    | "links"
    | "worklog"
    | "customer_satisfaction"
    | "sla"
    | "procedure"
    | "attachments"
    | "audit_trail"
    | "time_registration"
  >("general");

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formPriority, setFormPriority] = useState("medium");
  const [formStatus, setFormStatus] = useState("new");
  const [formDueAtLocal, setFormDueAtLocal] = useState("");

  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);

  const [commentBody, setCommentBody] = useState("");
  const [commentInternal, setCommentInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [{ data: ticketData, error: ticketError }, { data: commentData, error: commentError }] =
      await Promise.all([
        supabase
          .from("tickets")
          .select(
            "id,ticket_number,title,description,status,priority,category,created_at,due_at,requester_email,requester_name,requester:profiles!tickets_requester_id_fkey(full_name,email),assignee:profiles!tickets_assignee_id_fkey(full_name,email)",
          )
          .eq("id", ticketId)
          .maybeSingle(),
        supabase
          .from("ticket_comments")
          .select(
            "id,body,is_internal,created_at,author:profiles!ticket_comments_author_id_fkey(full_name,email)",
          )
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true }),
      ]);

    if (ticketError) {
      setError(ticketError.message);
      setTicket(null);
      setComments([]);
      setLoading(false);
      return;
    }

    if (commentError) {
      setError(commentError.message);
      setTicket(null);
      setComments([]);
      setLoading(false);
      return;
    }

    const rawTicket = ticketData as unknown as RawTicket | null;
    if (!rawTicket) {
      setError("Ticket not found.");
      setTicket(null);
      setComments([]);
      setLoading(false);
      return;
    }

    const normalizedTicket: Ticket = {
      ...rawTicket,
      requester: Array.isArray(rawTicket.requester)
        ? rawTicket.requester[0] ?? null
        : rawTicket.requester ?? null,
      assignee: Array.isArray(rawTicket.assignee)
        ? rawTicket.assignee[0] ?? null
        : rawTicket.assignee ?? null,
    };

    const rawComments = (commentData as unknown as RawComment[]) ?? [];
    const normalizedComments: Comment[] = rawComments.map((c) => ({
      ...c,
      author: Array.isArray(c.author) ? c.author[0] ?? null : c.author ?? null,
    }));

    setTicket(normalizedTicket);
    setComments(normalizedComments);

    setFormTitle(normalizedTicket.title);
    setFormDescription(normalizedTicket.description ?? "");
    setFormCategory(normalizedTicket.category);
    setFormPriority(normalizedTicket.priority);
    setFormStatus(normalizedTicket.status);
    setFormDueAtLocal(toDateTimeLocalValue(normalizedTicket.due_at));

    setLoading(false);
  }, [supabase, ticketId]);

  const escalate = useCallback(async () => {
    if (!ticket) return;
    if (!user) return;
    if (!canWorkTickets) {
      setError("Only operators/admins can escalate tickets.");
      return;
    }

    const reasonRaw = window.prompt("Escalation note (optional)") ?? "";
    const reason = reasonRaw.trim();

    setError(null);
    setNotice(null);

    const logRes = await supabase.from("ticket_events").insert({
      ticket_id: ticket.id,
      actor_id: user.id,
      event_type: "escalation",
      payload: {
        reason: reason || null,
      },
    });

    if (logRes.error) {
      setError(logRes.error.message);
      return;
    }

    const upd = await supabase
      .from("tickets")
      .update({ priority: "urgent" })
      .eq("id", ticket.id);

    if (upd.error) {
      setError(upd.error.message);
      return;
    }

    setNotice("Escalated.");
    await load();
  }, [canWorkTickets, load, supabase, ticket, user]);

  const createFollowUp = useCallback(async () => {
    if (!ticket) return;
    if (!user) return;
    if (!canWorkTickets) {
      setError("Only operators/admins can create follow-up tickets.");
      return;
    }

    setError(null);
    setNotice(null);

    const inserted = await supabase
      .from("tickets")
      .insert({
        title: `Follow-up: ${ticket.title}`,
        description: null,
        status: "new",
        priority: ticket.priority,
        requester_id: user.id,
        created_by: user.id,
        assignee_id: null,
      })
      .select("id")
      .single();

    if (inserted.error) {
      setError(inserted.error.message);
      return;
    }

    const newId = inserted.data.id as string;

    const linkRes = await supabase.from("ticket_links").insert({
      from_ticket_id: newId,
      to_ticket_id: ticket.id,
      link_type: "child_of",
      created_by: user.id,
    });

    if (linkRes.error) {
      setError(linkRes.error.message);
      return;
    }

    setNotice("Follow-up created.");
    onOpenTicket?.(newId, "Follow-up created.");
  }, [canWorkTickets, onOpenTicket, supabase, ticket, user]);

  const handleNewTicket = useCallback(() => {
    if (!canWorkTickets) {
      setError("Only operators/admins can create tickets.");
      return;
    }

    onNewTicket?.();
    if (!onNewTicket) {
      setNotice("Use the queue view to create a new ticket.");
    }
  }, [canWorkTickets, onNewTicket]);

  const copyText = useCallback(async (text: string) => {
    const value = text.trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitComment = async () => {
    if (!user) return;
    if (!ticket) return;
    if (!commentBody.trim()) return;

    setSubmitting(true);
    setError(null);

    const isInternal = canWorkTickets ? commentInternal : false;
    const { data: inserted, error } = await supabase
      .from("ticket_comments")
      .insert({
        ticket_id: ticket.id,
        author_id: user.id,
        body: commentBody.trim(),
        is_internal: isInternal,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    if (canWorkTickets && !isInternal && inserted?.id) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        if (!accessToken) {
          throw new Error("Missing access token");
        }

        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ticket-comment-email`;
        const res = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ ticketId: ticket.id, commentId: inserted.id }),
        });

        if (!res.ok) {
          throw new Error(`ticket-comment-email failed: ${res.status}`);
        }
      } catch {
        // Don't block comment save if email delivery fails
      }
    }

    setCommentBody("");
    setCommentInternal(false);
    setSubmitting(false);
    setNotice("Message sent.");
    await load();
  };

  const isDirty =
    !!ticket &&
    (formTitle.trim() !== ticket.title ||
      (formDescription.trim() || "") !== (ticket.description ?? "") ||
      formCategory !== ticket.category ||
      formPriority !== ticket.priority ||
      formStatus !== ticket.status ||
      (formDueAtLocal ? fromDateTimeLocalValue(formDueAtLocal) : "") !==
        ticket.due_at);

  const saveTicket = async () => {
    if (!ticket) return;
    if (!canWorkTickets) return;
    if (!formTitle.trim()) {
      setError("Title is required.");
      return;
    }
    if (!formDueAtLocal) {
      setError("Target date is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("tickets")
      .update({
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        category: formCategory.trim() || "General",
        priority: formPriority,
        status: formStatus,
        due_at: fromDateTimeLocalValue(formDueAtLocal),
      })
      .eq("id", ticket.id);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setNotice("Saved.");
    await load();
  };

  const assignToMe = async () => {
    if (!ticket) return;
    if (!canWorkTickets) return;
    if (!user) return;

    setAssigning(true);
    setError(null);

    const { error } = await supabase
      .from("tickets")
      .update({ assignee_id: user.id })
      .eq("id", ticket.id);

    if (error) {
      setError(error.message);
      setAssigning(false);
      return;
    }

    setAssigning(false);
    setNotice("Assigned to you.");
    await load();
  };

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (!initialNotice) return;
    setNotice(initialNotice);
  }, [initialNotice]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-white">
        <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Back"
          >
            <ArrowLeft size={16} className="text-[#2d3e50]" />
          </button>
          <h2 className="text-lg font-semibold text-[#2d3e50]">Ticket</h2>
        </div>
        <div className="p-4 text-sm text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex-1 flex flex-col h-full bg-white">
        <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Back"
          >
            <ArrowLeft size={16} className="text-[#2d3e50]" />
          </button>
          <h2 className="text-lg font-semibold text-[#2d3e50]">Ticket</h2>
        </div>
        {error && <div className="p-4 text-sm text-red-600">{error}</div>}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Back"
          >
            <ArrowLeft size={16} className="text-[#2d3e50]" />
          </button>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#2d3e50] truncate">
              {ticket.ticket_number} {ticket.title}
            </div>
            <div className="text-xs text-gray-600 mt-0.5 truncate">
              {statusLabel(ticket.status)}
              {" · "}
              {priorityLabel(ticket.priority)}
              {" · "}
              {ticket.category}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => void saveTicket()}
            disabled={!canWorkTickets || saving || !isDirty}
            className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors disabled:opacity-60 flex items-center gap-1"
            title={canWorkTickets ? "Save" : "Only operators/admins can edit tickets"}
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => void escalate()}
            className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors"
            title={canWorkTickets ? "Escalate" : "Only operators/admins can escalate"}
          >
            Escalate
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
              >
                Create
                <ChevronDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleNewTicket()}>
                <Plus className="size-4" />
                New ticket
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void createFollowUp()}>
                <Copy className="size-4" />
                Follow-up ticket (linked)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void copyText(ticket.ticket_number)}>
                <Copy className="size-4" />
                Copy ticket number
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title="More"
              >
                <MoreHorizontal size={16} className="text-[#2d3e50]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void load()}>
                Refresh
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void copyText(ticket.ticket_number)}>
                <Copy className="size-4" />
                Copy ticket number
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void copyText(ticket.id)}>
                <Copy className="size-4" />
                Copy ticket id
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-2 py-1 flex items-center gap-1 overflow-x-auto">
        {([
          { id: "general", label: "GENERAL" },
          { id: "information", label: "INFORMATION" },
          { id: "links", label: "LINKS" },
          { id: "worklog", label: "WORKLOG" },
          { id: "customer_satisfaction", label: "CUSTOMER SATISFACTION" },
          { id: "sla", label: "SLA" },
          { id: "procedure", label: "PROCEDURE" },
          { id: "attachments", label: "ATTACHMENTS" },
          { id: "audit_trail", label: "AUDIT TRAIL" },
          { id: "time_registration", label: "TIME REGISTRATION" },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`px-3 py-1 text-xs rounded ${
              activeTab === tab.id
                ? "bg-[#e3f2fd] text-[#1976d2]"
                : "hover:bg-gray-100 text-gray-700"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(notice || error) && (
        <div
          className={`px-4 py-2 text-sm border-b ${
            error
              ? "text-red-700 bg-red-50 border-red-200"
              : "text-green-700 bg-green-50 border-green-200"
          }`}
        >
          {error ?? notice}
        </div>
      )}

      <div className="flex-1 overflow-hidden flex">
        <div className="w-[340px] border-r border-gray-200 overflow-auto bg-white">
          <div className="p-3">
            <div className="text-xs font-semibold text-gray-500 uppercase">
              Caller
            </div>
            <div className="mt-2 border border-gray-200 rounded p-3">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User size={16} className="text-gray-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#2d3e50] truncate">
                    {ticket.requester_name ?? ticket.requester?.full_name ?? ticket.requester_email ?? ticket.requester?.email ?? ""}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {ticket.requester_email ?? ticket.requester?.email ?? ""}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xs text-gray-600 mb-1">Subject</div>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  disabled={!canWorkTickets}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff] disabled:bg-gray-100"
                />
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-1">Category</div>
                <input
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  disabled={!canWorkTickets}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff] disabled:bg-gray-100"
                />
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-1">Status</div>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  disabled={!canWorkTickets}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff] disabled:bg-gray-100"
                >
                  <option value="new">New</option>
                  <option value="open">Open</option>
                  <option value="pending">On Hold</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-1">Priority</div>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                  disabled={!canWorkTickets}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff] disabled:bg-gray-100"
                >
                  <option value="low">P4</option>
                  <option value="medium">P3</option>
                  <option value="high">P2</option>
                  <option value="urgent">P1</option>
                </select>
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-1">Target Date</div>
                <input
                  type="datetime-local"
                  value={formDueAtLocal}
                  onChange={(e) => setFormDueAtLocal(e.target.value)}
                  disabled={!canWorkTickets}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff] disabled:bg-gray-100"
                />
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-1">Assignee</div>
                <div className="text-sm text-[#2d3e50]">
                  {ticket.assignee?.full_name ?? ticket.assignee?.email ?? "Unassigned"}
                </div>
                {canWorkTickets && user && ticket.assignee?.email !== user.email && (
                  <button
                    onClick={() => void assignToMe()}
                    disabled={assigning}
                    className="mt-2 px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors disabled:opacity-60"
                  >
                    {assigning ? "Assigning..." : "Assign to me"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {activeTab !== "general" ? (
            <div className="p-4 text-sm text-gray-600">
              This section is not wired yet.
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {ticket.description && (
                  <div className="border border-gray-200 rounded p-3">
                    <div className="text-xs text-gray-600 mb-2">Description</div>
                    <div className="text-sm text-[#2d3e50] whitespace-pre-wrap">
                      {ticket.description}
                    </div>
                  </div>
                )}

                {comments.map((c) => (
                  <div
                    key={c.id}
                    className={`border border-gray-200 rounded p-3 ${
                      c.is_internal ? "bg-[#fff8e1]" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-600">
                        {c.author?.full_name ?? c.author?.email ?? ""}
                        {c.is_internal ? " · Invisible to caller" : ""}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(c.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-[#2d3e50] whitespace-pre-wrap mt-2">
                      {c.body}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 p-3 bg-white">
                <div className="text-xs text-gray-600 mb-2">Reply</div>
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                  rows={4}
                />
                {canWorkTickets && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={commentInternal}
                      onChange={(e) => setCommentInternal(e.target.checked)}
                    />
                    Invisible to caller
                  </label>
                )}
                <div className="mt-3 flex items-center justify-end">
                  <button
                    onClick={() => void submitComment()}
                    disabled={submitting || !commentBody.trim()}
                    className="px-3 py-2 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors disabled:opacity-60 flex items-center gap-1"
                  >
                    <Send size={14} />
                    {submitting ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
