import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Badge } from '../components';

interface TicketTemplate {
  id: string;
  user_id: string;
  visibility: 'private' | 'global';
  name: string;
  defaults: Record<string, any>;
  form_schema: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function TicketTemplatesPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user, isGlobalAdmin } = useAuth();

  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TicketTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    visibility: 'private' as 'private' | 'global',
    is_active: true,
    default_title: '',
    default_description: '',
    default_priority: 'medium',
    default_category: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('ticket_templates')
      .select('*')
      .order('name');

    if (!error && data) {
      setTemplates(data as TicketTemplate[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const resetForm = () => {
    setFormData({
      name: '',
      visibility: 'private',
      is_active: true,
      default_title: '',
      default_description: '',
      default_priority: 'medium',
      default_category: '',
    });
    setEditingTemplate(null);
    setShowForm(false);
  };

  const handleEdit = (template: TicketTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      visibility: template.visibility,
      is_active: template.is_active,
      default_title: template.defaults.title ?? '',
      default_description: template.defaults.description ?? '',
      default_priority: template.defaults.priority ?? 'medium',
      default_category: template.defaults.category ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !user) return;

    setSaving(true);

    const payload = {
      name: formData.name.trim(),
      visibility: formData.visibility,
      is_active: formData.is_active,
      defaults: {
        title: formData.default_title.trim() || null,
        description: formData.default_description.trim() || null,
        priority: formData.default_priority,
        category: formData.default_category.trim() || null,
      },
    };

    if (editingTemplate) {
      await supabase.from('ticket_templates').update(payload).eq('id', editingTemplate.id);
    } else {
      await supabase.from('ticket_templates').insert({
        ...payload,
        user_id: user.id,
      });
    }

    setSaving(false);
    resetForm();
    void fetchTemplates();
  };

  const handleDelete = async (template: TicketTemplate) => {
    if (!confirm(`Delete template "${template.name}"?`)) return;
    await supabase.from('ticket_templates').delete().eq('id', template.id);
    void fetchTemplates();
  };

  return (
    <div>
      <PageHeader
        title="Ticket Templates"
        subtitle="Reusable ticket templates for quick creation"
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            New Template
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {showForm && (
          <Panel
            title={editingTemplate ? 'Edit Template' : 'New Template'}
            style={{ marginBottom: 'var(--itsm-space-4)' }}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Template Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Password Reset Request"
                  required
                />
                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                    Visibility
                  </label>
                  <select
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'private' | 'global' })}
                    disabled={!isGlobalAdmin && formData.visibility === 'global'}
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
                    <option value="private">Private (only me)</option>
                    <option value="global">Global (all agents)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                <Input
                  label="Default Title"
                  value={formData.default_title}
                  onChange={(e) => setFormData({ ...formData, default_title: e.target.value })}
                  placeholder="Pre-filled ticket title"
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                  Default Description
                </label>
                <textarea
                  value={formData.default_description}
                  onChange={(e) => setFormData({ ...formData, default_description: e.target.value })}
                  placeholder="Pre-filled ticket description..."
                  style={{
                    width: '100%',
                    minHeight: 100,
                    padding: 'var(--itsm-space-3)',
                    fontSize: 'var(--itsm-text-sm)',
                    border: '1px solid var(--itsm-border-default)',
                    borderRadius: 'var(--itsm-input-radius)',
                    resize: 'vertical',
                    backgroundColor: 'var(--itsm-surface-base)',
                  }}
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                    Default Priority
                  </label>
                  <select
                    value={formData.default_priority}
                    onChange={(e) => setFormData({ ...formData, default_priority: e.target.value })}
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
                  label="Default Category"
                  value={formData.default_category}
                  onChange={(e) => setFormData({ ...formData, default_category: e.target.value })}
                  placeholder="e.g., IT Services"
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Active</span>
                </label>
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-2)' }}>
                <Button variant="ghost" type="button" onClick={resetForm}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={saving} disabled={saving}>
                  {editingTemplate ? 'Save Changes' : 'Create Template'}
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
          ) : templates.length === 0 ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              No templates found. Create your first template to get started.
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell width={100}>Visibility</TableHeaderCell>
                  <TableHeaderCell width={80}>Status</TableHeaderCell>
                  <TableHeaderCell width={120} align="right">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                        {template.name}
                      </div>
                      {template.defaults.title && (
                        <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginTop: 2 }}>
                          Title: {template.defaults.title}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.visibility === 'global' ? 'info' : 'neutral'}>
                        {template.visibility === 'global' ? 'Global' : 'Private'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? 'success' : 'neutral'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-1)' }}>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                          Edit
                        </Button>
                        {(template.user_id === user?.id || isGlobalAdmin) && (
                          <Button variant="ghost" size="sm" onClick={() => void handleDelete(template)}>
                            Delete
                          </Button>
                        )}
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
