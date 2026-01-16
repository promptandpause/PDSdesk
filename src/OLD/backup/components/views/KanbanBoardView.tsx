import {
  GripVertical,
  Plus,
  MoreHorizontal,
  User,
} from "lucide-react";
import { useState } from "react";

// TODO: Implement drag-and-drop with react-dnd
// TODO: Real-time updates via Supabase subscriptions

interface Task {
  id: string;
  title: string;
  priority: number;
  category: string;
  assignee: string | null;
  dueDate: string;
}

export function KanbanBoardView() {
  const [message, setMessage] = useState<string | null>(null);

  const columns = [
    {
      id: "new",
      title: "New",
      color: "#e0e0e0",
      tasks: [] as Task[],
    },
    {
      id: "in-progress",
      title: "In Progress",
      color: "#4a9eff",
      tasks: [] as Task[],
    },
    {
      id: "waiting",
      title: "Waiting",
      color: "#ff9800",
      tasks: [] as Task[],
    },
    {
      id: "resolved",
      title: "Resolved",
      color: "#4caf50",
      tasks: [] as Task[],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 px-4 py-3">
        <h1 className="text-lg font-normal text-[#2d3e50]">
          Kanban Board{" "}
          <span className="font-semibold">Call Management</span>
        </h1>
      </div>

      {message && (
        <div className="px-4 py-2 text-sm text-red-600 border-b border-gray-200">
          {message}
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4 bg-[#f5f5f5]">
        <div
          className="flex gap-4 h-full"
          style={{ minWidth: "max-content" }}
        >
          {columns.map((column) => (
            <div
              key={column.id}
              className="w-72 flex flex-col flex-shrink-0"
            >
              {/* Column Header */}
              <div
                className="rounded-t border-t-4 px-4 py-3 bg-white border-x border-gray-300"
                style={{ borderTopColor: column.color }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-[#2d3e50] text-sm">
                    {column.title}
                  </h3>
                  <button
                    type="button"
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    onClick={() => setMessage("Column actions are not implemented yet.")}
                  >
                    <MoreHorizontal
                      size={16}
                      className="text-gray-600"
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    {column.tasks.length} tasks
                  </span>
                  <button
                    type="button"
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    onClick={() => setMessage("Adding tasks from the Kanban board is not implemented yet.")}
                  >
                    <Plus
                      size={16}
                      className="text-[#4a9eff]"
                    />
                  </button>
                </div>
              </div>

              {/* Column Content */}
              <div className="flex-1 bg-white border-x border-b border-gray-300 rounded-b p-3 overflow-y-auto space-y-3">
                {column.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white border border-gray-300 rounded shadow-sm hover:shadow-md transition-all cursor-move group p-3"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <GripVertical
                        size={16}
                        className="text-gray-300 group-hover:text-gray-400 flex-shrink-0 mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-semibold text-[#4a9eff]">
                            {task.id}
                          </span>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                              task.priority === 1
                                ? "bg-red-500"
                                : task.priority === 2
                                  ? "bg-orange-500"
                                  : "bg-blue-500"
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-[#2d3e50] mb-2 line-clamp-2">
                          {task.title}
                        </h4>
                        <div className="flex items-center justify-between text-xs">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                            {task.category}
                          </span>
                          <span
                            className={`font-medium ${
                              task.dueDate === "Done"
                                ? "text-green-600"
                                : task.dueDate.includes("h") &&
                                    parseInt(task.dueDate) < 3
                                  ? "text-red-600"
                                  : "text-gray-600"
                            }`}
                          >
                            {task.dueDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Assignee */}
                    <div className="pt-2 border-t border-gray-100 mt-2">
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold text-white">
                              {task.assignee
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </span>
                          </div>
                          <span className="text-xs text-gray-700">
                            {task.assignee}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400">
                          <User size={14} />
                          <span className="text-xs">
                            Unassigned
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {column.tasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-xs">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}