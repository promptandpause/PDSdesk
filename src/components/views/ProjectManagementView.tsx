import {
  Plus,
  Search,
  Filter,
  FolderKanban,
} from "lucide-react";

// TODO: Fetch projects from Supabase
export function ProjectManagementView() {
  const projects = [
    {
      id: "PRJ-001",
      name: "Office 365 Migration",
      manager: "Smith, J.",
      status: "In Progress",
      progress: 65,
      startDate: "2024-01-01",
      endDate: "2024-03-31",
      budget: "£50,000",
    },
    {
      id: "PRJ-002",
      name: "Infrastructure Upgrade",
      manager: "Brown, K.",
      status: "Planning",
      progress: 15,
      startDate: "2024-02-01",
      endDate: "2024-06-30",
      budget: "£120,000",
    },
    {
      id: "PRJ-003",
      name: "CRM Implementation",
      manager: "Taylor, M.",
      status: "On Hold",
      progress: 40,
      startDate: "2023-11-01",
      endDate: "2024-02-28",
      budget: "£75,000",
    },
    {
      id: "PRJ-004",
      name: "Security Audit 2024",
      manager: "Johnson, A.",
      status: "Completed",
      progress: 100,
      startDate: "2023-12-01",
      endDate: "2024-01-15",
      budget: "£35,000",
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Project Management
        </h2>
        <button className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-1">
          <Plus size={14} />
          New Project
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
              placeholder="Search projects..."
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
                Project ID
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Name
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Manager
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Status
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Progress
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Start Date
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                End Date
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Budget
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className="border-b border-gray-200 hover:bg-[#f9f9f9] cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-[#4a9eff] font-medium">
                  {project.id}
                </td>
                <td className="px-4 py-3 font-medium">
                  {project.name}
                </td>
                <td className="px-4 py-3">{project.manager}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      project.status === "In Progress"
                        ? "bg-blue-100 text-blue-800"
                        : project.status === "Planning"
                          ? "bg-yellow-100 text-yellow-800"
                          : project.status === "On Hold"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-green-100 text-green-800"
                    }`}
                  >
                    {project.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[100px]">
                      <div
                        className="h-full bg-[#4a9eff] transition-all"
                        style={{
                          width: `${project.progress}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium">
                      {project.progress}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {project.startDate}
                </td>
                <td className="px-4 py-3">{project.endDate}</td>
                <td className="px-4 py-3 font-medium">
                  {project.budget}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}