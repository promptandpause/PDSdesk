import { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: { value: string; positive?: boolean };
  icon?: ReactNode;
  onClick?: () => void;
}

export function MetricCard({ label, value, change, icon, onClick }: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--itsm-space-4)',
        backgroundColor: 'var(--itsm-surface-base)',
        border: '1px solid var(--itsm-border-subtle)',
        borderRadius: 'var(--itsm-panel-radius)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color var(--itsm-transition-fast), box-shadow var(--itsm-transition-fast)',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--itsm-border-strong)';
          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--itsm-shadow-sm)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--itsm-border-subtle)';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--itsm-space-2)',
        }}
      >
        <span
          className="itsm-label"
          style={{ color: 'var(--itsm-text-tertiary)' }}
        >
          {label}
        </span>
        {icon && (
          <span style={{ color: 'var(--itsm-text-muted)' }}>{icon}</span>
        )}
      </div>
      <div
        style={{
          fontSize: 'var(--itsm-text-2xl)',
          fontWeight: 'var(--itsm-weight-bold)' as any,
          color: 'var(--itsm-text-primary)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {change && (
        <div
          style={{
            marginTop: 'var(--itsm-space-2)',
            fontSize: 'var(--itsm-text-xs)',
            color: change.positive ? 'var(--itsm-status-resolved)' : 'var(--itsm-status-open)',
          }}
        >
          {change.positive ? '↑' : '↓'} {change.value}
        </div>
      )}
    </div>
  );
}

interface MetricRowProps {
  children: ReactNode;
}

export function MetricRow({ children }: MetricRowProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 'var(--itsm-space-4)',
      }}
    >
      {children}
    </div>
  );
}
