import { calculateSLAStatus, formatTimeRemaining, SLAStatus } from '../hooks/useSLA';

interface SLAIndicatorProps {
  dueAt: string | null;
  label?: string;
  isComplete?: boolean;
  size?: 'sm' | 'md';
}

const statusColors: Record<SLAStatus, { bg: string; text: string; border: string }> = {
  within: {
    bg: 'var(--itsm-status-resolved-bg)',
    text: 'var(--itsm-status-resolved)',
    border: 'var(--itsm-status-resolved)',
  },
  warning: {
    bg: 'var(--itsm-status-pending-bg)',
    text: 'var(--itsm-status-pending)',
    border: 'var(--itsm-status-pending)',
  },
  breached: {
    bg: 'var(--itsm-status-critical-bg)',
    text: 'var(--itsm-status-critical)',
    border: 'var(--itsm-status-critical)',
  },
};

export function SLAIndicator({ dueAt, label, isComplete, size = 'md' }: SLAIndicatorProps) {
  if (!dueAt) {
    return null;
  }

  const { status, timeRemaining } = calculateSLAStatus(dueAt);
  const colors = statusColors[status];

  const isSmall = size === 'sm';

  if (isComplete) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--itsm-space-2)',
          padding: isSmall ? '2px 6px' : '4px 8px',
          borderRadius: 'var(--itsm-badge-radius)',
          backgroundColor: 'var(--itsm-status-resolved-bg)',
          color: 'var(--itsm-status-resolved)',
          fontSize: isSmall ? 'var(--itsm-text-xs)' : 'var(--itsm-text-sm)',
          fontWeight: 'var(--itsm-weight-medium)' as any,
        }}
      >
        <span>✓</span>
        {label && <span>{label} met</span>}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--itsm-space-2)',
        padding: isSmall ? '2px 6px' : '4px 8px',
        borderRadius: 'var(--itsm-badge-radius)',
        backgroundColor: colors.bg,
        color: colors.text,
        fontSize: isSmall ? 'var(--itsm-text-xs)' : 'var(--itsm-text-sm)',
        fontWeight: 'var(--itsm-weight-medium)' as any,
      }}
    >
      <span style={{ fontSize: isSmall ? 12 : 14 }}>⏱</span>
      <span>
        {status === 'breached' ? (
          <>Breached {formatTimeRemaining(timeRemaining)} ago</>
        ) : (
          <>
            {label && `${label}: `}
            {formatTimeRemaining(timeRemaining)}
          </>
        )}
      </span>
    </div>
  );
}

interface SLARowProps {
  responseLabel?: string;
  responseDueAt: string | null;
  responseCompletedAt: string | null;
  resolutionLabel?: string;
  resolutionDueAt: string | null;
  resolutionCompletedAt: string | null;
}

export function SLARow({
  responseLabel = 'Response',
  responseDueAt,
  responseCompletedAt,
  resolutionLabel = 'Resolution',
  resolutionDueAt,
  resolutionCompletedAt,
}: SLARowProps) {
  return (
    <div style={{ display: 'flex', gap: 'var(--itsm-space-3)', flexWrap: 'wrap' }}>
      <SLAIndicator
        dueAt={responseDueAt}
        label={responseLabel}
        isComplete={responseCompletedAt != null}
        size="sm"
      />
      <SLAIndicator
        dueAt={resolutionDueAt}
        label={resolutionLabel}
        isComplete={resolutionCompletedAt != null}
        size="sm"
      />
    </div>
  );
}
