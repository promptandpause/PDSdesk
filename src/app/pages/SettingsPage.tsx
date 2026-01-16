import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, PanelSection, Button } from '../components';

interface SettingsLinkProps {
  title: string;
  description: string;
  to: string;
}

function SettingsLink({ title, description, to }: SettingsLinkProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: 'var(--itsm-space-3) var(--itsm-space-4)',
        border: '1px solid var(--itsm-border-subtle)',
        borderRadius: 'var(--itsm-panel-radius)',
        backgroundColor: 'var(--itsm-surface-base)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all var(--itsm-transition-fast)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--itsm-primary-400)';
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--itsm-primary-50)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--itsm-border-subtle)';
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--itsm-surface-base)';
      }}
    >
      <div>
        <div style={{ fontSize: 'var(--itsm-text-sm)', fontWeight: 'var(--itsm-weight-medium)' as any, color: 'var(--itsm-text-primary)' }}>
          {title}
        </div>
        <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginTop: 2 }}>
          {description}
        </div>
      </div>
      <span style={{ color: 'var(--itsm-text-tertiary)', fontSize: 14 }}>→</span>
    </button>
  );
}

export function SettingsPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes('global_admin') || roles.includes('service_desk_admin');

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="System configuration and preferences"
      />

      <div style={{ padding: 'var(--itsm-space-6)', maxWidth: 800 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
          {/* Admin Settings */}
          {isAdmin && (
            <Panel title="Administration">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-3)' }}>
                <SettingsLink
                  title="Operator Groups"
                  description="Manage teams and assignment groups"
                  to="/settings/operator-groups"
                />
                <SettingsLink
                  title="SLA Policies"
                  description="Configure service level agreements"
                  to="/settings/sla-policies"
                />
                <SettingsLink
                  title="Ticket Routing Rules"
                  description="Configure automatic ticket assignment rules"
                  to="/settings/routing-rules"
                />
                <SettingsLink
                  title="Audit Log"
                  description="View system activity and change history"
                  to="/settings/audit-log"
                />
              </div>
            </Panel>
          )}

          <Panel title="General">
            <PanelSection title="Organization" noBorder>
              <div style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-secondary)' }}>
                Configure organization-wide settings and preferences.
              </div>
            </PanelSection>
          </Panel>

          <Panel title="Notifications">
            <PanelSection title="Email Notifications" noBorder>
              <div style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-secondary)' }}>
                Manage email notification preferences for ticket updates.
              </div>
            </PanelSection>
          </Panel>

          <Panel title="Integrations">
            <PanelSection title="Connected Services" noBorder>
              <div style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-secondary)' }}>
                Manage third-party integrations and API connections.
              </div>
            </PanelSection>
          </Panel>

          <Panel title="Security">
            <PanelSection title="Authentication" noBorder>
              <div style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-secondary)' }}>
                Configure SSO, MFA, and other security settings.
              </div>
            </PanelSection>
          </Panel>
        </div>
      </div>
    </div>
  );
}
