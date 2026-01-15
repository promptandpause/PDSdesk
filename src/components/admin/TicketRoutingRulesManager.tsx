import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";
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

type OperatorGroupRow = {
  id: string;
  group_key: string;
  name: string;
  is_active: boolean;
};

type RoutingRuleRow = {
  id: string;
  rule_key: string;
  is_active: boolean;
  priority: number;
  match_mailbox: string | null;
  match_ticket_type: string | null;
  match_category: string | null;
  assignment_group_id: string | null;
  created_at: string;
};

export function TicketRoutingRulesManager() {
  const { user, isGlobalAdmin } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [groups, setGroups] = useState<OperatorGroupRow[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const [rules, setRules] = useState<RoutingRuleRow[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    rule_key: "",
    is_active: true,
    priority: "100",
    match_mailbox: "",
    match_ticket_type: "",
    match_category: "",
    assignment_group_id: "",
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    setGroupsError(null);
    setGroupsLoading(true);

    const res = await supabase
      .from("operator_groups")
      .select("id,group_key,name,is_active")
      .order("name", { ascending: true });

    if (res.error) {
      setGroups([]);
      setGroupsError(res.error.message);
      setGroupsLoading(false);
      return;
    }

    setGroups((res.data ?? []) as OperatorGroupRow[]);
    setGroupsLoading(false);
  }, [supabase, user]);

  const loadRules = useCallback(async () => {
    if (!user) return;
    setRulesError(null);
    setRulesLoading(true);

    const res = await supabase
      .from("ticket_routing_rules")
      .select(
        "id,rule_key,is_active,priority,match_mailbox,match_ticket_type,match_category,assignment_group_id,created_at",
      )
      .order("priority", { ascending: true });

    if (res.error) {
      setRules([]);
      setRulesError(res.error.message);
      setRulesLoading(false);
      return;
    }

    setRules((res.data ?? []) as RoutingRuleRow[]);
    setRulesLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    void loadGroups();
    void loadRules();
  }, [loadGroups, loadRules]);

  const startEdit = (rule: RoutingRuleRow) => {
    setEditingId(rule.id);
    setIsAdding(false);
    setFormData({
      rule_key: rule.rule_key,
      is_active: !!rule.is_active,
      priority: String(rule.priority ?? 100),
      match_mailbox: rule.match_mailbox ?? "",
      match_ticket_type: rule.match_ticket_type ?? "",
      match_category: rule.match_category ?? "",
      assignment_group_id: rule.assignment_group_id ?? "",
    });
  };

  const startAdd = () => {
    setEditingId(null);
    setIsAdding(true);
    setFormData({
      rule_key: "",
      is_active: true,
      priority: "100",
      match_mailbox: "",
      match_ticket_type: "",
      match_category: "",
      assignment_group_id: "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({
      rule_key: "",
      is_active: true,
      priority: "100",
      match_mailbox: "",
      match_ticket_type: "",
      match_category: "",
      assignment_group_id: "",
    });
  };

  const handleSave = async () => {
    if (!user) return;
    if (!isGlobalAdmin) return;

    const rule_key = formData.rule_key.trim();
    const priority = Number(formData.priority);

    if (!rule_key) return;
    if (!Number.isFinite(priority)) return;

    const assignment_group_id = formData.assignment_group_id.trim();

    const payload = {
      rule_key,
      is_active: !!formData.is_active,
      priority,
      match_mailbox: formData.match_mailbox.trim() || null,
      match_ticket_type: formData.match_ticket_type.trim() || null,
      match_category: formData.match_category.trim() || null,
      assignment_group_id: assignment_group_id || null,
    };

    if (editingId) {
      const upd = await supabase
        .from("ticket_routing_rules")
        .update(payload)
        .eq("id", editingId);

      if (upd.error) {
        setRulesError(upd.error.message);
        return;
      }
    } else {
      const ins = await supabase.from("ticket_routing_rules").insert(payload);
      if (ins.error) {
        setRulesError(ins.error.message);
        return;
      }
    }

    await loadRules();
    cancelEdit();
  };

  const requestDelete = (id: string) => {
    if (!isGlobalAdmin) return;
    setPendingDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = useCallback(async () => {
    if (!user) return;
    if (!isGlobalAdmin) return;
    if (!pendingDeleteId) return;

    setRulesError(null);
    setDeleting(true);

    const del = await supabase
      .from("ticket_routing_rules")
      .delete()
      .eq("id", pendingDeleteId);

    if (del.error) {
      setRulesError(del.error.message);
      setDeleting(false);
      return;
    }

    setDeleteDialogOpen(false);
    setPendingDeleteId(null);
    setDeleting(false);
    await loadRules();
  }, [isGlobalAdmin, loadRules, pendingDeleteId, supabase, user]);

  const groupNameById = useMemo(() => {
    return new Map(groups.map((g) => [g.id, g.name] as const));
  }, [groups]);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[#2d3e50] mb-1">
            Queue Management
          </h3>
          <p className="text-sm text-gray-600">
            Manage ticket routing rules to link mailboxes and ticket types to team queues.
          </p>
        </div>
        <button
          onClick={startAdd}
          disabled={!isGlobalAdmin}
          className="px-4 py-2 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          Add Routing Rule
        </button>
      </div>

      {(groupsError || rulesError) && (
        <div className="mb-4 bg-white border border-gray-300 rounded p-3 text-sm text-red-600">
          {groupsError ?? rulesError}
        </div>
      )}

      {(isAdding || editingId) && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
          <h4 className="font-medium text-sm text-[#2d3e50] mb-3">
            {editingId ? "Edit Routing Rule" : "New Routing Rule"}
          </h4>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Rule Key
                </label>
                <input
                  type="text"
                  value={formData.rule_key}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rule_key: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Match Mailbox
                </label>
                <input
                  type="text"
                  value={formData.match_mailbox}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      match_mailbox: e.target.value,
                    })
                  }
                  placeholder=""
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Match Ticket Type
                </label>
                <input
                  type="text"
                  value={formData.match_ticket_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      match_ticket_type: e.target.value,
                    })
                  }
                  placeholder=""
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Match Category
                </label>
                <input
                  type="text"
                  value={formData.match_category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      match_category: e.target.value,
                    })
                  }
                  placeholder=""
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Assignment Group
                </label>
                <select
                  value={formData.assignment_group_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      assignment_group_id: e.target.value,
                    })
                  }
                  disabled={groupsLoading}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                >
                  <option value="">Unassigned</option>
                  {groups
                    .filter((g) => g.is_active)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_active: e.target.checked,
                  })
                }
              />
              Active
            </label>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!isGlobalAdmin}
                className="px-4 py-2 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-300 rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-300">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold">Key</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Active</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Mailbox</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Ticket Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Queue</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rulesLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-sm text-gray-600">
                  Loading...
                </td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-sm text-gray-600">
                  No routing rules found.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{rule.rule_key}</td>
                  <td className="px-4 py-3 text-gray-700">{rule.priority}</td>
                  <td className="px-4 py-3 text-gray-700">{rule.is_active ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-gray-600">{rule.match_mailbox ?? ""}</td>
                  <td className="px-4 py-3 text-gray-600">{rule.match_ticket_type ?? ""}</td>
                  <td className="px-4 py-3 text-gray-600">{rule.match_category ?? ""}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {rule.assignment_group_id
                      ? (groupNameById.get(rule.assignment_group_id) ?? "")
                      : "Unassigned"}
                  </td>
                  <td className="px-4 py-3">
                    {isGlobalAdmin ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(rule)}
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => requestDelete(rule.id)}
                          className="text-red-600 hover:underline flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">Read-only</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setPendingDeleteId(null);
            setDeleting(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete routing rule?</AlertDialogTitle>
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
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
