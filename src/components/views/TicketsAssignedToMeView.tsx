import { AlertCircle, Clock, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { TicketCreateViewV1 } from "./TicketCreateViewV1";
import { TicketDetailView } from "./TicketDetailView";

export function TicketsAssignedToMeView() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [detailNotice, setDetailNotice] = useState<string | undefined>(undefined);

  const [showArchive, setShowArchive] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  type AssignedTicketRow = {
    id: string;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
    due_at: string;
    category: string;
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
        "id,ticket_number,title,status,priority,category,created_at,due_at,archived_at,requester_email,requester_name,requester:profiles!tickets_requester_id_fkey(full_name,email)",
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
        created_at: row.created_at,
        due_at: row.due_at,
        archived_at: row.archived_at ?? null,
        requester_email: row.requester_email,
        requester_name: row.requester_name,
        requester,
      };
    });

    setAssignedTickets(normalized);
    setLoading(false);
  }, [supabase, user]);

  const filteredTickets = useMemo(
    () => assignedTickets.filter((t) => (showArchive ? !!t.archived_at : !t.archived_at)),
    [assignedTickets, showArchive],
  );

  const archiveCount = useMemo(() => assignedTickets.filter((t) => !!t.archived_at).length, [assignedTickets]);

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
      <TicketCreateViewV1
        onBack={() => setView("list")}
        onCreated={(ticketId) => {
          setActiveTicketId(ticketId);
          setDetailNotice("Created.");
          setView("detail");
        }}
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

  const handleCreate = () => {
    setCreating(true);
    setError(null);
    setView("create");
    setCreating(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#2d3e50]">
            Tickets Assigned to Me
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">
                {filteredTickets.length} tickets
              </span>
            </div>
            <div className="flex items-center border border-gray-300 rounded overflow-hidden">
              <button
                type="button"
                className={`px-3 py-1.5 text-sm transition-colors ${
                  showArchive ? "bg-white hover:bg-gray-50 text-gray-700" : "bg-[#e3f2fd] text-[#1976d2]"
                }`}
                onClick={() => setShowArchive(false)}
              >
                Active
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-sm transition-colors ${
                  showArchive ? "bg-[#e3f2fd] text-[#1976d2]" : "bg-white hover:bg-gray-50 text-gray-700"
                }`}
                onClick={() => setShowArchive(true)}
              >
                Archive ({archiveCount})
              </button>
            </div>
            <button
              onClick={() => handleCreate()}
              disabled={creating}
              className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors disabled:opacity-60"
            >
              New Ticket
            </button>
            <button
              onClick={() => void loadTickets()}
              className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="border-b border-gray-300 px-4 py-2 bg-white">
          <div className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </div>
        </div>
      )}

      {/* Tickets Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 text-sm text-gray-600">Loading...</div>
        ) : (
        <table className="w-full text-sm">
          <thead className="bg-[#f5f5f5] border-b border-gray-300 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Number
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Subject
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Caller
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Priority
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Status
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Category
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Created
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Target Date
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="border-b border-gray-200 hover:bg-[#f9f9f9] cursor-pointer transition-colors"
                onClick={() => {
                  setActiveTicketId(ticket.id);
                  setDetailNotice(undefined);
                  setView("detail");
                }}
              >
                <td className="px-4 py-3 text-[#4a9eff] font-medium">
                  <span title={ticket.ticket_number}>{ticket.ticket_number}</span>
                </td>
                <td className="px-4 py-3 font-medium">
                  {ticket.title}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <User size={14} className="text-gray-500" />
                    {ticket.requester_name ?? ticket.requester?.full_name ?? ticket.requester_email ?? ticket.requester?.email ?? "Unknown"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      priorityLabel(ticket.priority) === "P1"
                        ? "bg-red-100 text-red-800"
                        : priorityLabel(ticket.priority) === "P2"
                          ? "bg-orange-100 text-orange-800"
                          : priorityLabel(ticket.priority) === "P3"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {priorityLabel(ticket.priority)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      statusLabel(ticket.status) === "Open"
                        ? "bg-blue-100 text-blue-800"
                        : statusLabel(ticket.status) === "In Progress"
                          ? "bg-green-100 text-green-800"
                          : statusLabel(ticket.status) === "New"
                            ? "bg-gray-100 text-gray-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {statusLabel(ticket.status)}
                  </span>
                </td>
                <td className="px-4 py-3">{ticket.category}</td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {new Date(ticket.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
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
    </div>
  );
}