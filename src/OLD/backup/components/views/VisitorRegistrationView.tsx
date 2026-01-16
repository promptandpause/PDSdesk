import {
  UserPlus,
  Search,
} from "lucide-react";
import { useState } from "react";

// TODO: Fetch visitor data from Supabase
export function VisitorRegistrationView() {
  const [message, setMessage] = useState<string | null>(null);

  type VisitorRow = {
    id: string;
    name: string;
    company: string;
    host: string;
    checkIn: string;
    checkOut: string;
    status: string;
    purpose: string;
  };

  const visitors: VisitorRow[] = [];

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Visitor Registration
        </h2>
        <button
          type="button"
          className="px-4 py-2 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-2"
          onClick={() => setMessage("Visitor registration is not implemented yet.")}
        >
          <UserPlus size={16} />
          Register New Visitor
        </button>
      </div>

      {message && (
        <div className="px-4 py-2 text-sm text-red-600 border-b border-gray-200">
          {message}
        </div>
      )}

      <div className="border-b border-gray-300 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search visitors..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
          />
        </div>
        <select className="px-3 py-2 text-sm border border-gray-300 rounded">
          <option>All Status</option>
          <option>Checked In</option>
          <option>Checked Out</option>
        </select>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f5f5f5] border-b border-gray-300 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">
                Visitor ID
              </th>
              <th className="px-4 py-2 text-left font-semibold">
                Name
              </th>
              <th className="px-4 py-2 text-left font-semibold">
                Company
              </th>
              <th className="px-4 py-2 text-left font-semibold">
                Host
              </th>
              <th className="px-4 py-2 text-left font-semibold">
                Check In
              </th>
              <th className="px-4 py-2 text-left font-semibold">
                Check Out
              </th>
              <th className="px-4 py-2 text-left font-semibold">
                Status
              </th>
              <th className="px-4 py-2 text-left font-semibold">
                Purpose
              </th>
            </tr>
          </thead>
          <tbody>
            {visitors.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-sm text-gray-600">
                  No visitors found.
                </td>
              </tr>
            ) : (
              visitors.map((visitor) => (
                <tr
                  key={visitor.id}
                  className="border-b border-gray-200 hover:bg-[#f9f9f9] cursor-pointer"
                >
                  <td className="px-4 py-3 text-[#4a9eff] font-medium">
                    {visitor.id}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {visitor.name}
                  </td>
                  <td className="px-4 py-3">{visitor.company}</td>
                  <td className="px-4 py-3">{visitor.host}</td>
                  <td className="px-4 py-3">{visitor.checkIn}</td>
                  <td className="px-4 py-3">
                    {visitor.checkOut}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {visitor.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{visitor.purpose}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}