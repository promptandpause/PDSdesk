import { Settings, Maximize2 } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

// TODO: Fetch selections from Supabase
export function SelectionsWidget({
  onMaximize,
  onSettings,
  title,
  items,
  onOpenItem,
  loading,
  error,
}: {
  onMaximize?: () => void;
  onSettings?: () => void;
  title?: string;
  items?: string[];
  onOpenItem?: (name: string) => void;
  loading?: boolean;
  error?: string | null;
}) {
  const selections = Array.isArray(items) ? items : [];

  return (
    <div className="pds-panel">
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>{title ?? "Selections"}</h3>
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

      {error ? (
        <div className="pds-message" data-tone="danger">{error}</div>
      ) : loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ) : selections.length === 0 ? (
        <div className="text-xs pds-text-muted">No saved selections yet.</div>
      ) : (
        <div className="space-y-2">
          {selections.map((selection, index) => (
            <div key={index}>
              <button
                type="button"
                className="pds-link text-xs"
                onClick={() => onOpenItem?.(selection)}
              >
                {selection}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}