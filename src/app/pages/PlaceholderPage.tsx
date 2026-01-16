import type { ReactNode } from "react";

export function PlaceholderPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="pds-page flex-1">
      <div className="pds-page-header">
        <div>
          <h1 className="pds-page-title">{title}</h1>
          {subtitle ? (
            <div className="pds-text-muted" style={{ marginTop: 2, fontSize: 13 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
      <div className="pds-panel" style={{ margin: 16 }}>
        {children ?? (
          <div className="pds-text-muted" style={{ fontSize: 13 }}>
            This page is being rebuilt.
          </div>
        )}
      </div>
    </div>
  );
}
