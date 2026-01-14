import {
  TrendingUp,
  Users,
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// TODO: Fetch overview data from Supabase
export function OverviewView() {
  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          System Overview
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Total Tickets
              </span>
              <Ticket size={16} className="text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              1,247
            </div>
            <div className="text-xs text-green-600 mt-1">
              ↑ 12% from last month
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Active Users
              </span>
              <Users size={16} className="text-green-600" />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              142
            </div>
            <div className="text-xs text-gray-500 mt-1">
              87 online now
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Avg Resolution Time
              </span>
              <Clock size={16} className="text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              4.2h
            </div>
            <div className="text-xs text-green-600 mt-1">
              ↓ 18% improvement
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                SLA Compliance
              </span>
              <CheckCircle2
                size={16}
                className="text-purple-600"
              />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              96.8%
            </div>
            <div className="text-xs text-green-600 mt-1">
              Above target (95%)
            </div>
          </div>
        </div>

        {/* Module Status */}
        <div className="bg-white border border-gray-300 rounded p-4 mb-6">
          <h3 className="font-semibold text-sm mb-4">
            Module Status
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                name: "Incident Management",
                status: "Operational",
                tickets: 45,
                color: "green",
              },
              {
                name: "Problem Management",
                status: "Operational",
                tickets: 8,
                color: "green",
              },
              {
                name: "Change Management",
                status: "Operational",
                tickets: 12,
                color: "green",
              },
              {
                name: "Asset Management",
                status: "Operational",
                assets: 1245,
                color: "green",
              },
              {
                name: "Knowledge Base",
                status: "Operational",
                articles: 234,
                color: "green",
              },
              {
                name: "Customer Support",
                status: "Warning",
                tickets: 23,
                color: "yellow",
              },
            ].map((module, idx) => (
              <div
                key={idx}
                className="p-3 border border-gray-200 rounded hover:bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {module.name}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      module.color === "green"
                        ? "bg-green-500"
                        : "bg-yellow-500"
                    }`}
                  ></span>
                </div>
                <div className="text-xs text-gray-600">
                  {module.tickets &&
                    `${module.tickets} active tickets`}
                  {module.assets &&
                    `${module.assets} assets tracked`}
                  {module.articles &&
                    `${module.articles} articles`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-gray-300 rounded p-4">
          <h3 className="font-semibold text-sm mb-3">
            Recent System Activity
          </h3>
          <div className="space-y-2">
            {[
              {
                time: "2 min ago",
                user: "Alex Johnson",
                action: "Resolved incident I 2024 045",
                type: "success",
              },
              {
                time: "15 min ago",
                user: "Sarah Williams",
                action: "Created new change request C 2024-012",
                type: "info",
              },
              {
                time: "1 hour ago",
                user: "Michael Brown",
                action: "Updated SLA policy for P1 incidents",
                type: "warning",
              },
              {
                time: "2 hours ago",
                user: "System",
                action:
                  "Automatic backup completed successfully",
                type: "success",
              },
              {
                time: "3 hours ago",
                user: "Emma Davis",
                action: "Added 15 new assets to inventory",
                type: "info",
              },
            ].map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    activity.type === "success"
                      ? "bg-green-500"
                      : activity.type === "warning"
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                  }`}
                ></div>
                <span className="text-xs text-gray-500 w-20">
                  {activity.time}
                </span>
                <span className="text-xs font-medium w-32">
                  {activity.user}
                </span>
                <span className="text-xs flex-1">
                  {activity.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}