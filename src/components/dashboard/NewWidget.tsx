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
    <div className="bg-white border border-gray-300 rounded shadow-sm">
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-3 py-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#2d3e50]">
          New
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
        <div className="grid grid-cols-3 gap-3">
          <button
            className="flex flex-col items-center gap-2 p-4 bg-[#4a9eff] hover:bg-[#3d8fe6] rounded transition-colors"
            onClick={onAddWidget}
          >
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <FileText size={24} className="text-[#4a9eff]" />
            </div>
            <span className="text-xs text-white font-medium">
              Reports
              <br />
              calls
            </span>
          </button>

          <button
            className="flex flex-col items-center gap-2 p-4 bg-[#4a9eff] hover:bg-[#3d8fe6] rounded transition-colors"
            onClick={onAddWidget}
          >
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <BarChart3 size={24} className="text-[#4a9eff]" />
            </div>
            <span className="text-xs text-white font-medium">
              KPIs
              <br />
              calls
            </span>
          </button>

          <button
            className="flex flex-col items-center gap-2 p-4 bg-[#4a9eff] hover:bg-[#3d8fe6] rounded transition-colors"
            onClick={onAddWidget}
          >
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <Filter size={24} className="text-[#4a9eff]" />
            </div>
            <span className="text-xs text-white font-medium">
              Selection
              <br />
              calls
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}