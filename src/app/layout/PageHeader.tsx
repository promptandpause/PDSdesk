import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: { label: string; to?: string }[];
}

export function PageHeader({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div
      style={{
        padding: 'var(--itsm-space-4) var(--itsm-space-6)',
        backgroundColor: 'var(--itsm-surface-base)',
        borderBottom: '1px solid var(--itsm-border-subtle)',
      }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--itsm-space-2)',
            marginBottom: 'var(--itsm-space-2)',
          }}
        >
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)' }}>
              {idx > 0 && (
                <span style={{ color: 'var(--itsm-text-muted)', fontSize: 'var(--itsm-text-xs)' }}>/</span>
              )}
              {crumb.to ? (
                <a
                  href={crumb.to}
                  style={{
                    fontSize: 'var(--itsm-text-xs)',
                    color: 'var(--itsm-text-tertiary)',
                    textDecoration: 'none',
                  }}
                >
                  {crumb.label}
                </a>
              ) : (
                <span style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--itsm-space-4)',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--itsm-text-xl)',
              fontWeight: 'var(--itsm-weight-semibold)' as any,
              color: 'var(--itsm-text-primary)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontSize: 'var(--itsm-text-sm)',
                color: 'var(--itsm-text-tertiary)',
                margin: 0,
                marginTop: 'var(--itsm-space-1)',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
