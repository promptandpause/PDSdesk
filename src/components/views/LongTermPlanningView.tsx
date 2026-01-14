import {
  Calendar,
  Target,
  TrendingUp,
  DollarSign,
} from "lucide-react";

// TODO: Fetch long-term planning data from Supabase
export function LongTermPlanningView() {
  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Long-Term Planning
        </h2>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Strategic Initiatives
              </span>
              <Target size={16} className="text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              12
            </div>
            <div className="text-xs text-gray-500 mt-1">
              5 in progress
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Planning Horizon
              </span>
              <Calendar size={16} className="text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              36 months
            </div>
            <div className="text-xs text-gray-500 mt-1">
              2024-2027
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Budget Allocated
              </span>
              <DollarSign
                size={16}
                className="text-green-600"
              />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              £2.4M
            </div>
            <div className="text-xs text-gray-500 mt-1">
              68% utilized
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded p-4 mb-6">
          <h3 className="font-semibold text-sm mb-4">
            Strategic Initiatives 2024-2027
          </h3>
          <div className="space-y-3">
            {[
              {
                name: "Digital Transformation Program",
                status: "In Progress",
                progress: 45,
                budget: "£850K",
                timeline: "Q1 2024 - Q4 2025",
              },
              {
                name: "Infrastructure Modernization",
                status: "Planning",
                progress: 15,
                budget: "£620K",
                timeline: "Q3 2024 - Q2 2026",
              },
              {
                name: "Cybersecurity Enhancement",
                status: "In Progress",
                progress: 60,
                budget: "£420K",
                timeline: "Q2 2024 - Q1 2025",
              },
              {
                name: "Cloud Migration",
                status: "Approved",
                progress: 5,
                budget: "£520K",
                timeline: "Q1 2025 - Q4 2026",
              },
            ].map((initiative, idx) => (
              <div
                key={idx}
                className="p-4 border border-gray-200 rounded"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">
                    {initiative.name}
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      initiative.status === "In Progress"
                        ? "bg-blue-100 text-blue-800"
                        : initiative.status === "Planning"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {initiative.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                  <span>Budget: {initiative.budget}</span>
                  <span>Timeline: {initiative.timeline}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${initiative.progress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {initiative.progress}% complete
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}