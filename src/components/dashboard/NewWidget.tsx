import {
  Settings,
  Maximize2,
  FileText,
  BarChart3,
  Filter,
} from "lucide-react";

export function NewWidget({
  onMaximize,
  onSettings,
  onAddWidget,
}: {
  onMaximize?: () => void;
  onSettings?: () => void;
  onAddWidget?: () => void;
}) {
  return (
    <div className="pds-panel">
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>New</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="pds-btn pds-btn--outline pds-btn--icon pds-focus"
            title="Settings"
            onClick={onSettings}
          >
            <Settings size={14} />
          </button>
          <button
            type="button"
            className="pds-btn pds-btn--outline pds-btn--icon pds-focus"
            title="Maximize"
            onClick={onMaximize}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          className="pds-btn pds-btn--outline pds-focus w-full flex flex-col items-center gap-2"
          style={{ height: "auto", padding: "12px 10px" }}
          onClick={onAddWidget}
        >
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ background: "var(--pds-accent-soft)", color: "var(--pds-accent)" }}
          >
            <FileText size={24} />
          </div>
          <span className="text-xs" style={{ fontWeight: 650 }}>
            Reports
          </span>
        </button>

        <button
          type="button"
          className="pds-btn pds-btn--outline pds-focus w-full flex flex-col items-center gap-2"
          style={{ height: "auto", padding: "12px 10px" }}
          onClick={onAddWidget}
        >
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ background: "var(--pds-accent-soft)", color: "var(--pds-accent)" }}
          >
            <BarChart3 size={24} />
          </div>
          <span className="text-xs" style={{ fontWeight: 650 }}>
            KPIs
          </span>
        </button>

        <button
          type="button"
          className="pds-btn pds-btn--outline pds-focus w-full flex flex-col items-center gap-2"
          style={{ height: "auto", padding: "12px 10px" }}
          onClick={onAddWidget}
        >
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ background: "var(--pds-accent-soft)", color: "var(--pds-accent)" }}
          >
            <Filter size={24} />
          </div>
          <span className="text-xs" style={{ fontWeight: 650 }}>
            Selections
          </span>
        </button>
      </div>
    </div>
  );
}