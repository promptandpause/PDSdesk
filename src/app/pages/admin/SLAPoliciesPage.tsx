import { useState } from 'react';
import { PageHeader } from '../../layout/PageHeader';
import { Panel, Button, Input, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Badge } from '../../components';
import { useSLAPolicies, SLAPolicy } from '../../hooks/useSLA';

export function SLAPoliciesPage() {
  const { policies, loading, createPolicy, updatePolicy, deletePolicy } = useSLAPolicies();

  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SLAPolicy | null>(null);
  const [formData, setFormData] = useState({
    policy_key: '',
    name: '',
    description: '',
    priority: 100,
    match_ticket_type: '',
    match_priority: '',
    match_category: '',
    first_response_minutes: 120,
    resolution_minutes: 1440,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormData({
      policy_key: '',
      name: '',
      description: '',
      priority: 100,
      match_ticket_type: '',
      match_priority: '',
      match_category: '',
      first_response_minutes: 120,
      resolution_minutes: 1440,
      is_active: true,
    });
    setEditingPolicy(null);
    setShowForm(false);
  };

  const handleEdit = (policy: SLAPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      policy_key: policy.policy_key,
      name: policy.name,
      description: policy.description ?? '',
      priority: policy.priority,
      match_ticket_type: policy.match_ticket_type ?? '',
      match_priority: policy.match_priority ?? '',
      match_category: policy.match_category ?? '',
      first_response_minutes: policy.first_response_minutes ?? 120,
      resolution_minutes: policy.resolution_minutes ?? 1440,
      is_active: policy.is_active,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.policy_key.trim() || !formData.name.trim()) return;

    setSaving(true);

    const payload = {
      policy_key: formData.policy_key.trim(),
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      priority: formData.priority,
      match_ticket_type: formData.match_ticket_type.trim() || null,
      match_priority: formData.match_priority.trim() || null,
      match_category: formData.match_category.trim() || null,
      first_response_minutes: formData.first_response_minutes,
      resolution_minutes: formData.resolution_minutes,
      is_active: formData.is_active,
    };

    if (editingPolicy) {
      await updatePolicy(editingPolicy.id, payload);
    } else {
      await createPolicy(payload);
    }

    setSaving(false);
    resetForm();
  };

  const handleDelete = async (policy: SLAPolicy) => {
    if (!confirm(`Delete SLA policy "${policy.name}"?`)) return;
    await deletePolicy(policy.id);
  };

  const formatMinutes = (minutes: number | null) => {
    if (minutes == null) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) return `${days}d ${remainingHours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div>
      <PageHeader
        title="SLA Policies"
        subtitle="Configure service level agreements"
        breadcrumbs={[
          { label: 'Settings', to: '/settings' },
          { label: 'SLA Policies' },
        ]}
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Add Policy
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {showForm && (
          <Panel
            title={editingPolicy ? 'Edit SLA Policy' : 'New SLA Policy'}
            style={{ marginBottom: 'var(--itsm-space-4)' }}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Policy Key"
                  value={formData.policy_key}
                  onChange={(e) => setFormData({ ...formData, policy_key: e.target.value })}
                  placeholder="e.g., default_itsm"
                  required
                />
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Default IT SLA"
                  required
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description of this SLA policy..."
                  style={{
                    width: '100%',
                    minHeight: 60,
                    padding: 'var(--itsm-space-3)',
                    fontSize: 'var(--itsm-text-sm)',
                    fontFamily: 'inherit',
                    border: '1px solid var(--itsm-border-default)',
                    borderRadius: 'var(--itsm-input-radius)',
                    resize: 'vertical',
                    backgroundColor: 'var(--itsm-surface-base)',
                  }}
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Match Ticket Type"
                  value={formData.match_ticket_type}
                  onChange={(e) => setFormData({ ...formData, match_ticket_type: e.target.value })}
                  placeholder="e.g., itsm_incident"
                  hint="Leave empty to match all"
                />
                <Input
                  label="Match Priority"
                  value={formData.match_priority}
                  onChange={(e) => setFormData({ ...formData, match_priority: e.target.value })}
                  placeholder="e.g., high"
                  hint="Leave empty to match all"
                />
                <Input
                  label="Match Category"
                  value={formData.match_category}
                  onChange={(e) => setFormData({ ...formData, match_category: e.target.value })}
                  placeholder="e.g., network"
                  hint="Leave empty to match all"
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                    First Response (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.first_response_minutes}
                    onChange={(e) => setFormData({ ...formData, first_response_minutes: parseInt(e.target.value) || 0 })}
                    min={0}
                    style={{
                      width: '100%',
                      height: 32,
                      padding: '0 var(--itsm-space-3)',
                      fontSize: 'var(--itsm-text-sm)',
                      border: '1px solid var(--itsm-border-default)',
                      borderRadius: 'var(--itsm-input-radius)',
                      backgroundColor: 'var(--itsm-surface-base)',
                    }}
                  />
                </div>
                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                    Resolution (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.resolution_minutes}
                    onChange={(e) => setFormData({ ...formData, resolution_minutes: parseInt(e.target.value) || 0 })}
                    min={0}
                    style={{
                      width: '100%',
                      height: 32,
                      padding: '0 var(--itsm-space-3)',
                      fontSize: 'var(--itsm-text-sm)',
                      border: '1px solid var(--itsm-border-default)',
                      borderRadius: 'var(--itsm-input-radius)',
                      backgroundColor: 'var(--itsm-surface-base)',
                    }}
                  />
                </div>
                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                    Priority (lower = higher)
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })}
                    min={1}
                    style={{
                      width: '100%',
                      height: 32,
                      padding: '0 var(--itsm-space-3)',
                      fontSize: 'var(--itsm-text-sm)',
                      border: '1px solid var(--itsm-border-default)',
                      borderRadius: 'var(--itsm-input-radius)',
                      backgroundColor: 'var(--itsm-surface-base)',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-primary)' }}>
                    Active
                  </span>
                </label>
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-2)' }}>
                <Button variant="ghost" type="button" onClick={resetForm}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={saving} disabled={saving}>
                  {editingPolicy ? 'Save Changes' : 'Create Policy'}
                </Button>
              </div>
            </form>
          </Panel>
        )}

        <Panel noPadding>
          {loading ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              Loading...
            </div>
          ) : policies.length === 0 ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              No SLA policies found
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell width={100}>Response</TableHeaderCell>
                  <TableHeaderCell width={100}>Resolution</TableHeaderCell>
                  <TableHeaderCell width={120}>Matches</TableHeaderCell>
                  <TableHeaderCell width={80}>Status</TableHeaderCell>
                  <TableHeaderCell width={120} align="right">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell>
                      <div>
                        <span style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                          {policy.name}
                        </span>
                        <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                          {policy.policy_key}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatMinutes(policy.first_response_minutes)}</TableCell>
                    <TableCell>{formatMinutes(policy.resolution_minutes)}</TableCell>
                    <TableCell muted>
                      {[policy.match_ticket_type, policy.match_priority, policy.match_category]
                        .filter(Boolean)
                        .join(', ') || 'All'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={policy.is_active ? 'success' : 'neutral'}>
                        {policy.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-1)' }}>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(policy)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void handleDelete(policy)}>
                          Delete
                        </Button>
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
