import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { PageHeader } from '../../layout/PageHeader';
import { Panel, Button, Input, Badge, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../../components';

interface OperatorGroup {
  id: string;
  group_key: string;
  name: string;
  description: string | null;
  is_active: boolean;
  email_address: string | null;
  auto_assign: boolean;
}

interface QueueConfig {
  group_id: string;
  categories: string[];
  priorities: string[];
  default_sla_id: string | null;
}

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface GroupMember {
  group_id: string;
  user_id: string;
  profile?: Profile;
}

export function QueueManagementPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();

  const [groups, setGroups] = useState<OperatorGroup[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<OperatorGroup | null>(null);
  const [saving, setSaving] = useState(false);

  const [emailFormData, setEmailFormData] = useState({
    email_address: '',
    auto_assign: false,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [{ data: groupsData }, { data: membersData }, { data: profilesData }] = await Promise.all([
      supabase.from('operator_groups').select('*').order('name'),
      supabase.from('operator_group_members').select('group_id, user_id'),
      supabase.from('profiles').select('id, email, full_name').order('full_name'),
    ]);

    if (groupsData) setGroups(groupsData as OperatorGroup[]);
    if (membersData) setMembers(membersData as GroupMember[]);
    if (profilesData) setProfiles(profilesData as Profile[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedGroup) {
      setEmailFormData({
        email_address: selectedGroup.email_address || '',
        auto_assign: selectedGroup.auto_assign || false,
      });
    }
  }, [selectedGroup]);

  const handleSaveEmailSettings = async () => {
    if (!selectedGroup) return;

    setSaving(true);

    const { error } = await supabase
      .from('operator_groups')
      .update({
        email_address: emailFormData.email_address.trim() || null,
        auto_assign: emailFormData.auto_assign,
      })
      .eq('id', selectedGroup.id);

    if (error) {
      alert('Error saving settings: ' + error.message);
    } else {
      alert('Settings saved successfully!');
      void fetchData();
    }

    setSaving(false);
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedGroup) return;

    const { error } = await supabase.from('operator_group_members').insert({
      group_id: selectedGroup.id,
      user_id: userId,
    });

    if (error) {
      alert('Error adding member: ' + error.message);
    } else {
      void fetchData();
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return;

    const { error } = await supabase
      .from('operator_group_members')
      .delete()
      .eq('group_id', selectedGroup.id)
      .eq('user_id', userId);

    if (error) {
      alert('Error removing member: ' + error.message);
    } else {
      void fetchData();
    }
  };

  const getGroupMembers = (groupId: string) => {
    return members
      .filter((m) => m.group_id === groupId)
      .map((m) => ({
        ...m,
        profile: profiles.find((p) => p.id === m.user_id),
      }));
  };

  const getNonMembers = (groupId: string) => {
    const memberIds = members.filter((m) => m.group_id === groupId).map((m) => m.user_id);
    return profiles.filter((p) => !memberIds.includes(p.id));
  };

  return (
    <div>
      <PageHeader
        title="Queue Management"
        subtitle="Configure operator group queues and email settings"
        breadcrumbs={[
          { label: 'Settings', to: '/settings' },
          { label: 'Queue Management' },
        ]}
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--itsm-space-4)' }}>
          {/* Groups List */}
          <Panel title="Operator Groups" noPadding>
            {loading ? (
              <div style={{ padding: 'var(--itsm-space-4)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
                Loading...
              </div>
            ) : (
              <div>
                {groups.map((group) => {
                  const memberCount = members.filter((m) => m.group_id === group.id).length;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setSelectedGroup(group)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: 'var(--itsm-space-3) var(--itsm-space-4)',
                        border: 'none',
                        borderBottom: '1px solid var(--itsm-border-subtle)',
                        backgroundColor: selectedGroup?.id === group.id ? 'var(--itsm-primary-50)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'var(--itsm-weight-medium)' as any, fontSize: 'var(--itsm-text-sm)' }}>
                          {group.name}
                        </span>
                        <Badge variant={group.is_active ? 'success' : 'neutral'} size="sm">
                          {memberCount}
                        </Badge>
                      </div>
                      {group.email_address && (
                        <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginTop: 2 }}>
                          📧 {group.email_address}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Group Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
            {selectedGroup ? (
              <>
                {/* Email Settings */}
                <Panel title={`${selectedGroup.name} - Email & Notification Settings`}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                    <Input
                      label="Group Email Address"
                      value={emailFormData.email_address}
                      onChange={(e) => setEmailFormData({ ...emailFormData, email_address: e.target.value })}
                      placeholder="e.g., it-support@company.com"
                      hint="Notifications for this queue will be sent here"
                    />
                    <div>
                      <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                        Auto-Assignment
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={emailFormData.auto_assign}
                          onChange={(e) => setEmailFormData({ ...emailFormData, auto_assign: e.target.checked })}
                        />
                        <span style={{ fontSize: 'var(--itsm-text-sm)' }}>
                          Automatically assign tickets to available agents
                        </span>
                      </label>
                    </div>
                  </div>
                  <div style={{ marginTop: 'var(--itsm-space-4)', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="primary" onClick={handleSaveEmailSettings} loading={saving}>
                      Save Settings
                    </Button>
                  </div>
                </Panel>

                {/* Members */}
                <Panel title={`${selectedGroup.name} - Members`}>
                  <div style={{ marginBottom: 'var(--itsm-space-4)' }}>
                    <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                      Add Member
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          void handleAddMember(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      style={{
                        width: '100%',
                        maxWidth: 300,
                        height: 32,
                        padding: '0 var(--itsm-space-3)',
                        fontSize: 'var(--itsm-text-sm)',
                        border: '1px solid var(--itsm-border-default)',
                        borderRadius: 'var(--itsm-input-radius)',
                        backgroundColor: 'var(--itsm-surface-base)',
                      }}
                    >
                      <option value="">Select user to add...</option>
                      {getNonMembers(selectedGroup.id).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name || p.email || 'Unknown'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {getGroupMembers(selectedGroup.id).length === 0 ? (
                    <div style={{ padding: 'var(--itsm-space-4)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
                      No members in this group
                    </div>
                  ) : (
                    <Table>
                      <TableHead>
                        <tr>
                          <TableHeaderCell>Name</TableHeaderCell>
                          <TableHeaderCell>Email</TableHeaderCell>
                          <TableHeaderCell width={100} align="right">Actions</TableHeaderCell>
                        </tr>
                      </TableHead>
                      <TableBody>
                        {getGroupMembers(selectedGroup.id).map((m) => (
                          <TableRow key={m.user_id}>
                            <TableCell>
                              <span style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                                {m.profile?.full_name || 'Unknown'}
                              </span>
                            </TableCell>
                            <TableCell muted>{m.profile?.email || '—'}</TableCell>
                            <TableCell align="right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void handleRemoveMember(m.user_id)}
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Panel>
              </>
            ) : (
              <Panel>
                <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
                  Select an operator group to configure its queue settings
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
