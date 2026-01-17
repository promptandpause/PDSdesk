import { ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple' | 'blue' | 'green' | 'yellow' | 'red';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  dot?: boolean;
  size?: 'sm' | 'md';
}

const variantColors: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  neutral: {
    bg: 'var(--itsm-gray-100)',
    text: 'var(--itsm-gray-700)',
    dot: 'var(--itsm-gray-400)',
  },
  info: {
    bg: 'var(--itsm-primary-100)',
    text: 'var(--itsm-primary-800)',
    dot: 'var(--itsm-primary-500)',
  },
  success: {
    bg: 'var(--itsm-status-resolved-bg)',
    text: 'var(--itsm-status-resolved)',
    dot: 'var(--itsm-status-resolved)',
  },
  warning: {
    bg: 'var(--itsm-status-in-progress-bg)',
    text: 'var(--itsm-status-in-progress)',
    dot: 'var(--itsm-status-in-progress)',
  },
  danger: {
    bg: 'var(--itsm-status-open-bg)',
    text: 'var(--itsm-status-open)',
    dot: 'var(--itsm-status-open)',
  },
  purple: {
    bg: 'var(--itsm-status-pending-bg)',
    text: 'var(--itsm-status-pending)',
    dot: 'var(--itsm-status-pending)',
  },
  blue: {
    bg: 'var(--itsm-primary-100)',
    text: 'var(--itsm-primary-700)',
    dot: 'var(--itsm-primary-500)',
  },
  green: {
    bg: 'var(--itsm-status-resolved-bg)',
    text: 'var(--itsm-status-resolved)',
    dot: 'var(--itsm-status-resolved)',
  },
  yellow: {
    bg: 'var(--itsm-status-in-progress-bg)',
    text: 'var(--itsm-status-in-progress)',
    dot: 'var(--itsm-status-in-progress)',
  },
  red: {
    bg: 'var(--itsm-status-critical-bg)',
    text: 'var(--itsm-status-critical)',
    dot: 'var(--itsm-status-critical)',
  },
};

export function Badge({ variant = 'neutral', children, dot = false, size = 'sm' }: BadgeProps) {
  const colors = variantColors[variant] ?? variantColors.neutral;
  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--itsm-space-1)',
        padding: isSmall ? '2px 6px' : '3px 8px',
        fontSize: isSmall ? 'var(--itsm-text-xs)' : 'var(--itsm-text-sm)',
        fontWeight: 'var(--itsm-weight-medium)' as any,
        lineHeight: 1.2,
        borderRadius: '3px',
        backgroundColor: colors.bg,
        color: colors.text,
        whiteSpace: 'nowrap',
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: colors.dot,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
