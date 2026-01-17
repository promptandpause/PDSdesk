import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { PageHeader } from '../../layout/PageHeader';
import { Panel, Button, Input, Badge } from '../../components';

type SettingsTab = 'organization' | 'notifications' | 'integrations' | 'security';

interface OrganizationSettings {
  id: string;
  organization_name: string;
  organization_logo_url: string | null;
  support_email: string;
  support_phone: string | null;
  timezone: string;
  date_format: string;
  time_format: string;
  default_language: string;
  business_hours_start: string;
  business_hours_end: string;
  business_days: string[];
  ticket_prefix: string;
  auto_assign_tickets: boolean;
  require_category: boolean;
  allow_anonymous_tickets: boolean;
  max_attachment_size_mb: number;
}

interface NotificationSettings {
  id: string;
  notify_on_ticket_created: boolean;
  notify_on_ticket_assigned: boolean;
  notify_on_ticket_updated: boolean;
  notify_on_ticket_resolved: boolean;
  notify_on_ticket_closed: boolean;
  notify_on_comment_added: boolean;
  notify_on_sla_breach: boolean;
  notify_on_escalation: boolean;
  email_from_name: string;
  email_from_address: string;
  email_reply_to: string;
  include_ticket_details_in_email: boolean;
  email_footer_text: string;
  send_daily_digest: boolean;
  daily_digest_time: string;
  send_weekly_summary: boolean;
  weekly_summary_day: string;
}

interface Integration {
  id: string;
  name: string;
  type: string;
  provider: string;
  is_enabled: boolean;
  config: Record<string, unknown>;
  last_sync_at: string | null;
  sync_status: string;
  sync_error: string | null;
}

interface SecuritySettings {
  id: string;
  sso_enabled: boolean;
  sso_provider: string;
  sso_enforce_for_all: boolean;
  sso_allowed_domains: string[];
  session_timeout_minutes: number;
  idle_timeout_minutes: number;
  max_concurrent_sessions: number;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_number: boolean;
  password_require_special: boolean;
  password_expiry_days: number;
  mfa_enabled: boolean;
  mfa_enforce_for_admins: boolean;
  mfa_methods: string[];
  ip_whitelist_enabled: boolean;
  ip_whitelist: string[];
  audit_log_retention_days: number;
}

const defaultOrgSettings: OrganizationSettings = {
  id: '',
  organization_name: 'PDSdesk',
  organization_logo_url: null,
  support_email: 'servicedesk@promptandpause.com',
  support_phone: null,
  timezone: 'UTC',
  date_format: 'YYYY-MM-DD',
  time_format: 'HH:mm',
  default_language: 'en',
  business_hours_start: '09:00',
  business_hours_end: '17:00',
  business_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  ticket_prefix: 'TKT',
  auto_assign_tickets: false,
  require_category: true,
  allow_anonymous_tickets: false,
  max_attachment_size_mb: 10,
};

const defaultNotificationSettings: NotificationSettings = {
  id: '',
  notify_on_ticket_created: true,
  notify_on_ticket_assigned: true,
  notify_on_ticket_updated: true,
  notify_on_ticket_resolved: true,
  notify_on_ticket_closed: true,
  notify_on_comment_added: true,
  notify_on_sla_breach: true,
  notify_on_escalation: true,
  email_from_name: 'PDSdesk Support',
  email_from_address: 'noreply@promptandpause.com',
  email_reply_to: 'servicedesk@promptandpause.com',
  include_ticket_details_in_email: true,
  email_footer_text: 'This is an automated message from PDSdesk.',
  send_daily_digest: false,
  daily_digest_time: '08:00',
  send_weekly_summary: false,
  weekly_summary_day: 'monday',
};

const defaultSecuritySettings: SecuritySettings = {
  id: '',
  sso_enabled: true,
  sso_provider: 'azure',
  sso_enforce_for_all: false,
  sso_allowed_domains: ['promptandpause.com'],
  session_timeout_minutes: 480,
  idle_timeout_minutes: 60,
  max_concurrent_sessions: 5,
  password_min_length: 12,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_number: true,
  password_require_special: true,
  password_expiry_days: 90,
  mfa_enabled: false,
  mfa_enforce_for_admins: false,
  mfa_methods: ['totp', 'email'],
  ip_whitelist_enabled: false,
  ip_whitelist: [],
  audit_log_retention_days: 365,
};

export function SystemSettingsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { roles } = useAuth();
  const isGlobalAdmin = roles.includes('global_admin');
  const isServiceDeskAdmin = roles.includes('service_desk_admin');

  const [activeTab, setActiveTab] = useState<SettingsTab>('organization');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>(defaultOrgSettings);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(defaultSecuritySettings);

  const fetchSettings = useCallback(async () => {
    setLoading(true);

    const [orgRes, notifRes, intRes, secRes] = await Promise.all([
      supabase.from('organization_settings').select('*').single(),
      supabase.from('notification_settings').select('*').single(),
      supabase.from('integrations').select('*').order('name'),
      isGlobalAdmin ? supabase.from('security_settings').select('*').single() : Promise.resolve({ data: null, error: null }),
    ]);

    if (orgRes.data) setOrgSettings(orgRes.data as OrganizationSettings);
    if (notifRes.data) setNotificationSettings(notifRes.data as NotificationSettings);
    if (intRes.data) setIntegrations(intRes.data as Integration[]);
    if (secRes.data) setSecuritySettings(secRes.data as SecuritySettings);

    setLoading(false);
  }, [supabase, isGlobalAdmin]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleSaveOrganization = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('organization_settings')
      .update(orgSettings)
      .eq('id', orgSettings.id);

    if (error) {
      alert('Error saving organization settings: ' + error.message);
    } else {
      alert('Organization settings saved!');
    }
    setSaving(false);
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('notification_settings')
      .update(notificationSettings)
      .eq('id', notificationSettings.id);

    if (error) {
      alert('Error saving notification settings: ' + error.message);
    } else {
      alert('Notification settings saved!');
    }
    setSaving(false);
  };

  const handleSaveSecurity = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('security_settings')
      .update(securitySettings)
      .eq('id', securitySettings.id);

    if (error) {
      alert('Error saving security settings: ' + error.message);
    } else {
      alert('Security settings saved!');
    }
    setSaving(false);
  };

  const handleToggleIntegration = async (integration: Integration) => {
    const { error } = await supabase
      .from('integrations')
      .update({ is_enabled: !integration.is_enabled })
      .eq('id', integration.id);

    if (error) {
      alert('Error updating integration: ' + error.message);
    } else {
      setIntegrations((prev) =>
        prev.map((i) => (i.id === integration.id ? { ...i, is_enabled: !i.is_enabled } : i))
      );
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="System Settings" subtitle="Configure organization-wide settings" />
        <div style={{ padding: 'var(--itsm-space-6)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
          Loading...
        </div>
      </div>
    );
  }

  const tabs: { key: SettingsTab; label: string; adminOnly?: boolean }[] = [
    { key: 'organization', label: 'Organization' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'integrations', label: 'Integrations' },
    { key: 'security', label: 'Security', adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isGlobalAdmin);

  return (
    <div>
      <PageHeader
        title="System Settings"
        subtitle="Configure organization-wide settings and preferences"
        breadcrumbs={[
          { label: 'Settings', to: '/settings' },
          { label: 'System Settings' },
        ]}
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--itsm-space-2)', marginBottom: 'var(--itsm-space-4)', borderBottom: '1px solid var(--itsm-border-subtle)', paddingBottom: 'var(--itsm-space-2)' }}>
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: 'var(--itsm-space-2) var(--itsm-space-4)',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid var(--itsm-primary-500)' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === tab.key ? 'var(--itsm-primary-600)' : 'var(--itsm-text-secondary)',
                fontWeight: activeTab === tab.key ? 600 : 400,
                cursor: 'pointer',
                fontSize: 'var(--itsm-text-sm)',
              }}
            >
              {tab.label}
              {tab.adminOnly && <span style={{ marginLeft: 8 }}><Badge variant="neutral" size="sm">Admin</Badge></span>}
            </button>
          ))}
        </div>

        <div style={{ maxWidth: 900 }}>
          {/* Organization Tab */}
          {activeTab === 'organization' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
              <Panel title="General Information">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                  <Input
                    label="Organization Name"
                    value={orgSettings.organization_name}
                    onChange={(e) => setOrgSettings({ ...orgSettings, organization_name: e.target.value })}
                    disabled={!isGlobalAdmin}
                  />
                  <Input
                    label="Support Email"
                    type="email"
                    value={orgSettings.support_email}
                    onChange={(e) => setOrgSettings({ ...orgSettings, support_email: e.target.value })}
                    disabled={!isGlobalAdmin}
                  />
                  <Input
                    label="Support Phone"
                    value={orgSettings.support_phone || ''}
                    onChange={(e) => setOrgSettings({ ...orgSettings, support_phone: e.target.value })}
                    disabled={!isGlobalAdmin}
                  />
                  <Input
                    label="Ticket Prefix"
                    value={orgSettings.ticket_prefix}
                    onChange={(e) => setOrgSettings({ ...orgSettings, ticket_prefix: e.target.value })}
                    hint="e.g., TKT-001, INC-001"
                    disabled={!isGlobalAdmin}
                  />
                </div>
              </Panel>

              <Panel title="Business Hours">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                  <Input
                    label="Start Time"
                    type="time"
                    value={orgSettings.business_hours_start}
                    onChange={(e) => setOrgSettings({ ...orgSettings, business_hours_start: e.target.value })}
                  />
                  <Input
                    label="End Time"
                    type="time"
                    value={orgSettings.business_hours_end}
                    onChange={(e) => setOrgSettings({ ...orgSettings, business_hours_end: e.target.value })}
                  />
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--itsm-space-2)', fontSize: 'var(--itsm-text-sm)', fontWeight: 500 }}>
                      Timezone
                    </label>
                    <select
                      value={orgSettings.timezone}
                      onChange={(e) => setOrgSettings({ ...orgSettings, timezone: e.target.value })}
                      style={{
                        width: '100%',
                        height: 36,
                        padding: '0 var(--itsm-space-3)',
                        fontSize: 'var(--itsm-text-sm)',
                        border: '1px solid var(--itsm-border-default)',
                        borderRadius: 'var(--itsm-input-radius)',
                        backgroundColor: 'var(--itsm-surface-base)',
                      }}
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--itsm-space-2)', fontSize: 'var(--itsm-text-sm)', fontWeight: 500 }}>
                    Business Days
                  </label>
                  <div style={{ display: 'flex', gap: 'var(--itsm-space-2)', flexWrap: 'wrap' }}>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                      const isSelected = orgSettings.business_days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setOrgSettings({ ...orgSettings, business_days: orgSettings.business_days.filter((d) => d !== day) });
                            } else {
                              setOrgSettings({ ...orgSettings, business_days: [...orgSettings.business_days, day] });
                            }
                          }}
                          style={{
                            padding: 'var(--itsm-space-2) var(--itsm-space-3)',
                            border: '1px solid',
                            borderColor: isSelected ? 'var(--itsm-primary-500)' : 'var(--itsm-border-default)',
                            borderRadius: 'var(--itsm-input-radius)',
                            backgroundColor: isSelected ? 'var(--itsm-primary-100)' : 'var(--itsm-surface-base)',
                            color: isSelected ? 'var(--itsm-primary-700)' : 'var(--itsm-text-secondary)',
                            cursor: 'pointer',
                            fontSize: 'var(--itsm-text-sm)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Panel>

              <Panel title="Ticket Settings">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-3)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={orgSettings.auto_assign_tickets}
                      onChange={(e) => setOrgSettings({ ...orgSettings, auto_assign_tickets: e.target.checked })}
                    />
                    <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Auto-assign tickets based on routing rules</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={orgSettings.require_category}
                      onChange={(e) => setOrgSettings({ ...orgSettings, require_category: e.target.checked })}
                    />
                    <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Require category when creating tickets</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={orgSettings.allow_anonymous_tickets}
                      onChange={(e) => setOrgSettings({ ...orgSettings, allow_anonymous_tickets: e.target.checked })}
                      disabled={!isGlobalAdmin}
                    />
                    <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Allow anonymous ticket submissions</span>
                    {!isGlobalAdmin && <Badge variant="neutral" size="sm">Admin only</Badge>}
                  </label>
                  <div style={{ marginTop: 'var(--itsm-space-2)' }}>
                    <Input
                      label="Max Attachment Size (MB)"
                      type="number"
                      value={orgSettings.max_attachment_size_mb.toString()}
                      onChange={(e) => setOrgSettings({ ...orgSettings, max_attachment_size_mb: parseInt(e.target.value) || 10 })}
                      style={{ maxWidth: 200 }}
                    />
                  </div>
                </div>
              </Panel>

              {isGlobalAdmin && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="primary" onClick={handleSaveOrganization} loading={saving}>
                    Save Organization Settings
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
              <Panel title="Email Notification Triggers">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-3)' }}>
                  {[
                    { key: 'notify_on_ticket_created', label: 'Ticket Created' },
                    { key: 'notify_on_ticket_assigned', label: 'Ticket Assigned' },
                    { key: 'notify_on_ticket_updated', label: 'Ticket Updated' },
                    { key: 'notify_on_ticket_resolved', label: 'Ticket Resolved' },
                    { key: 'notify_on_ticket_closed', label: 'Ticket Closed' },
                    { key: 'notify_on_comment_added', label: 'Comment Added' },
                    { key: 'notify_on_sla_breach', label: 'SLA Breach' },
                    { key: 'notify_on_escalation', label: 'Escalation' },
                  ].map(({ key, label }) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={(notificationSettings as unknown as Record<string, boolean>)[key]}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, [key]: e.target.checked })}
                      />
                      <span style={{ fontSize: 'var(--itsm-text-sm)' }}>{label}</span>
                    </label>
                  ))}
                </div>
              </Panel>

              <Panel title="Email Configuration">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                  <Input
                    label="From Name"
                    value={notificationSettings.email_from_name}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, email_from_name: e.target.value })}
                  />
                  <Input
                    label="From Address"
                    type="email"
                    value={notificationSettings.email_from_address}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, email_from_address: e.target.value })}
                  />
                  <Input
                    label="Reply-To Address"
                    type="email"
                    value={notificationSettings.email_reply_to}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, email_reply_to: e.target.value })}
                  />
                </div>
                <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notificationSettings.include_ticket_details_in_email}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, include_ticket_details_in_email: e.target.checked })}
                    />
                    <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Include ticket details in email notifications</span>
                  </label>
                </div>
              </Panel>

              <Panel title="Digest Settings">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-3)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notificationSettings.send_daily_digest}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, send_daily_digest: e.target.checked })}
                    />
                    <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Send daily digest emails</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notificationSettings.send_weekly_summary}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, send_weekly_summary: e.target.checked })}
                    />
                    <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Send weekly summary emails</span>
                  </label>
                </div>
              </Panel>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" onClick={handleSaveNotifications} loading={saving}>
                  Save Notification Settings
                </Button>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
              <Panel title="Connected Services">
                {integrations.length === 0 ? (
                  <div style={{ padding: 'var(--itsm-space-4)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
                    No integrations configured
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-3)' }}>
                    {integrations.map((integration) => (
                      <div
                        key={integration.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 'var(--itsm-space-3)',
                          border: '1px solid var(--itsm-border-subtle)',
                          borderRadius: 'var(--itsm-radius-md)',
                          backgroundColor: 'var(--itsm-surface-base)',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 'var(--itsm-text-sm)' }}>{integration.name}</div>
                          <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginTop: 2 }}>
                            {(integration.config as { description?: string })?.description || integration.provider}
                          </div>
                          {integration.last_sync_at && (
                            <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginTop: 4 }}>
                              Last sync: {new Date(integration.last_sync_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-3)' }}>
                          <Badge variant={integration.is_enabled ? 'success' : 'neutral'} size="sm">
                            {integration.is_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          {isGlobalAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleIntegration(integration)}
                            >
                              {integration.is_enabled ? 'Disable' : 'Enable'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              {!isGlobalAdmin && (
                <div style={{ padding: 'var(--itsm-space-4)', backgroundColor: 'var(--itsm-warning-50)', borderRadius: 'var(--itsm-radius-md)', fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-warning-700)' }}>
                  Contact a Global Admin to add or configure integrations.
                </div>
              )}
            </div>
          )}

          {/* Security Tab (Global Admin only) */}
          {activeTab === 'security' && isGlobalAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
              <Panel title="Single Sign-On (SSO)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-3)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={securitySettings.sso_enabled}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, sso_enabled: e.target.checked })}
                    />
                    <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Enable SSO Authentication</span>
                    <Badge variant="success" size="sm">Recommended</Badge>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={securitySettings.sso_enforce_for_all}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, sso_enforce_for_all: e.target.checked })}
                    />
                    <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Enforce SSO for all users (disable password login)</span>
                  </label>
                  <div style={{ marginTop: 'var(--itsm-space-2)' }}>
                    <Input
                      label="Allowed Domains (comma-separated)"
                      value={securitySettings.sso_allowed_domains.join(', ')}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, sso_allowed_domains: e.target.value.split(',').map((d) => d.trim()).filter(Boolean) })}
                      hint="Only users from these domains can sign in via SSO"
                    />
                  </div>
                </div>
              </Panel>

              <Panel title="Session Settings">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                  <Input
                    label="Session Timeout (minutes)"
                    type="number"
                    value={securitySettings.session_timeout_minutes.toString()}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, session_timeout_minutes: parseInt(e.target.value) || 480 })}
                  />
                  <Input
                    label="Idle Timeout (minutes)"
                    type="number"
                    value={securitySettings.idle_timeout_minutes.toString()}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, idle_timeout_minutes: parseInt(e.target.value) || 60 })}
                  />
                  <Input
                    label="Max Concurrent Sessions"
                    type="number"
                    value={securitySettings.max_concurrent_sessions.toString()}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, max_concurrent_sessions: parseInt(e.target.value) || 5 })}
                  />
                </div>
              </Panel>

              <Panel title="Multi-Factor Authentication">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-3)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={securitySettings.mfa_enabled}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, mfa_enabled: e.target.checked })}
                    />
                    <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Enable MFA</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={securitySettings.mfa_enforce_for_admins}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, mfa_enforce_for_admins: e.target.checked })}
                    />
                    <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Enforce MFA for administrators</span>
                  </label>
                </div>
              </Panel>

              <Panel title="Audit & Compliance">
                <Input
                  label="Audit Log Retention (days)"
                  type="number"
                  value={securitySettings.audit_log_retention_days.toString()}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, audit_log_retention_days: parseInt(e.target.value) || 365 })}
                  style={{ maxWidth: 200 }}
                  hint="How long to keep audit logs"
                />
              </Panel>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" onClick={handleSaveSecurity} loading={saving}>
                  Save Security Settings
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
