import { Plus, Search, Filter, Wrench } from "lucide-react";

// TODO: Fetch operations from Supabase
export function OperationsManagementView() {
  const operations = [
    {
      id: "O-001",
      title: "Server Maintenance - DC1",
      type: "Scheduled Maintenance",
      status: "In Progress",
      assignee: "IT Ops Team",
      scheduled: "2024-01-15 02:00",
      duration: "4 hours",
    },
    {
      id: "O-002",
      title: "Backup Verification",
      type: "Routine Check",
      status: "Completed",
      assignee: "Smith, J.",
      scheduled: "2024-01-14 00:00",
      duration: "2 hours",
    },
    {
      id: "O-003",
      title: "Network Switch Replacement",
      type: "Hardware Update",
      status: "Scheduled",
      assignee: "Infra Team",
      scheduled: "2024-01-20 18:00",
      duration: "3 hours",
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Operations Management
        </h2>
        <button className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-1">
          <Plus size={14} />
          New Operation
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-gray-300 px-4 py-3 bg-white">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search operations..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
            />
          </div>
          <button className="px-3 py-2 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-1">
            <Filter size={14} />
            Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f5f5f5] border-b border-gray-300 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                ID
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Title
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Type
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Status
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Assignee
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Scheduled
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {operations.map((operation) => (
              <tr
                key={operation.id}
                className="border-b border-gray-200 hover:bg-[#f9f9f9] cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-[#4a9eff] font-medium">
                  {operation.id}
                </td>
                <td className="px-4 py-3">{operation.title}</td>
                <td className="px-4 py-3">{operation.type}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      operation.status === "In Progress"
                        ? "bg-yellow-100 text-yellow-800"
                        : operation.status === "Completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {operation.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {operation.assignee}
                </td>
                <td className="px-4 py-3">
                  {operation.scheduled}
                </td>
                <td className="px-4 py-3">
                  {operation.duration}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}