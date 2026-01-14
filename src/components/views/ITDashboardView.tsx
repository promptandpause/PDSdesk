import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Server,
  HardDrive,
  Cpu,
  Wifi,
} from "lucide-react";

// TODO: Fetch IT metrics from Supabase
export function ITDashboardView() {
  const metrics = {
    systemUptime: 99.98,
    activeServers: 24,
    totalServers: 25,
    cpuUsage: 45,
    memoryUsage: 62,
    storageUsage: 78,
    networkHealth: "Excellent",
    activeIncidents: 3,
    resolvedToday: 18,
    avgResponseTime: "12 min",
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          IT Infrastructure Dashboard
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* System Uptime */}
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                System Uptime
              </span>
              <Server size={16} className="text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {metrics.systemUptime}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Last 30 days
            </div>
          </div>

          {/* Active Servers */}
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Active Servers
              </span>
              <CheckCircle
                size={16}
                className="text-blue-600"
              />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              {metrics.activeServers}/{metrics.totalServers}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              1 maintenance
            </div>
          </div>

          {/* Active Incidents */}
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Active Incidents
              </span>
              <AlertCircle
                size={16}
                className="text-orange-600"
              />
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.activeIncidents}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              -2 from yesterday
            </div>
          </div>

          {/* Avg Response Time */}
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Avg Response Time
              </span>
              <Clock size={16} className="text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              {metrics.avgResponseTime}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Within SLA
            </div>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu size={18} className="text-blue-600" />
                <span className="font-medium text-sm">
                  CPU Usage
                </span>
              </div>
              <span className="text-sm font-semibold">
                {metrics.cpuUsage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${metrics.cpuUsage}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Server size={18} className="text-orange-600" />
                <span className="font-medium text-sm">
                  Memory Usage
                </span>
              </div>
              <span className="text-sm font-semibold">
                {metrics.memoryUsage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full"
                style={{ width: `${metrics.memoryUsage}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive size={18} className="text-red-600" />
                <span className="font-medium text-sm">
                  Storage Usage
                </span>
              </div>
              <span className="text-sm font-semibold">
                {metrics.storageUsage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full"
                style={{ width: `${metrics.storageUsage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Network Status */}
        <div className="bg-white border border-gray-300 rounded p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Wifi size={18} className="text-green-600" />
            <h3 className="font-semibold text-sm">
              Network Status
            </h3>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                name: "Main Office",
                status: "Online",
                latency: "2ms",
                bandwidth: "95%",
              },
              {
                name: "Data Center",
                status: "Online",
                latency: "1ms",
                bandwidth: "82%",
              },
              {
                name: "Remote Site A",
                status: "Online",
                latency: "45ms",
                bandwidth: "78%",
              },
              {
                name: "Remote Site B",
                status: "Warning",
                latency: "120ms",
                bandwidth: "45%",
              },
            ].map((site, idx) => (
              <div
                key={idx}
                className="p-3 border border-gray-200 rounded"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">
                    {site.name}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      site.status === "Online"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {site.status}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  <div>Latency: {site.latency}</div>
                  <div>Bandwidth: {site.bandwidth}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-white border border-gray-300 rounded p-4">
          <h3 className="font-semibold text-sm mb-3">
            Recent System Events
          </h3>
          <div className="space-y-2">
            {[
              {
                time: "14:23",
                event:
                  "Server DC1-WEB03 - CPU spike detected (85%)",
                severity: "warning",
              },
              {
                time: "13:45",
                event:
                  "Backup completed successfully - All servers",
                severity: "success",
              },
              {
                time: "12:10",
                event: "Network switch PORT-12 - Link down",
                severity: "error",
              },
              {
                time: "11:30",
                event: "Disk usage warning - SRV-SQL01 (82%)",
                severity: "warning",
              },
            ].map((event, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
              >
                <span className="text-xs text-gray-500 w-12">
                  {event.time}
                </span>
                <div
                  className={`w-2 h-2 rounded-full ${
                    event.severity === "error"
                      ? "bg-red-500"
                      : event.severity === "warning"
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                ></div>
                <span className="text-xs flex-1">
                  {event.event}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}