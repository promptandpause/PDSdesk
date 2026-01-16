import {
  Plus,
  Search,
  Filter,
  Download,
  Settings,
  Mail,
  User,
  Clock,
  Tag,
  ArrowUpCircle,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { TicketDetailView } from "./TicketDetailView";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

export function CustomerSupportQueueView() {
  const { user, hasRole, isGlobalAdmin, isInOperatorGroup } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const customerSupportMailbox = (import.meta.env.VITE_CUSTOMER_SUPPORT_MAILBOX ?? "").trim();

  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [detailNotice, setDetailNotice] = useState<string | undefined>(undefined);

  const [showArchive, setShowArchive] = useState(false);

  const [selectedTickets, setSelectedTickets] = useState<
    string[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");

  const canWorkTickets =
    isGlobalAdmin ||
    hasRole("service_desk_admin") ||
    hasRole("operator") ||
    isInOperatorGroup("customer_service");

  type QueueTicket = {
    id: string;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
    category: string;
    channel: string;
    mailbox: string | null;
    assignment_group_id: string | null;
    created_at: string;
    archived_at: string | null;
    requester_email: string | null;
    requester_name: string | null;
    requester: { full_name: string | null; email: string | null } | null;
    assignee: { full_name: string | null; email: string | null } | null;
  };

  type RawQueueTicket = Omit<QueueTicket, "requester" | "assignee"> & {
    requester:
      | { full_name: string | null; email: string | null }
      | Array<{ full_name: string | null; email: string | null }>
      | null;
    assignee:
      | { full_name: string | null; email: string | null }
      | Array<{ full_name: string | null; email: string | null }>
      | null;
  };

  const [tickets, setTickets] = useState<QueueTicket[]>([]);

  const downloadCsv = (filename: string, rows: Array<Record<string, unknown>>) => {
    const esc = (value: unknown) => {
      const s = String(value ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    };

    const headers = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row).forEach((k) => set.add(k));
        return set;
      }, new Set<string>()),
    );

    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc((r as any)[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const loadTickets = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("tickets")
      .select(
        "id,ticket_number,title,status,priority,category,channel,mailbox,assignment_group_id,created_at,archived_at,requester_email,requester_name,requester:profiles!tickets_requester_id_fkey(full_name,email),assignee:profiles!tickets_assignee_id_fkey(full_name,email)",
      )
      .eq("ticket_type", "customer_service")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setTickets([]);
      setLoading(false);
      return;
    }

    const rows = (data as unknown as RawQueueTicket[]) ?? [];
    const normalized: QueueTicket[] = rows.map((row) => {
      const requester = Array.isArray(row.requester)
        ? row.requester[0] ?? null
        : row.requester ?? null;
      const assignee = Array.isArray(row.assignee)
        ? row.assignee[0] ?? null
        : row.assignee ?? null;

      return {
        ...row,
        archived_at: (row as any).archived_at ?? null,
        requester,
        assignee,
      };
    });

    setTickets(normalized);
    setSelectedTickets([]);
    setLoading(false);
  }, [supabase, user]);

  const assignSelectedToMe = async () => {
    if (!user) return;
    if (!canWorkTickets) return;
    if (selectedTickets.length === 0) return;

    setActionError(null);
    setActionBusy(true);
    const res = await supabase
      .from("tickets")
      .update({ assignee_id: user.id })
      .in("id", selectedTickets);

    if (res.error) {
      setActionError(res.error.message);
      setActionBusy(false);
      return;
    }

    await loadTickets();
    setActionBusy(false);
  };

  type OperatorGroupRow = {
    id: string;
    name: string;
    group_key: string;
  };

  const [operatorGroups, setOperatorGroups] = useState<OperatorGroupRow[]>([]);
  const [operatorGroupsLoading, setOperatorGroupsLoading] = useState(false);
  const [operatorGroupsError, setOperatorGroupsError] = useState<string | null>(null);

  const loadOperatorGroups = useCallback(async () => {
    if (!user) return;
    setOperatorGroupsError(null);
    setOperatorGroupsLoading(true);

    const res = await supabase
      .from("operator_groups")
      .select("id,name,group_key")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (res.error) {
      setOperatorGroups([]);
      setOperatorGroupsError(res.error.message);
      setOperatorGroupsLoading(false);
      return;
    }

    setOperatorGroups((res.data ?? []) as OperatorGroupRow[]);
    setOperatorGroupsLoading(false);
  }, [supabase, user]);

  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [escalateTargetGroupId, setEscalateTargetGroupId] = useState<string>("");
  const [escalateNote, setEscalateNote] = useState("");
  const [escalateClearAssignee, setEscalateClearAssignee] = useState(true);
  const [escalateSubmitting, setEscalateSubmitting] = useState(false);
  const [escalateError, setEscalateError] = useState<string | null>(null);

  const openEscalateDialog = async () => {
    if (!user) return;
    if (!canWorkTickets) return;
    if (selectedTickets.length === 0) return;

    setEscalateError(null);
    if (operatorGroups.length === 0 && !operatorGroupsLoading) {
      await loadOperatorGroups();
    }
    setEscalateDialogOpen(true);
  };

  const submitEscalationToQueue = async () => {
    if (!user) return;
    if (!canWorkTickets) return;
    if (selectedTickets.length === 0) return;

    const targetValue = escalateTargetGroupId.trim();
    if (!targetValue) {
      setEscalateError("Select a target queue.");
      return;
    }

    const targetGroupId = targetValue === "__unassigned__" ? null : targetValue;
    const note = escalateNote.trim() || null;
    const selectedGroup = operatorGroups.find((g) => g.id === (targetGroupId ?? "")) ?? null;

    setEscalateError(null);
    setEscalateSubmitting(true);
    setActionError(null);

    const updateFields: Record<string, unknown> = {
      assignment_group_id: targetGroupId,
      ...(escalateClearAssignee ? { assignee_id: null } : null),
    };

    const upd = await supabase
      .from("tickets")
      .update(updateFields)
      .in("id", selectedTickets);

    if (upd.error) {
      setEscalateError(upd.error.message);
      setEscalateSubmitting(false);
      return;
    }

    const byId = new Map(tickets.map((t) => [t.id, t] as const));
    const events = selectedTickets.map((ticketId) => {
      const prev = byId.get(ticketId);
      return {
        ticket_id: ticketId,
        actor_id: user.id,
        event_type: "escalation",
        payload: {
          note,
          from_assignment_group_id: prev?.assignment_group_id ?? null,
          to_assignment_group_id: targetGroupId,
          to_assignment_group_name: selectedGroup?.name ?? null,
          cleared_assignee: !!escalateClearAssignee,
          source: "customer-support-queue",
        },
      };
    });

    const ev = await supabase.from("ticket_events").insert(events);
    if (ev.error) {
      setEscalateError(ev.error.message);
      setEscalateSubmitting(false);
      return;
    }

    setEscalateSubmitting(false);
    setEscalateDialogOpen(false);
    setEscalateTargetGroupId("");
    setEscalateNote("");
    await loadTickets();
  };

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromHash = () => {
      const raw = window.location.hash || "";
      const [path, query] = raw.replace(/^#\/?/, "").split("?");
      if ((path ?? "").split("/")[0] !== "customer-support-queue") return;
      const params = new URLSearchParams(query ?? "");
      const id = params.get("ticketId") ?? "";
      if (!id.trim()) return;
      setActiveTicketId(id.trim());
      setDetailNotice(undefined);
      setView("detail");
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    const handler = () => {
      if (view !== "list") return;
      void loadTickets();
    };

    window.addEventListener("pdsdesk:refresh", handler as EventListener);
    return () => {
      window.removeEventListener("pdsdesk:refresh", handler as EventListener);
    };
  }, [loadTickets, view]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of tickets) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set).sort();
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const statusMap: Record<string, string> = {
      "New": "new",
      "Open": "open",
      "In Progress": "in_progress",
      "On Hold": "pending",
      "Resolved": "resolved",
      "Closed": "closed",
    };
    const filterStatus = statusMap[statusFilter] ?? "";

    return tickets
      .filter((t) => (showArchive ? !!t.archived_at : !t.archived_at))
      .filter((t) => {
      const matchesSearch =
        !q ||
        t.ticket_number.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.requester_name ?? "").toLowerCase().includes(q) ||
        (t.requester_email ?? "").toLowerCase().includes(q) ||
        (t.requester?.full_name ?? "").toLowerCase().includes(q) ||
        (t.requester?.email ?? "").toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === "All Categories" ||
        t.category === categoryFilter;

      const matchesStatus =
        statusFilter === "All Status" ||
        t.status === filterStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, searchQuery, showArchive, statusFilter, tickets]);

  const archiveCount = useMemo(() => tickets.filter((t) => !!t.archived_at).length, [tickets]);

  const exportTickets = () => {
    const ids = new Set(selectedTickets);
    const source = selectedTickets.length > 0
      ? tickets.filter((t) => ids.has(t.id))
      : filteredTickets;

    downloadCsv(
      `customer-support-queue-${new Date().toISOString().slice(0, 10)}.csv`,
      source.map((t) => ({
        ticket_number: t.ticket_number,
        title: t.title,
        status: t.status,
        priority: t.priority,
        category: t.category,
        channel: t.channel,
        mailbox: t.mailbox ?? "",
        requester: t.requester_name ?? t.requester?.full_name ?? "",
        requester_email: t.requester_email ?? t.requester?.email ?? "",
        assignee: t.assignee?.full_name ?? t.assignee?.email ?? "",
        created_at: t.created_at,
        archived_at: t.archived_at ?? "",
      })),
    );
  };

  const stats = useMemo(() => {
    const newCount = tickets.filter((t) => t.status === "new").length;
    const openCount = tickets.filter((t) => t.status === "open").length;
    const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
    const pendingCount = tickets.filter((t) => t.status === "pending").length;
    const unassignedCount = tickets.filter((t) => !t.assignee).length;

    return { newCount, openCount, inProgressCount, pendingCount, unassignedCount };
  }, [tickets]);

  const toggleSelection = (id: string) => {
    setSelectedTickets((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id],
    );
  };

  const priorityLabel = (priority: string): "P1" | "P2" | "P3" | "P4" => {
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
  };

  const priorityTone = (
    priority: string,
  ): "danger" | "warning" | "info" | "muted" => {
    switch (priorityLabel(priority)) {
      case "P1":
        return "danger";
      case "P2":
        return "warning";
      case "P3":
        return "info";
      default:
        return "muted";
    }
  };

  const statusLabel = (status: string): string => {
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
  };

  const statusTone = (
    status: string,
  ): "info" | "success" | "warning" | "muted" => {
    switch (statusLabel(status)) {
      case "In Progress":
        return "success";
      case "On Hold":
        return "warning";
      case "Resolved":
      case "Closed":
        return "muted";
      default:
        return "info";
    }
  };

  const newTicketDefaults = useMemo(() => {
    return {
      ticket_type: "customer_service",
      channel: "email",
      ...(customerSupportMailbox ? { mailbox: customerSupportMailbox } : null),
    };
  }, [customerSupportMailbox]);

  if (view === "create") {
    return (
      <TicketDetailView
        isNewTicket
        newTicketDefaults={newTicketDefaults}
        onCreated={(ticketId) => {
          setActiveTicketId(ticketId);
          setDetailNotice("Created.");
          setView("detail");
        }}
        onBack={() => setView("list")}
      />
    );
  }

  if (view === "detail" && activeTicketId) {
    return (
      <TicketDetailView
        ticketId={activeTicketId}
        initialNotice={detailNotice}
        onBack={() => {
          setActiveTicketId(null);
          setDetailNotice(undefined);
          setView("list");
          if (typeof window !== "undefined") {
            const next = "#/customer-support-queue";
            if (window.location.hash !== next) window.location.hash = next;
          }
        }}
      />
    );
  }

  return (
    <div className="pds-page flex-1">
      <div className="pds-page-header">
        <div className="pds-toolbar">
          <div className="flex items-center gap-10">
            <h2 className="pds-page-title">Customer Support Queue</h2>
          </div>
          <div className="pds-toolbar-actions">
            <button
              className="pds-btn pds-btn--primary pds-focus"
              onClick={() => setView("create")}
            >
              <Plus size={14} />
              New Ticket
            </button>
            <button
              className="pds-btn pds-btn--outline pds-focus"
              onClick={() => void loadTickets()}
            >
              Refresh
            </button>
            <button
              className="pds-btn pds-btn--outline pds-focus"
              onClick={exportTickets}
              disabled={loading}
            >
              <Download size={14} />
              Export
            </button>
            <button
              className="pds-icon-btn pds-focus"
              onClick={() => {
                if (typeof window !== "undefined") window.location.hash = "#/settings";
              }}
              title="Settings"
            >
              <Settings size={16} className="pds-header-icon" />
            </button>
          </div>
        </div>
      </div>

      <div className="pds-message" data-tone="info">
        <Mail size={16} />
        <span>
          This queue manages customer inquiries from email.
          {customerSupportMailbox
            ? (
                <>
                  Tickets are automatically created from{" "}
                  <strong>{customerSupportMailbox}</strong>
                </>
              )
            : " Tickets are automatically created from the configured support mailbox."}
        </span>
      </div>

      {error && (
        <div className="pds-message" data-tone="danger">
          {error}
        </div>
      )}
      {actionError && (
        <div className="pds-message" data-tone="danger">
          {actionError}
        </div>
      )}

      {/* Action Bar */}
      {selectedTickets.length > 0 && (
        <div className="pds-actionbar">
          <span className="text-sm">
            <strong>{selectedTickets.length}</strong> selected
          </span>
          <div className="pds-toolbar-actions">
            <button
              className="pds-btn pds-btn--secondary pds-focus"
              onClick={() => void assignSelectedToMe()}
              disabled={!canWorkTickets || actionBusy}
              title={!canWorkTickets ? "Not permitted" : "Assign selected to me"}
            >
              <Users size={14} />
              Assign
            </button>
            <button
              className="pds-btn pds-btn--secondary pds-focus"
              onClick={() => void openEscalateDialog()}
              disabled={!canWorkTickets || actionBusy}
              title={!canWorkTickets ? "Not permitted" : "Escalate selected tickets to a queue"}
            >
              <ArrowUpCircle size={14} />
              Escalate
            </button>
            <button
              className="pds-btn pds-btn--secondary pds-focus"
              disabled={!canWorkTickets || actionBusy}
              onClick={() => setError("Change Category is not implemented yet.")}
            >
              <Tag size={14} />
              Category
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="pds-subtoolbar">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2"
            style={{ color: "var(--pds-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Search customer tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pds-input pds-focus w-full pl-10"
          />
        </div>
        <select
          className="pds-input pds-focus"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option>All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="pds-input pds-focus"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All Status</option>
          <option>New</option>
          <option>Open</option>
          <option>In Progress</option>
          <option>Resolved</option>
          <option>Closed</option>
        </select>
        <div className="pds-segmented">
          <button
            type="button"
            className="pds-segment pds-focus"
            data-active={showArchive ? "false" : "true"}
            onClick={() => setShowArchive(false)}
          >
            Active
          </button>
          <button
            type="button"
            className="pds-segment pds-focus"
            data-active={showArchive ? "true" : "false"}
            onClick={() => setShowArchive(true)}
          >
            Archive ({archiveCount})
          </button>
        </div>
        <button
          type="button"
          className="pds-btn pds-btn--outline pds-focus"
          onClick={() => setError("More filters are not implemented yet. Use the search and dropdowns for now.")}
        >
          <Filter size={14} />
          More Filters
        </button>
      </div>

      {/* Stats Bar */}
      <div className="pds-statbar">
        <div className="pds-stat">
          <span className="pds-stat-label">New</span>
          <span className="pds-stat-value">{stats.newCount}</span>
        </div>
        <div className="pds-stat">
          <span className="pds-stat-label">Open</span>
          <span className="pds-stat-value">{stats.openCount}</span>
        </div>
        <div className="pds-stat">
          <span className="pds-stat-label">In Progress</span>
          <span className="pds-stat-value">{stats.inProgressCount}</span>
        </div>
        <div className="pds-stat">
          <span className="pds-stat-label">On Hold</span>
          <span className="pds-stat-value">{stats.pendingCount}</span>
        </div>
        <div className="pds-stat">
          <span className="pds-stat-label">Unassigned</span>
          <span className="pds-stat-value">{stats.unassignedCount}</span>
        </div>
      </div>

      {/* Table */}
      <div className="pds-table-wrap">
        {loading ? (
          <div className="p-6 text-sm pds-text-muted">Loading...</div>
        ) : (
          <table className="pds-table">
            <thead className="pds-thead">
              <tr>
                <th className="pds-th" style={{ width: 44 }}>
                  <input
                    type="checkbox"
                    className="pds-focus"
                    checked={
                      selectedTickets.length === filteredTickets.length &&
                      filteredTickets.length > 0
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTickets(filteredTickets.map((i) => i.id));
                      } else {
                        setSelectedTickets([]);
                      }
                    }}
                  />
                </th>
                <th className="pds-th">Number</th>
                <th className="pds-th">Subject</th>
                <th className="pds-th">Customer</th>
                <th className="pds-th">Category</th>
                <th className="pds-th">Priority</th>
                <th className="pds-th">Status</th>
                <th className="pds-th">Assigned</th>
                <th className="pds-th">Source</th>
                <th className="pds-th">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="pds-row pds-focus cursor-pointer"
                  data-selected={selectedTickets.includes(ticket.id) ? "true" : "false"}
                  aria-selected={selectedTickets.includes(ticket.id)}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActiveTicketId(ticket.id);
                    setDetailNotice(undefined);
                    setView("detail");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveTicketId(ticket.id);
                      setDetailNotice(undefined);
                      setView("detail");
                    }
                  }}
                >
                  <td className="pds-td">
                    <input
                      type="checkbox"
                      className="pds-focus"
                      checked={selectedTickets.includes(ticket.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelection(ticket.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="pds-td">
                    <span className="pds-link">{ticket.ticket_number}</span>
                  </td>
                  <td className="pds-td">
                    <span className="font-semibold">{ticket.title}</span>
                  </td>
                  <td className="pds-td">
                    <div className="flex items-center gap-1">
                      <Mail size={14} className="pds-text-muted" />
                      {ticket.requester_email ?? ticket.requester?.email ?? ""}
                    </div>
                  </td>
                  <td className="pds-td">
                    <span className="pds-chip" data-tone="muted">{ticket.category}</span>
                  </td>
                  <td className="pds-td">
                    <span className="pds-chip" data-tone={priorityTone(ticket.priority)}>
                      {priorityLabel(ticket.priority)}
                    </span>
                  </td>
                  <td className="pds-td">
                    <span className="pds-chip" data-tone={statusTone(ticket.status)}>
                      {statusLabel(ticket.status)}
                    </span>
                  </td>
                  <td className="pds-td">
                    {ticket.assignee ? (
                      <div className="flex items-center gap-1">
                        <User size={14} className="pds-text-muted" />
                        {ticket.assignee?.full_name ?? ticket.assignee?.email ?? ""}
                      </div>
                    ) : (
                      <span className="pds-chip" data-tone="warning">Unassigned</span>
                    )}
                  </td>
                  <td className="pds-td">
                    <span className="pds-chip" data-tone="muted">{ticket.channel ?? ""}</span>
                  </td>
                  <td className="pds-td pds-text-muted" style={{ fontSize: 12 }}>
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(ticket.created_at).toLocaleString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog
        open={escalateDialogOpen}
        onOpenChange={(open) => {
          setEscalateDialogOpen(open);
          if (!open) {
            setEscalateSubmitting(false);
            setEscalateError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate to Queue</DialogTitle>
            <DialogDescription>
              Move the selected tickets to another operator group/queue.
            </DialogDescription>
          </DialogHeader>

          {operatorGroupsError && (
            <div className="pds-message" data-tone="danger">
              {operatorGroupsError}
            </div>
          )}
          {escalateError && (
            <div className="pds-message" data-tone="danger">
              {escalateError}
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--pds-text)]">Target queue</label>
              <select
                className="pds-input pds-focus w-full"
                value={escalateTargetGroupId}
                onChange={(e) => setEscalateTargetGroupId(e.target.value)}
                disabled={operatorGroupsLoading || escalateSubmitting}
              >
                <option value="">Select a queue...</option>
                <option value="__unassigned__">Unassigned</option>
                {operatorGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--pds-text)]">Note (optional)</label>
              <textarea
                className="pds-input pds-focus w-full"
                rows={3}
                value={escalateNote}
                onChange={(e) => setEscalateNote(e.target.value)}
                disabled={escalateSubmitting}
                placeholder="Reason for escalation..."
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--pds-text)]">
              <input
                type="checkbox"
                checked={escalateClearAssignee}
                onChange={(e) => setEscalateClearAssignee(e.target.checked)}
                disabled={escalateSubmitting}
              />
              Clear assignee when moving queues
            </label>
          </div>

          <DialogFooter>
            <button
              className="pds-btn pds-btn--outline pds-focus"
              onClick={() => setEscalateDialogOpen(false)}
              disabled={escalateSubmitting}
            >
              Cancel
            </button>
            <button
              className="pds-btn pds-btn--primary pds-focus"
              onClick={() => void submitEscalationToQueue()}
              disabled={escalateSubmitting || operatorGroupsLoading}
            >
              {escalateSubmitting ? "Moving..." : "Move"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}