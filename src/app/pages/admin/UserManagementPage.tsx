import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { PageHeader } from '../../layout/PageHeader';
import { Panel, Button, Input, Badge, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../../components';

interface DirectoryUser {
  azure_ad_id: string;
  email: string | null;
  full_name: string | null;
  given_name: string | null;
  surname: string | null;
  job_title: string | null;
  department: string | null;
  office_location: string | null;
  account_enabled: boolean | null;
  last_synced_at: string | null;
}

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  azure_ad_id: string | null;
  department: string | null;
  job_title: string | null;
  is_active?: boolean;
}

export function UserManagementPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();

  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'directory' | 'profiles'>('profiles');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [activating, setActivating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [{ data: dirData }, { data: profilesData }] = await Promise.all([
      supabase.from('directory_users').select('*').order('full_name'),
      supabase.from('profiles').select('id, email, full_name, azure_ad_id, department, job_title, is_active').order('full_name'),
    ]);

    if (dirData) {
      setDirectoryUsers(dirData as DirectoryUser[]);
      const latestSync = dirData.reduce((latest: string | null, u: DirectoryUser) => {
        if (!u.last_synced_at) return latest;
        if (!latest) return u.last_synced_at;
        return new Date(u.last_synced_at) > new Date(latest) ? u.last_synced_at : latest;
      }, null);
      setLastSyncTime(latestSync);
    }

    if (profilesData) {
      setProfiles(profilesData as Profile[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSyncFromAzure = async () => {
    if (!confirm('This will sync all users from Azure AD/Microsoft 365. Continue?')) return;

    setSyncing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        alert('No active session. Please log in again.');
        setSyncing(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/graph-directory-sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (result.ok) {
        alert(`Successfully synced ${result.count} users from Azure AD.`);
        void fetchData();
      } else {
        alert('Sync failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Sync error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    setSyncing(false);
  };

  const handleActivateSelected = async () => {
    if (validSelectedUsers.length === 0) {
      alert('Please select users to activate.');
      return;
    }

    if (!confirm(`Activate ${validSelectedUsers.length} user(s) as active profiles? They will be able to be assigned tickets and will have the "requester" role.`)) {
      return;
    }

    setActivating(true);

    try {
      const { data, error } = await supabase.rpc('activate_directory_users_bulk', {
        p_azure_ad_ids: validSelectedUsers,
      });

      if (error) {
        alert('Activation failed: ' + error.message);
      } else {
        const result = data as { success_count: number; error_count: number };
        alert(`Activated ${result.success_count} user(s). ${result.error_count > 0 ? `${result.error_count} failed.` : ''}`);
        setSelectedUsers(new Set());
        void fetchData();
      }
    } catch (error) {
      alert('Activation error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    setActivating(false);
  };

  const handleDeactivateSelected = async () => {
    if (selectedProfiles.size === 0) {
      alert('Please select users to deactivate.');
      return;
    }

    // Filter out current user from selection
    const usersToDeactivate = Array.from(selectedProfiles).filter((id) => id !== user?.id);
    
    if (usersToDeactivate.length === 0) {
      alert('You cannot deactivate yourself.');
      return;
    }

    if (!confirm(`Deactivate ${usersToDeactivate.length} user(s)? They will no longer be able to sign in.`)) {
      return;
    }

    setDeactivating(true);

    try {
      const { data, error } = await supabase.rpc('deactivate_users_bulk', {
        p_user_ids: usersToDeactivate,
      });

      if (error) {
        alert('Deactivation failed: ' + error.message);
      } else {
        const result = data as { success_count: number; error_count: number };
        alert(`Deactivated ${result.success_count} user(s). ${result.error_count > 0 ? `${result.error_count} failed.` : ''}`);
        setSelectedProfiles(new Set());
        void fetchData();
      }
    } catch (error) {
      alert('Deactivation error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    setDeactivating(false);
  };

  const handleReactivateUser = async (userId: string) => {
    if (!confirm('Reactivate this user? They will be able to sign in again.')) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('reactivate_user', {
        p_user_id: userId,
      });

      if (error) {
        alert('Reactivation failed: ' + error.message);
      } else {
        alert('User reactivated successfully.');
        void fetchData();
      }
    } catch (error) {
      alert('Reactivation error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const toggleProfileSelection = (profileId: string) => {
    // Don't allow selecting yourself
    if (profileId === user?.id) return;
    
    setSelectedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  };

  const toggleSelectAllProfiles = () => {
    const selectableProfiles = filteredProfiles.filter((p) => p.id !== user?.id && p.is_active !== false);
    if (selectedProfiles.size === selectableProfiles.length && selectableProfiles.length > 0) {
      setSelectedProfiles(new Set());
    } else {
      setSelectedProfiles(new Set(selectableProfiles.map((p) => p.id)));
    }
  };

  const isUserActivated = (azureAdId: string) => {
    return profiles.some((p) => p.azure_ad_id === azureAdId);
  };

  const filteredDirectoryUsers = directoryUsers.filter((u) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(searchLower) ||
      u.full_name?.toLowerCase().includes(searchLower) ||
      u.department?.toLowerCase().includes(searchLower)
    );
  });

  // Get list of non-activated directory users (selectable)
  const selectableUsers = filteredDirectoryUsers.filter(
    (u) => !isUserActivated(u.azure_ad_id)
  );

  const toggleUserSelection = (azureAdId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(azureAdId)) {
        next.delete(azureAdId);
      } else {
        next.add(azureAdId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === selectableUsers.length && selectableUsers.length > 0) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(selectableUsers.map((u) => u.azure_ad_id)));
    }
  };

  // Filter selectedUsers to only include non-activated users
  const validSelectedUsers = Array.from(selectedUsers).filter((azureAdId) => {
    return selectableUsers.some((u) => u.azure_ad_id === azureAdId);
  });
  const validSelectedCount = validSelectedUsers.length;

  const allSelectableSelected = selectableUsers.length > 0 && selectableUsers.every((u) => selectedUsers.has(u.azure_ad_id));

  const filteredProfiles = profiles.filter((u) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(searchLower) ||
      u.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage users and Azure AD sync"
        breadcrumbs={[
          { label: 'Settings', to: '/settings' },
          { label: 'User Management' },
        ]}
        actions={
          <Button variant="primary" onClick={handleSyncFromAzure} loading={syncing} disabled={syncing}>
            {syncing ? 'Syncing...' : '🔄 Sync from Azure AD'}
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {/* Sync Status */}
        <div
          style={{
            padding: 'var(--itsm-space-3)',
            marginBottom: 'var(--itsm-space-4)',
            backgroundColor: 'var(--itsm-info-100)',
            borderRadius: 'var(--itsm-panel-radius)',
            fontSize: 'var(--itsm-text-sm)',
            color: 'var(--itsm-info-700)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            <strong>Azure AD Integration:</strong> Users are synced from Microsoft 365 / Azure Active Directory.
            Internal users will be available for ticket assignment and SSO login.
          </span>
          {lastSyncTime && (
            <span style={{ fontSize: 'var(--itsm-text-xs)' }}>
              Last sync: {formatDateTime(lastSyncTime)}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--itsm-space-2)', marginBottom: 'var(--itsm-space-4)', alignItems: 'center' }}>
          <Button
            variant={activeTab === 'profiles' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('profiles')}
          >
            Active Users ({profiles.length})
          </Button>
          <Button
            variant={activeTab === 'directory' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('directory')}
          >
            Directory ({directoryUsers.length})
          </Button>
          {activeTab === 'profiles' && selectedProfiles.size > 0 && (
            <Button
              variant="danger"
              onClick={handleDeactivateSelected}
              loading={deactivating}
              disabled={deactivating}
              style={{ marginLeft: 'auto' }}
            >
              Deactivate Selected ({selectedProfiles.size})
            </Button>
          )}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 'var(--itsm-space-4)' }}>
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 400 }}
          />
        </div>

        {/* Content */}
        <Panel noPadding>
          {loading ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              Loading...
            </div>
          ) : activeTab === 'profiles' ? (
            filteredProfiles.length === 0 ? (
              <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
                No active users found
              </div>
            ) : (
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell width={40}>
                      <input
                        type="checkbox"
                        checked={filteredProfiles.filter((p) => p.id !== user?.id && p.is_active !== false).length > 0 && 
                          filteredProfiles.filter((p) => p.id !== user?.id && p.is_active !== false).every((p) => selectedProfiles.has(p.id))}
                        onChange={toggleSelectAllProfiles}
                        style={{ cursor: 'pointer' }}
                      />
                    </TableHeaderCell>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Department</TableHeaderCell>
                    <TableHeaderCell width={100}>Linked</TableHeaderCell>
                    <TableHeaderCell width={100}>Status</TableHeaderCell>
                    <TableHeaderCell width={100}>Actions</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {filteredProfiles.map((u, index) => {
                    const isCurrentUser = u.id === user?.id;
                    const isDeactivated = u.is_active === false;
                    const canSelect = !isCurrentUser && !isDeactivated;
                    return (
                      <TableRow key={`profile-${u.id}-${index}`}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={canSelect && selectedProfiles.has(u.id)}
                            onChange={() => canSelect && toggleProfileSelection(u.id)}
                            disabled={!canSelect}
                            style={{ cursor: canSelect ? 'pointer' : 'not-allowed', opacity: canSelect ? 1 : 0.4 }}
                          />
                        </TableCell>
                        <TableCell>
                          <span style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                            {u.full_name || 'Unknown'}
                            {isCurrentUser && <span style={{ marginLeft: 8, fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>(You)</span>}
                          </span>
                        </TableCell>
                        <TableCell muted>{u.email || '—'}</TableCell>
                        <TableCell muted>{u.department || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={u.azure_ad_id ? 'success' : 'neutral'} size="sm">
                            {u.azure_ad_id ? 'Azure AD' : 'Local'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isDeactivated ? 'danger' : 'success'} size="sm">
                            {isDeactivated ? 'Deactivated' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isDeactivated && !isCurrentUser && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReactivateUser(u.id)}
                            >
                              Reactivate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )
          ) : (
            filteredDirectoryUsers.length === 0 ? (
              <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
                No directory users found. Click "Sync from Azure AD" to import users.
              </div>
            ) : (
              <>
                {/* Info banner about SSO */}
                <div style={{
                  padding: 'var(--itsm-space-3) var(--itsm-space-4)',
                  backgroundColor: 'var(--itsm-info-50)',
                  borderBottom: '1px solid var(--itsm-info-200)',
                  fontSize: 'var(--itsm-text-sm)',
                  color: 'var(--itsm-info-700)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--itsm-space-2)',
                }}>
                  <span style={{ fontSize: '1rem' }}>ℹ️</span>
                  <span>
                    Users with "Not Active" status need to sign in via SSO at <strong>/login</strong> to create their profile. 
                    Once they sign in, they will automatically appear as Active Users.
                  </span>
                </div>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell width={40}>
                      <input
                        type="checkbox"
                        checked={allSelectableSelected}
                        onChange={toggleSelectAll}
                        style={{ cursor: 'pointer' }}
                      />
                    </TableHeaderCell>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Department</TableHeaderCell>
                    <TableHeaderCell width={100}>Profile</TableHeaderCell>
                    <TableHeaderCell width={80}>Status</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {filteredDirectoryUsers.map((u, index) => {
                    const activated = isUserActivated(u.azure_ad_id);
                    return (
                      <TableRow key={`dir-${u.azure_ad_id}-${index}`}>
                        <TableCell>
                          <input
                            key={`checkbox-${u.azure_ad_id}-${index}`}
                            type="checkbox"
                            checked={!activated && selectedUsers.has(u.azure_ad_id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (!activated) {
                                toggleUserSelection(u.azure_ad_id);
                              }
                            }}
                            disabled={activated}
                            style={{ cursor: activated ? 'not-allowed' : 'pointer', opacity: activated ? 0.4 : 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          <span style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                            {u.full_name || 'Unknown'}
                          </span>
                          {u.job_title && (
                            <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                              {u.job_title}
                            </div>
                          )}
                        </TableCell>
                        <TableCell muted>{u.email || '—'}</TableCell>
                        <TableCell muted>{u.department || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={activated ? 'success' : 'neutral'} size="sm">
                            {activated ? 'Active' : 'Not Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.account_enabled ? 'success' : 'danger'} size="sm">
                            {u.account_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </>
            )
          )}
        </Panel>
      </div>
    </div>
  );
}
