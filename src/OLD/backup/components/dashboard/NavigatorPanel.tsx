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
    <div
      className="w-56 pds-panel flex flex-col flex-shrink-0"
      style={{ borderRadius: 0, borderRight: "1px solid var(--pds-border)", padding: 0 }}
    >
      <div
        className="flex items-center justify-between"
        style={{ padding: "8px 12px", borderBottom: "1px solid var(--pds-border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>
          Navigator
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="pds-btn pds-btn--outline pds-btn--icon pds-focus"
          title="Hide Navigator"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Dashboards Section */}
        <div style={{ borderBottom: "1px solid var(--pds-border)" }}>
          <div style={{ padding: "8px 12px" }}>
            <div className="flex items-center gap-2" style={{ color: "var(--pds-accent)" }}>
              <BarChart3 size={14} />
              <span className="text-xs font-semibold">Service Desk KPI's</span>
            </div>
          </div>
          <div className="py-1" style={{ padding: "0 6px 6px" }}>
            {dashboards.map((dashboard) => (
              <button
                key={dashboard.id}
                type="button"
                onClick={() => {
                  setActiveDashboardId(dashboard.id);
                  onOpenTab(dashboard.module, dashboard.name);
                }}
                className="pds-btn pds-btn--ghost pds-btn--sm pds-focus w-full"
                style={{
                  justifyContent: "flex-start",
                  background: activeDashboardId === dashboard.id ? "var(--pds-accent-soft)" : undefined,
                }}
              >
                <div className="flex items-center gap-2">
                  <dashboard.icon size={12} style={{ color: "var(--pds-accent)" }} />
                  <span style={{ color: "var(--pds-text)" }}>{dashboard.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Modules Section */}
        <div className="py-1" style={{ padding: "6px" }}>
          {modules.map((module) => (
            <button
              key={module.id}
              type="button"
              onClick={() => {
                setActiveModuleId(module.id);
                onOpenTab(module.module, module.name);
              }}
              className="pds-btn pds-btn--ghost pds-btn--sm pds-focus w-full"
              style={{
                justifyContent: "flex-start",
                background: activeModuleId === module.id ? "var(--pds-accent-soft)" : undefined,
              }}
            >
              <div className="flex items-center gap-2">
                {module.icon && (
                  <module.icon size={12} style={{ color: "var(--pds-accent)" }} />
                )}
                <span style={{ color: "var(--pds-text)", fontWeight: activeModuleId === module.id ? 650 : 500 }}>
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