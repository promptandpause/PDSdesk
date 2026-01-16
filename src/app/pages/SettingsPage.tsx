import { PageHeader } from '../layout/PageHeader';
import { Panel, PanelSection } from '../components';

export function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="System configuration and preferences"
      />

      <div style={{ padding: 'var(--itsm-space-6)', maxWidth: 800 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
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
