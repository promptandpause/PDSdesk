import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    background-color: var(--itsm-interactive-primary);
    color: var(--itsm-text-inverse);
    border: 1px solid var(--itsm-interactive-primary);
  `,
  secondary: `
    background-color: var(--itsm-surface-base);
    color: var(--itsm-text-primary);
    border: 1px solid var(--itsm-border-default);
  `,
  ghost: `
    background-color: transparent;
    color: var(--itsm-text-secondary);
    border: 1px solid transparent;
  `,
  danger: `
    background-color: var(--itsm-interactive-danger);
    color: var(--itsm-text-inverse);
    border: 1px solid var(--itsm-interactive-danger);
  `,
  outline: `
    background-color: transparent;
    color: var(--itsm-interactive-primary);
    border: 1px solid var(--itsm-border-default);
  `,
};

const sizeStyles: Record<ButtonSize, { padding: string; fontSize: string; height: string }> = {
  sm: { padding: '0 var(--itsm-space-2)', fontSize: 'var(--itsm-text-xs)', height: '26px' },
  md: { padding: '0 var(--itsm-space-3)', fontSize: 'var(--itsm-text-sm)', height: '32px' },
  lg: { padding: '0 var(--itsm-space-4)', fontSize: 'var(--itsm-text-base)', height: '40px' },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      loading = false,
      icon,
      iconRight,
      fullWidth = false,
      disabled,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const sizeStyle = sizeStyles[size];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--itsm-space-2)',
          height: sizeStyle.height,
          padding: sizeStyle.padding,
          fontSize: sizeStyle.fontSize,
          fontWeight: 'var(--itsm-weight-medium)' as any,
          fontFamily: 'inherit',
          lineHeight: 1,
          borderRadius: 'var(--itsm-button-radius)',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all var(--itsm-transition-fast)',
          width: fullWidth ? '100%' : 'auto',
          whiteSpace: 'nowrap',
          ...style,
        }}
        className="itsm-focus"
        {...props}
      >
        <style>{`
          button[data-variant="primary"]:hover:not(:disabled) {
            background-color: var(--itsm-interactive-primary-hover);
            border-color: var(--itsm-interactive-primary-hover);
          }
          button[data-variant="secondary"]:hover:not(:disabled) {
            background-color: var(--itsm-surface-raised);
            border-color: var(--itsm-border-strong);
          }
          button[data-variant="ghost"]:hover:not(:disabled) {
            background-color: var(--itsm-interactive-ghost-hover);
          }
          button[data-variant="danger"]:hover:not(:disabled) {
            background-color: var(--itsm-interactive-danger-hover);
            border-color: var(--itsm-interactive-danger-hover);
          }
          button[data-variant="outline"]:hover:not(:disabled) {
            background-color: var(--itsm-surface-raised);
          }
        `}</style>
        {loading ? (
          <span
            style={{
              width: 14,
              height: 14,
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'itsm-spin 0.6s linear infinite',
            }}
          />
        ) : icon ? (
          <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
        ) : null}
        {children}
        {iconRight && !loading ? (
          <span style={{ display: 'flex', alignItems: 'center' }}>{iconRight}</span>
        ) : null}
      </button>
    );
  }
);

Button.displayName = 'Button';
