import {
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";

// TODO: Fetch visitor data from Supabase
export function VisitorRegistrationView() {
  const visitors = [
    {
      id: "V-001",
      name: "John Smith",
      company: "Acme Corp",
      host: "Alex Johnson",
      checkIn: "09:15",
      checkOut: "-",
      status: "Checked In",
      purpose: "Business Meeting",
    },
    {
      id: "V-002",
      name: "Jane Doe",
      company: "Tech Solutions",
      host: "Sarah Williams",
      checkIn: "10:30",
      checkOut: "12:45",
      status: "Checked Out",
      purpose: "Interview",
    },
    {
      id: "V-003",
      name: "Bob Wilson",
      company: "Consultancy Ltd",
      host: "Michael Brown",
      checkIn: "14:00",
      checkOut: "-",
      status: "Checked In",
      purpose: "Consultation",
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Visitor Registration
        </h2>
        <button className="px-4 py-2 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-2">
          <UserPlus size={16} />
          Register New Visitor
        </button>
      </div>

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
            {visitors.map((visitor) => (
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
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      visitor.status === "Checked In"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {visitor.status}
                  </span>
                </td>
                <td className="px-4 py-3">{visitor.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}