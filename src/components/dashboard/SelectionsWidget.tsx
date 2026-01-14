import { Settings, Maximize2 } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

// TODO: Fetch selections from Supabase
export function SelectionsWidget({
  onMaximize,
  onSettings,
  title,
  items,
  loading,
  error,
}: {
  onMaximize?: () => void;
  onSettings?: () => void;
  title?: string;
  items?: string[];
  loading?: boolean;
  error?: string | null;
}) {
  const selections = items && items.length > 0 ? items : [
    "List of all major incidents",
    "All calls with a Worcade conversation",
    "Incidents with feedback",
    "List of all current incidents per department",
    "All Selections",
  ];

  return (
    <div className="bg-white border border-gray-300 rounded shadow-sm">
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-3 py-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#2d3e50]">
          {title ?? "Selections"}
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
        {error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : (
          <div className="space-y-2">
            {selections.map((selection, index) => (
              <div key={index}>
                <button className="text-xs text-[#4a9eff] hover:underline text-left">
                  {selection}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}