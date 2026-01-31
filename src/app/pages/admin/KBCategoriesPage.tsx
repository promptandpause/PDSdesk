import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { PageHeader } from '../../layout/PageHeader';
import { Panel, Button, Input, Badge } from '../../components';
import { PlusIcon, PencilIcon, TrashIcon } from '../../components/Icons';

interface KBCategory {
  id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AVAILABLE_ICONS = [
  { name: 'RocketIcon', label: 'Rocket (Onboarding)' },
  { name: 'WrenchIcon', label: 'Wrench (IT Support)' },
  { name: 'BookOpenIcon', label: 'Book (Guides)' },
  { name: 'HelpCircleIcon', label: 'Help Circle (FAQ)' },
  { name: 'ScrollTextIcon', label: 'Scroll (Policies)' },
  { name: 'ShieldIcon', label: 'Shield (Security)' },
  { name: 'UserIcon', label: 'User (HR)' },
  { name: 'LaptopIcon', label: 'Laptop (Software)' },
  { name: 'FileTextIcon', label: 'File (General)' },
];

export function KBCategoriesPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { roles } = useAuth();

  const isAdmin = roles.includes('global_admin') || roles.includes('service_desk_admin');

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<KBCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon_name: 'FileTextIcon',
    display_order: 0,
    is_active: true,
  });

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kb_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setCategories(data as KBCategory[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchCategories();
  }, [supabase]);

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      icon_name: 'FileTextIcon',
      display_order: categories.length + 1,
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (category: KBCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon_name: category.icon_name || 'FileTextIcon',
      display_order: category.display_order,
      is_active: category.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (category: KBCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This cannot be undone.`)) {
      return;
    }

    const { error } = await supabase
      .from('kb_categories')
      .delete()
      .eq('id', category.id);

    if (error) {
      alert('Error deleting category: ' + error.message);
    } else {
      void fetchCategories();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      icon_name: formData.icon_name,
      display_order: formData.display_order,
      is_active: formData.is_active,
    };

    if (editingCategory) {
      const { error } = await supabase
        .from('kb_categories')
        .update(payload)
        .eq('id', editingCategory.id);

      if (error) {
        alert('Error updating category: ' + error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('kb_categories')
        .insert(payload);

      if (error) {
        alert('Error creating category: ' + error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setShowModal(false);
    void fetchCategories();
  };

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Access Denied" />
        <div style={{ padding: 'var(--itsm-space-6)' }}>
          <Panel>
            <p style={{ color: 'var(--itsm-text-tertiary)' }}>
              You do not have permission to manage KB categories.
            </p>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="KB Categories"
        subtitle="Manage knowledge base categories"
        breadcrumbs={[
          { label: 'Settings', to: '/settings' },
          { label: 'KB Categories' },
        ]}
        actions={
          <Button variant="primary" onClick={handleAdd}>
            <PlusIcon size={14} /> Add Category
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        <Panel noPadding>
          {loading ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              Loading...
            </div>
          ) : categories.length === 0 ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              No categories found. Click "Add Category" to create one.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--itsm-border-default)' }}>
                  <th style={{ padding: 'var(--itsm-space-3) var(--itsm-space-4)', textAlign: 'left', fontSize: 'var(--itsm-text-xs)', fontWeight: 500, color: 'var(--itsm-text-tertiary)', textTransform: 'uppercase' }}>Order</th>
                  <th style={{ padding: 'var(--itsm-space-3) var(--itsm-space-4)', textAlign: 'left', fontSize: 'var(--itsm-text-xs)', fontWeight: 500, color: 'var(--itsm-text-tertiary)', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: 'var(--itsm-space-3) var(--itsm-space-4)', textAlign: 'left', fontSize: 'var(--itsm-text-xs)', fontWeight: 500, color: 'var(--itsm-text-tertiary)', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: 'var(--itsm-space-3) var(--itsm-space-4)', textAlign: 'left', fontSize: 'var(--itsm-text-xs)', fontWeight: 500, color: 'var(--itsm-text-tertiary)', textTransform: 'uppercase' }}>Icon</th>
                  <th style={{ padding: 'var(--itsm-space-3) var(--itsm-space-4)', textAlign: 'left', fontSize: 'var(--itsm-text-xs)', fontWeight: 500, color: 'var(--itsm-text-tertiary)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: 'var(--itsm-space-3) var(--itsm-space-4)', textAlign: 'right', fontSize: 'var(--itsm-text-xs)', fontWeight: 500, color: 'var(--itsm-text-tertiary)', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} style={{ borderBottom: '1px solid var(--itsm-border-subtle)' }}>
                    <td style={{ padding: 'var(--itsm-space-3) var(--itsm-space-4)', fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-tertiary)' }}>
                      {category.display_order}
                    </td>
                    <td style={{ padding: 'var(--itsm-space-3) var(--itsm-space-4)', fontSize: 'var(--itsm-text-sm)', fontWeight: 500 }}>
                      {category.name}
                    </td>
                    <td style={{ padding: 'var(--itsm-space-3) var(--itsm-space-4)', fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-tertiary)' }}>
                      {category.description || '—'}
                    </td>
                    <td style={{ padding: 'var(--itsm-space-3) var(--itsm-space-4)', fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-tertiary)' }}>
                      {category.icon_name || 'FileTextIcon'}
                    </td>
                    <td style={{ padding: 'var(--itsm-space-3) var(--itsm-space-4)' }}>
                      <Badge variant={category.is_active ? 'success' : 'neutral'}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td style={{ padding: 'var(--itsm-space-3) var(--itsm-space-4)', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 'var(--itsm-space-2)', justifyContent: 'flex-end' }}>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
                          <PencilIcon size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(category)}>
                          <TrashIcon size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--itsm-surface-base)',
              borderRadius: 'var(--itsm-panel-radius)',
              padding: 'var(--itsm-space-6)',
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 'var(--itsm-text-lg)', fontWeight: 600, marginBottom: 'var(--itsm-space-4)' }}>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., IT Support"
                  required
                />

                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-1)' }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this category"
                    style={{
                      width: '100%',
                      minHeight: 80,
                      padding: 'var(--itsm-space-2)',
                      fontSize: 'var(--itsm-text-sm)',
                      border: '1px solid var(--itsm-border-default)',
                      borderRadius: 'var(--itsm-input-radius)',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-1)' }}>
                    Icon
                  </label>
                  <select
                    value={formData.icon_name}
                    onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
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
                    {AVAILABLE_ICONS.map((icon) => (
                      <option key={icon.name} value={icon.name}>
                        {icon.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Display Order"
                  type="number"
                  value={formData.display_order.toString()}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  min={0}
                />

                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Active</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 'var(--itsm-space-3)', justifyContent: 'flex-end', marginTop: 'var(--itsm-space-6)' }}>
                <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={saving} disabled={saving}>
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
