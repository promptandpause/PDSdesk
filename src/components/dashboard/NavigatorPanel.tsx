import {
  ChevronLeft,
  BarChart3,
  LayoutDashboard,
  Building2,
  BookOpen,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ModuleType } from "../../App";

interface NavigatorPanelProps {
  onClose: () => void;
  onOpenTab: (module: ModuleType, title: string) => void;
}

export function NavigatorPanel({
  onClose,
  onOpenTab,
}: NavigatorPanelProps) {
  const dashboards = useMemo(
    () =>
      [
        {
          id: "dashboard",
          name: "Service Desk KPIs",
          icon: BarChart3,
          module: "dashboard" as ModuleType,
        },
        {
          id: "it-dashboard",
          name: "IT Dashboard",
          icon: LayoutDashboard,
          module: "it-dashboard" as ModuleType,
        },
        {
          id: "facility-dashboard",
          name: "Facility Dashboard",
          icon: Building2,
          module: "facility-dashboard" as ModuleType,
        },
        {
          id: "overview",
          name: "Overview",
          icon: LayoutDashboard,
          module: "overview" as ModuleType,
        },
      ],
    [],
  );

  const [activeDashboardId, setActiveDashboardId] = useState(dashboards[0]?.id ?? "dashboard");

  const modules = useMemo(
    () =>
      [
        { id: "call-management", name: "Call Management", module: "call-management" as ModuleType },
        { id: "problem-management", name: "Problem Management", module: "problem-management" as ModuleType },
        { id: "change-management", name: "Change Management", module: "change-management" as ModuleType },
        { id: "project-management", name: "Project Management", module: "project-management" as ModuleType },
        { id: "knowledge-base", name: "Knowledge Base", module: "knowledge-base" as ModuleType, icon: BookOpen },
        { id: "visitor-registration", name: "Visitor Registration", module: "visitor-registration" as ModuleType },
        { id: "operations", name: "Operations Management", module: "operations-management" as ModuleType },
        { id: "reservations", name: "Reservations Management", module: "reservations-management" as ModuleType },
        { id: "items", name: "Item Management", module: "item-management" as ModuleType },
        { id: "assets", name: "Asset Management", module: "asset-management" as ModuleType },
        { id: "planning", name: "Long-Term Planning", module: "long-term-planning" as ModuleType },
        { id: "contracts", name: "Contract Management and SLM", module: "contracts-management" as ModuleType },
        { id: "supporting", name: "Supporting Files", module: "supporting-files" as ModuleType },
      ],
    [],
  );

  const [activeModuleId, setActiveModuleId] = useState(modules[0]?.id ?? "call-management");

  return (
    <div className="w-56 bg-white border-r border-gray-300 flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-3 py-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#2d3e50]">
          Navigator
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Hide Navigator"
        >
          <ChevronLeft size={16} className="text-[#2d3e50]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Dashboards Section */}
        <div className="border-b border-gray-200">
          <div className="px-3 py-2 bg-[#f5f5f5]">
            <div className="flex items-center gap-2 text-[#4a9eff]">
              <BarChart3 size={14} />
              <span className="text-xs font-semibold">
                Service Desk KPI's
              </span>
            </div>
          </div>
          <div className="py-1">
            {dashboards.map((dashboard) => (
              <button
                key={dashboard.id}
                onClick={() => {
                  setActiveDashboardId(dashboard.id);
                  onOpenTab(dashboard.module, dashboard.name);
                }}
                className={`w-full px-6 py-1.5 text-left text-xs hover:bg-gray-100 transition-colors ${
                  activeDashboardId === dashboard.id ? "bg-gray-100" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <dashboard.icon
                    size={12}
                    className="text-[#4a9eff]"
                  />
                  <span className="text-[#2d3e50]">
                    {dashboard.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Modules Section */}
        <div className="py-1">
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => {
                setActiveModuleId(module.id);
                onOpenTab(module.module, module.name);
              }}
              className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[#e6f2ff] transition-colors ${
                activeModuleId === module.id ? "bg-[#cce5ff]" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                {module.icon && (
                  <module.icon size={12} className="text-[#4a9eff]" />
                )}
                <span
                  className={`${activeModuleId === module.id ? "text-[#2d3e50] font-semibold" : "text-[#2d3e50]"}`}
                >
                  {module.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}