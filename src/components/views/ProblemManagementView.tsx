import {
  Plus,
  Search,
  Filter,
  Download,
  Settings,
  AlertTriangle,
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

// TODO: Fetch problems from Supabase
export function ProblemManagementView() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  type ProblemRow = {
    id: string;
    problem_number: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assignee_id: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [incidentCountByProblemId, setIncidentCountByProblemId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<ProblemRow | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStatus, setCreateStatus] = useState("open");
  const [createPriority, setCreatePriority] = useState("medium");
  const [createAssignToMe, setCreateAssignToMe] = useState(true);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("open");
  const [editPriority, setEditPriority] = useState("medium");
  const [editAssigneeSelf, setEditAssigneeSelf] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const openProblem = (problemId: string) => {
    if (typeof window === "undefined") return;
    const id = problemId.trim();
    if (!id) return;
    window.location.hash = `#/problem-management?problemId=${encodeURIComponent(id)}`;
  };

  const closeProblem = () => {
    if (typeof window === "undefined") return;
    window.location.hash = "#/problem-management";
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromHash = () => {
      const raw = window.location.hash || "";
      const [path, query] = raw.replace(/^#\/?/, "").split("?");
      if ((path ?? "").split("/")[0] !== "problem-management") return;
      const params = new URLSearchParams(query ?? "");
      const id = params.get("problemId");
      setSelectedProblemId(id && id.trim() ? id.trim() : null);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOpen = (e: Event) => {
      const ev = e as CustomEvent<{ problemId?: string }>;
      const id = (ev.detail?.problemId ?? "").trim();
      if (id) openProblem(id);
    };
    window.addEventListener("pdsdesk:problem-management:open-problem", onOpen);
    return () => window.removeEventListener("pdsdesk:problem-management:open-problem", onOpen);
  }, []);

  const refreshProblems = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const res = await supabase
      .from("problems")
      .select("id,problem_number,title,description,status,priority,assignee_id,created_by,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (res.error) {
      setProblems([]);
      setIncidentCountByProblemId({});
      setError(res.error.message);
      setLoading(false);
      return;
    }

    const rows = (res.data ?? []) as ProblemRow[];
    setProblems(rows);

    const ids = rows.map((p) => p.id);
    if (!ids.length) {
      setIncidentCountByProblemId({});
      setLoading(false);
      return;
    }

    const links = await supabase
      .from("problem_tickets")
      .select("problem_id")
      .in("problem_id", ids);

    if (links.error) {
      setIncidentCountByProblemId({});
      setLoading(false);
      return;
    }

    const counts: Record<string, number> = {};
    for (const row of (links.data ?? []) as Array<{ problem_id: string }>) {
      counts[row.problem_id] = (counts[row.problem_id] ?? 0) + 1;
    }
    setIncidentCountByProblemId(counts);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    void refreshProblems();
  }, [user]);

  useEffect(() => {
    const handler = () => {
      void refreshProblems();
    };
    window.addEventListener("pdsdesk:refresh", handler as EventListener);
    return () => window.removeEventListener("pdsdesk:refresh", handler as EventListener);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (!selectedProblemId) {
      setSelectedProblem(null);
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

      const res = await supabase
        .from("problems")
        .select("id,problem_number,title,description,status,priority,assignee_id,created_by,created_at,updated_at")
        .eq("id", selectedProblemId)
        .single();

      if (cancelled) return;

      if (res.error) {
        setSelectedProblem(null);
        setSelectedError(res.error.message);
        setSelectedLoading(false);
        return;
      }

      setSelectedProblem(res.data as ProblemRow);
      setEditMode(false);
      setEditSubmitting(false);
      setSelectedLoading(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedProblemId, supabase, user]);

  useEffect(() => {
    if (!selectedProblem) return;
    setEditTitle(selectedProblem.title ?? "");
    setEditDescription(selectedProblem.description ?? "");
    setEditStatus(selectedProblem.status ?? "open");
    setEditPriority(selectedProblem.priority ?? "medium");
    setEditAssigneeSelf(selectedProblem.assignee_id === user?.id);
  }, [selectedProblem, user?.id]);

  useEffect(() => {
    if (!createOpen) return;
    setCreateTitle("");
    setCreateDescription("");
    setCreateStatus("open");
    setCreatePriority("medium");
    setCreateAssignToMe(true);
    setCreateSubmitting(false);
    setCreateError(null);
  }, [createOpen]);

  const submitCreate = async () => {
    if (!user) return;
    const title = createTitle.trim();
    const description = createDescription.trim() || null;
    const status = createStatus.trim() || "open";
    const priority = createPriority.trim() || "medium";
    const assignee_id = createAssignToMe ? user.id : null;

    if (!title) {
      setCreateError("Title is required.");
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);

    const inserted = await supabase
      .from("problems")
      .insert({
        title,
        description,
        status,
        priority,
        assignee_id,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (inserted.error) {
      setCreateError(inserted.error.message);
      setCreateSubmitting(false);
      return;
    }

    setCreateSubmitting(false);
    setCreateOpen(false);
    await refreshProblems();
    openProblem(inserted.data.id as string);
  };

  const submitEdit = async () => {
    if (!user) return;
    if (!selectedProblemId) return;

    const title = editTitle.trim();
    const description = editDescription.trim() || null;
    const status = editStatus.trim() || "open";
    const priority = editPriority.trim() || "medium";
    const assignee_id = editAssigneeSelf ? user.id : null;

    if (!title) {
      setSelectedError("Title is required.");
      return;
    }

    setEditSubmitting(true);
    setSelectedError(null);

    const upd = await supabase
      .from("problems")
      .update({
        title,
        description,
        status,
        priority,
        assignee_id,
      })
      .eq("id", selectedProblemId);

    if (upd.error) {
      setSelectedError(upd.error.message);
      setEditSubmitting(false);
      return;
    }

    setEditMode(false);
    setEditSubmitting(false);
    await refreshProblems();
    const refreshed = await supabase
      .from("problems")
      .select("id,problem_number,title,description,status,priority,assignee_id,created_by,created_at,updated_at")
      .eq("id", selectedProblemId)
      .single();

    if (!refreshed.error) {
      setSelectedProblem(refreshed.data as ProblemRow);
    }
  };

  const filteredProblems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return problems;
    return problems.filter((p) => {
      const haystack = `${p.problem_number} ${p.title} ${p.status} ${p.priority}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [problems, searchTerm]);

  return (
    <div className="flex-1 flex h-full bg-white overflow-hidden">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Problem</DialogTitle>
            <DialogDescription>Create a new problem record.</DialogDescription>
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
                rows={6}
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                disabled={createSubmitting}
              />
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
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
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
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={createAssignToMe}
                onChange={(e) => setCreateAssignToMe(e.target.checked)}
                disabled={createSubmitting}
              />
              Assign to me
            </label>
            {createError && (
              <div className="text-sm text-red-600">{createError}</div>
            )}
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
            Problem Management
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-1"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={14} />
              New Problem
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
            placeholder="Search problems..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
          />
        </div>
        <button className="px-3 py-2 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-1">
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
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Number
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Title
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Status
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Priority
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Assignee
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Created
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Related Incidents
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProblems.map((problem) => (
              <tr
                key={problem.id}
                className="border-b border-gray-200 hover:bg-[#f9f9f9] cursor-pointer transition-colors"
                onClick={() => openProblem(problem.id)}
              >
                <td className="px-4 py-3 text-[#4a9eff] font-medium">
                  {problem.problem_number}
                </td>
                <td className="px-4 py-3">{problem.title}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      problem.status === "open"
                        ? "bg-blue-100 text-blue-800"
                        : problem.status === "investigating"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {(problem.status ?? "").toString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {(problem.priority ?? "").toString()}
                </td>
                <td className="px-4 py-3">
                  {problem.assignee_id === user?.id ? "Me" : "—"}
                </td>
                <td className="px-4 py-3">{new Date(problem.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-[#4a9eff]">
                    <AlertTriangle size={14} />
                    {incidentCountByProblemId[problem.id] ?? 0}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      </div>

      {selectedProblemId && (
        <div className="w-[440px] border-l border-gray-300 bg-white flex flex-col">
          <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between bg-[#f5f5f5]">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-[#2d3e50]">Problem</div>
              {!selectedLoading && selectedProblem && (
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
                    if (!selectedProblem) return;
                    setEditMode(false);
                    setEditTitle(selectedProblem.title ?? "");
                    setEditDescription(selectedProblem.description ?? "");
                    setEditStatus(selectedProblem.status ?? "open");
                    setEditPriority(selectedProblem.priority ?? "medium");
                    setEditAssigneeSelf(selectedProblem.assignee_id === user?.id);
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
              onClick={closeProblem}
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

            {selectedLoading || !selectedProblem ? (
              <div className="text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500">{selectedProblem.problem_number}</div>
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
                          rows={8}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          disabled={editSubmitting}
                        />
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
                            <option value="open">Open</option>
                            <option value="investigating">Investigating</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
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
                      <div className="mt-1 text-lg font-semibold text-[#2d3e50]">{selectedProblem.title}</div>
                      {selectedProblem.description && (
                        <div className="mt-2 text-sm text-[#2d3e50] whitespace-pre-wrap">
                          {selectedProblem.description}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!editMode && (
                  <div className="border-t border-gray-200 pt-3 text-xs text-gray-600 space-y-2">
                    <div>
                      <span className="text-gray-500">Status:</span> {selectedProblem.status}
                    </div>
                    <div>
                      <span className="text-gray-500">Priority:</span> {selectedProblem.priority}
                    </div>
                    <div>
                      <span className="text-gray-500">Assignee:</span> {selectedProblem.assignee_id === user?.id ? "Me" : "—"}
                    </div>
                    <div>
                      <span className="text-gray-500">Updated:</span> {new Date(selectedProblem.updated_at).toLocaleString()}
                    </div>
                    <div>
                      <span className="text-gray-500">Related incidents:</span> {incidentCountByProblemId[selectedProblem.id] ?? 0}
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