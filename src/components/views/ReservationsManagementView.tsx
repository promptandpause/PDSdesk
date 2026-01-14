import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
} from "lucide-react";

// TODO: Fetch reservations from Supabase
export function ReservationsManagementView() {
  const reservations = [
    {
      id: "R-001",
      resource: "Meeting Room A",
      requester: "Griffin, M.",
      startTime: "2024-01-15 10:00",
      endTime: "2024-01-15 12:00",
      status: "Confirmed",
      purpose: "Client Meeting",
    },
    {
      id: "R-002",
      resource: "Projector - Sony 4K",
      requester: "Johnson, A.",
      startTime: "2024-01-16 14:00",
      endTime: "2024-01-16 16:00",
      status: "Pending",
      purpose: "Team Presentation",
    },
    {
      id: "R-003",
      resource: "Conference Room B",
      requester: "Smith, J.",
      startTime: "2024-01-17 09:00",
      endTime: "2024-01-17 17:00",
      status: "Confirmed",
      purpose: "Workshop",
    },
    {
      id: "R-004",
      resource: "Parking Space 12",
      requester: "Brown, K.",
      startTime: "2024-01-18 08:00",
      endTime: "2024-01-18 18:00",
      status: "Cancelled",
      purpose: "Visitor Parking",
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Reservations Management
        </h2>
        <button className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-1">
          <Plus size={14} />
          New Reservation
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
              placeholder="Search reservations..."
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
                Resource
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Requester
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Start Time
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                End Time
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Status
              </th>
              <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                Purpose
              </th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr
                key={reservation.id}
                className="border-b border-gray-200 hover:bg-[#f9f9f9] cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-[#4a9eff] font-medium">
                  {reservation.id}
                </td>
                <td className="px-4 py-3 font-medium">
                  {reservation.resource}
                </td>
                <td className="px-4 py-3">
                  {reservation.requester}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-gray-700">
                    <Clock size={12} />
                    {reservation.startTime}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-gray-700">
                    <Clock size={12} />
                    {reservation.endTime}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      reservation.status === "Confirmed"
                        ? "bg-green-100 text-green-800"
                        : reservation.status === "Pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {reservation.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {reservation.purpose}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}