import { useState } from 'react';
import { PageHeader } from '../../layout/PageHeader';
import { Panel, Button, Input, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Badge } from '../../components';
import { useOperatorGroups, OperatorGroup } from '../../hooks/useOperatorGroups';

export function OperatorGroupsPage() {
  const { groups, loading, createGroup, updateGroup, deleteGroup } = useOperatorGroups();

  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OperatorGroup | null>(null);
  const [formData, setFormData] = useState({
    group_key: '',
    name: '',
    description: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormData({ group_key: '', name: '', description: '', is_active: true });
    setEditingGroup(null);
    setShowForm(false);
  };

  const handleEdit = (group: OperatorGroup) => {
    setEditingGroup(group);
    setFormData({
      group_key: group.group_key,
      name: group.name,
      description: group.description ?? '',
      is_active: group.is_active,
    });
    setShowForm(true);
  };

  const ensureQueueSuffix = (key: string): string => {
    const trimmed = key.trim().toLowerCase().replace(/\s+/g, '-');
    return trimmed.endsWith('-queue') ? trimmed : `${trimmed}-queue`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.group_key.trim() || !formData.name.trim()) return;

    setSaving(true);

    const groupKey = ensureQueueSuffix(formData.group_key);

    if (editingGroup) {
      await updateGroup(editingGroup.id, {
        group_key: groupKey,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      });
    } else {
      await createGroup({
        group_key: groupKey,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      });
    }

    setSaving(false);
    resetForm();
  };

  const handleDelete = async (group: OperatorGroup) => {
    if (!confirm(`Delete operator group "${group.name}"?`)) return;
    await deleteGroup(group.id);
  };

  return (
    <div>
      <PageHeader
        title="Operator Groups"
        subtitle="Manage teams and assignment groups"
        breadcrumbs={[
          { label: 'Settings', to: '/settings' },
          { label: 'Operator Groups' },
        ]}
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Add Group
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {/* Form */}
        {showForm && (
          <Panel
            title={editingGroup ? 'Edit Operator Group' : 'New Operator Group'}
            style={{ marginBottom: 'var(--itsm-space-4)' }}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Group Key"
                  value={formData.group_key}
                  onChange={(e) => setFormData({ ...formData, group_key: e.target.value })}
                  placeholder="e.g., it_services"
                  required
                  hint="Unique identifier (lowercase, underscores)"
                />
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., IT Services"
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
                  placeholder="Brief description of this group's responsibilities..."
                  style={{
                    width: '100%',
                    minHeight: 80,
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
                  {editingGroup ? 'Save Changes' : 'Create Group'}
                </Button>
              </div>
            </form>
          </Panel>
        )}

        {/* Table */}
        <Panel noPadding>
          {loading ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              Loading...
            </div>
          ) : groups.length === 0 ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              No operator groups found
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Key</TableHeaderCell>
                  <TableHeaderCell>Description</TableHeaderCell>
                  <TableHeaderCell width={80}>Status</TableHeaderCell>
                  <TableHeaderCell width={120} align="right">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <span style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                        {group.name}
                      </span>
                    </TableCell>
                    <TableCell mono>{group.group_key}</TableCell>
                    <TableCell muted>
                      {group.description ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={group.is_active ? 'success' : 'neutral'}>
                        {group.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-1)' }}>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(group)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void handleDelete(group)}>
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
