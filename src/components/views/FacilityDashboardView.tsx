import {
  Thermometer,
  Zap,
  Users,
  AlertTriangle,
} from "lucide-react";

// TODO: Fetch facility metrics from Supabase
export function FacilityDashboardView() {
  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Facility Management Dashboard
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Building Occupancy */}
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Building Occupancy
              </span>
              <Users size={16} className="text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              N/A
            </div>
            <div className="text-xs text-gray-500 mt-1">
              &nbsp;
            </div>
          </div>

          {/* Temperature */}
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Avg Temperature
              </span>
              <Thermometer
                size={16}
                className="text-orange-600"
              />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              N/A
            </div>
            <div className="text-xs text-gray-500 mt-1">
              &nbsp;
            </div>
          </div>

          {/* Energy Usage */}
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Energy Usage
              </span>
              <Zap size={16} className="text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              N/A
            </div>
            <div className="text-xs text-gray-500 mt-1">
              &nbsp;
            </div>
          </div>

          {/* Active Requests */}
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Active Requests
              </span>
              <AlertTriangle
                size={16}
                className="text-red-600"
              />
            </div>
            <div className="text-2xl font-bold text-red-600">
              0
            </div>
            <div className="text-xs text-gray-500 mt-1">
              &nbsp;
            </div>
          </div>
        </div>

        {/* Floor Status */}
        <div className="bg-white border border-gray-300 rounded p-4 mb-6">
          <h3 className="font-semibold text-sm mb-4">
            Floor Status
          </h3>
          <div className="space-y-3">
            <div className="text-xs text-gray-600">No facility telemetry connected.</div>
          </div>
        </div>

        {/* Recent Facility Requests */}
        <div className="bg-white border border-gray-300 rounded p-4">
          <h3 className="font-semibold text-sm mb-3">
            Recent Facility Requests
          </h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold">
                  Request
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold">
                  Location
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold">
                  Priority
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold">
                  Assigned To
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="px-3 py-3 text-xs text-gray-600" colSpan={5}>
                  No facility requests found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}