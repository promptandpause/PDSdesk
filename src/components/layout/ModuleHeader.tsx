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
    <div className="flex flex-col pds-app-header">
      {/* Top toolbar */}
      <div className="pds-header-toolbar text-xs">
        <div className="flex items-center gap-2">
          <div className="pds-header-brand">
            <span>PDSdesk</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCalendar}
            className="pds-icon-btn pds-focus-ring"
            title="Calendar"
          >
            <Calendar size={14} className="pds-header-icon" />
          </button>
          <button
            onClick={handleUsers}
            className="pds-icon-btn pds-focus-ring"
            title="Users Directory"
          >
            <UsersIcon size={14} className="pds-header-icon" />
          </button>
          <div className="pds-header-divider" />
          <button
            onClick={handleRefresh}
            className="pds-icon-btn pds-focus-ring"
            title="Refresh"
          >
            <RefreshCw size={14} className="pds-header-icon" />
          </button>
          <button
            onClick={handleHelp}
            disabled={!docsUrl}
            className="pds-icon-btn pds-focus-ring"
            title={docsUrl ? "Help" : "Help (not configured)"}
          >
            <HelpCircle size={14} className="pds-header-icon" />
          </button>
          <div className="pds-header-divider" />
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
      <div className="pds-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`pds-tab ${activeTabId === tab.id ? "pds-tab--active" : ""}`}
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
                className="pds-tab-close pds-focus-ring"
                title="Close tab"
              >
                <X size={12} className="pds-header-icon" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}