import { ReactNode, useEffect, useRef } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: number;
  position?: 'left' | 'right';
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  width = 400,
  position = 'right',
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--itsm-z-drawer)' as any,
        display: 'flex',
        justifyContent: position === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          transition: 'opacity var(--itsm-transition-base)',
        }}
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        style={{
          position: 'relative',
          width,
          maxWidth: '100vw',
          height: '100%',
          backgroundColor: 'var(--itsm-surface-base)',
          boxShadow: 'var(--itsm-shadow-overlay)',
          display: 'flex',
          flexDirection: 'column',
          animation: `itsm-slide-in-${position} var(--itsm-transition-base)`,
        }}
      >
        {/* Header */}
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--itsm-space-4)',
              borderBottom: '1px solid var(--itsm-border-subtle)',
            }}
          >
            <h2
              style={{
                fontSize: 'var(--itsm-text-lg)',
                fontWeight: 'var(--itsm-weight-semibold)' as any,
                color: 'var(--itsm-text-primary)',
                margin: 0,
              }}
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="itsm-focus"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                border: 'none',
                background: 'transparent',
                borderRadius: 'var(--itsm-button-radius)',
                cursor: 'pointer',
                color: 'var(--itsm-text-tertiary)',
                transition: 'background-color var(--itsm-transition-fast)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--itsm-interactive-ghost-hover)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div
          className="itsm-scrollbar"
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 'var(--itsm-space-4)',
          }}
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes itsm-slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes itsm-slide-in-left {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
