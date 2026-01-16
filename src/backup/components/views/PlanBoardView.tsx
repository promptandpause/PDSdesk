import {
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { useState } from "react";

// TODO: Fetch planned activities from Supabase
export function PlanBoardView() {
  const [message, setMessage] = useState<string | null>(null);

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

  type PlannedTask = { time: string; duration: number; title: string; color: string };
  type PlannedOperator = { name: string; tasks: PlannedTask[] };

  const operators: PlannedOperator[] = [];

  const currentDateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Plan Board
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              onClick={() => setMessage("Date navigation is not implemented yet.")}
            >
              <ChevronLeft
                size={16}
                className="text-[#2d3e50]"
              />
            </button>
            <div className="flex items-center gap-2 px-3">
              <Calendar size={14} className="text-[#2d3e50]" />
              <span className="text-sm font-medium text-[#2d3e50]">
                {currentDateLabel}
              </span>
            </div>
            <button
              type="button"
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              onClick={() => setMessage("Date navigation is not implemented yet.")}
            >
              <ChevronRight
                size={16}
                className="text-[#2d3e50]"
              />
            </button>
          </div>
          <select
            className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
            onChange={() => setMessage("View switching is not implemented yet.")}
          >
            <option>Day View</option>
            <option>Week View</option>
            <option>Month View</option>
          </select>
        </div>
      </div>

      {message && (
        <div className="px-4 py-2 text-sm text-red-600 border-b border-gray-200">
          {message}
        </div>
      )}

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
          {operators.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">No planned activities found.</div>
          ) : (
            operators.map((operator, idx) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}