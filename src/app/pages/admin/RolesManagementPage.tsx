import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { PageHeader } from '../../layout/PageHeader';
import { Panel, Button, Badge, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../../components';

interface Role {
  role_key: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface UserWithRoles {
  id: string;
  email: string | null;
  full_name: string | null;
  roles: string[];
}

export function RolesManagementPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user, roles: currentUserRoles } = useAuth();

  const isGlobalAdmin = currentUserRoles.includes('global_admin');
  const isServiceDeskAdmin = currentUserRoles.includes('service_desk_admin');

  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [{ data: rolesData }, { data: profilesData }, { data: userRolesData }] = await Promise.all([
      supabase.from('roles').select('*').order('role_key'),
      supabase.from('profiles').select('id, email, full_name').order('full_name'),
      supabase.from('user_roles').select('user_id, role_key'),
    ]);

    if (rolesData) setRoles(rolesData as Role[]);

    if (profilesData && userRolesData) {
      const rolesByUser = new Map<string, string[]>();
      (userRolesData as { user_id: string; role_key: string }[]).forEach((ur) => {
        const existing = rolesByUser.get(ur.user_id) || [];
        existing.push(ur.role_key);
        rolesByUser.set(ur.user_id, existing);
      });

      const usersWithRoles: UserWithRoles[] = (profilesData as { id: string; email: string | null; full_name: string | null }[]).map((p) => ({
        ...p,
        roles: rolesByUser.get(p.id) || [],
      }));

      setUsers(usersWithRoles);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const canEditRole = (roleKey: string, targetUserId: string): boolean => {
    if (targetUserId === user?.id) return false;

    if (isGlobalAdmin) return true;

    if (isServiceDeskAdmin) {
      return roleKey === 'operator' || roleKey === 'requester';
    }

    return false;
  };

  const handleToggleRole = async (targetUser: UserWithRoles, roleKey: string) => {
    if (!canEditRole(roleKey, targetUser.id)) {
      alert('You do not have permission to modify this role.');
      return;
    }

    setSaving(true);

    const hasRole = targetUser.roles.includes(roleKey);

    if (hasRole) {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', targetUser.id)
        .eq('role_key', roleKey);

      if (error) {
        alert('Error removing role: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('user_roles').insert({
        user_id: targetUser.id,
        role_key: roleKey,
        assigned_by: user?.id,
      });

      if (error) {
        alert('Error assigning role: ' + error.message);
      }
    }

    setSaving(false);
    void fetchData();
  };

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(searchLower) ||
      u.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const getRoleBadgeVariant = (roleKey: string) => {
    switch (roleKey) {
      case 'global_admin': return 'danger';
      case 'service_desk_admin': return 'warning';
      case 'operator': return 'info';
      case 'requester': return 'neutral';
      default: return 'neutral';
    }
  };

  return (
    <div>
      <PageHeader
        title="Roles Management"
        subtitle="Assign and manage user roles"
        breadcrumbs={[
          { label: 'Settings', to: '/settings' },
          { label: 'Roles Management' },
        ]}
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {/* Info Banner */}
        <div
          style={{
            padding: 'var(--itsm-space-3)',
            marginBottom: 'var(--itsm-space-4)',
            backgroundColor: 'var(--itsm-info-100)',
            borderRadius: 'var(--itsm-panel-radius)',
            fontSize: 'var(--itsm-text-sm)',
            color: 'var(--itsm-info-700)',
          }}
        >
          <strong>Role Hierarchy:</strong> Global Admins can assign all roles. Service Desk Admins can only assign Operator and Requester roles. You cannot modify your own roles.
        </div>

        {/* Available Roles */}
        <Panel title="Available Roles" style={{ marginBottom: 'var(--itsm-space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--itsm-space-3)' }}>
            {roles.map((role) => (
              <div
                key={role.role_key}
                style={{
                  padding: 'var(--itsm-space-3)',
                  border: '1px solid var(--itsm-border-subtle)',
                  borderRadius: 'var(--itsm-panel-radius)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', marginBottom: 'var(--itsm-space-1)' }}>
                  <Badge variant={getRoleBadgeVariant(role.role_key) as any}>{role.name}</Badge>
                </div>
                <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                  {role.description || 'No description'}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Search */}
        <div style={{ marginBottom: 'var(--itsm-space-4)' }}>
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              maxWidth: 400,
              height: 32,
              padding: '0 var(--itsm-space-3)',
              fontSize: 'var(--itsm-text-sm)',
              border: '1px solid var(--itsm-border-default)',
              borderRadius: 'var(--itsm-input-radius)',
              backgroundColor: 'var(--itsm-surface-base)',
            }}
          />
        </div>

        {/* Users Table */}
        <Panel noPadding>
          {loading ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              Loading...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              No users found
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>User</TableHeaderCell>
                  <TableHeaderCell>Current Roles</TableHeaderCell>
                  <TableHeaderCell width={300}>Manage Roles</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                        {u.full_name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                        {u.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', gap: 'var(--itsm-space-1)', flexWrap: 'wrap' }}>
                        {u.roles.length > 0 ? (
                          u.roles.map((r) => (
                            <Badge key={r} variant={getRoleBadgeVariant(r) as any} size="sm">
                              {roles.find((role) => role.role_key === r)?.name || r}
                            </Badge>
                          ))
                        ) : (
                          <span style={{ color: 'var(--itsm-text-tertiary)', fontSize: 'var(--itsm-text-xs)' }}>No roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', gap: 'var(--itsm-space-1)', flexWrap: 'wrap' }}>
                        {roles.map((role) => {
                          const hasRole = u.roles.includes(role.role_key);
                          const canEdit = canEditRole(role.role_key, u.id);
                          return (
                            <Button
                              key={role.role_key}
                              variant={hasRole ? 'primary' : 'ghost'}
                              size="sm"
                              disabled={!canEdit || saving}
                              onClick={() => void handleToggleRole(u, role.role_key)}
                              style={{ opacity: canEdit ? 1 : 0.5 }}
                            >
                              {hasRole ? '✓ ' : ''}{role.name}
                            </Button>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>
    </div>
  );
}
