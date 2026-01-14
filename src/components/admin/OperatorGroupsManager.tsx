import { useState } from "react";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
} from "lucide-react";

interface OperatorGroup {
  id: string;
  name: string;
  description: string;
  email: string; // Team email for notifications
  members: number;
  created: string;
}

// TODO: Fetch from Supabase
export function OperatorGroupsManager() {
  const [groups, setGroups] = useState<OperatorGroup[]>([
    {
      id: "1",
      name: "First Line Support",
      description:
        "Handles initial incident triage and basic requests",
      email: "servicedesk@promptandpause.com",
      members: 12,
      created: "2024-01-01",
    },
    {
      id: "2",
      name: "Second Line Support",
      description: "Advanced technical support and escalations",
      email: "support-l2@promptandpause.com",
      members: 8,
      created: "2024-01-01",
    },
    {
      id: "3",
      name: "Infra Team",
      description: "Network infrastructure and connectivity",
      email: "infrastructure@promptandpause.com",
      members: 5,
      created: "2024-01-01",
    },
    {
      id: "4",
      name: "Applications Team",
      description: "Business applications and software",
      email: "apps@promptandpause.com",
      members: 6,
      created: "2024-01-01",
    },
    {
      id: "5",
      name: "Customer Support",
      description: "External customer inquiries",
      email: "support@promptandpause.com",
      members: 10,
      created: "2024-01-10",
    },
    {
      id: "6",
      name: "DevOps Team",
      description: "Development and operations",
      email: "devops@promptandpause.com",
      members: 7,
      created: "2024-01-01",
    },
    {
      id: "7",
      name: "Security Team",
      description: "Security and compliance",
      email: "security@promptandpause.com",
      members: 4,
      created: "2024-01-01",
    },
    {
      id: "8",
      name: "HR Team",
      description: "Human resources inquiries",
      email: "hr@promptandpause.com",
      members: 5,
      created: "2024-01-01",
    },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    email: "",
  });

  const handleSave = async () => {
    if (editingId) {
      // Update existing group
      setGroups(
        groups.map((g) =>
          g.id === editingId
            ? {
                ...g,
                name: formData.name,
                description: formData.description,
                email: formData.email,
              }
            : g,
        ),
      );
      // TODO: Update in Supabase
    } else {
      // Add new group
      const newGroup: OperatorGroup = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        email: formData.email,
        members: 0,
        created: new Date().toISOString().split("T")[0],
      };
      setGroups([...groups, newGroup]);
      // TODO: Insert into Supabase
    }
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: "", description: "", email: "" });
  };

  const handleDelete = (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this operator group?",
      )
    ) {
      setGroups(groups.filter((g) => g.id !== id));
      // TODO: Delete from Supabase
    }
  };

  const startEdit = (group: OperatorGroup) => {
    setEditingId(group.id);
    setFormData({
      name: group.name,
      description: group.description,
      email: group.email,
    });
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: "", description: "", email: "" });
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
          className="px-4 py-2 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Add Operator Group
        </button>
      </div>

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
                placeholder="e.g., Third Line Support"
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
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value,
                  })
                }
                placeholder="e.g., team@promptandpause.com"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!formData.name.trim()}
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
                Group Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold">
                Email
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
            {groups.map((group) => (
              <tr
                key={group.id}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
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
                <td className="px-4 py-3 text-gray-600">
                  {group.email}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {group.members} members
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {group.created}
                </td>
                <td className="px-4 py-3">
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
                </td>
              </tr>
            ))}
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
            • Each group has a dedicated email address (e.g.,
            devops@promptandpause.com)
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
            • Internal support email:{" "}
            <strong>servicedesk@promptandpause.com</strong>
          </li>
        </ul>
      </div>
    </div>
  );
}