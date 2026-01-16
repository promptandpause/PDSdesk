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

type TicketRoutingRulesManagerProps = {
  showHeader?: boolean;
  onChanged?: () => void;
};

export function TicketRoutingRulesManager({
  showHeader = true,
  onChanged,
}: TicketRoutingRulesManagerProps) {
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
    onChanged?.();
    cancelEdit();
  };

  const requestDelete = (id: string) => {
    if (!isGlobalAdmin) return;

    const ok = window.confirm(
      "Delete routing rule? This action cannot be undone.",
    );
    if (!ok) return;

    void deleteRuleById(id);
  };

  const deleteRuleById = useCallback(
    async (id: string) => {
      if (!user) return;
      if (!isGlobalAdmin) return;

      setRulesError(null);
      setDeleting(true);

      const del = await supabase.from("ticket_routing_rules").delete().eq("id", id);
      if (del.error) {
        setRulesError(del.error.message);
        setDeleting(false);
        return;
      }

      setDeleting(false);
      await loadRules();
      onChanged?.();
    },
    [isGlobalAdmin, loadRules, onChanged, supabase, user],
  );

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
    onChanged?.();
  }, [isGlobalAdmin, loadRules, onChanged, pendingDeleteId, supabase, user]);

  const groupNameById = useMemo(() => {
    return new Map(groups.map((g) => [g.id, g.name] as const));
  }, [groups]);

  return (
    <div className={showHeader ? "max-w-4xl" : "w-full"}>
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--pds-text)" }}>
              Queue Management
            </h3>
            <p className="text-sm pds-text-muted">
              Manage ticket routing rules to link mailboxes and ticket types to team queues.
            </p>
          </div>
          <button
            onClick={startAdd}
            disabled={!isGlobalAdmin}
            className="pds-btn pds-btn--primary pds-focus disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            <Plus size={16} />
            Add Routing Rule
          </button>
        </div>
      )}

      {(groupsError || rulesError) && (
        <div className="mb-4 pds-panel p-3 text-sm" style={{ color: "var(--pds-danger)" }}>
          {groupsError ?? rulesError}
        </div>
      )}

      {(isAdding || editingId) && (
        <div
          className="pds-panel p-4 mb-4"
          style={{
            borderColor: "color-mix(in srgb, var(--pds-accent) 22%, var(--pds-border))",
            background: "var(--pds-accent-soft)",
          }}
        >
          <h4 className="font-medium text-sm mb-3" style={{ color: "var(--pds-text)" }}>
            {editingId ? "Edit Routing Rule" : "New Routing Rule"}
          </h4>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs pds-text-muted mb-1">
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
                  className="pds-input pds-focus w-full"
                />
              </div>

              <div>
                <label className="block text-xs pds-text-muted mb-1">
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
                  className="pds-input pds-focus w-full"
                />
              </div>

              <div>
                <label className="block text-xs pds-text-muted mb-1">
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
                  className="pds-input pds-focus w-full"
                />
              </div>

              <div>
                <label className="block text-xs pds-text-muted mb-1">
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
                  className="pds-input pds-focus w-full"
                />
              </div>

              <div>
                <label className="block text-xs pds-text-muted mb-1">
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
                  className="pds-input pds-focus w-full"
                />
              </div>

              <div>
                <label className="block text-xs pds-text-muted mb-1">
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
                  className="pds-input pds-focus w-full"
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

            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--pds-text)" }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_active: e.target.checked,
                  })
                }
                className="rounded pds-focus"
              />
              Active
            </label>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!isGlobalAdmin}
                className="pds-btn pds-btn--primary pds-focus disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="pds-btn pds-btn--outline pds-focus"
                type="button"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pds-panel">
        <div className="pds-table-wrap">
          <table className="pds-table">
            <thead className="pds-thead">
            <tr>
              <th className="pds-th">Key</th>
              <th className="pds-th">Priority</th>
              <th className="pds-th">Active</th>
              <th className="pds-th">Mailbox</th>
              <th className="pds-th">Ticket Type</th>
              <th className="pds-th">Category</th>
              <th className="pds-th">Queue</th>
              <th className="pds-th">Actions</th>
            </tr>
            </thead>
            <tbody>
            {rulesLoading ? (
              <tr>
                <td colSpan={8} className="pds-td pds-text-muted">
                  Loading...
                </td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan={8} className="pds-td pds-text-muted">
                  No routing rules found.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className="pds-row">
                  <td className="pds-td" style={{ color: "var(--pds-text)" }}>{rule.rule_key}</td>
                  <td className="pds-td" style={{ color: "var(--pds-text)" }}>{rule.priority}</td>
                  <td className="pds-td">
                    {rule.is_active ? (
                      <span className="pds-chip" data-tone="success">Active</span>
                    ) : (
                      <span className="pds-chip" data-tone="muted">Inactive</span>
                    )}
                  </td>
                  <td className="pds-td pds-text-muted">{rule.match_mailbox ?? ""}</td>
                  <td className="pds-td pds-text-muted">{rule.match_ticket_type ?? ""}</td>
                  <td className="pds-td pds-text-muted">{rule.match_category ?? ""}</td>
                  <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                    {rule.assignment_group_id
                      ? (groupNameById.get(rule.assignment_group_id) ?? "")
                      : "Unassigned"}
                  </td>
                  <td className="pds-td">
                    {isGlobalAdmin ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(rule)}
                          className="pds-btn pds-btn--link pds-focus text-xs"
                          type="button"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => requestDelete(rule.id)}
                          className="pds-btn pds-btn--link pds-focus text-xs"
                          type="button"
                          style={{ color: "var(--pds-danger)" }}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs pds-text-muted">Read-only</span>
                    )}
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>
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
              className="pds-btn--destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
