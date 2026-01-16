import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { PageHeader } from '../../layout/PageHeader';
import { Panel, Button, Input, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Badge } from '../../components';
import { useOperatorGroups } from '../../hooks/useOperatorGroups';

interface RoutingRule {
  id: string;
  rule_key: string;
  is_active: boolean;
  priority: number;
  match_mailbox: string | null;
  match_ticket_type: string | null;
  match_category: string | null;
  assignment_group_id: string | null;
  created_at: string;
}

export function RoutingRulesPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { groups } = useOperatorGroups();

  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [formData, setFormData] = useState({
    rule_key: '',
    is_active: true,
    priority: 100,
    match_mailbox: '',
    match_ticket_type: '',
    match_category: '',
    assignment_group_id: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ticket_routing_rules')
      .select('*')
      .order('priority');

    if (!error && data) {
      setRules(data as RoutingRule[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchRules();
  }, [fetchRules]);

  const resetForm = () => {
    setFormData({
      rule_key: '',
      is_active: true,
      priority: 100,
      match_mailbox: '',
      match_ticket_type: '',
      match_category: '',
      assignment_group_id: '',
    });
    setEditingRule(null);
    setShowForm(false);
  };

  const handleEdit = (rule: RoutingRule) => {
    setEditingRule(rule);
    setFormData({
      rule_key: rule.rule_key,
      is_active: rule.is_active,
      priority: rule.priority,
      match_mailbox: rule.match_mailbox ?? '',
      match_ticket_type: rule.match_ticket_type ?? '',
      match_category: rule.match_category ?? '',
      assignment_group_id: rule.assignment_group_id ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.rule_key.trim()) return;

    setSaving(true);

    const payload = {
      rule_key: formData.rule_key.trim(),
      is_active: formData.is_active,
      priority: formData.priority,
      match_mailbox: formData.match_mailbox.trim() || null,
      match_ticket_type: formData.match_ticket_type.trim() || null,
      match_category: formData.match_category.trim() || null,
      assignment_group_id: formData.assignment_group_id || null,
    };

    if (editingRule) {
      await supabase
        .from('ticket_routing_rules')
        .update(payload)
        .eq('id', editingRule.id);
    } else {
      await supabase.from('ticket_routing_rules').insert(payload);
    }

    setSaving(false);
    resetForm();
    void fetchRules();
  };

  const handleDelete = async (rule: RoutingRule) => {
    if (!confirm(`Delete routing rule "${rule.rule_key}"?`)) return;
    await supabase.from('ticket_routing_rules').delete().eq('id', rule.id);
    void fetchRules();
  };

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return '—';
    const group = groups.find((g) => g.id === groupId);
    return group?.name ?? groupId.slice(0, 8);
  };

  return (
    <div>
      <PageHeader
        title="Ticket Routing Rules"
        subtitle="Configure automatic ticket assignment rules"
        breadcrumbs={[
          { label: 'Settings', to: '/settings' },
          { label: 'Routing Rules' },
        ]}
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Add Rule
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {showForm && (
          <Panel
            title={editingRule ? 'Edit Routing Rule' : 'New Routing Rule'}
            style={{ marginBottom: 'var(--itsm-space-4)' }}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Rule Key"
                  value={formData.rule_key}
                  onChange={(e) => setFormData({ ...formData, rule_key: e.target.value })}
                  placeholder="e.g., customer_service_email"
                  required
                />
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

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Match Mailbox"
                  value={formData.match_mailbox}
                  onChange={(e) => setFormData({ ...formData, match_mailbox: e.target.value })}
                  placeholder="e.g., support@example.com"
                  hint="Leave empty to match all"
                />
                <Input
                  label="Match Ticket Type"
                  value={formData.match_ticket_type}
                  onChange={(e) => setFormData({ ...formData, match_ticket_type: e.target.value })}
                  placeholder="e.g., customer_service"
                  hint="Leave empty to match all"
                />
                <Input
                  label="Match Category"
                  value={formData.match_category}
                  onChange={(e) => setFormData({ ...formData, match_category: e.target.value })}
                  placeholder="e.g., billing"
                  hint="Leave empty to match all"
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                  Assign to Group
                </label>
                <select
                  value={formData.assignment_group_id}
                  onChange={(e) => setFormData({ ...formData, assignment_group_id: e.target.value })}
                  style={{
                    width: '100%',
                    height: 32,
                    padding: '0 var(--itsm-space-3)',
                    fontSize: 'var(--itsm-text-sm)',
                    border: '1px solid var(--itsm-border-default)',
                    borderRadius: 'var(--itsm-input-radius)',
                    backgroundColor: 'var(--itsm-surface-base)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">— Select Group —</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
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
                  {editingRule ? 'Save Changes' : 'Create Rule'}
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
          ) : rules.length === 0 ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              No routing rules found
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell width={60}>Priority</TableHeaderCell>
                  <TableHeaderCell>Rule Key</TableHeaderCell>
                  <TableHeaderCell>Matches</TableHeaderCell>
                  <TableHeaderCell>Assign To</TableHeaderCell>
                  <TableHeaderCell width={80}>Status</TableHeaderCell>
                  <TableHeaderCell width={120} align="right">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.priority}</TableCell>
                    <TableCell mono>{rule.rule_key}</TableCell>
                    <TableCell muted>
                      {[
                        rule.match_mailbox && `mailbox: ${rule.match_mailbox}`,
                        rule.match_ticket_type && `type: ${rule.match_ticket_type}`,
                        rule.match_category && `category: ${rule.match_category}`,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'All tickets'}
                    </TableCell>
                    <TableCell>{getGroupName(rule.assignment_group_id)}</TableCell>
                    <TableCell>
                      <Badge variant={rule.is_active ? 'success' : 'neutral'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-1)' }}>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void handleDelete(rule)}>
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
