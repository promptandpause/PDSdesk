import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { PageHeader } from '../../layout/PageHeader';
import { Panel, Button, Input, Badge, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../../components';

interface DirectoryUser {
  id: string;
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
  const [activating, setActivating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [{ data: dirData }, { data: profilesData }] = await Promise.all([
      supabase.from('directory_users').select('*').order('full_name'),
      supabase.from('profiles').select('id, email, full_name, azure_ad_id, department, job_title').order('full_name'),
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
    if (selectedUsers.size === 0) {
      alert('Please select users to activate.');
      return;
    }

    if (!confirm(`Activate ${selectedUsers.size} user(s) as active profiles? They will be able to be assigned tickets and will have the "requester" role.`)) {
      return;
    }

    setActivating(true);

    try {
      const { data, error } = await supabase.rpc('activate_directory_users_bulk', {
        p_directory_user_ids: Array.from(selectedUsers),
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

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const notActivatedUsers = filteredDirectoryUsers.filter(
      (u) => !profiles.some((p) => p.azure_ad_id === u.azure_ad_id)
    );
    if (selectedUsers.size === notActivatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(notActivatedUsers.map((u) => u.id)));
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
          {activeTab === 'directory' && selectedUsers.size > 0 && (
            <Button
              variant="primary"
              onClick={handleActivateSelected}
              loading={activating}
              disabled={activating}
              style={{ marginLeft: 'auto' }}
            >
              Activate Selected ({selectedUsers.size})
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
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Department</TableHeaderCell>
                    <TableHeaderCell>Job Title</TableHeaderCell>
                    <TableHeaderCell width={100}>Linked</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {filteredProfiles.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <span style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                          {u.full_name || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell muted>{u.email || '—'}</TableCell>
                      <TableCell muted>{u.department || '—'}</TableCell>
                      <TableCell muted>{u.job_title || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={u.azure_ad_id ? 'success' : 'neutral'} size="sm">
                          {u.azure_ad_id ? 'Azure AD' : 'Local'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            filteredDirectoryUsers.length === 0 ? (
              <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
                No directory users found. Click "Sync from Azure AD" to import users.
              </div>
            ) : (
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell width={40}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.size > 0 && selectedUsers.size === filteredDirectoryUsers.filter((u) => !isUserActivated(u.azure_ad_id)).length}
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
                  {filteredDirectoryUsers.map((u) => {
                    const activated = isUserActivated(u.azure_ad_id);
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(u.id)}
                            onChange={() => toggleUserSelection(u.id)}
                            disabled={activated}
                            style={{ cursor: activated ? 'not-allowed' : 'pointer' }}
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
            )
          )}
        </Panel>
      </div>
    </div>
  );
}
