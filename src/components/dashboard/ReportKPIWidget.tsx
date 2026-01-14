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
  cards?: Array<{ label: string; value: number; trend: string; color: string }>;
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
    const safeGauges =
      gauges && gauges.length > 0
        ? gauges
        : [
            {
              title: "KPI logged",
              now: 3,
              min: 2,
              norm: 20,
              max: 24,
            },
            {
              title: "KPI solved",
              now: 1,
              min: 0,
              norm: 14,
              max: 16,
            },
          ];

    return (
      <div className="bg-white border border-gray-300 rounded shadow-sm">
        <div className="bg-[#f5f5f5] border-b border-gray-300 px-3 py-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#2d3e50]">
            {title}
          </h3>
          <div className="flex items-center gap-1">
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Settings"
              onClick={onSettings}
            >
              <Settings size={14} className="text-[#2d3e50]" />
            </button>
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              onClick={onMaximize}
            >
              <Maximize2 size={14} className="text-[#2d3e50]" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <p className="text-xs text-gray-600 mb-4">
            {subtitle}
          </p>
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
        </div>
      </div>
    );
  }

  // Using clean KPI cards instead of pie chart
  const kpiData =
    cards && cards.length > 0
      ? cards
      : [
          {
            label: "Total Calls",
            value: 1249,
            trend: "+12%",
            color: "#4a9eff",
          },
          {
            label: "Resolved",
            value: 987,
            trend: "+8%",
            color: "#4caf50",
          },
          {
            label: "Pending",
            value: 156,
            trend: "-5%",
            color: "#ff9800",
          },
          {
            label: "Escalated",
            value: 45,
            trend: "+3%",
            color: "#f44336",
          },
        ];

  return (
    <div className="bg-white border border-gray-300 rounded shadow-sm">
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-3 py-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#2d3e50]">
          {title}
        </h3>
        <div className="flex items-center gap-1">
          <button
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Settings"
            onClick={onSettings}
          >
            <Settings size={14} className="text-[#2d3e50]" />
          </button>
          <button
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            onClick={onMaximize}
          >
            <Maximize2 size={14} className="text-[#2d3e50]" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs text-gray-600 mb-4">{subtitle}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi) => (
            <KPICard key={kpi.label} {...kpi} />
          ))}
        </div>
      </div>
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
      <p className="text-xs text-[#4a9eff] font-medium mb-4 text-center">
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
            stroke="#e0e0e0"
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
                ? "#d32f2f"
                : isWarning
                  ? "#ff9800"
                  : "#4caf50"
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
            <div className="text-2xl font-bold text-[#2d3e50]">
              {now}
            </div>
            <div className="text-xs text-gray-500">
              of {norm}
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="text-center">
          <div className="text-gray-500 mb-0.5">Min.</div>
          <div className="font-semibold text-[#2d3e50]">
            {min}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500 mb-0.5">Norm</div>
          <div className="font-semibold text-[#2d3e50]">
            {norm}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500 mb-0.5">Max.</div>
          <div className="font-semibold text-[#2d3e50]">
            {max}
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="mt-3 text-xs font-medium">
        {isDanger && (
          <span className="text-red-600">Above norm</span>
        )}
        {isWarning && !isDanger && (
          <span className="text-orange-600">Below minimum</span>
        )}
        {!isWarning && !isDanger && (
          <span className="text-green-600">Within range</span>
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
  trend: string;
  color: string;
}) {
  const isPositive = trend.startsWith("+");

  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 rounded border border-gray-200">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
        style={{ backgroundColor: `${color}20` }}
      >
        <div className="text-lg font-bold" style={{ color }}>
          {value}
        </div>
      </div>
      <div className="text-xs text-gray-600 text-center mb-1">
        {label}
      </div>
      <div
        className={`text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}
      >
        {trend}
      </div>
    </div>
  );
}