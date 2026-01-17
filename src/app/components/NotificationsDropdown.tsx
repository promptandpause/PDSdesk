import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, Notification } from '../hooks/useNotifications';
import { Button } from './Button';
import { BellIcon } from './Icons';

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    if (notification.ticket_id) {
      navigate(`/tickets/${notification.ticket_id}`);
    }

    setOpen(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          border: 'none',
          background: 'transparent',
          borderRadius: 'var(--itsm-button-radius)',
          cursor: 'pointer',
          color: 'var(--itsm-text-secondary)',
        }}
      >
        <BellIcon size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 8,
              backgroundColor: 'var(--itsm-status-critical)',
              color: 'white',
              fontSize: 10,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            width: 360,
            maxHeight: 480,
            backgroundColor: 'var(--itsm-surface-base)',
            border: '1px solid var(--itsm-border-default)',
            borderRadius: 'var(--itsm-panel-radius)',
            boxShadow: 'var(--itsm-shadow-overlay)',
            zIndex: 'var(--itsm-z-dropdown)' as any,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--itsm-space-3) var(--itsm-space-4)',
              borderBottom: '1px solid var(--itsm-border-subtle)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--itsm-text-sm)',
                fontWeight: 'var(--itsm-weight-semibold)' as any,
                color: 'var(--itsm-text-primary)',
              }}
            >
              Notifications
            </span>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => void markAllAsRead()}>
                Mark all read
              </Button>
            )}
          </div>

          {/* Content */}
          <div
            className="itsm-scrollbar"
            style={{
              flex: 1,
              overflow: 'auto',
              maxHeight: 400,
            }}
          >
            {loading ? (
              <div
                style={{
                  padding: 'var(--itsm-space-6)',
                  textAlign: 'center',
                  color: 'var(--itsm-text-tertiary)',
                  fontSize: 'var(--itsm-text-sm)',
                }}
              >
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div
                style={{
                  padding: 'var(--itsm-space-6)',
                  textAlign: 'center',
                  color: 'var(--itsm-text-tertiary)',
                  fontSize: 'var(--itsm-text-sm)',
                }}
              >
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void handleNotificationClick(notification)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: 'var(--itsm-space-3) var(--itsm-space-4)',
                    border: 'none',
                    background: notification.is_read
                      ? 'transparent'
                      : 'var(--itsm-primary-50)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--itsm-border-subtle)',
                    transition: 'background-color var(--itsm-transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = notification.is_read
                      ? 'var(--itsm-surface-sunken)'
                      : 'var(--itsm-primary-100)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = notification.is_read
                      ? 'transparent'
                      : 'var(--itsm-primary-50)';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--itsm-space-3)',
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: notification.is_read
                          ? 'transparent'
                          : 'var(--itsm-primary-600)',
                        marginTop: 6,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 'var(--itsm-text-sm)',
                          fontWeight: notification.is_read
                            ? 'var(--itsm-weight-normal)'
                            : ('var(--itsm-weight-medium)' as any),
                          color: 'var(--itsm-text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {notification.title ?? notification.event_type}
                      </div>
                      {notification.body && (
                        <div
                          style={{
                            fontSize: 'var(--itsm-text-xs)',
                            color: 'var(--itsm-text-secondary)',
                            marginTop: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {notification.body}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 'var(--itsm-text-xs)',
                          color: 'var(--itsm-text-tertiary)',
                          marginTop: 4,
                        }}
                      >
                        {formatTime(notification.created_at)}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
