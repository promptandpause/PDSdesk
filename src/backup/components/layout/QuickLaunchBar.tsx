import { useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Phone,
  AlertCircle,
  Calendar,
  Repeat,
  Bookmark,
  Edit3,
  Plus,
  FileText,
  Users,
  ClipboardList,
  Star,
} from "lucide-react";

interface QuickLaunchBarProps {
  onAction?: (action: string) => void;
  onOpenTab?: (tab: string, title: string) => void;
}

export function QuickLaunchBar({
  onAction,
  onOpenTab,
}: QuickLaunchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const quickActions = [
    {
      id: "first-line",
      icon: Phone,
      label: "Create Incident Ticket",
      color: "#4a9eff",
      action: () =>
        onOpenTab?.(
          "call-management",
          "New Incident",
        ),
    },
    {
      id: "incident-queue",
      icon: ClipboardList,
      label: "Incident Queue",
      color: "#2196F3",
      action: () =>
        onOpenTab?.("incident-queue", "First Line Incidents"),
    },
    {
      id: "second-line",
      icon: Phone,
      label: "New Second Line Incident",
      color: "#ff9800",
      action: () =>
        onOpenTab?.(
          "call-management",
          "New Second Line Incident",
        ),
    },
    {
      id: "reservation",
      icon: Calendar,
      label: "New Reservation",
      color: "#9c27b0",
      action: () =>
        onOpenTab?.(
          "reservations-management",
          "New Reservation",
        ),
    },
    {
      id: "change",
      icon: Repeat,
      label: "New Request for Change",
      color: "#f44336",
      action: () =>
        onOpenTab?.(
          "change-management",
          "New Request for Change",
        ),
    },
    {
      id: "bookmarks",
      icon: Star,
      label: "Bookmarks",
      color: "#4caf50",
      action: () => onOpenTab?.("bookmarks", "Bookmarks"),
    },
  ];

  return (
    <div
      className={`bg-[#2d3e50] text-white transition-all duration-300 flex flex-col border-r border-[#1e2935] ${
        isExpanded ? "w-52" : "w-14"
      }`}
    >
      {/* Expand/Collapse button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-12 flex items-center justify-center hover:bg-[#3d5167] transition-colors border-b border-[#1e2935] flex-shrink-0"
        title={isExpanded ? "Collapse" : "Expand Quick Launch"}
      >
        {isExpanded ? (
          <ChevronLeft size={20} />
        ) : (
          <ChevronRight size={20} />
        )}
      </button>

      {/* Quick Actions */}
      <div className="flex-1 flex flex-col pt-4 gap-1">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => action.action()}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#3d5167] transition-colors relative group"
            title={!isExpanded ? action.label : undefined}
          >
            <div
              className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: action.color }}
            >
              <action.icon size={18} className="text-white" />
            </div>
            {isExpanded && (
              <span className="text-xs text-left leading-tight">
                {action.label}
              </span>
            )}
            {!isExpanded && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                {action.label}
              </div>
            )}
          </button>
        ))}

        {message && isExpanded && (
          <div className="px-3 pb-2 text-xs text-red-200">
            {message}
          </div>
        )}
      </div>

      {/* Edit button at bottom */}
      <div className="border-t border-[#1e2935] p-2 flex-shrink-0">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#3d5167] hover:bg-[#4d6177] rounded transition-colors"
          title="Adjust Quick Launch bar"
          onClick={() => {
            setIsExpanded(true);
            setMessage("Quick Launch editing is not implemented yet.");
            onAction?.("quick-launch:edit");
          }}
        >
          <Edit3 size={16} />
          {isExpanded && <span className="text-xs">Edit</span>}
        </button>
      </div>
    </div>
  );
}