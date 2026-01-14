import {
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";

// TODO: Fetch planned activities from Supabase
export function PlanBoardView() {
  const timeSlots = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
  ];

  const operators = [
    {
      name: "Smith, J.",
      tasks: [
        {
          time: "09:00",
          duration: 2,
          title: "Server Maintenance",
          color: "#4a9eff",
        },
        {
          time: "14:00",
          duration: 1,
          title: "Client Meeting",
          color: "#9c27b0",
        },
      ],
    },
    {
      name: "Brown, K.",
      tasks: [
        {
          time: "08:00",
          duration: 3,
          title: "Network Update",
          color: "#ff9800",
        },
        {
          time: "15:00",
          duration: 2,
          title: "Documentation",
          color: "#4caf50",
        },
      ],
    },
    {
      name: "Taylor, M.",
      tasks: [
        {
          time: "10:00",
          duration: 4,
          title: "Project Planning",
          color: "#f44336",
        },
      ],
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Plan Board
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button className="p-1 hover:bg-gray-200 rounded transition-colors">
              <ChevronLeft
                size={16}
                className="text-[#2d3e50]"
              />
            </button>
            <div className="flex items-center gap-2 px-3">
              <Calendar size={14} className="text-[#2d3e50]" />
              <span className="text-sm font-medium text-[#2d3e50]">
                Monday, January 15, 2024
              </span>
            </div>
            <button className="p-1 hover:bg-gray-200 rounded transition-colors">
              <ChevronRight
                size={16}
                className="text-[#2d3e50]"
              />
            </button>
          </div>
          <select className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]">
            <option>Day View</option>
            <option>Week View</option>
            <option>Month View</option>
          </select>
        </div>
      </div>

      {/* Plan Board Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Time Header */}
          <div className="flex bg-[#f5f5f5] border-b border-gray-300 sticky top-0 z-10">
            <div className="w-40 px-4 py-2 text-sm font-semibold text-[#2d3e50] border-r border-gray-300">
              Operator
            </div>
            {timeSlots.map((time) => (
              <div
                key={time}
                className="w-24 px-2 py-2 text-xs font-semibold text-[#2d3e50] text-center border-r border-gray-300"
              >
                {time}
              </div>
            ))}
          </div>

          {/* Operator Rows */}
          {operators.map((operator, idx) => (
            <div
              key={idx}
              className="flex border-b border-gray-300"
            >
              <div className="w-40 px-4 py-3 text-sm text-[#2d3e50] font-medium border-r border-gray-300 bg-white">
                {operator.name}
              </div>
              <div className="flex-1 relative h-16">
                <div className="absolute inset-0 flex">
                  {timeSlots.map((_, slotIdx) => (
                    <div
                      key={slotIdx}
                      className="w-24 border-r border-gray-200"
                    />
                  ))}
                </div>
                {operator.tasks.map((task, taskIdx) => {
                  const startSlot = timeSlots.indexOf(
                    task.time,
                  );
                  return (
                    <div
                      key={taskIdx}
                      className="absolute top-1 bottom-1 rounded px-2 py-1 text-xs text-white font-medium cursor-pointer hover:opacity-90 transition-opacity"
                      style={{
                        left: `${startSlot * 96}px`,
                        width: `${task.duration * 96 - 4}px`,
                        backgroundColor: task.color,
                      }}
                    >
                      <div className="truncate">
                        {task.title}
                      </div>
                      <div className="text-[10px] opacity-80">
                        {task.time}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}