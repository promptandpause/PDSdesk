import { ReactNode, CSSProperties } from 'react';

interface PanelProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  noPadding?: boolean;
  style?: CSSProperties;
  className?: string;
}

export function Panel({
  children,
  title,
  subtitle,
  actions,
  noPadding = false,
  style,
  className,
}: PanelProps) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: 'var(--itsm-surface-base)',
        border: '1px solid var(--itsm-border-subtle)',
        borderRadius: 'var(--itsm-panel-radius)',
        ...style,
      }}
    >
      {(title || actions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--itsm-space-3) var(--itsm-space-4)',
            borderBottom: '1px solid var(--itsm-border-subtle)',
            minHeight: 44,
          }}
        >
          <div>
            {title && (
              <h3
                style={{
                  fontSize: 'var(--itsm-text-md)',
                  fontWeight: 'var(--itsm-weight-semibold)' as any,
                  color: 'var(--itsm-text-primary)',
                  margin: 0,
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: 'var(--itsm-text-xs)',
                  color: 'var(--itsm-text-tertiary)',
                  margin: 0,
                  marginTop: 2,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div style={{ display: 'flex', gap: 'var(--itsm-space-2)' }}>{actions}</div>}
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : 'var(--itsm-space-4)' }}>{children}</div>
    </div>
  );
}

interface PanelSectionProps {
  children: ReactNode;
  title?: string;
  noBorder?: boolean;
}

export function PanelSection({ children, title, noBorder = false }: PanelSectionProps) {
  return (
    <div
      style={{
        padding: 'var(--itsm-space-4)',
        borderBottom: noBorder ? 'none' : '1px solid var(--itsm-border-subtle)',
      }}
    >
      {title && (
        <h4
          className="itsm-label"
          style={{ marginBottom: 'var(--itsm-space-3)' }}
        >
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}
