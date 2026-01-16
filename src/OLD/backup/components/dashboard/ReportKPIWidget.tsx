import { Settings, Maximize2 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface ReportKPIWidgetProps {
  title: string;
  subtitle: string;
  variant?: "pie" | "dual-gauge";
  cards?: Array<{ label: string; value: number; trend?: string; color: string }>;
  gauges?: Array<{ title: string; now: number; min: number; norm: number; max: number }>;
  onMaximize?: () => void;
  onSettings?: () => void;
}

// TODO: Fetch report data from Supabase
export function ReportKPIWidget({
  title,
  subtitle,
  variant = "pie",
  cards,
  gauges,
  onMaximize,
  onSettings,
}: ReportKPIWidgetProps) {
  if (variant === "dual-gauge") {
    const safeGauges = Array.isArray(gauges) ? gauges : [];

    return (
      <div className="pds-panel">
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>{title}</h3>
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

        <p className="text-xs pds-text-muted" style={{ marginBottom: 12 }}>
          {subtitle}
        </p>
        {safeGauges.length === 0 ? (
          <div className="text-xs pds-text-muted">No KPI data yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {safeGauges.slice(0, 2).map((g) => (
              <CleanGauge
                key={g.title}
                title={g.title}
                now={g.now}
                min={g.min}
                norm={g.norm}
                max={g.max}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Using clean KPI cards instead of pie chart
  const kpiData = Array.isArray(cards) ? cards : [];

  return (
    <div className="pds-panel">
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>{title}</h3>
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

      <p className="text-xs pds-text-muted" style={{ marginBottom: 12 }}>{subtitle}</p>
      {kpiData.length === 0 ? (
        <div className="text-xs pds-text-muted">No KPI data yet.</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi) => (
            <KPICard key={kpi.label} {...kpi} />
          ))}
        </div>
      )}
    </div>
  );
}

function CleanGauge({
  title,
  now,
  min,
  norm,
  max,
}: {
  title: string;
  now: number;
  min: number;
  norm: number;
  max: number;
}) {
  const percentage = Math.min(100, (now / norm) * 100);
  const isWarning = now < min;
  const isDanger = now > norm;

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-medium mb-4 text-center" style={{ color: "var(--pds-accent)" }}>
        {title}
      </p>

      {/* Circular Progress */}
      <div className="relative w-32 h-32 mb-4">
        <svg className="transform -rotate-90 w-32 h-32">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="var(--pds-border)"
            strokeWidth="8"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke={
              isDanger
                ? "var(--pds-danger)"
                : isWarning
                  ? "var(--pds-warning)"
                  : "var(--pds-success)"
            }
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 56}`}
            strokeDashoffset={`${2 * Math.PI * 56 * (1 - percentage / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "var(--pds-text)" }}>
              {now}
            </div>
            <div className="text-xs pds-text-muted">
              of {norm}
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="text-center">
          <div className="pds-text-muted mb-0.5">Min.</div>
          <div className="font-semibold" style={{ color: "var(--pds-text)" }}>
            {min}
          </div>
        </div>
        <div className="text-center">
          <div className="pds-text-muted mb-0.5">Norm</div>
          <div className="font-semibold" style={{ color: "var(--pds-text)" }}>
            {norm}
          </div>
        </div>
        <div className="text-center">
          <div className="pds-text-muted mb-0.5">Max.</div>
          <div className="font-semibold" style={{ color: "var(--pds-text)" }}>
            {max}
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="mt-3 text-xs font-medium">
        {isDanger && (
          <span style={{ color: "var(--pds-danger)" }}>Above norm</span>
        )}
        {isWarning && !isDanger && (
          <span style={{ color: "var(--pds-warning)" }}>Below minimum</span>
        )}
        {!isWarning && !isDanger && (
          <span style={{ color: "var(--pds-success)" }}>Within range</span>
        )}
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  trend,
  color,
}: {
  label: string;
  value: number;
  trend?: string;
  color: string;
}) {
  const safeTrend = (trend ?? "").trim();
  const isPositive = safeTrend ? safeTrend.startsWith("+") : true;

  return (
    <div className="pds-panel flex flex-col items-center p-4" style={{ background: "var(--pds-surface-2)" }}>
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
        style={{ background: `color-mix(in srgb, ${color} 16%, transparent)` }}
      >
        <div className="text-lg font-bold" style={{ color }}>
          {value}
        </div>
      </div>
      <div className="text-xs pds-text-muted text-center mb-1">
        {label}
      </div>
      {safeTrend ? (
        <div
          className="text-xs font-medium"
          style={{ color: isPositive ? "var(--pds-success)" : "var(--pds-danger)" }}
        >
          {safeTrend}
        </div>
      ) : null}
    </div>
  );
}