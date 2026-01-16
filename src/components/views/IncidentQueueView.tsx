import {
  Plus,
  Search,
  Filter,
  Download,
  Settings,
  ArrowUpCircle,
  ArrowDownCircle,
  Users,
  Trash2,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

export function IncidentQueueView() {
  const { user, hasRole, isGlobalAdmin, isInOperatorGroup } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

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

  const canWorkTickets =
    isGlobalAdmin ||
    hasRole("service_desk_admin") ||
    hasRole("operator") ||
    isInOperatorGroup("it_services");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");

  type TicketRow = {
    id: string;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
    category: string;
    assignment_group_id: string | null;
    created_at: string;
    due_at: string;
    archived_at: string | null;
    requester_email: string | null;
    requester_name: string | null;
    requester: { full_name: string | null; email: string | null } | null;
    assignee: { full_name: string | null; email: string | null } | null;
  };

  type RawTicketRow = {
    id: string;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
    category: string;
    assignment_group_id: string | null;
    created_at: string;
    due_at: string;
    archived_at: string | null;
    requester_email: string | null;
    requester_name: string | null;
    requester:
      | { full_name: string | null; email: string | null }
      | Array<{ full_name: string | null; email: string | null }>
      | null;
    assignee:
      | { full_name: string | null; email: string | null }
      | Array<{ full_name: string | null; email: string | null }>
      | null;
  };

  const [tickets, setTickets] = useState<TicketRow[]>([]);

  const loadTickets = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("tickets")
      .select(
        "id,ticket_number,title,status,priority,category,assignment_group_id,created_at,due_at,archived_at,requester_email,requester_name,requester:profiles!tickets_requester_id_fkey(full_name,email),assignee:profiles!tickets_assignee_id_fkey(full_name,email)",
      )
      .neq("ticket_type", "customer_service")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setTickets([]);
      setLoading(false);
      return;
    }

    const rows = (data as unknown as RawTicketRow[]) ?? [];
    const normalized: TicketRow[] = rows.map((row) => {
      const requester = Array.isArray(row.requester)
        ? row.requester[0] ?? null
        : row.requester ?? null;
      const assignee = Array.isArray(row.assignee)
        ? row.assignee[0] ?? null
        : row.assignee ?? null;

      return {
        id: row.id,
        ticket_number: row.ticket_number,
        title: row.title,
        status: row.status,
        priority: row.priority,
        category: row.category,
        assignment_group_id: row.assignment_group_id ?? null,
        created_at: row.created_at,
        due_at: row.due_at,
        archived_at: row.archived_at ?? null,
        requester_email: row.requester_email,
        requester_name: row.requester_name,
        requester,
        assignee,
      };
    });

    setTickets(normalized);
    setSelectedTickets([]);
    setLoading(false);
  }, [supabase, user]);

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

  const exportTickets = () => {
    const ids = new Set(selectedTickets);
    const source = selectedTickets.length > 0
      ? tickets.filter((t) => ids.has(t.id))
      : filteredTickets;

    downloadCsv(
      `incident-queue-${new Date().toISOString().slice(0, 10)}.csv`,
      source.map((t) => ({
        ticket_number: t.ticket_number,
        title: t.title,
        status: t.status,
        priority: t.priority,
        category: t.category,
        requester: t.requester_name ?? t.requester?.full_name ?? "",
        requester_email: t.requester_email ?? t.requester?.email ?? "",
        assignee: t.assignee?.full_name ?? t.assignee?.email ?? "",
        created_at: t.created_at,
        due_at: t.due_at,
        archived_at: t.archived_at ?? "",
      })),
    );
  };

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
          source: "incident-queue",
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

  const bumpPriority = async (direction: "up" | "down") => {
    if (!user) return;
    if (!canWorkTickets) return;
    if (selectedTickets.length === 0) return;

    const byId = new Map(tickets.map((t) => [t.id, t] as const));
    const order = ["low", "medium", "high", "urgent"] as const;

    setActionError(null);
    setActionBusy(true);

    for (const id of selectedTickets) {
      const t = byId.get(id);
      if (!t) continue;
      const idx = Math.max(0, order.indexOf(t.priority as any));
      const nextIdx = direction === "up" ? Math.min(order.length - 1, idx + 1) : Math.max(0, idx - 1);
      const next = order[nextIdx];
      if (next === t.priority) continue;

      const upd = await supabase
        .from("tickets")
        .update({ priority: next })
        .eq("id", id);
      if (upd.error) {
        setActionError(upd.error.message);
        setActionBusy(false);
        return;
      }
    }

    await loadTickets();
    setActionBusy(false);
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const requestDelete = () => {
    if (!canWorkTickets) return;
    if (selectedTickets.length === 0) return;
    if (selectedIncludesClosedTicket) {
      setActionError("Closed tickets cannot be deleted.");
      return;
    }
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!user) return;
    if (!canWorkTickets) return;
    if (selectedTickets.length === 0) return;
    if (selectedIncludesClosedTicket) {
      setActionError("Closed tickets cannot be deleted.");
      return;
    }

    setActionError(null);
    setDeleting(true);

    const { error } = await supabase.rpc("delete_tickets_and_audit", {
      ticket_ids: selectedTickets,
      source: "incident-queue",
    });

    if (error) {
      setActionError(error.message);
      setDeleting(false);
      return;
    }

    setDeleteDialogOpen(false);
    setDeleting(false);
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
      if ((path ?? "").split("/")[0] !== "incident-queue") return;
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

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of tickets) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tickets
      .filter((t) => (showArchive ? !!t.archived_at : !t.archived_at))
      .filter((t) => {
      const statusOk =
        statusFilter === "All Status" ||
        statusLabel(t.status) === statusFilter;
      const categoryOk =
        categoryFilter === "All Categories" ||
        t.category === categoryFilter;

      if (!statusOk || !categoryOk) return false;

      if (!q) return true;

      const requesterText =
        `${t.requester_name ?? ""} ${t.requester_email ?? ""} ${t.requester?.full_name ?? ""} ${t.requester?.email ?? ""}`.toLowerCase();
      return (
        t.ticket_number.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        requesterText.includes(q)
      );
    });
  }, [categoryFilter, searchQuery, showArchive, statusFilter, tickets]);

  const archiveCount = useMemo(() => tickets.filter((t) => !!t.archived_at).length, [tickets]);

  const toggleSelection = (id: string) => {
    setSelectedTickets((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id],
    );
  };

  const selectedIncludesClosedTicket = useMemo(() => {
    if (selectedTickets.length === 0) return false;
    const byId = new Map(tickets.map((t) => [t.id, t] as const));
    for (const id of selectedTickets) {
      const t = byId.get(id);
      if (t?.status === "closed") return true;
    }
    return false;
  }, [selectedTickets, tickets]);

  if (view === "create") {
    return (
      <TicketDetailView
        isNewTicket
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
            const next = "#/incident-queue";
            if (window.location.hash !== next) window.location.hash = next;
          }
        }}
      />
    );
  }

  return (
    <div className="pds-page flex-1">
      {/* Header */}
      <div className="pds-page-header">
        <div className="pds-toolbar">
          <h2 className="pds-page-title">Incident Queue</h2>
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
              onClick={() => void bumpPriority("up")}
              disabled={!canWorkTickets || actionBusy}
              title={!canWorkTickets ? "Not permitted" : "Increase priority"}
            >
              <ArrowDownCircle size={14} />
              Priority +
            </button>
            <button
              className="pds-btn pds-btn--secondary pds-focus"
              onClick={() => void bumpPriority("down")}
              disabled={!canWorkTickets || actionBusy}
              title={!canWorkTickets ? "Not permitted" : "Decrease priority"}
            >
              <ArrowDownCircle size={14} />
              Priority -
            </button>

            <button
              className="pds-btn pds-btn--destructive pds-focus"
              onClick={requestDelete}
              disabled={!canWorkTickets || actionBusy || selectedIncludesClosedTicket}
              title={!canWorkTickets
                ? "Not permitted"
                : selectedIncludesClosedTicket
                  ? "Closed tickets cannot be deleted"
                  : "Delete selected tickets"}
            >
              <Trash2 size={14} />
              Delete
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
            placeholder="Search incidents..."
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
          <option>On Hold</option>
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

      {/* Table */}
      <div className="pds-table-wrap">
        {error && (
          <div className="pds-message" data-tone="danger">
            {error}
          </div>
        )}
        {loading ? (
          <div className="px-4 py-3 text-sm pds-text-muted">Loading...</div>
        ) : (
          <table className="pds-table">
            <thead className="pds-thead">
              <tr>
                <th className="pds-th" style={{ width: 44 }}>
                  <input
                    type="checkbox"
                    className="pds-focus"
                    checked={
                      filteredTickets.length > 0 &&
                      selectedTickets.length === filteredTickets.length
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
                <th className="pds-th">Caller</th>
                <th className="pds-th">Priority</th>
                <th className="pds-th">Status</th>
                <th className="pds-th">Assigned</th>
                <th className="pds-th">Category</th>
                <th className="pds-th">Created</th>
                <th className="pds-th">Target</th>
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
                    {ticket.requester_name ??
                      ticket.requester?.full_name ??
                      ticket.requester_email ??
                      ticket.requester?.email ??
                      ""}
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
                      <span>
                        {ticket.assignee?.full_name ?? ticket.assignee?.email ?? ""}
                      </span>
                    ) : (
                      <span className="pds-chip" data-tone="warning">Unassigned</span>
                    )}
                  </td>
                  <td className="pds-td">{ticket.category}</td>
                  <td className="pds-td pds-text-muted" style={{ fontSize: 12 }}>
                    {new Date(ticket.created_at).toLocaleString()}
                  </td>
                  <td className="pds-td pds-text-muted" style={{ fontSize: 12 }}>
                    {new Date(ticket.due_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setDeleting(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected tickets?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              className="pds-btn--destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <label className="text-sm font-medium" style={{ color: "var(--pds-text)" }}>
                Target queue
              </label>
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
              <label className="text-sm font-medium" style={{ color: "var(--pds-text)" }}>
                Note (optional)
              </label>
              <textarea
                className="pds-input pds-focus w-full"
                rows={3}
                value={escalateNote}
                onChange={(e) => setEscalateNote(e.target.value)}
                disabled={escalateSubmitting}
                placeholder="Reason for escalation..."
              />
            </div>

            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--pds-text)" }}>
              <input
                type="checkbox"
                className="pds-focus"
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