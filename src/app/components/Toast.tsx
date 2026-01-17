import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (type: Toast['type'], message: string, details?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: Toast['type'], message: string, details?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setToasts((prev) => [...prev, { id, type, message, details }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'var(--itsm-space-6)',
        right: 'var(--itsm-space-6)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--itsm-space-2)',
        maxWidth: 400,
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const colors = {
    success: {
      bg: 'var(--itsm-success-50)',
      border: 'var(--itsm-success-500)',
      icon: '✓',
      iconBg: 'var(--itsm-success-500)',
    },
    error: {
      bg: 'var(--itsm-error-50)',
      border: 'var(--itsm-error-500)',
      icon: '✕',
      iconBg: 'var(--itsm-error-500)',
    },
    warning: {
      bg: 'var(--itsm-warning-50)',
      border: 'var(--itsm-warning-500)',
      icon: '!',
      iconBg: 'var(--itsm-warning-500)',
    },
    info: {
      bg: 'var(--itsm-primary-50)',
      border: 'var(--itsm-primary-500)',
      icon: 'i',
      iconBg: 'var(--itsm-primary-500)',
    },
  };

  const style = colors[toast.type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--itsm-space-3)',
        padding: 'var(--itsm-space-3) var(--itsm-space-4)',
        backgroundColor: style.bg,
        borderLeft: `4px solid ${style.border}`,
        borderRadius: 'var(--itsm-panel-radius)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        animation: 'slideIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: style.iconBg,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 'bold',
          flexShrink: 0,
        }}
      >
        {style.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 'var(--itsm-text-sm)',
            fontWeight: 'var(--itsm-weight-medium)' as any,
            color: 'var(--itsm-text-primary)',
          }}
        >
          {toast.message}
        </div>
        {toast.details && (
          <div
            style={{
              fontSize: 'var(--itsm-text-xs)',
              color: 'var(--itsm-text-secondary)',
              marginTop: 2,
            }}
          >
            {toast.details}
          </div>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: 'var(--itsm-text-tertiary)',
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ×
      </button>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
