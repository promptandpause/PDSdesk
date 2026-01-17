import { NotificationsDropdown } from '../components/NotificationsDropdown';
import { useAuth } from '../../lib/auth/AuthProvider';
import { SearchIcon, UserIcon } from '../components/Icons';

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
          <SearchIcon size={14} />
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
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'var(--itsm-primary-100)',
            color: 'var(--itsm-primary-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: '2px solid var(--itsm-primary-200)',
          }}
          title={profile?.full_name ?? profile?.email ?? 'User'}
        >
          {profile?.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.full_name ?? 'User'} 
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 'var(--itsm-text-sm)', fontWeight: 600 }}>
              {(profile?.full_name ?? profile?.email ?? 'U').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
