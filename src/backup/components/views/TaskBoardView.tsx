import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  HelpCircle,
  Star,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";

 type DbTaskRow = {
   id: string;
   ticket_id: string;
   title: string | null;
   description: string | null;
   status: string | null;
   created_at: string | null;
   updated_at: string | null;
   completed_at: string | null;
   assigned_to: string | null;
   created_by: string | null;
   ticket?:
     | { ticket_number: string; title: string }
     | Array<{ ticket_number: string; title: string }>
     | null;
   assignee?:
     | { full_name: string | null; email: string | null }
     | Array<{ full_name: string | null; email: string | null }>
     | null;
   creator?:
     | { full_name: string | null; email: string | null }
     | Array<{ full_name: string | null; email: string | null }>
     | null;
 };

 type BoardTask = {
   id: string;
   ticketId: string;
   ticketNumber: string;
   ticketTitle: string;
   title: string;
   category: string;
   requester: string;
   operator: string | null;
   status: string;
   assigned_to: string | null;
   created_by: string | null;
   completed_at: string | null;
   assigneeLabel: string;
   creatorLabel: string;
   date: string;
   type: "incident" | "activity";
   priority: number;
   hasRequest: boolean;
   caller?: {
     name: string;
     phone: string;
     image: string;
   };
   request?: string;
   requestTime?: string;
   requestBy?: string;
 };

// TODO: Fetch tasks from Supabase with real-time subscriptions
export function TaskBoardView() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const docsUrl = (import.meta.env.VITE_DOCS_URL ?? "").trim();

  const [showFilters, setShowFilters] = useState(true);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState({
    open: true,
    in_progress: true,
    completed: true,
  });
  const [assigneeFilter, setAssigneeFilter] = useState<
    "all" | "mine" | "unassigned"
  >("all");

  const [detailsTab, setDetailsTab] = useState<"details" | "request">(
    "details",
  );

  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createTicketId, setCreateTicketId] = useState<string>("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [availableTickets, setAvailableTickets] = useState<
    Array<{ id: string; ticket_number: string; title: string }>
  >([]);

  const [editStatus, setEditStatus] = useState("open");
  const [editAssignedTo, setEditAssignedTo] = useState<string | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deletingTask, setDeletingTask] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const toPriorityRank = (): number => 3;

  const normalizeProfileLabel = (p: {
    full_name: string | null;
    email: string | null;
  } | null): string => {
    const name = (p?.full_name ?? "").trim();
    if (name) return name;
    const email = (p?.email ?? "").trim();
    if (email) return email;
    return "";
  };

  const normalizeStatus = (value: string | null | undefined): "open" | "in_progress" | "completed" => {
    const v = (value ?? "").toString().toLowerCase();
    switch (v) {
      case "open":
      case "new":
        return "open";
      case "in_progress":
      case "in progress":
        return "in_progress";
      case "completed":
      case "done":
      case "resolved":
      case "closed":
        return "completed";
      default:
        return "open";
    }
  };

  const toDisplayDate = (value: string | null): string => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const loadTicketsForCreate = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("tickets")
      .select("id,ticket_number,title")
      .order("created_at", { ascending: false })
      .limit(100);

    const rows = (data as unknown as Array<{ id: string; ticket_number: string; title: string }>) ?? [];
    setAvailableTickets(rows);
  }, [supabase, user]);

  const loadTasks = useCallback(async () => {
    if (!user) return;

    setLoadingTasks(true);
    setTaskError(null);

    const { data, error } = await supabase
      .from("ticket_tasks")
      .select(
        "id,ticket_id,title,description,status,assigned_to,created_by,created_at,updated_at,completed_at,ticket:tickets!ticket_tasks_ticket_id_fkey(ticket_number,title),assignee:profiles!ticket_tasks_assigned_to_fkey(full_name,email),creator:profiles!ticket_tasks_created_by_fkey(full_name,email)",
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setTasks([]);
      setTaskError(error.message);
      setLoadingTasks(false);
      return;
    }

    const rows = (data as unknown as DbTaskRow[]) ?? [];
    const normalized: BoardTask[] = rows.map((row) => {
      const createdAt = row.created_at ?? "";
      const status = normalizeStatus(row.status);
      const ticket = Array.isArray(row.ticket)
        ? row.ticket[0] ?? null
        : row.ticket ?? null;
      const ticketNumber = ticket?.ticket_number ?? "";
      const ticketTitle = ticket?.title ?? "";
      const assignee = Array.isArray(row.assignee)
        ? row.assignee[0] ?? null
        : row.assignee ?? null;
      const creator = Array.isArray(row.creator)
        ? row.creator[0] ?? null
        : row.creator ?? null;
      const assigneeLabel = normalizeProfileLabel(assignee) || "Unassigned";
      const creatorLabel = normalizeProfileLabel(creator);

      return {
        id: row.id,
        ticketId: row.ticket_id,
        ticketNumber,
        ticketTitle,
        title: (row.title ?? "Untitled").toString(),
        category: ticketNumber ? `Ticket ${ticketNumber}` : "",
        requester: "",
        operator: assigneeLabel === "Unassigned" ? null : assigneeLabel,
        status,
        assigned_to: row.assigned_to,
        created_by: row.created_by,
        completed_at: row.completed_at,
        assigneeLabel,
        creatorLabel,
        date: toDisplayDate(createdAt),
        type: "activity",
        priority: toPriorityRank(),
        hasRequest: Boolean(row.description && row.description.trim()),
        request: row.description ?? undefined,
      };
    });

    setTasks(normalized);
    setLoadingTasks(false);
  }, [supabase, user]);

  const resetCreateForm = () => {
    setCreateTitle("");
    setCreateDescription("");
    setCreateTicketId("");
    setCreateError(null);
  };

  const createTask = useCallback(async () => {
    if (!user) return;

    const title = createTitle.trim();
    if (!title) {
      setCreateError("Title is required.");
      return;
    }

    if (!createTicketId) {
      setCreateError("Ticket is required.");
      return;
    }

    setCreatingTask(true);
    setCreateError(null);

    const payload: Record<string, unknown> = {
      ticket_id: createTicketId,
      title,
      description: createDescription.trim() || null,
      status: "open",
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from("ticket_tasks")
      .insert(payload)
      .select("id")
      .maybeSingle();

    if (error) {
      setCreateError(error.message);
      setCreatingTask(false);
      return;
    }

    const newId = (data as any)?.id as string | undefined;

    setShowCreateModal(false);
    resetCreateForm();
    await loadTasks();
    if (newId) setSelectedTask(newId);

    setCreatingTask(false);
  }, [createDescription, createTicketId, createTitle, loadTasks, supabase, user]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const handler = () => {
      void loadTasks();
    };

    window.addEventListener("pdsdesk:refresh", handler as EventListener);
    return () => {
      window.removeEventListener("pdsdesk:refresh", handler as EventListener);
    };
  }, [loadTasks]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_tasks" },
        () => {
          void loadTasks();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTasks, supabase, user]);

  useEffect(() => {
    if (tasks.length === 0) {
      setSelectedTask(null);
      return;
    }

    if (!selectedTask || !tasks.some((t) => t.id === selectedTask)) {
      setSelectedTask(tasks[0]?.id ?? null);
    }
  }, [selectedTask, tasks]);

  useEffect(() => {
    const task = selectedTask ? tasks.find((t) => t.id === selectedTask) : null;
    if (!task) return;

    setEditStatus(normalizeStatus(task.status));
    setEditAssignedTo(task.assigned_to ?? null);
    setSaveError(null);
    setDeleteError(null);
    setDetailsTab("details");
  }, [selectedTask, tasks]);

  const updateTask = useCallback(async (
    taskId: string,
    overrides?: { status?: "open" | "in_progress" | "completed"; assigned_to?: string | null },
  ) => {
    if (!user) return;

    setSavingTask(true);
    setSaveError(null);

    const nextStatus = overrides?.status ?? editStatus;
    const nextAssignedTo = overrides?.assigned_to ?? editAssignedTo;
    const nextCompletedAt = nextStatus === "completed" ? new Date().toISOString() : null;

    const payload: Record<string, unknown> = {
      status: nextStatus,
      assigned_to: nextAssignedTo,
      updated_at: new Date().toISOString(),
      completed_at: nextCompletedAt,
    };

    const { error } = await supabase
      .from("ticket_tasks")
      .update(payload)
      .eq("id", taskId);

    if (error) {
      setSaveError(error.message);
      setSavingTask(false);
      return;
    }

    await loadTasks();
    setSelectedTask(taskId);
    setSavingTask(false);
  }, [editAssignedTo, editStatus, loadTasks, supabase, user]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return tasks.filter((t) => {
      if (t.status in statusFilters) {
        if (!statusFilters[t.status as keyof typeof statusFilters]) return false;
      }

      if (assigneeFilter === "mine") {
        if (!user?.id) return false;
        if (t.assigned_to !== user.id) return false;
      }

      if (assigneeFilter === "unassigned") {
        if (t.assigned_to) return false;
      }

      if (!q) return true;

      const haystack = `${t.title} ${t.ticketNumber} ${t.ticketTitle} ${t.request ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [assigneeFilter, searchQuery, statusFilters, tasks, user?.id]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { open: 0, in_progress: 0, completed: 0 };
    for (const t of tasks) {
      if (t.status in counts) counts[t.status] += 1;
    }
    return counts;
  }, [tasks]);

  const renderTaskIdentifier = (task: BoardTask): string => {
    if (task.ticketNumber) return task.ticketNumber;
    return "Task";
  };

  const statusBadge = (status: string): { label: string; className: string } => {
    switch (status) {
      case "open":
        return { label: "Open", className: "bg-blue-100 text-blue-800" };
      case "in_progress":
        return { label: "In Progress", className: "bg-amber-100 text-amber-800" };
      case "completed":
        return { label: "Completed", className: "bg-green-100 text-green-800" };
      default:
        return { label: status, className: "bg-gray-100 text-gray-800" };
    }
  };

  const deleteTask = useCallback(async (taskId: string) => {
    if (!user) return;

    setDeletingTask(true);
    setDeleteError(null);

    const currentIndex = tasks.findIndex((t) => t.id === taskId);
    const nextCandidate =
      currentIndex >= 0
        ? tasks[currentIndex + 1]?.id ?? tasks[currentIndex - 1]?.id ?? null
        : null;

    const { error } = await supabase.from("ticket_tasks").delete().eq("id", taskId);
    if (error) {
      setDeleteError(error.message);
      setDeletingTask(false);
      return;
    }

    await loadTasks();
    setSelectedTask(nextCandidate);
    setDeletingTask(false);
  }, [loadTasks, supabase, tasks, user]);

  const requestDeleteTask = useCallback((taskId: string) => {
    setDeleteError(null);
    setDeleteConfirmTaskId(taskId);
  }, []);

  return (
    <div className="flex h-full bg-white">
      {/* Filters Sidebar */}
      {showFilters && (
        <div className="w-64 lg:w-72 border-r border-gray-300 flex flex-col bg-white">
          <div className="bg-[#f5f5f5] border-b border-gray-300 px-3 py-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#2d3e50]">
              Filters
            </h2>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <ChevronLeft
                size={16}
                className="text-[#2d3e50]"
              />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <div className="text-xs text-gray-600 mb-1">Search</div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, ticket #, title..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
              />
            </div>

            <div>
              <div className="text-xs text-gray-600 mb-1">Assignee</div>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
              >
                <option value="all">All</option>
                <option value="mine">Assigned to me</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <div className="text-xs text-gray-600 mb-2">Status</div>
              <div className="space-y-2">
                <label className="flex items-center justify-between gap-2 text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={statusFilters.open}
                      onChange={() =>
                        setStatusFilters((prev) => ({ ...prev, open: !prev.open }))
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-gray-700">Open</span>
                  </span>
                  <span className="text-xs text-gray-500">{statusCounts.open}</span>
                </label>
                <label className="flex items-center justify-between gap-2 text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={statusFilters.in_progress}
                      onChange={() =>
                        setStatusFilters((prev) => ({
                          ...prev,
                          in_progress: !prev.in_progress,
                        }))
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-gray-700">In Progress</span>
                  </span>
                  <span className="text-xs text-gray-500">{statusCounts.in_progress}</span>
                </label>
                <label className="flex items-center justify-between gap-2 text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={statusFilters.completed}
                      onChange={() =>
                        setStatusFilters((prev) => ({
                          ...prev,
                          completed: !prev.completed,
                        }))
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-gray-700">Completed</span>
                  </span>
                  <span className="text-xs text-gray-500">{statusCounts.completed}</span>
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <div className="text-xs text-gray-600 mb-1">Showing</div>
              <div className="text-sm text-[#2d3e50] font-medium">
                {filteredTasks.length} of {tasks.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-300 px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {!showFilters && (
                <button
                  onClick={() => setShowFilters(true)}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                  title="Show Filters"
                >
                  <ChevronRight
                    size={16}
                    className="text-[#2d3e50]"
                  />
                </button>
              )}
              <h1 className="text-lg font-normal text-[#2d3e50]">
                Task Board{" "}
                <span className="font-semibold">({filteredTasks.length})</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors"
                onClick={() => {
                  resetCreateForm();
                  void loadTicketsForCreate();
                  setShowCreateModal(true);
                }}
              >
                New Task
              </button>
              <button
                type="button"
                className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                onClick={() => void loadTasks()}
              >
                <RefreshCw
                  size={14}
                  className="text-[#2d3e50]"
                />
              </button>
              <button
                type="button"
                className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                title={docsUrl ? "Help" : "Help (not configured)"}
                onClick={() => {
                  if (!docsUrl) {
                    setMessage("Help is not configured yet.");
                    return;
                  }
                  window.open(docsUrl, "_blank", "noopener,noreferrer");
                }}
              >
                <HelpCircle
                  size={14}
                  className="text-[#2d3e50]"
                />
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className="border-b border-gray-300 px-4 py-2 bg-white">
            <div className="text-sm text-red-600 flex items-center gap-2">
              <MessageSquare size={14} />
              {message}
            </div>
          </div>
        )}

        {taskError && (
          <div className="border-b border-gray-300 px-4 py-2 bg-white">
            <div className="text-sm text-red-600 flex items-center gap-2">
              <MessageSquare size={14} />
              {taskError}
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Task Items */}
          <div className="flex-1 overflow-y-auto bg-[#f5f5f5] p-4 space-y-3">
            {loadingTasks && (
              <div className="text-sm text-gray-600">Loading...</div>
            )}
            {!loadingTasks && filteredTasks.length === 0 && (
              <div className="text-sm text-gray-600">No tasks found.</div>
            )}
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task.id)}
                className={`bg-white border rounded cursor-pointer transition-all ${
                  selectedTask === task.id
                    ? "border-[#4a9eff] shadow-md"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <div className="p-3 flex items-start gap-3">
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-yellow-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMessage("Favorites are not implemented yet.");
                      }}
                    >
                      <Star size={16} />
                    </button>
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center text-xs font-semibold text-white ${
                        task.priority === 1
                          ? "bg-[#4a9eff]"
                          : "bg-purple-500"
                      }`}
                    >
                      {task.type === "incident" ? "📞" : "⚙️"}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#4a9eff]">
                          {renderTaskIdentifier(task)}
                        </span>
                        <span className="text-sm font-semibold text-[#2d3e50]">
                          {task.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            statusBadge(task.status).className
                          }`}
                        >
                          {statusBadge(task.status).label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {task.date}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {task.ticketTitle}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {task.assigneeLabel}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Task Details Panel */}
          {selectedTask && (
            <div className="w-full lg:w-96 border-l border-gray-300 bg-white overflow-y-auto">
              {(() => {
                const task = tasks.find((t) => t.id === selectedTask);
                if (!task) return null;

                return (
                  <div>
                    {/* Task Header */}
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-start gap-2 mb-3">
                        <Star size={16} className="text-gray-400 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <div className="w-5 h-5 bg-[#4a9eff] rounded flex items-center justify-center text-xs text-white">
                              🧩
                            </div>
                            <span className="text-sm font-semibold text-[#4a9eff]">
                              {renderTaskIdentifier(task)}
                            </span>
                            <span className="text-sm font-semibold text-[#2d3e50]">
                              {task.title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                statusBadge(task.status).className
                              }`}
                            >
                              {statusBadge(task.status).label}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">{task.ticketTitle}</div>
                          <div className="text-xs text-gray-500">
                            {task.assigneeLabel}
                            {task.creatorLabel ? ` • Created by ${task.creatorLabel}` : ""}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">{task.date}</span>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                      <div className="flex">
                        <button
                          className={`px-4 py-2 text-sm font-medium border-b-2 ${
                            detailsTab === "details"
                              ? "text-[#2d3e50] border-[#4a9eff] bg-white"
                              : "text-gray-600 border-transparent hover:text-[#2d3e50] hover:bg-gray-50"
                          }`}
                          onClick={() => setDetailsTab("details")}
                        >
                          Details
                        </button>
                        <button
                          className={`px-4 py-2 text-sm font-medium border-b-2 ${
                            detailsTab === "request"
                              ? "text-[#2d3e50] border-[#4a9eff] bg-white"
                              : "text-gray-600 border-transparent hover:text-[#2d3e50] hover:bg-gray-50"
                          }`}
                          onClick={() => setDetailsTab("request")}
                        >
                          Request
                        </button>
                      </div>
                    </div>

                    {detailsTab === "details" ? (
                      <div className="p-4 space-y-3">
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-xs text-gray-600">Ticket</div>
                          <div className="text-sm text-[#2d3e50] font-medium">
                            {task.ticketNumber ? `#${task.ticketNumber}` : ""}{" "}
                            {task.ticketTitle}
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-xs text-gray-600">Assignee</div>
                          <div className="text-sm text-[#2d3e50] font-medium">
                            {task.assigneeLabel}
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-xs text-gray-600">Created by</div>
                          <div className="text-sm text-[#2d3e50] font-medium">
                            {task.creatorLabel || ""}
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded p-3">
                          <h3 className="text-sm font-semibold text-[#2d3e50] mb-3">
                            Update
                          </h3>

                          <div className="space-y-3">
                            <div>
                              <div className="text-xs text-gray-600 mb-1">Status</div>
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                              >
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 transition-colors"
                                onClick={() => {
                                  setEditAssignedTo(user.id);
                                  void updateTask(task.id, { assigned_to: user.id });
                                }}
                                disabled={savingTask}
                              >
                                Assign to me
                              </button>
                              <button
                                className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 transition-colors"
                                onClick={() => {
                                  setEditAssignedTo(null);
                                  void updateTask(task.id, { assigned_to: null });
                                }}
                                disabled={savingTask}
                              >
                                Unassign
                              </button>
                            </div>

                            {saveError && (
                              <div className="text-sm text-red-600 flex items-center gap-2">
                                <MessageSquare size={14} />
                                {saveError}
                              </div>
                            )}

                            {deleteError && (
                              <div className="text-sm text-red-600 flex items-center gap-2">
                                <MessageSquare size={14} />
                                {deleteError}
                              </div>
                            )}

                            <div className="flex justify-end gap-2">
                              <button
                                className="px-3 py-1.5 border border-red-300 text-red-700 text-sm rounded hover:bg-red-50 transition-colors disabled:opacity-60"
                                onClick={() => requestDeleteTask(task.id)}
                                disabled={savingTask || deletingTask}
                              >
                                {deletingTask ? "Deleting..." : "Delete"}
                              </button>
                              <button
                                className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors disabled:opacity-60"
                                onClick={() => void updateTask(task.id)}
                                disabled={savingTask || deletingTask}
                              >
                                {savingTask ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="text-xs text-gray-600 mb-2">Description</div>
                        <div className="text-sm text-[#2d3e50] whitespace-pre-wrap">
                          {task.request?.trim() ? task.request : "No description."}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded border border-gray-300 bg-white shadow-lg">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-[#2d3e50]">New Task</div>
              <button
                className="text-sm text-gray-600 hover:text-[#2d3e50]"
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <div className="text-xs text-gray-600 mb-1">Ticket</div>
                <select
                  value={createTicketId}
                  onChange={(e) => setCreateTicketId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                >
                  <option value="">Select a ticket...</option>
                  {availableTickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.ticket_number} — {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-1">Title</div>
                <input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                />
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-1">Description</div>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                />
              </div>

              {createError && (
                <div className="text-sm text-red-600 flex items-center gap-2">
                  <MessageSquare size={14} />
                  {createError}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 transition-colors"
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                disabled={creatingTask}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors disabled:opacity-60"
                onClick={() => void createTask()}
                disabled={creatingTask}
              >
                {creatingTask ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded border border-gray-300 bg-white shadow-lg">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-[#2d3e50]">Delete Task</div>
              <button
                className="text-sm text-gray-600 hover:text-[#2d3e50] disabled:opacity-60"
                onClick={() => setDeleteConfirmTaskId(null)}
                disabled={deletingTask}
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-sm text-[#2d3e50]">Delete this task?</div>
              <div className="text-xs text-gray-600">This cannot be undone.</div>
            </div>

            <div className="border-t border-gray-200 px-4 py-3 flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 transition-colors disabled:opacity-60"
                onClick={() => setDeleteConfirmTaskId(null)}
                disabled={deletingTask}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-60"
                onClick={() => {
                  const id = deleteConfirmTaskId;
                  setDeleteConfirmTaskId(null);
                  if (id) void deleteTask(id);
                }}
                disabled={deletingTask}
              >
                {deletingTask ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}