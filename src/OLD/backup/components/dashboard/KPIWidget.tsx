import { Settings, Maximize2 } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { useState } from "react";

// TODO: Fetch KPI data from Supabase
export function KPIWidget({
  data,
  onMaximize,
  title,
  loading,
  error,
  onSettings,
}: {
  data?: Array<{ indicator: string; now: number; min: number; max: number; norm: number }>;
  onMaximize?: () => void;
  title?: string;
  loading?: boolean;
  error?: string | null;
  onSettings?: () => void;
}) {
  const kpiTableData = Array.isArray(data) ? data : [];
  const [message, setMessage] = useState<string | null>(null);

  const mainKPI = kpiTableData[0];
  const percentage = mainKPI
    ? Math.min(100, (mainKPI.now / Math.max(1, mainKPI.norm)) * 100)
    : 0;
  const isWarning = mainKPI ? mainKPI.now < mainKPI.min : false;
  const isDanger = mainKPI ? mainKPI.now > mainKPI.norm : false;

  return (
    <div className="pds-panel">
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>{title ?? "KPI"}</h3>
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

      {message && (
        <div className="pds-message" data-tone="danger">{message}</div>
      )}

      {/* Widget Content */}
      <div>
        {error ? (
          <div className="pds-message" data-tone="danger">{error}</div>
        ) : loading ? (
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <Skeleton className="w-28 h-28 rounded-full" />
              <div className="flex-1 w-full space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          </div>
        ) : kpiTableData.length === 0 ? (
          <div className="text-xs pds-text-muted">No KPI data yet.</div>
        ) : (
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* Circular Progress Gauge */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="transform -rotate-90 w-28 h-28">
              {/* Background circle */}
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="var(--pds-border)"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke={
                  isDanger
                    ? "var(--pds-danger)"
                    : isWarning
                      ? "var(--pds-warning)"
                      : "var(--pds-success)"
                }
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 48}`}
                strokeDashoffset={`${2 * Math.PI * 48 * (1 - percentage / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            {/* Center value */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--pds-text)" }}>
                  {mainKPI?.now}
                </div>
                <div className="text-xs pds-text-muted">
                  of {mainKPI?.norm}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Table */}
          <div className="flex-1 w-full overflow-x-auto">
            <table className="pds-table">
              <thead className="pds-thead">
                <tr>
                  <th className="pds-th">Indicator</th>
                  <th className="pds-th" style={{ textAlign: "center" }}>Graphic</th>
                  <th className="pds-th" style={{ textAlign: "right" }}>Now</th>
                  <th className="pds-th" style={{ textAlign: "right" }}>Min.</th>
                  <th className="pds-th" style={{ textAlign: "right" }}>Max.</th>
                  <th className="pds-th" style={{ textAlign: "right" }}>Norm</th>
                </tr>
              </thead>
              <tbody>
                {kpiTableData.map((row, idx) => (
                  <tr key={idx} className="pds-row">
                    <td className="pds-td">
                      <span className="pds-link">{row.indicator}</span>
                    </td>
                    <td className="pds-td" style={{ textAlign: "center" }}>
                      <div className="flex justify-center">
                        <MiniBar
                          value={row.now}
                          max={row.norm}
                        />
                      </div>
                    </td>
                    <td className="pds-td" style={{ textAlign: "right", fontWeight: 650 }}>
                      {row.now}
                    </td>
                    <td className="pds-td" style={{ textAlign: "right" }}>{row.min}</td>
                    <td className="pds-td" style={{ textAlign: "right" }}>{row.max}</td>
                    <td className="pds-td" style={{ textAlign: "right" }}>{row.norm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3">
              <button
                type="button"
                className="pds-link text-xs"
                onClick={() => setMessage("Full KPI view is not implemented yet.")}
              >
                All KPIs
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function MiniBar({
  value,
  max,
}: {
  value: number;
  max: number;
}) {
  const percentage = Math.min(100, (value / max) * 100);
  const color =
    percentage > 100
      ? "var(--pds-danger)"
      : percentage < 50
        ? "var(--pds-warning)"
        : "var(--pds-success)";

  return (
    <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: "var(--pds-border)" }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${percentage}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}