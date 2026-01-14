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
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { TicketCreateViewV1 } from "./TicketCreateViewV1";
import { TicketDetailView } from "./TicketDetailView";

export function CustomerSupportQueueView() {
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

  type QueueTicket = {
    id: string;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
    category: string;
    channel: string;
    mailbox: string | null;
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

  const loadTickets = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("tickets")
      .select(
        "id,ticket_number,title,status,priority,category,channel,mailbox,created_at,archived_at,requester_email,requester_name,requester:profiles!tickets_requester_id_fkey(full_name,email),assignee:profiles!tickets_assignee_id_fkey(full_name,email)",
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

  if (view === "create") {
    return (
      <TicketCreateViewV1
        onBack={() => setView("list")}
        defaults={{
          ticket_type: "customer_service",
          channel: "email",
          mailbox: "support@promptandpause.com",
        }}
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
        <div className="flex items-center gap-3">
          <Mail size={20} className="text-[#4a9eff]" />
          <h2 className="text-lg font-semibold text-[#2d3e50]">
            Customer Support Queue
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-1"
            onClick={() => setView("create")}
          >
            <Plus size={14} />
            New Customer Ticket
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

      {/* Info Banner */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2">
        <Mail size={16} className="text-blue-600" />
        <span className="text-sm text-blue-900">
          This queue manages customer inquiries from email.
          Tickets are automatically created from{" "}
          <strong>support@promptandpause.com</strong>
        </span>
      </div>

      {error && (
        <div className="px-4 py-2 text-sm text-red-600 border-b border-gray-200">
          {error}
        </div>
      )}

      {/* Action Bar */}
      {selectedTickets.length > 0 && (
        <div className="bg-[#e3f2fd] border-b border-[#90caf9] px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-[#1976d2] font-medium">
            {selectedTickets.length} ticket(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-white border border-gray-300 text-sm rounded hover:bg-gray-50 transition-colors flex items-center gap-1">
              <User size={14} />
              Assign
            </button>
            <button className="px-3 py-1.5 bg-white border border-gray-300 text-sm rounded hover:bg-gray-50 transition-colors flex items-center gap-1">
              <Tag size={14} />
              Change Category
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
            placeholder="Search customer tickets..."
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

      {/* Stats Bar */}
      <div className="border-b border-gray-300 px-4 py-2 flex items-center gap-6 bg-[#fafafa]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">New:</span>
          <span className="text-sm font-semibold text-blue-600">
            {stats.newCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Open:</span>
          <span className="text-sm font-semibold text-orange-600">
            {stats.openCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">
            On Hold:
          </span>
          <span className="text-sm font-semibold text-green-600">
            {stats.pendingCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">
            Unassigned:
          </span>
          <span className="text-sm font-semibold text-red-600">
            {stats.unassignedCount}
          </span>

        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 text-sm text-gray-600">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#f5f5f5] border-b border-gray-300 sticky top-0">
              <tr>
                <th className="px-4 py-2 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
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
                <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                  Number
                </th>
                <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                  Subject
                </th>
                <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                  Customer Email
                </th>
                <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                  Category
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
                  Source
                </th>
                <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className={`border-b border-gray-200 hover:bg-[#f9f9f9] cursor-pointer transition-colors ${
                    selectedTickets.includes(ticket.id) ? "bg-[#e3f2fd]" : ""
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
                      checked={selectedTickets.includes(ticket.id)}
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
                  <td className="px-4 py-3 font-medium">{ticket.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Mail size={14} className="text-gray-500" />
                      {ticket.requester_email ?? ticket.requester?.email ?? ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {ticket.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <User size={14} className="text-gray-500" />
                      {ticket.assignee?.full_name ??
                        ticket.assignee?.email ??
                        "Unassigned"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                      {ticket.channel ?? ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
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
    </div>
  );
}