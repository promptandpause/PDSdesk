import {
  Plus,
  Search,
  Filter,
  Clock,
} from "lucide-react";
import { useState } from "react";

// TODO: Fetch reservations from Supabase
export function ReservationsManagementView() {
  type ReservationRow = {
    id: string;
    resource: string;
    requester: string;
    startTime: string;
    endTime: string;
    status: string;
    purpose: string;
  };

  const reservations: ReservationRow[] = [];
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Reservations Management
        </h2>
        <button
          type="button"
          className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-1"
          onClick={() => setMessage("Creating reservations is not implemented yet.")}
        >
          <Plus size={14} />
          New Reservation
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
              placeholder="Search reservations..."
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
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-sm text-gray-600">
                  No reservations found.
                </td>
              </tr>
            ) : (
              reservations.map((reservation) => (
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
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {reservation.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {reservation.purpose}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}