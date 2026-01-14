import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  Settings,
} from "lucide-react";
import { TicketDetailView } from "./TicketDetailView";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/auth/AuthProvider";

export function CallManagementView() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [selectedView, setSelectedView] = useState<
    "list" | "detail" | "new"
  >("list");
  const [selectedTicket, setSelectedTicket] = useState<
    string | null
  >(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  const [showArchive, setShowArchive] = useState(false);

  type TicketRow = {
    id: string;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
    archived_at: string | null;
    requester?: { full_name: string | null; email: string | null } | null;
    assignee?: { full_name: string | null; email: string | null } | null;
  };

  const [tickets, setTickets] = useState<TicketRow[]>([]);

  const loadTickets = useCallback(async () => {
    if (!user) return;

    setTicketsError(null);
    setTicketsLoading(true);

    let query = supabase
      .from("tickets")
      .select(
        "id,ticket_number,title,status,priority,created_at,archived_at,requester:requester_id(full_name,email),assignee:assignee_id(full_name,email)",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    const term = searchTerm.trim();
    if (term) {
      const safe = term.replace(/%/g, "\\%").replace(/_/g, "\\_");
      query = query.or(`ticket_number.ilike.%${safe}%,title.ilike.%${safe}%`);
    }

    const res = await query;
    if (res.error) {
      setTicketsError(res.error.message);
      setTicketsLoading(false);
      return;
    }

    const normalized = (res.data ?? []).map((row: any) => {
      const requester = Array.isArray(row.requester)
        ? (row.requester[0] ?? null)
        : (row.requester ?? null);
      const assignee = Array.isArray(row.assignee)
        ? (row.assignee[0] ?? null)
        : (row.assignee ?? null);
      return {
        ...row,
        archived_at: row.archived_at ?? null,
        requester,
        assignee,
      };
    });

    setTickets(normalized as unknown as TicketRow[]);
    setTicketsLoading(false);
  }, [searchTerm, supabase, user]);

  const filteredTickets = useMemo(
    () => tickets.filter((t) => (showArchive ? !!t.archived_at : !t.archived_at)),
    [showArchive, tickets],
  );

  const archiveCount = useMemo(() => tickets.filter((t) => !!t.archived_at).length, [tickets]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    const handler = () => {
      void loadTickets();
    };

    window.addEventListener("pdsdesk:refresh", handler as EventListener);
    return () => {
      window.removeEventListener("pdsdesk:refresh", handler as EventListener);
    };
  }, [loadTickets]);

  useEffect(() => {
    const onOpenTicket = (event: Event) => {
      const ce = event as CustomEvent<{ ticketId?: string }>;
      const id = ce.detail?.ticketId ?? null;
      if (!id) return;
      setSelectedTicket(id);
      setSelectedView("detail");
    };

    const onNewTicket = () => {
      setSelectedTicket(null);
      setSelectedView("new");
    };

    window.addEventListener("pdsdesk:call-management:open-ticket", onOpenTicket as EventListener);
    window.addEventListener("pdsdesk:call-management:new-ticket", onNewTicket as EventListener);
    return () => {
      window.removeEventListener("pdsdesk:call-management:open-ticket", onOpenTicket as EventListener);
      window.removeEventListener("pdsdesk:call-management:new-ticket", onNewTicket as EventListener);
    };
  }, []);

  if (selectedView === "detail" || selectedView === "new") {
    return (
      <TicketDetailView
        ticketId={selectedTicket || undefined}
        isNewTicket={selectedView === "new"}
        onBack={() => {
          setSelectedView("list");
          setSelectedTicket(null);
        }}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Call Management
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedView("new")}
            className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-1"
          >
            <Plus size={14} />
            New Incident
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
          />
        </div>
        <button className="px-3 py-2 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-1">
          <Filter size={14} />
          Filters
        </button>
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
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {ticketsError && (
          <div className="p-4 text-sm text-red-600">{ticketsError}</div>
        )}

        {ticketsLoading && (
          <div className="p-4 text-sm text-gray-600">Loading tickets...</div>
        )}

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
                Status
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Priority
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Operator
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket) => (
              <tr
                key={ticket.id}
                onClick={() => {
                  setSelectedTicket(ticket.id);
                  setSelectedView("detail");
                }}
                className="border-b border-gray-200 hover:bg-[#f9f9f9] cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-[#4a9eff] font-medium">
                  {ticket.ticket_number}
                </td>
                <td className="px-4 py-3">{ticket.title}</td>
                <td className="px-4 py-3">
                  {ticket.requester?.full_name ?? ticket.requester?.email ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      ticket.status === "new" || ticket.status === "open"
                        ? "bg-blue-100 text-blue-800"
                        : ticket.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : ticket.status === "resolved" || ticket.status === "closed"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {ticket.status}
                  </span>
                </td>
                <td className="px-4 py-3">{ticket.priority}</td>
                <td className="px-4 py-3">
                  {ticket.assignee?.full_name ?? ticket.assignee?.email ?? "-"}
                </td>
                <td className="px-4 py-3">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!ticketsLoading && !ticketsError && tickets.length === 0 && (
          <div className="p-4 text-sm text-gray-600">No tickets found.</div>
        )}
      </div>
    </div>
  );
}