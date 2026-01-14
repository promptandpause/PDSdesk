import { Settings, Maximize2 } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

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
  const kpiTableData =
    data && data.length > 0
      ? data
      : [
          {
            indicator: "KPI logged",
            now: 3,
            min: 2,
            max: 24,
            norm: 20,
          },
          {
            indicator: "KPI solved",
            now: 1,
            min: 0,
            max: 16,
            norm: 14,
          },
        ];

  // Use first KPI for the main gauge
  const mainKPI = kpiTableData[0];
  const percentage = Math.min(
    100,
    (mainKPI.now / mainKPI.norm) * 100,
  );
  const isWarning = mainKPI.now < mainKPI.min;
  const isDanger = mainKPI.now > mainKPI.norm;

  return (
    <div className="bg-white border border-gray-300 rounded shadow-sm">
      {/* Widget Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-3 py-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#2d3e50]">
          {title ?? "KPI"}
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
            title="Maximize"
            onClick={onMaximize}
          >
            <Maximize2 size={14} className="text-[#2d3e50]" />
          </button>
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-4">
        {error ? (
          <div className="text-sm text-red-600">{error}</div>
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
                stroke="#e0e0e0"
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
                    ? "#d32f2f"
                    : isWarning
                      ? "#ff9800"
                      : "#4caf50"
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
                <div className="text-2xl font-bold text-[#2d3e50]">
                  {mainKPI.now}
                </div>
                <div className="text-xs text-gray-500">
                  of {mainKPI.norm}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Table */}
          <div className="flex-1 w-full overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="pb-2 font-normal">
                    Indicator
                  </th>
                  <th className="pb-2 font-normal text-center">
                    Graphic
                  </th>
                  <th className="pb-2 font-normal text-right">
                    Now
                  </th>
                  <th className="pb-2 font-normal text-right">
                    Min.
                  </th>
                  <th className="pb-2 font-normal text-right">
                    Max.
                  </th>
                  <th className="pb-2 font-normal text-right">
                    Norm
                  </th>
                </tr>
              </thead>
              <tbody>
                {kpiTableData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-gray-100"
                  >
                    <td className="py-2 text-[#4a9eff] hover:underline cursor-pointer">
                      {row.indicator}
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center">
                        <MiniBar
                          value={row.now}
                          max={row.norm}
                        />
                      </div>
                    </td>
                    <td className="text-right font-medium">
                      {row.now}
                    </td>
                    <td className="text-right">{row.min}</td>
                    <td className="text-right">{row.max}</td>
                    <td className="text-right">{row.norm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3">
              <button className="text-xs text-[#4a9eff] hover:underline">
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
      ? "#d32f2f"
      : percentage < 50
        ? "#ff9800"
        : "#4caf50";

  return (
    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
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