import {
  Plus,
  Search,
  Filter,
  FileText,
  AlertCircle,
} from "lucide-react";

// TODO: Fetch contracts from Supabase
export function ContractsManagementView() {
  const contracts = [
    {
      id: "C-2024-001",
      name: "Microsoft Enterprise Agreement",
      supplier: "Microsoft Corporation",
      startDate: "2024-01-01",
      endDate: "2026-12-31",
      value: "£250,000",
      status: "Active",
      sla: "Standard",
    },
    {
      id: "C-2023-045",
      name: "AWS Cloud Services",
      supplier: "Amazon Web Services",
      startDate: "2023-06-01",
      endDate: "2024-05-31",
      value: "£120,000",
      status: "Expiring Soon",
      sla: "Premium",
    },
    {
      id: "C-2023-012",
      name: "Office Lease Agreement",
      supplier: "Property Management Ltd",
      startDate: "2023-01-01",
      endDate: "2028-12-31",
      value: "£500,000",
      status: "Active",
      sla: "N/A",
    },
    {
      id: "C-2022-089",
      name: "IT Support Services",
      supplier: "Tech Support Co",
      startDate: "2022-03-01",
      endDate: "2023-12-31",
      value: "£85,000",
      status: "Expired",
      sla: "Gold",
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Contract Management & SLM
        </h2>
        <button className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-1">
          <Plus size={14} />
          New Contract
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
              placeholder="Search contracts..."
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
                Contract ID
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Name
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Supplier
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Start Date
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                End Date
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Value
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Status
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                SLA
              </th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr
                key={contract.id}
                className="border-b border-gray-200 hover:bg-[#f9f9f9] cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-[#4a9eff] font-medium">
                  {contract.id}
                </td>
                <td className="px-4 py-3">{contract.name}</td>
                <td className="px-4 py-3">
                  {contract.supplier}
                </td>
                <td className="px-4 py-3">
                  {contract.startDate}
                </td>
                <td className="px-4 py-3">
                  {contract.endDate}
                </td>
                <td className="px-4 py-3 font-medium">
                  {contract.value}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1 ${
                      contract.status === "Active"
                        ? "bg-green-100 text-green-800"
                        : contract.status === "Expiring Soon"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {contract.status === "Expiring Soon" && (
                      <AlertCircle size={12} />
                    )}
                    {contract.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      contract.sla === "Premium" ||
                      contract.sla === "Gold"
                        ? "bg-purple-100 text-purple-800"
                        : contract.sla === "Standard"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {contract.sla}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}