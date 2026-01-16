import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
} from "lucide-react";
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

interface OperatorGroup {
  id: string;
  group_key: string;
  name: string;
  description: string;
  members: number | null;
  created_at: string;
}

type OperatorGroupsManagerProps = {
  showHeader?: boolean;
  onChanged?: () => void;
};

// TODO: Fetch from Supabase
export function OperatorGroupsManager({
  showHeader = true,
  onChanged,
}: OperatorGroupsManagerProps) {
  const { user, isGlobalAdmin } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [groups, setGroups] = useState<OperatorGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(
    null,
  );
  const [formData, setFormData] = useState({
    group_key: "",
    name: "",
    description: "",
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
      .select("id,group_key,name,description,created_at")
      .order("name", { ascending: true });

    if (res.error) {
      setGroups([]);
      setGroupsError(res.error.message);
      setGroupsLoading(false);
      return;
    }

    const rows = (res.data ?? []) as Array<{
      id: string;
      group_key: string;
      name: string;
      description: string | null;
      created_at: string;
    }>;

    const groupIds = rows.map((r) => r.id);
    let countsById = new Map<string, number>();

    if (isGlobalAdmin && groupIds.length > 0) {
      const membersRes = await supabase
        .from("operator_group_members")
        .select("group_id")
        .in("group_id", groupIds)
        .limit(2000);

      if (!membersRes.error) {
        countsById = (membersRes.data ?? []).reduce((acc, row: any) => {
          const id = row.group_id as string;
          acc.set(id, (acc.get(id) ?? 0) + 1);
          return acc;
        }, new Map<string, number>());
      }
    }

    setGroups(
      rows.map((r) => ({
        id: r.id,
        group_key: r.group_key,
        name: r.name,
        description: r.description ?? "",
        members: isGlobalAdmin ? (countsById.get(r.id) ?? 0) : null,
        created_at: r.created_at,
      })),
    );
    setGroupsLoading(false);
  }, [isGlobalAdmin, supabase, user]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const handleSave = async () => {
    if (!user) return;
    if (!isGlobalAdmin) return;

    if (editingId) {
      const payload: Record<string, unknown> = {
        name: formData.name,
        description: formData.description || null,
      };

      const upd = await supabase.from("operator_groups").update(payload).eq("id", editingId);
      if (upd.error) {
        setGroupsError(upd.error.message);
        return;
      }
    } else {
      const group_key = formData.group_key.trim();
      const name = formData.name.trim();
      const description = formData.description.trim();

      if (!group_key || !name) return;

      const inserted = await supabase
        .from("operator_groups")
        .insert({
          group_key,
          name,
          description: description || null,
          is_active: true,
        });

      if (inserted.error) {
        setGroupsError(inserted.error.message);
        return;
      }
    }

    await loadGroups();
    onChanged?.();
    setIsAdding(false);
    setEditingId(null);
    setFormData({ group_key: "", name: "", description: "" });
  };

  const deleteGroupById = useCallback(
    async (id: string) => {
      if (!isGlobalAdmin) return;

      setGroupsError(null);
      setDeleting(true);

      const del = await supabase.from("operator_groups").delete().eq("id", id);
      if (del.error) {
        setGroupsError(del.error.message);
        setDeleting(false);
        return;
      }

      setDeleting(false);
      await loadGroups();
      onChanged?.();
    },
    [isGlobalAdmin, loadGroups, onChanged, supabase],
  );

  const handleDelete = (id: string) => {
    if (!isGlobalAdmin) return;

    const ok = window.confirm(
      "Delete operator group? This action cannot be undone.",
    );
    if (!ok) return;

    void deleteGroupById(id);
  };

  const confirmDelete = useCallback(async () => {
    if (!isGlobalAdmin) return;
    if (!pendingDeleteId) return;

    setGroupsError(null);
    setDeleting(true);

    const del = await supabase
      .from("operator_groups")
      .delete()
      .eq("id", pendingDeleteId);

    if (del.error) {
      setGroupsError(del.error.message);
      setDeleting(false);
      return;
    }

    setDeleteDialogOpen(false);
    setPendingDeleteId(null);
    setDeleting(false);
    await loadGroups();
    onChanged?.();
  }, [isGlobalAdmin, loadGroups, onChanged, pendingDeleteId, supabase]);

  const startEdit = (group: OperatorGroup) => {
    setEditingId(group.id);
    setFormData({
      group_key: group.group_key,
      name: group.name,
      description: group.description,
    });
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ group_key: "", name: "", description: "" });
  };

  return (
    <div className="max-w-4xl">
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--pds-text)" }}>
              Operator Groups
            </h3>
            <p className="text-sm pds-text-muted">
              Manage operator groups for ticket assignment and
              routing
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            disabled={!isGlobalAdmin}
            className="pds-btn pds-btn--primary pds-focus"
          >
            <Plus size={16} />
            Add Operator Group
          </button>
        </div>
      )}

      {groupsError && (
        <div className="mb-4 pds-panel p-3 text-sm" style={{ color: "var(--pds-danger)" }}>
          {groupsError}
        </div>
      )}

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div
          className="pds-panel p-4 mb-4"
          style={{
            borderColor: "color-mix(in srgb, var(--pds-accent) 22%, var(--pds-border))",
            background: "var(--pds-accent-soft)",
          }}
        >
          <h4 className="font-medium text-sm mb-3" style={{ color: "var(--pds-text)" }}>
            {editingId
              ? "Edit Operator Group"
              : "New Operator Group"}
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs pds-text-muted mb-1">
                Group Key
              </label>
              <input
                type="text"
                value={formData.group_key}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    group_key: e.target.value,
                  })
                }
                placeholder="e.g., it_services"
                className="pds-input pds-focus w-full"
                disabled={!!editingId}
              />
            </div>
            <div>
              <label className="block text-xs pds-text-muted mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                  })
                }
                placeholder="e.g., IT Services"
                className="pds-input pds-focus w-full"
              />
            </div>
            <div>
              <label className="block text-xs pds-text-muted mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                placeholder="Describe the purpose and responsibilities of this group"
                rows={3}
                className="pds-input pds-focus w-full"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || (!editingId && !formData.group_key.trim())}
                className="pds-btn pds-btn--primary pds-focus disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="pds-btn pds-btn--outline pds-focus"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Groups List */}
      <div className="pds-panel">
        <div className="pds-table-wrap">
          <table className="pds-table">
            <thead className="pds-thead">
            <tr>
              <th className="pds-th">
                Group Key
              </th>
              <th className="pds-th">
                Group Name
              </th>
              <th className="pds-th">
                Description
              </th>
              <th className="pds-th">
                Members
              </th>
              <th className="pds-th">
                Created
              </th>
              <th className="pds-th">
                Actions
              </th>
            </tr>
            </thead>
            <tbody>
            {groupsLoading ? (
              <tr>
                <td colSpan={6} className="pds-td pds-text-muted">
                  Loading...
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={6} className="pds-td pds-text-muted">
                  No operator groups found.
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <tr
                  key={group.id}
                  className="pds-row"
                >
                  <td className="pds-td pds-text-muted">
                    {group.group_key}
                  </td>
                  <td className="pds-td">
                    <div className="flex items-center gap-2">
                      <Users
                        size={16}
                        style={{ color: "var(--pds-accent)" }}
                      />
                      <span className="font-medium" style={{ color: "var(--pds-text)" }}>
                        {group.name}
                      </span>
                    </div>
                  </td>
                  <td className="pds-td pds-text-muted">
                    {group.description}
                  </td>
                  <td className="pds-td">
                    {group.members === null ? (
                      <span className="text-xs pds-text-muted">-</span>
                    ) : (
                      <span className="pds-chip" data-tone="info">
                        {group.members} members
                      </span>
                    )}
                  </td>
                  <td className="pds-td pds-text-muted">
                    {group.created_at ? new Date(group.created_at).toLocaleDateString() : ""}
                  </td>
                  <td className="pds-td">
                    {isGlobalAdmin ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(group)}
                          className="pds-btn pds-btn--link pds-focus text-xs"
                          type="button"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(group.id)}
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

      {/* Info Box */}
      <div className="mt-4 pds-panel p-4" style={{ background: "var(--pds-surface-2)" }}>
        <h4 className="text-sm font-medium mb-2" style={{ color: "var(--pds-text)" }}>
          About Operator Groups & Email Notifications
        </h4>
        <ul className="text-xs pds-text-muted space-y-1">
          <li>
            • Operator groups are used for ticket assignment and
            routing
          </li>
          <li>
            • Each group has a stable group key used for routing
          </li>
          <li>
            • All users within a group receive ticket
            notifications via the group email
          </li>
          <li>
            • AI auto-assignment uses these groups to route
            tickets to the correct team
          </li>
          <li>
            • Users can be members of multiple operator groups
          </li>
          <li>
            • Groups can be assigned to specific categories or
            SLA policies
          </li>
          <li>
            • Only global admins can manage operator groups
          </li>
        </ul>
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
            <AlertDialogTitle>Delete operator group?</AlertDialogTitle>
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