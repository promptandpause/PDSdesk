import {
  Building,
  Thermometer,
  Droplets,
  Zap,
  Users,
  AlertTriangle,
  CheckCircle,
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
              245
            </div>
            <div className="text-xs text-gray-500 mt-1">
              78% capacity
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
              21.5°C
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Within range
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
              1,245 kWh
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Today
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
              7
            </div>
            <div className="text-xs text-gray-500 mt-1">
              2 urgent
            </div>
          </div>
        </div>

        {/* Floor Status */}
        <div className="bg-white border border-gray-300 rounded p-4 mb-6">
          <h3 className="font-semibold text-sm mb-4">
            Floor Status
          </h3>
          <div className="space-y-3">
            {[
              {
                floor: "Ground Floor",
                rooms: 12,
                occupied: 10,
                temp: "21°C",
                status: "Normal",
              },
              {
                floor: "First Floor",
                rooms: 15,
                occupied: 14,
                temp: "22°C",
                status: "Normal",
              },
              {
                floor: "Second Floor",
                rooms: 15,
                occupied: 12,
                temp: "23°C",
                status: "Warning",
              },
              {
                floor: "Third Floor",
                rooms: 10,
                occupied: 8,
                temp: "21°C",
                status: "Normal",
              },
            ].map((floor, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Building
                    size={18}
                    className="text-gray-600"
                  />
                  <div>
                    <div className="text-sm font-medium">
                      {floor.floor}
                    </div>
                    <div className="text-xs text-gray-500">
                      {floor.occupied}/{floor.rooms} rooms
                      occupied
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs text-gray-600">
                    <Thermometer
                      size={14}
                      className="inline mr-1"
                    />
                    {floor.temp}
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      floor.status === "Normal"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {floor.status}
                  </span>
                </div>
              </div>
            ))}
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
              {[
                {
                  id: "F-001",
                  request: "AC not working",
                  location: "Floor 2, Room 2.15",
                  priority: "High",
                  status: "In Progress",
                  assignee: "Facilities Team",
                },
                {
                  id: "F-002",
                  request: "Light bulb replacement",
                  location: "Floor 1, Room 1.08",
                  priority: "Low",
                  status: "Open",
                  assignee: "Unassigned",
                },
                {
                  id: "F-003",
                  request: "Meeting room cleaning",
                  location: "Ground Floor, Meeting Room A",
                  priority: "Medium",
                  status: "Completed",
                  assignee: "Cleaning Staff",
                },
              ].map((req, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-3 py-2">{req.request}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {req.location}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        req.priority === "High"
                          ? "bg-red-100 text-red-800"
                          : req.priority === "Medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {req.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        req.status === "Completed"
                          ? "bg-green-100 text-green-800"
                          : req.status === "In Progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {req.assignee}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}