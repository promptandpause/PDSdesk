import {
  Calendar,
  Users as UsersIcon,
  X,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { useState } from "react";
import { Tab } from "../../App";
import {
  NotificationDropdown,
  UserProfileDropdown,
} from "./NotificationSystem";

interface ModuleHeaderProps {
  user: {
    initials: string;
    name: string;
  };
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onOpenSettings?: () => void;
  onRefresh?: () => void;
}

export function ModuleHeader({
  user,
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onOpenSettings,
  onRefresh,
}: ModuleHeaderProps) {
  const [message, setMessage] = useState<string | null>(null);

  const docsUrl = (import.meta.env.VITE_DOCS_URL ?? "").trim();

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
      return;
    }

    window.dispatchEvent(new CustomEvent("pdsdesk:refresh"));
  };

  const handleCalendar = () => {
    setMessage("Calendar is not implemented yet.");
  };

  const handleUsers = () => {
    setMessage("Users directory is not implemented yet.");
  };

  const handleHelp = () => {
    if (!docsUrl) return;
    window.open(docsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col bg-[#c8c8c8] border-b border-[#a0a0a0]">
      {/* Top toolbar */}
      <div className="h-8 flex items-center justify-between px-3 text-xs border-b border-[#a0a0a0]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[#2d3e50]">
            <span className="font-medium">PDSdesk</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCalendar}
            className="p-1 hover:bg-[#b0b0b0] rounded transition-colors"
            title="Calendar"
          >
            <Calendar size={14} className="text-[#2d3e50]" />
          </button>
          <button
            onClick={handleUsers}
            className="p-1 hover:bg-[#b0b0b0] rounded transition-colors"
            title="Users Directory"
          >
            <UsersIcon size={14} className="text-[#2d3e50]" />
          </button>
          <div className="w-px h-4 bg-[#a0a0a0] mx-1"></div>
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-[#b0b0b0] rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className="text-[#2d3e50]" />
          </button>
          <button
            onClick={handleHelp}
            disabled={!docsUrl}
            className="p-1 hover:bg-[#b0b0b0] rounded transition-colors"
            title={docsUrl ? "Help" : "Help (not configured)"}
          >
            <HelpCircle size={14} className="text-[#2d3e50]" />
          </button>
          <div className="w-px h-4 bg-[#a0a0a0] mx-1"></div>
          <div className="flex items-center gap-1">
            <NotificationDropdown
              onOpenSettings={onOpenSettings}
            />
            <UserProfileDropdown
              onOpenSettings={onOpenSettings}
            />
          </div>
        </div>
      </div>

      {message && (
        <div className="px-3 py-1 text-xs text-red-600 border-b border-[#a0a0a0] bg-[#d8d8d8]">
          {message}
        </div>
      )}

      {/* Tabs bar */}
      <div className="flex items-center bg-[#d8d8d8] px-1 overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer transition-colors border-r border-[#a0a0a0] ${
              activeTabId === tab.id
                ? "bg-[#e8e8e8] text-[#2d3e50] font-medium"
                : "bg-[#c8c8c8] text-[#2d3e50] hover:bg-[#d0d0d0]"
            }`}
          >
            <span onClick={() => onTabChange(tab.id)}>
              {tab.title}
            </span>
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="p-0.5 hover:bg-[#b0b0b0] rounded transition-colors"
                title="Close tab"
              >
                <X size={12} className="text-[#2d3e50]" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}