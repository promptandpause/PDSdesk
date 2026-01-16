import { NotificationsDropdown } from '../components/NotificationsDropdown';
import { useAuth } from '../../lib/auth/AuthProvider';

export function TopBar() {
  const { profile } = useAuth();

  return (
    <header
      style={{
        height: 48,
        backgroundColor: 'var(--itsm-surface-base)',
        borderBottom: '1px solid var(--itsm-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 var(--itsm-space-4)',
        gap: 'var(--itsm-space-3)',
        flexShrink: 0,
      }}
    >
      {/* Search placeholder */}
      <div style={{ flex: 1, maxWidth: 400 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--itsm-space-2)',
            padding: 'var(--itsm-space-2) var(--itsm-space-3)',
            backgroundColor: 'var(--itsm-surface-sunken)',
            borderRadius: 'var(--itsm-input-radius)',
            color: 'var(--itsm-text-tertiary)',
            fontSize: 'var(--itsm-text-sm)',
            cursor: 'pointer',
          }}
        >
          <span>🔍</span>
          <span>Search tickets, KB articles...</span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 'var(--itsm-text-xs)',
              padding: '2px 6px',
              backgroundColor: 'var(--itsm-gray-200)',
              borderRadius: 4,
            }}
          >
            ⌘K
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)' }}>
        <NotificationsDropdown />

        {/* User avatar */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'var(--itsm-primary-100)',
            color: 'var(--itsm-primary-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--itsm-text-xs)',
            fontWeight: 'var(--itsm-weight-semibold)' as any,
            cursor: 'pointer',
          }}
          title={profile?.full_name ?? profile?.email ?? 'User'}
        >
          {(profile?.full_name ?? profile?.email ?? 'U').charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
