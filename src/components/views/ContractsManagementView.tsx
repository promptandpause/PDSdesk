import {
  Plus,
  Search,
  Filter,
} from "lucide-react";
import { useState } from "react";

// TODO: Fetch contracts from Supabase
export function ContractsManagementView() {
  const contracts: never[] = [];
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Contract Management & SLM
        </h2>
        <button
          type="button"
          className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-1"
          onClick={() => setMessage("Creating contracts is not implemented yet.")}
        >
          <Plus size={14} />
          New Contract
        </button>
      </div>

      {message && (
        <div className="px-4 py-2 text-sm text-red-600 border-b border-gray-200">
          {message}
        </div>
      )}

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
          <button
            type="button"
            className="px-3 py-2 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
            onClick={() => setMessage("Filters are not implemented yet.")}
          >
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
            {contracts.length === 0 ? (
              <tr className="border-b border-gray-200">
                <td className="px-4 py-4 text-xs text-gray-600" colSpan={8}>
                  No contracts found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}