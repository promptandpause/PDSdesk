import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { PageHeader } from '../../layout/PageHeader';
import { Panel, PanelSection, Button, Input, Badge } from '../../components';

interface SystemSetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export function SystemSettingsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [settings, setSettings] = useState<Record<string, string>>({
    session_timeout_minutes: '480',
    max_attachment_size_mb: '25',
    default_ticket_priority: 'medium',
    auto_close_resolved_days: '7',
    enable_customer_portal: 'true',
    enable_email_notifications: 'true',
    enable_sla_breach_alerts: 'true',
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    working_days: 'mon,tue,wed,thu,fri',
    timezone: 'UTC',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('system_settings')
      .select('*');

    if (!error && data) {
      const settingsMap: Record<string, string> = { ...settings };
      (data as SystemSetting[]).forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      setSettings(settingsMap);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);

    const upserts = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('system_settings')
      .upsert(upserts, { onConflict: 'key' });

    if (error) {
      alert('Error saving settings: ' + error.message);
    } else {
      alert('Settings saved successfully!');
    }

    setSaving(false);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="System Settings" subtitle="General ITSM configuration" />
        <div style={{ padding: 'var(--itsm-space-6)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="System Settings"
        subtitle="General ITSM configuration"
        breadcrumbs={[
          { label: 'Settings', to: '/settings' },
          { label: 'System Settings' },
        ]}
        actions={
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Save All Settings
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)', maxWidth: 900 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
          {/* Session & Security */}
          <Panel title="Session & Security">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
              <Input
                label="Session Timeout (minutes)"
                type="number"
                value={settings.session_timeout_minutes}
                onChange={(e) => updateSetting('session_timeout_minutes', e.target.value)}
                hint="Inactive sessions will expire after this duration"
              />
              <Input
                label="Max Attachment Size (MB)"
                type="number"
                value={settings.max_attachment_size_mb}
                onChange={(e) => updateSetting('max_attachment_size_mb', e.target.value)}
                hint="Maximum file size for ticket attachments"
              />
            </div>
          </Panel>

          {/* Ticket Defaults */}
          <Panel title="Ticket Defaults">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
              <div>
                <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                  Default Priority
                </label>
                <select
                  value={settings.default_ticket_priority}
                  onChange={(e) => updateSetting('default_ticket_priority', e.target.value)}
                  style={{
                    width: '100%',
                    height: 32,
                    padding: '0 var(--itsm-space-3)',
                    fontSize: 'var(--itsm-text-sm)',
                    border: '1px solid var(--itsm-border-default)',
                    borderRadius: 'var(--itsm-input-radius)',
                    backgroundColor: 'var(--itsm-surface-base)',
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <Input
                label="Auto-Close Resolved Tickets (days)"
                type="number"
                value={settings.auto_close_resolved_days}
                onChange={(e) => updateSetting('auto_close_resolved_days', e.target.value)}
                hint="Resolved tickets will auto-close after this many days"
              />
            </div>
          </Panel>

          {/* Working Hours */}
          <Panel title="Working Hours & SLA">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--itsm-space-4)' }}>
              <Input
                label="Working Hours Start"
                type="time"
                value={settings.working_hours_start}
                onChange={(e) => updateSetting('working_hours_start', e.target.value)}
              />
              <Input
                label="Working Hours End"
                type="time"
                value={settings.working_hours_end}
                onChange={(e) => updateSetting('working_hours_end', e.target.value)}
              />
              <div>
                <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                  Timezone
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => updateSetting('timezone', e.target.value)}
                  style={{
                    width: '100%',
                    height: 32,
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
                  <option value="Asia/Tokyo">Tokyo</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 'var(--itsm-space-4)' }}>
              <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                Working Days
              </label>
              <div style={{ display: 'flex', gap: 'var(--itsm-space-2)', flexWrap: 'wrap' }}>
                {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                  const isSelected = settings.working_days.split(',').includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const days = settings.working_days.split(',').filter(Boolean);
                        if (isSelected) {
                          updateSetting('working_days', days.filter((d) => d !== day).join(','));
                        } else {
                          updateSetting('working_days', [...days, day].join(','));
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
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </Panel>

          {/* Features */}
          <Panel title="Features & Notifications">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-3)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.enable_customer_portal === 'true'}
                  onChange={(e) => updateSetting('enable_customer_portal', e.target.checked ? 'true' : 'false')}
                />
                <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Enable Customer Portal</span>
                <Badge variant="info" size="sm">Self-service</Badge>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.enable_email_notifications === 'true'}
                  onChange={(e) => updateSetting('enable_email_notifications', e.target.checked ? 'true' : 'false')}
                />
                <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Enable Email Notifications</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.enable_sla_breach_alerts === 'true'}
                  onChange={(e) => updateSetting('enable_sla_breach_alerts', e.target.checked ? 'true' : 'false')}
                />
                <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Enable SLA Breach Alerts</span>
                <Badge variant="warning" size="sm">Recommended</Badge>
              </label>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
