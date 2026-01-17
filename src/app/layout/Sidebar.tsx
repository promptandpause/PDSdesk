import { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth/AuthProvider';
import { getSupabaseClient } from '../../lib/supabaseClient';

interface NavItem {
  label: string;
  to: string;
  icon: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
  dynamic?: boolean;
}

interface OperatorQueue {
  id: string;
  group_key: string;
  name: string;
}

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
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user, profile, roles, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [userQueues, setUserQueues] = useState<OperatorQueue[]>([]);

  const isGlobalAdmin = roles.includes('global_admin');
  const isServiceDeskAdmin = roles.includes('service_desk_admin');
  const isAgent = roles.includes('operator') || isServiceDeskAdmin || isGlobalAdmin;
  const canViewAllQueues = isGlobalAdmin || isServiceDeskAdmin;

  // Fetch user's visible queues dynamically
  const fetchUserQueues = useCallback(async () => {
    if (!user || !isAgent) return;

    if (canViewAllQueues) {
      // Global admins and service desk admins see all active queues
      const { data } = await supabase
        .from('operator_groups')
        .select('id, group_key, name')
        .eq('is_active', true)
        .order('name');
      setUserQueues((data as OperatorQueue[]) ?? []);
    } else {
      // Operators only see queues they're members of
      const { data: memberData } = await supabase
        .from('operator_group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberData && memberData.length > 0) {
        const groupIds = memberData.map((m: { group_id: string }) => m.group_id);
        const { data } = await supabase
          .from('operator_groups')
          .select('id, group_key, name')
          .in('id', groupIds)
          .eq('is_active', true)
          .order('name');
        setUserQueues((data as OperatorQueue[]) ?? []);
      }
    }
  }, [supabase, user, isAgent, canViewAllQueues]);

  useEffect(() => {
    void fetchUserQueues();
  }, [fetchUserQueues]);

  // Build dynamic navigation based on user's queues
  const agentNavigation: NavSection[] = useMemo(() => {
    const queueItems: NavItem[] = userQueues.map((q) => ({
      label: q.name,
      to: `/${q.group_key}`,
      icon: '◆',
    }));

    const mainItems: NavItem[] = [
      { label: 'Dashboard', to: '/dashboard', icon: '◫' },
      { label: 'My Tickets', to: '/my-tickets', icon: '◈' },
    ];
    
    // Only show All Tickets to global_admin and service_desk_admin
    if (canViewAllQueues) {
      mainItems.push({ label: 'All Tickets', to: '/tickets', icon: '▤' });
    }

    return [
      {
        items: mainItems,
      },
      ...(queueItems.length > 0
        ? [
            {
              title: 'My Queues',
              items: queueItems,
              dynamic: true,
            },
          ]
        : []),
      {
        items: [{ label: 'Problems', to: '/problems', icon: '⚠' }],
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
          { label: 'Reservations', to: '/reservations', icon: '◐' },
          { label: 'Saved Replies', to: '/saved-replies', icon: '◈' },
          { label: 'Templates', to: '/ticket-templates', icon: '◧' },
        ],
      },
      // Directory section - only for admins
      ...(canViewAllQueues
        ? [
            {
              title: 'Directory',
              items: [
                { label: 'Customers', to: '/customers', icon: '◎' },
                { label: 'Contacts', to: '/contacts', icon: '◇' },
                { label: 'Reports', to: '/reports', icon: '◫' },
              ],
            },
          ]
        : []),
      {
        title: 'System',
        items: [
          ...(canViewAllQueues ? [{ label: 'Call Logs', to: '/call-logs', icon: '◌' }] : []),
          { label: 'Settings', to: '/settings', icon: '⚙' },
        ],
      },
    ];
  }, [userQueues, canViewAllQueues]);

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
