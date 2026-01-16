import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth/AuthProvider';

interface NavItem {
  label: string;
  to: string;
  icon: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const agentNavigation: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: '◫' },
      { label: 'Tickets', to: '/tickets', icon: '▤' },
      { label: 'Customer Queue', to: '/customer-queue', icon: '◆' },
      { label: 'Problems', to: '/problems', icon: '⚠' },
    ],
  },
  {
    title: 'Planning',
    items: [
      { label: 'Planner', to: '/planner', icon: '☰' },
      { label: 'Kanban Boards', to: '/kanban', icon: '▦' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Service Catalog', to: '/service-catalog', icon: '▧' },
      { label: 'Knowledge Base', to: '/kb', icon: '◉' },
      { label: 'Assets', to: '/assets', icon: '▣' },
      { label: 'Saved Replies', to: '/saved-replies', icon: '◈' },
      { label: 'Templates', to: '/ticket-templates', icon: '◧' },
    ],
  },
  {
    title: 'Directory',
    items: [
      { label: 'Customers', to: '/customers', icon: '◎' },
      { label: 'Contacts', to: '/contacts', icon: '◇' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Call Logs', to: '/call-logs', icon: '◌' },
      { label: 'Settings', to: '/settings', icon: '⚙' },
    ],
  },
];

const customerNavigation: NavSection[] = [
  {
    items: [
      { label: 'My Tickets', to: '/my-tickets', icon: '▤' },
      { label: 'Knowledge Base', to: '/kb-public', icon: '◉' },
    ],
  },
];

function NavItemLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation();
  const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');

  return (
    <NavLink
      to={item.to}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--itsm-space-3)',
        padding: collapsed ? 'var(--itsm-space-2)' : 'var(--itsm-space-2) var(--itsm-space-3)',
        borderRadius: 'var(--itsm-button-radius)',
        color: isActive ? 'var(--itsm-text-inverse)' : 'var(--itsm-gray-400)',
        backgroundColor: isActive ? 'var(--itsm-surface-sidebar-active)' : 'transparent',
        textDecoration: 'none',
        fontSize: 'var(--itsm-text-sm)',
        fontWeight: isActive ? 'var(--itsm-weight-medium)' : 'var(--itsm-weight-normal)',
        transition: 'all var(--itsm-transition-fast)',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
      title={collapsed ? item.label : undefined}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--itsm-surface-sidebar-hover)';
          (e.currentTarget as HTMLElement).style.color = 'var(--itsm-text-inverse)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'var(--itsm-gray-400)';
        }
      }}
    >
      <span style={{ fontSize: 16, width: 20, textAlign: 'center', opacity: 0.9 }}>{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const { profile, roles, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const isAgent = roles.includes('operator') || roles.includes('service_desk_admin') || roles.includes('global_admin');
  const navigation = isAgent ? agentNavigation : customerNavigation;

  return (
    <aside
      style={{
        width: collapsed ? 'var(--itsm-sidebar-collapsed)' : 'var(--itsm-sidebar-width)',
        height: '100vh',
        backgroundColor: 'var(--itsm-surface-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--itsm-transition-base)',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 'var(--itsm-space-3)',
          borderBottom: '1px solid var(--itsm-gray-800)',
        }}
      >
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--itsm-space-3)',
            width: '100%',
            padding: 'var(--itsm-space-2)',
            border: 'none',
            background: 'transparent',
            borderRadius: 'var(--itsm-button-radius)',
            cursor: 'pointer',
            color: 'var(--itsm-text-inverse)',
            transition: 'background-color var(--itsm-transition-fast)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--itsm-surface-sidebar-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              backgroundColor: 'var(--itsm-primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--itsm-text-sm)',
              fontWeight: 'var(--itsm-weight-bold)' as any,
              color: 'var(--itsm-text-inverse)',
              flexShrink: 0,
            }}
          >
            SD
          </div>
          {!collapsed && (
            <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <div
                style={{
                  fontSize: 'var(--itsm-text-sm)',
                  fontWeight: 'var(--itsm-weight-semibold)' as any,
                  color: 'var(--itsm-text-inverse)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Service Desk
              </div>
              <div
                style={{
                  fontSize: 'var(--itsm-text-xs)',
                  color: 'var(--itsm-gray-500)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {profile?.full_name ?? profile?.email ?? 'User'}
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav
        className="itsm-scrollbar"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 'var(--itsm-space-2)',
        }}
      >
        {navigation.map((section, idx) => (
          <div key={idx} style={{ marginBottom: 'var(--itsm-space-4)' }}>
            {section.title && !collapsed && (
              <div
                className="itsm-label"
                style={{
                  padding: 'var(--itsm-space-2) var(--itsm-space-3)',
                  color: 'var(--itsm-gray-600)',
                }}
              >
                {section.title}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {section.items.map((item) => (
                <NavItemLink key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: 'var(--itsm-space-3)',
          borderTop: '1px solid var(--itsm-gray-800)',
        }}
      >
        {isAgent && (
          <NavLink
            to="/my-tickets"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--itsm-space-3)',
              padding: 'var(--itsm-space-2) var(--itsm-space-3)',
              borderRadius: 'var(--itsm-button-radius)',
              color: 'var(--itsm-gray-400)',
              textDecoration: 'none',
              fontSize: 'var(--itsm-text-sm)',
              marginBottom: 'var(--itsm-space-2)',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
            title={collapsed ? 'Customer Portal' : undefined}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--itsm-surface-sidebar-hover)';
              (e.currentTarget as HTMLElement).style.color = 'var(--itsm-text-inverse)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--itsm-gray-400)';
            }}
          >
            <span style={{ fontSize: 16 }}>↗</span>
            {!collapsed && <span>Customer Portal</span>}
          </NavLink>
        )}

        <button
          type="button"
          onClick={() => void signOut()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--itsm-space-3)',
            width: '100%',
            padding: 'var(--itsm-space-2) var(--itsm-space-3)',
            border: 'none',
            background: 'transparent',
            borderRadius: 'var(--itsm-button-radius)',
            cursor: 'pointer',
            color: 'var(--itsm-gray-400)',
            fontSize: 'var(--itsm-text-sm)',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all var(--itsm-transition-fast)',
          }}
          title={collapsed ? 'Sign Out' : undefined}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--itsm-surface-sidebar-hover)';
            (e.currentTarget as HTMLElement).style.color = 'var(--itsm-text-inverse)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--itsm-gray-400)';
          }}
        >
          <span style={{ fontSize: 16 }}>⏻</span>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
