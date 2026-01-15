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

// TODO: Fetch from Supabase
export function OperatorGroupsManager() {
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
    setIsAdding(false);
    setEditingId(null);
    setFormData({ group_key: "", name: "", description: "" });
  };

  const handleDelete = (id: string) => {
    if (!isGlobalAdmin) return;
    setPendingDeleteId(id);
    setDeleteDialogOpen(true);
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
  }, [isGlobalAdmin, loadGroups, pendingDeleteId, supabase]);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[#2d3e50] mb-1">
            Operator Groups
          </h3>
          <p className="text-sm text-gray-600">
            Manage operator groups for ticket assignment and
            routing
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          disabled={!isGlobalAdmin}
          className="px-4 py-2 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Add Operator Group
        </button>
      </div>

      {groupsError && (
        <div className="mb-4 bg-white border border-gray-300 rounded p-3 text-sm text-red-600">
          {groupsError}
        </div>
      )}

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
          <h4 className="font-medium text-sm text-[#2d3e50] mb-3">
            {editingId
              ? "Edit Operator Group"
              : "New Operator Group"}
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                disabled={!!editingId}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || (!editingId && !formData.group_key.trim())}
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

      {/* Groups List */}
      <div className="bg-white border border-gray-300 rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-300">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold">
                Group Key
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold">
                Group Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold">
                Members
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {groupsLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-sm text-gray-600">
                  Loading...
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-sm text-gray-600">
                  No operator groups found.
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <tr
                  key={group.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-gray-600">
                    {group.group_key}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users
                        size={16}
                        className="text-blue-600"
                      />
                      <span className="font-medium">
                        {group.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {group.description}
                  </td>
                  <td className="px-4 py-3">
                    {group.members === null ? (
                      <span className="text-xs text-gray-500">-</span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {group.members} members
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {group.created_at ? new Date(group.created_at).toLocaleDateString() : ""}
                  </td>
                  <td className="px-4 py-3">
                    {isGlobalAdmin ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(group)}
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(group.id)}
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

      {/* Info Box */}
      <div className="mt-4 p-4 bg-gray-50 border border-gray-300 rounded">
        <h4 className="text-sm font-medium text-[#2d3e50] mb-2">
          About Operator Groups & Email Notifications
        </h4>
        <ul className="text-xs text-gray-600 space-y-1">
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