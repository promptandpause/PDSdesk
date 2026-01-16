import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, style, className, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-1)' }}>
        {label && (
          <label
            className="itsm-label"
            style={{ marginBottom: 'var(--itsm-space-1)' }}
          >
            {label}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {icon && (
            <span
              style={{
                position: 'absolute',
                left: 'var(--itsm-space-3)',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--itsm-text-tertiary)',
                pointerEvents: 'none',
              }}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`itsm-focus ${className ?? ''}`}
            style={{
              width: '100%',
              height: '32px',
              padding: `0 ${iconRight ? 'var(--itsm-space-8)' : 'var(--itsm-space-3)'} 0 ${icon ? 'var(--itsm-space-8)' : 'var(--itsm-space-3)'}`,
              fontSize: 'var(--itsm-text-sm)',
              fontFamily: 'inherit',
              color: 'var(--itsm-text-primary)',
              backgroundColor: 'var(--itsm-surface-base)',
              border: `1px solid ${error ? 'var(--itsm-interactive-danger)' : 'var(--itsm-border-default)'}`,
              borderRadius: 'var(--itsm-input-radius)',
              transition: 'border-color var(--itsm-transition-fast), box-shadow var(--itsm-transition-fast)',
              ...style,
            }}
            {...props}
          />
          {iconRight && (
            <span
              style={{
                position: 'absolute',
                right: 'var(--itsm-space-3)',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--itsm-text-tertiary)',
              }}
            >
              {iconRight}
            </span>
          )}
        </div>
        {error && (
          <span style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-interactive-danger)' }}>
            {error}
          </span>
        )}
        {hint && !error && (
          <span style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
