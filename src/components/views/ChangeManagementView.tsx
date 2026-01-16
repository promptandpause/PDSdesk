import {
  Plus,
  Search,
  Filter,
  Download,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

// TODO: Fetch change requests from Supabase
export function ChangeManagementView() {
  const { user, roles, isInOperatorGroup } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const canWorkTickets =
    roles.includes("global_admin") ||
    roles.includes("service_desk_admin") ||
    roles.includes("operator") ||
    isInOperatorGroup("it_services");

  type TicketRow = {
    id: string;
    ticket_number: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    ticket_type: string | null;
    requester_id: string;
    assignee_id: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
  };

  type TicketChangeRow = {
    ticket_id: string;
    change_type: string;
    risk_level: string | null;
    implementation_plan: string | null;
    rollback_plan: string | null;
    scheduled_start_at: string | null;
    scheduled_end_at: string | null;
    approval_status: string;
    created_at: string;
    updated_at: string;
  };

  type ChangeListRow = {
    ticket: TicketRow;
    change: TicketChangeRow;
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [rows, setRows] = useState<ChangeListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ChangeListRow | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPriority, setCreatePriority] = useState("medium");
  const [createType, setCreateType] = useState("standard");
  const [createRisk, setCreateRisk] = useState("medium");
  const [createStatus, setCreateStatus] = useState("draft");
  const [createPlannedStart, setCreatePlannedStart] = useState("");
  const [createPlannedEnd, setCreatePlannedEnd] = useState("");
  const [createImplPlan, setCreateImplPlan] = useState("");
  const [createRollbackPlan, setCreateRollbackPlan] = useState("");
  const [createAssignToMe, setCreateAssignToMe] = useState(true);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editType, setEditType] = useState("standard");
  const [editRisk, setEditRisk] = useState("medium");
  const [editStatus, setEditStatus] = useState("draft");
  const [editPlannedStart, setEditPlannedStart] = useState("");
  const [editPlannedEnd, setEditPlannedEnd] = useState("");
  const [editImplPlan, setEditImplPlan] = useState("");
  const [editRollbackPlan, setEditRollbackPlan] = useState("");
  const [editAssigneeSelf, setEditAssigneeSelf] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const downloadCsv = (filename: string, rowsToExport: Array<Record<string, unknown>>) => {
    const esc = (value: unknown) => {
      const s = String(value ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    };

    const headers = Array.from(
      rowsToExport.reduce((set, row) => {
        Object.keys(row).forEach((k) => set.add(k));
        return set;
      }, new Set<string>()),
    );

    const csv = [
      headers.join(","),
      ...rowsToExport.map((r) => headers.map((h) => esc((r as any)[h])).join(",")),
    ].join("\n");

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

  const openChange = (ticketId: string) => {
    if (typeof window === "undefined") return;
    const id = ticketId.trim();
    if (!id) return;
    window.location.hash = `#/change-management?ticketId=${encodeURIComponent(id)}`;
  };

  const closeChange = () => {
    if (typeof window === "undefined") return;
    window.location.hash = "#/change-management";
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromHash = () => {
      const raw = window.location.hash || "";
      const [path, query] = raw.replace(/^#\/?/, "").split("?");
      if ((path ?? "").split("/")[0] !== "change-management") return;
      const params = new URLSearchParams(query ?? "");
      const id = params.get("ticketId");
      setSelectedTicketId(id && id.trim() ? id.trim() : null);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOpen = (e: Event) => {
      const ev = e as CustomEvent<{ ticketId?: string }>;
      const id = (ev.detail?.ticketId ?? "").trim();
      if (id) openChange(id);
    };
    window.addEventListener("pdsdesk:change-management:open-change", onOpen);
    return () => window.removeEventListener("pdsdesk:change-management:open-change", onOpen);
  }, []);

  const refreshChanges = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const changesRes = await supabase
      .from("ticket_changes")
      .select("ticket_id,change_type,risk_level,implementation_plan,rollback_plan,scheduled_start_at,scheduled_end_at,approval_status,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (changesRes.error) {
      setRows([]);
      setError(changesRes.error.message);
      setLoading(false);
      return;
    }

    const changes = (changesRes.data ?? []) as TicketChangeRow[];
    const ticketIds = changes.map((c) => c.ticket_id);
    if (!ticketIds.length) {
      setRows([]);
      setLoading(false);
      return;
    }

    const ticketsRes = await supabase
      .from("tickets")
      .select("id,ticket_number,title,description,status,priority,ticket_type,requester_id,assignee_id,created_by,created_at,updated_at")
      .in("id", ticketIds);

    if (ticketsRes.error) {
      setRows([]);
      setError(ticketsRes.error.message);
      setLoading(false);
      return;
    }

    const tickets = (ticketsRes.data ?? []) as TicketRow[];
    const byId = new Map(tickets.map((t) => [t.id, t]));

    const merged: ChangeListRow[] = changes
      .map((c) => {
        const t = byId.get(c.ticket_id);
        if (!t) return null;
        if (t.ticket_type !== "change") return null;
        return { ticket: t, change: c };
      })
      .filter(Boolean) as ChangeListRow[];

    merged.sort((a, b) => (a.change.updated_at < b.change.updated_at ? 1 : -1));
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    void refreshChanges();
  }, [user]);

  useEffect(() => {
    const handler = () => {
      void refreshChanges();
    };
    window.addEventListener("pdsdesk:refresh", handler as EventListener);
    return () => window.removeEventListener("pdsdesk:refresh", handler as EventListener);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (!selectedTicketId) {
      setSelected(null);
      setSelectedError(null);
      setSelectedLoading(false);
      setEditMode(false);
      setEditSubmitting(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setSelectedLoading(true);
      setSelectedError(null);

      const [ticketRes, changeRes] = await Promise.all([
        supabase
          .from("tickets")
          .select("id,ticket_number,title,description,status,priority,ticket_type,requester_id,assignee_id,created_by,created_at,updated_at")
          .eq("id", selectedTicketId)
          .single(),
        supabase
          .from("ticket_changes")
          .select("ticket_id,change_type,risk_level,implementation_plan,rollback_plan,scheduled_start_at,scheduled_end_at,approval_status,created_at,updated_at")
          .eq("ticket_id", selectedTicketId)
          .single(),
      ]);

      if (cancelled) return;

      if (ticketRes.error || changeRes.error) {
        setSelected(null);
        setSelectedError((ticketRes.error ?? changeRes.error)?.message ?? "Failed to load change.");
        setSelectedLoading(false);
        return;
      }

      if ((ticketRes.data as TicketRow).ticket_type !== "change") {
        setSelected(null);
        setSelectedError("Change request not found.");
        setSelectedLoading(false);
        return;
      }

      setSelected({ ticket: ticketRes.data as TicketRow, change: changeRes.data as TicketChangeRow });
      setEditMode(false);
      setEditSubmitting(false);
      setSelectedLoading(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedTicketId, supabase, user]);

  useEffect(() => {
    if (!selected) return;
    setEditTitle(selected.ticket.title ?? "");
    setEditDescription(selected.ticket.description ?? "");
    setEditPriority(selected.ticket.priority ?? "medium");
    setEditType(selected.change.change_type ?? "standard");
    setEditRisk((selected.change.risk_level ?? "medium").toLowerCase());
    setEditStatus(selected.change.approval_status ?? "draft");
    setEditPlannedStart(selected.change.scheduled_start_at ? selected.change.scheduled_start_at.slice(0, 16) : "");
    setEditPlannedEnd(selected.change.scheduled_end_at ? selected.change.scheduled_end_at.slice(0, 16) : "");
    setEditImplPlan(selected.change.implementation_plan ?? "");
    setEditRollbackPlan(selected.change.rollback_plan ?? "");
    setEditAssigneeSelf(selected.ticket.assignee_id === user?.id);
  }, [selected, user?.id]);

  useEffect(() => {
    if (!createOpen) return;
    setCreateTitle("");
    setCreateDescription("");
    setCreatePriority("medium");
    setCreateType("standard");
    setCreateRisk("medium");
    setCreateStatus("draft");
    setCreatePlannedStart("");
    setCreatePlannedEnd("");
    setCreateImplPlan("");
    setCreateRollbackPlan("");
    setCreateAssignToMe(true);
    setCreateSubmitting(false);
    setCreateError(null);
  }, [createOpen]);

  const submitCreate = async () => {
    if (!user) return;
    if (!canWorkTickets) {
      setCreateError("You do not have permission to create change requests.");
      return;
    }
    const title = createTitle.trim();
    const description = createDescription.trim() || null;
    const priority = createPriority.trim() || "medium";
    const assignee_id = createAssignToMe ? user.id : null;

    if (!title) {
      setCreateError("Title is required.");
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);

    const ticketIns = await supabase
      .from("tickets")
      .insert({
        title,
        description,
        status: "new",
        priority,
        requester_id: user.id,
        assignee_id,
        created_by: user.id,
        ticket_type: "change",
        channel: "manual",
      } as any)
      .select("id")
      .single();

    if (ticketIns.error) {
      setCreateError(ticketIns.error.message);
      setCreateSubmitting(false);
      return;
    }

    const ticketId = ticketIns.data.id as string;
    const scheduled_start_at = createPlannedStart ? new Date(createPlannedStart).toISOString() : null;
    const scheduled_end_at = createPlannedEnd ? new Date(createPlannedEnd).toISOString() : null;

    const changeIns = await supabase
      .from("ticket_changes")
      .insert({
        ticket_id: ticketId,
        change_type: createType,
        risk_level: createRisk,
        approval_status: createStatus,
        scheduled_start_at,
        scheduled_end_at,
        implementation_plan: createImplPlan.trim() || null,
        rollback_plan: createRollbackPlan.trim() || null,
      })
      .select("ticket_id")
      .single();

    if (changeIns.error) {
      setCreateError(changeIns.error.message);
      setCreateSubmitting(false);
      return;
    }

    setCreateSubmitting(false);
    setCreateOpen(false);
    await refreshChanges();
    openChange(ticketId);
  };

  const submitEdit = async () => {
    if (!user) return;
    if (!canWorkTickets) {
      setSelectedError("You do not have permission to edit change requests.");
      return;
    }
    if (!selectedTicketId) return;

    const title = editTitle.trim();
    const description = editDescription.trim() || null;
    const priority = editPriority.trim() || "medium";
    const assignee_id = editAssigneeSelf ? user.id : null;

    if (!title) {
      setSelectedError("Title is required.");
      return;
    }

    setEditSubmitting(true);
    setSelectedError(null);

    const [ticketUpd, changeUpd] = await Promise.all([
      supabase
        .from("tickets")
        .update({
          title,
          description,
          priority,
          assignee_id,
        })
        .eq("id", selectedTicketId),
      supabase
        .from("ticket_changes")
        .update({
          change_type: editType,
          risk_level: editRisk,
          approval_status: editStatus,
          scheduled_start_at: editPlannedStart ? new Date(editPlannedStart).toISOString() : null,
          scheduled_end_at: editPlannedEnd ? new Date(editPlannedEnd).toISOString() : null,
          implementation_plan: editImplPlan.trim() || null,
          rollback_plan: editRollbackPlan.trim() || null,
        })
        .eq("ticket_id", selectedTicketId),
    ]);

    const firstErr = ticketUpd.error ?? changeUpd.error;
    if (firstErr) {
      setSelectedError(firstErr.message);
      setEditSubmitting(false);
      return;
    }

    setEditMode(false);
    setEditSubmitting(false);
    await refreshChanges();
    const [ticketRes, changeRes] = await Promise.all([
      supabase
        .from("tickets")
        .select("id,ticket_number,title,description,status,priority,ticket_type,requester_id,assignee_id,created_by,created_at,updated_at")
        .eq("id", selectedTicketId)
        .single(),
      supabase
        .from("ticket_changes")
        .select("ticket_id,change_type,risk_level,implementation_plan,rollback_plan,scheduled_start_at,scheduled_end_at,approval_status,created_at,updated_at")
        .eq("ticket_id", selectedTicketId)
        .single(),
    ]);
    if (!ticketRes.error && !changeRes.error) {
      const t = ticketRes.data as TicketRow;
      if (t.ticket_type === "change") {
        setSelected({ ticket: t, change: changeRes.data as TicketChangeRow });
      }
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = `${r.ticket.ticket_number} ${r.ticket.title} ${r.change.change_type} ${r.change.approval_status} ${r.ticket.priority} ${r.change.risk_level ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, searchTerm]);

  const exportChanges = () => {
    const source = filtered;
    downloadCsv(
      `change-management-${new Date().toISOString().slice(0, 10)}.csv`,
      source.map((r) => ({
        ticket_id: r.ticket.id,
        ticket_number: r.ticket.ticket_number,
        title: r.ticket.title,
        status: r.ticket.status,
        priority: r.ticket.priority,
        change_type: r.change.change_type,
        approval_status: r.change.approval_status,
        risk_level: r.change.risk_level ?? "",
        planned_start_at: r.change.scheduled_start_at ?? "",
        planned_end_at: r.change.scheduled_end_at ?? "",
        updated_at: r.change.updated_at,
        created_at: r.change.created_at,
      })),
    );
  };

  return (
    <div className="flex-1 flex h-full bg-white overflow-hidden">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Change Request</DialogTitle>
            <DialogDescription>Create a new change request.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                rows={5}
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                disabled={createSubmitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value)}
                  disabled={createSubmitting}
                >
                  <option value="standard">Standard</option>
                  <option value="normal">Normal</option>
                  <option value="major">Major</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                  value={createPriority}
                  onChange={(e) => setCreatePriority(e.target.value)}
                  disabled={createSubmitting}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                  value={createStatus}
                  onChange={(e) => setCreateStatus(e.target.value)}
                  disabled={createSubmitting}
                >
                  <option value="draft">Draft</option>
                  <option value="in_review">In Review</option>
                  <option value="approved">Approved</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Risk</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                  value={createRisk}
                  onChange={(e) => setCreateRisk(e.target.value)}
                  disabled={createSubmitting}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Planned Start</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                  value={createPlannedStart}
                  onChange={(e) => setCreatePlannedStart(e.target.value)}
                  disabled={createSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Planned End</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                  value={createPlannedEnd}
                  onChange={(e) => setCreatePlannedEnd(e.target.value)}
                  disabled={createSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Implementation Plan</label>
              <textarea
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                rows={4}
                value={createImplPlan}
                onChange={(e) => setCreateImplPlan(e.target.value)}
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rollback Plan</label>
              <textarea
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                rows={4}
                value={createRollbackPlan}
                onChange={(e) => setCreateRollbackPlan(e.target.value)}
                disabled={createSubmitting}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={createAssignToMe}
                onChange={(e) => setCreateAssignToMe(e.target.checked)}
                disabled={createSubmitting}
              />
              Assign to me
            </label>

            {createError && <div className="text-sm text-red-600">{createError}</div>}
          </div>

          <DialogFooter>
            <button
              type="button"
              className="px-3 py-2 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors"
              onClick={() => setCreateOpen(false)}
              disabled={createSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-3 py-2 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors"
              onClick={() => void submitCreate()}
              disabled={createSubmitting}
            >
              {createSubmitting ? "Creating..." : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Change Management
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-1"
            onClick={() => {
              if (!canWorkTickets) {
                setError("You do not have permission to create change requests.");
                return;
              }
              setCreateOpen(true);
            }}
            disabled={!canWorkTickets}
          >
            <Plus size={14} />
            New Change Request
          </button>
          <button
            type="button"
            className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
            onClick={exportChanges}
            disabled={loading || filtered.length === 0}
          >
            <Download size={14} />
            Export
          </button>
          <button
            type="button"
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            onClick={() => {
              if (typeof window !== "undefined") window.location.hash = "#/settings";
            }}
            title="Settings"
          >
            <Settings size={16} className="text-[#2d3e50]" />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="border-b border-gray-300 px-4 py-3 flex items-center gap-3 bg-white">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search change requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
          />
        </div>
        <button
          type="button"
          className="px-3 py-2 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
          onClick={() => setError("Filters are not implemented yet. Use search for now.")}
        >
          <Filter size={14} />
          Filters
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="m-4 bg-white border border-gray-300 rounded p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-4 text-sm text-gray-600">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#f5f5f5] border-b border-gray-300 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">Number</th>
                <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">Title</th>
                <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">Type</th>
                <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">Status</th>
                <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">Priority</th>
                <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">Assignee</th>
                <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">Planned Date</th>
                <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">Risk</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const planned = row.change.scheduled_start_at ? new Date(row.change.scheduled_start_at).toLocaleDateString() : "";
                const type = (row.change.change_type ?? "").toString();
                const status = (row.change.approval_status ?? "").toString();
                const risk = (row.change.risk_level ?? "").toString();
                return (
                  <tr
                    key={row.ticket.id}
                    className="border-b border-gray-200 hover:bg-[#f9f9f9] cursor-pointer transition-colors"
                    onClick={() => openChange(row.ticket.id)}
                  >
                    <td className="px-4 py-3 text-[#4a9eff] font-medium">
                      {row.ticket.ticket_number}
                    </td>
                    <td className="px-4 py-3">{row.ticket.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          type === "emergency"
                            ? "bg-red-100 text-red-800"
                            : type === "major"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          status === "scheduled"
                            ? "bg-blue-100 text-blue-800"
                            : status === "in_review"
                              ? "bg-yellow-100 text-yellow-800"
                              : status === "approved"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.ticket.priority}</td>
                    <td className="px-4 py-3">{row.ticket.assignee_id === user?.id ? "Me" : "—"}</td>
                    <td className="px-4 py-3">{planned}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          risk === "high"
                            ? "bg-red-100 text-red-800"
                            : risk === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {risk}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      </div>

      {selectedTicketId && (
        <div className="w-[440px] border-l border-gray-300 bg-white flex flex-col">
          <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between bg-[#f5f5f5]">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-[#2d3e50]">Change</div>
              {!selectedLoading && selected && canWorkTickets && (
                <button
                  type="button"
                  className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-100"
                  onClick={() => {
                    if (editSubmitting) return;
                    setEditMode((prev) => !prev);
                  }}
                >
                  {editMode ? "View" : "Edit"}
                </button>
              )}
              {editMode && (
                <button
                  type="button"
                  className="px-2 py-1 bg-[#4a9eff] text-white rounded text-xs hover:bg-[#3a8eef]"
                  onClick={() => void submitEdit()}
                  disabled={editSubmitting}
                >
                  {editSubmitting ? "Saving..." : "Save"}
                </button>
              )}
              {editMode && (
                <button
                  type="button"
                  className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-100"
                  onClick={() => {
                    if (!selected) return;
                    setEditMode(false);
                    setEditTitle(selected.ticket.title ?? "");
                    setEditDescription(selected.ticket.description ?? "");
                    setEditPriority(selected.ticket.priority ?? "medium");
                    setEditType(selected.change.change_type ?? "standard");
                    setEditRisk((selected.change.risk_level ?? "medium").toLowerCase());
                    setEditStatus(selected.change.approval_status ?? "draft");
                    setEditPlannedStart(selected.change.scheduled_start_at ? selected.change.scheduled_start_at.slice(0, 16) : "");
                    setEditPlannedEnd(selected.change.scheduled_end_at ? selected.change.scheduled_end_at.slice(0, 16) : "");
                    setEditImplPlan(selected.change.implementation_plan ?? "");
                    setEditRollbackPlan(selected.change.rollback_plan ?? "");
                    setEditAssigneeSelf(selected.ticket.assignee_id === user?.id);
                  }}
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
              )}
            </div>
            <button
              type="button"
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              onClick={closeChange}
              title="Close"
            >
              <X size={16} className="text-[#2d3e50]" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {selectedError && (
              <div className="mb-3 bg-white border border-gray-300 rounded p-3 text-sm text-red-600">
                {selectedError}
              </div>
            )}
            {selectedLoading || !selected ? (
              <div className="text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500">{selected.ticket.ticket_number}</div>
                  {editMode ? (
                    <div className="mt-2 space-y-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Title</label>
                        <input
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          disabled={editSubmitting}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Description</label>
                        <textarea
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                          rows={6}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          disabled={editSubmitting}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Type</label>
                          <select
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            disabled={editSubmitting}
                          >
                            <option value="standard">Standard</option>
                            <option value="normal">Normal</option>
                            <option value="major">Major</option>
                            <option value="emergency">Emergency</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Priority</label>
                          <select
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value)}
                            disabled={editSubmitting}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Status</label>
                          <select
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            disabled={editSubmitting}
                          >
                            <option value="draft">Draft</option>
                            <option value="in_review">In Review</option>
                            <option value="approved">Approved</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Risk</label>
                          <select
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                            value={editRisk}
                            onChange={(e) => setEditRisk(e.target.value)}
                            disabled={editSubmitting}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Planned Start</label>
                          <input
                            type="datetime-local"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                            value={editPlannedStart}
                            onChange={(e) => setEditPlannedStart(e.target.value)}
                            disabled={editSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Planned End</label>
                          <input
                            type="datetime-local"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                            value={editPlannedEnd}
                            onChange={(e) => setEditPlannedEnd(e.target.value)}
                            disabled={editSubmitting}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Implementation Plan</label>
                        <textarea
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                          rows={4}
                          value={editImplPlan}
                          onChange={(e) => setEditImplPlan(e.target.value)}
                          disabled={editSubmitting}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Rollback Plan</label>
                        <textarea
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                          rows={4}
                          value={editRollbackPlan}
                          onChange={(e) => setEditRollbackPlan(e.target.value)}
                          disabled={editSubmitting}
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editAssigneeSelf}
                          onChange={(e) => setEditAssigneeSelf(e.target.checked)}
                          disabled={editSubmitting}
                        />
                        Assign to me
                      </label>
                    </div>
                  ) : (
                    <>
                      <div className="mt-1 text-lg font-semibold text-[#2d3e50]">{selected.ticket.title}</div>
                      {selected.ticket.description && (
                        <div className="mt-2 text-sm text-[#2d3e50] whitespace-pre-wrap">
                          {selected.ticket.description}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!editMode && (
                  <div className="border-t border-gray-200 pt-3 text-xs text-gray-600 space-y-2">
                    <div>
                      <span className="text-gray-500">Type:</span> {selected.change.change_type}
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span> {selected.change.approval_status}
                    </div>
                    <div>
                      <span className="text-gray-500">Risk:</span> {selected.change.risk_level ?? ""}
                    </div>
                    <div>
                      <span className="text-gray-500">Priority:</span> {selected.ticket.priority}
                    </div>
                    <div>
                      <span className="text-gray-500">Assignee:</span> {selected.ticket.assignee_id === user?.id ? "Me" : "—"}
                    </div>
                    <div>
                      <span className="text-gray-500">Updated:</span> {new Date(selected.ticket.updated_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}