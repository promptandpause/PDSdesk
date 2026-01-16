import { AlertCircle, ArrowUpCircle, Clock, User } from "lucide-react";
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

export function TicketsAssignedToMeView() {
  const { user, hasRole, isGlobalAdmin, isInOperatorGroup } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [detailNotice, setDetailNotice] = useState<string | undefined>(undefined);

  const [showArchive, setShowArchive] = useState(false);

  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  const canWorkTickets =
    isGlobalAdmin ||
    hasRole("service_desk_admin") ||
    hasRole("operator") ||
    isInOperatorGroup("it_services") ||
    isInOperatorGroup("customer_service");

  type AssignedTicketRow = {
    id: string;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
    due_at: string;
    category: string;
    assignment_group_id: string | null;
    archived_at: string | null;
    requester_email: string | null;
    requester_name: string | null;
    requester: { full_name: string | null; email: string | null } | null;
  };

  type RawAssignedTicketRow = {
    id: string;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
    due_at: string;
    category: string;
    assignment_group_id: string | null;
    archived_at: string | null;
    requester_email: string | null;
    requester_name: string | null;
    requester:
      | { full_name: string | null; email: string | null }
      | Array<{ full_name: string | null; email: string | null }>
      | null;
  };

  const [assignedTickets, setAssignedTickets] = useState<AssignedTicketRow[]>([]);

  const loadTickets = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("tickets")
      .select(
        "id,ticket_number,title,status,priority,category,assignment_group_id,created_at,due_at,archived_at,requester_email,requester_name,requester:profiles!tickets_requester_id_fkey(full_name,email)",
      )
      .eq("assignee_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setAssignedTickets([]);
      setLoading(false);
      return;
    }

    const rows = (data as unknown as RawAssignedTicketRow[]) ?? [];
    const normalized: AssignedTicketRow[] = rows.map((row) => {
      const requester = Array.isArray(row.requester)
        ? row.requester[0] ?? null
        : row.requester ?? null;

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
      };
    });

    setAssignedTickets(normalized);
    setSelectedTickets([]);
    setLoading(false);
  }, [supabase, user]);

  const filteredTickets = useMemo(
    () => assignedTickets.filter((t) => (showArchive ? !!t.archived_at : !t.archived_at)),
    [assignedTickets, showArchive],
  );

  const archiveCount = useMemo(() => assignedTickets.filter((t) => !!t.archived_at).length, [assignedTickets]);

  const toggleSelection = (id: string) => {
    setSelectedTickets((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id],
    );
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
  const [escalateClearAssignee, setEscalateClearAssignee] = useState(false);
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
    setActionBusy(true);

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
      setActionBusy(false);
      return;
    }

    const byId = new Map(assignedTickets.map((t) => [t.id, t] as const));
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
          source: "tickets-assigned-to-me",
        },
      };
    });

    const ev = await supabase.from("ticket_events").insert(events);
    if (ev.error) {
      setEscalateError(ev.error.message);
      setEscalateSubmitting(false);
      setActionBusy(false);
      return;
    }

    setEscalateSubmitting(false);
    setEscalateDialogOpen(false);
    setEscalateTargetGroupId("");
    setEscalateNote("");
    setActionBusy(false);
    await loadTickets();
  };

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

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
        }}
      />
    );
  }

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

  const handleCreate = () => {
    setCreating(true);
    setError(null);
    setView("create");
    setCreating(false);
  };

  return (
    <div className="pds-page flex-1">
      <div className="pds-page-header">
        <div className="pds-toolbar">
          <h2 className="pds-page-title">Tickets Assigned to Me</h2>
          <div className="pds-toolbar-actions">
            <div className="text-sm pds-text-muted">
              <strong>{filteredTickets.length}</strong> tickets
            </div>
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
              onClick={() => handleCreate()}
              disabled={creating}
              className="pds-btn pds-btn--primary pds-focus"
            >
              New Ticket
            </button>
            <button
              onClick={() => void loadTickets()}
              className="pds-btn pds-btn--outline pds-focus"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="pds-message" data-tone="danger">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {actionError && (
        <div className="pds-message" data-tone="danger">
          <AlertCircle size={14} />
          {actionError}
        </div>
      )}

      {selectedTickets.length > 0 && (
        <div className="pds-actionbar">
          <span className="text-sm">
            <strong>{selectedTickets.length}</strong> selected
          </span>
          <div className="pds-toolbar-actions">
            <button
              className="pds-btn pds-btn--secondary pds-focus"
              onClick={() => void openEscalateDialog()}
              disabled={!canWorkTickets || actionBusy}
              title={!canWorkTickets ? "Not permitted" : "Escalate selected tickets to a queue"}
            >
              <ArrowUpCircle size={14} />
              Escalate
            </button>
          </div>
        </div>
      )}

      {/* Tickets Table */}
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
                    filteredTickets.length > 0 &&
                    selectedTickets.length === filteredTickets.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTickets(filteredTickets.map((t) => t.id));
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
                  <span className="pds-link" title={ticket.ticket_number}>{ticket.ticket_number}</span>
                </td>
                <td className="pds-td">
                  <span className="font-semibold">{ticket.title}</span>
                </td>
                <td className="pds-td">
                  <div className="flex items-center gap-1">
                    <User size={14} className="pds-text-muted" />
                    {ticket.requester_name ?? ticket.requester?.full_name ?? ticket.requester_email ?? ticket.requester?.email ?? "Unknown"}
                  </div>
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
                  <span className="pds-chip" data-tone="muted">{ticket.category}</span>
                </td>
                <td className="pds-td pds-text-muted" style={{ fontSize: 12 }}>
                  {new Date(ticket.created_at).toLocaleString()}
                </td>
                <td className="pds-td pds-text-muted" style={{ fontSize: 12 }}>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(ticket.due_at).toLocaleString()}
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
            <div className="text-sm text-red-600">{operatorGroupsError}</div>
          )}
          {escalateError && (
            <div className="text-sm text-red-600">{escalateError}</div>
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