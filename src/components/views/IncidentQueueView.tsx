import {
  Plus,
  Search,
  Filter,
  Download,
  Settings,
  ArrowUpCircle,
  ArrowDownCircle,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { TicketDetailView } from "./TicketDetailView";
import { TicketCreateViewV1 } from "./TicketCreateViewV1";

export function IncidentQueueView() {
  const { user } = useAuth();
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
        "id,ticket_number,title,status,priority,category,created_at,due_at,archived_at,requester_email,requester_name,requester:profiles!tickets_requester_id_fkey(full_name,email),assignee:profiles!tickets_assignee_id_fkey(full_name,email)",
      )
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

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Incident Queue
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-1"
            onClick={() => setView("create")}
          >
            <Plus size={14} />
            New Ticket
          </button>
          <button
            className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors"
            onClick={() => void loadTickets()}
          >
            Refresh
          </button>
          <button className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-1">
            <Download size={14} />
            Export
          </button>
          <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
            <Settings size={16} className="text-[#2d3e50]" />
          </button>
        </div>
      </div>

      {/* Action Bar */}
      {selectedTickets.length > 0 && (
        <div className="bg-[#e3f2fd] border-b border-[#90caf9] px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-[#1976d2] font-medium">
            {selectedTickets.length} ticket(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-white border border-gray-300 text-sm rounded hover:bg-gray-50 transition-colors flex items-center gap-1">
              <Users size={14} />
              Assign
            </button>
            <button className="px-3 py-1.5 bg-white border border-gray-300 text-sm rounded hover:bg-gray-50 transition-colors flex items-center gap-1">
              <ArrowUpCircle size={14} />
              Escalate
            </button>
            <button className="px-3 py-1.5 bg-white border border-gray-300 text-sm rounded hover:bg-gray-50 transition-colors flex items-center gap-1">
              <ArrowDownCircle size={14} />
              De-escalate
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="border-b border-gray-300 px-4 py-3 flex items-center gap-3 bg-white">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
          />
        </div>
        <select
          className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
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
          className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
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
        <div className="flex items-center border border-gray-300 rounded overflow-hidden">
          <button
            type="button"
            className={`px-3 py-2 text-sm transition-colors ${
              showArchive ? "bg-white hover:bg-gray-50 text-gray-700" : "bg-[#e3f2fd] text-[#1976d2]"
            }`}
            onClick={() => setShowArchive(false)}
          >
            Active
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm transition-colors ${
              showArchive ? "bg-[#e3f2fd] text-[#1976d2]" : "bg-white hover:bg-gray-50 text-gray-700"
            }`}
            onClick={() => setShowArchive(true)}
          >
            Archive ({archiveCount})
          </button>
        </div>
        <button className="px-3 py-2 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-1">
          <Filter size={14} />
          More Filters
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {loading ? (
          <div className="px-4 py-3 text-sm text-gray-600">Loading...</div>
        ) : (
        <table className="w-full text-sm">
          <thead className="bg-[#f5f5f5] border-b border-gray-300 sticky top-0">
            <tr>
              <th className="px-4 py-2 w-10">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={
                    filteredTickets.length > 0 &&
                    selectedTickets.length === filteredTickets.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTickets(
                        filteredTickets.map((i) => i.id),
                      );
                    } else {
                      setSelectedTickets([]);
                    }
                  }}
                />
              </th>
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
                Assigned To
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
                className={`border-b border-gray-200 hover:bg-[#f9f9f9] cursor-pointer transition-colors ${
                  selectedTickets.includes(ticket.id)
                    ? "bg-[#e3f2fd]"
                    : ""
                }`}
                onClick={() => {
                  setActiveTicketId(ticket.id);
                  setDetailNotice(undefined);
                  setView("detail");
                }}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={selectedTickets.includes(
                      ticket.id,
                    )}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelection(ticket.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="px-4 py-3 text-[#4a9eff] font-medium">
                  {ticket.ticket_number}
                </td>
                <td className="px-4 py-3 font-medium">
                  {ticket.title}
                </td>
                <td className="px-4 py-3">
                  {ticket.requester_name ??
                    ticket.requester?.full_name ??
                    ticket.requester_email ??
                    ticket.requester?.email ??
                    ""}
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
                      statusLabel(ticket.status) === "New"
                        ? "bg-blue-100 text-blue-800"
                        : statusLabel(ticket.status) === "Open"
                          ? "bg-cyan-100 text-cyan-800"
                          : statusLabel(ticket.status) === "In Progress"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {statusLabel(ticket.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      ticket.assignee
                        ? ""
                        : "text-red-600 font-medium"
                    }
                  >
                    {ticket.assignee?.full_name ??
                      ticket.assignee?.email ??
                      "Unassigned"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {ticket.category}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {new Date(ticket.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {new Date(ticket.due_at).toLocaleString()}
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