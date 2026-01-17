import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { PageHeader } from '../../layout/PageHeader';
import { Panel, Button, Input, Badge, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../../components';

interface ServiceCatalogCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  display_order: number;
  is_active: boolean;
}

interface ServiceCatalogItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  icon: string;
  estimated_time: string | null;
  requires_approval: boolean;
  default_priority: string;
  form_schema: unknown[];
  is_active: boolean;
  display_order: number;
}

interface Department {
  id: string;
  name: string;
  is_active: boolean;
  synced_from_azure: boolean;
}

type AdminTab = 'categories' | 'items' | 'departments';

export function ServiceCatalogAdminPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { roles } = useAuth();
  const isGlobalAdmin = roles.includes('global_admin');

  const [activeTab, setActiveTab] = useState<AdminTab>('categories');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ServiceCatalogCategory[]>([]);
  const [items, setItems] = useState<ServiceCatalogItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Edit states
  const [editingCategory, setEditingCategory] = useState<ServiceCatalogCategory | null>(null);
  const [editingItem, setEditingItem] = useState<ServiceCatalogItem | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [catRes, itemRes, deptRes] = await Promise.all([
      supabase.from('service_catalog_categories').select('*').order('display_order'),
      supabase.from('service_catalog_items').select('*').order('display_order'),
      supabase.from('departments').select('*').order('name'),
    ]);

    if (catRes.data) setCategories(catRes.data as ServiceCatalogCategory[]);
    if (itemRes.data) setItems(itemRes.data as ServiceCatalogItem[]);
    if (deptRes.data) setDepartments(deptRes.data as Department[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSyncDepartments = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.rpc('sync_departments_from_directory');
      if (error) {
        alert('Error syncing departments: ' + error.message);
      } else {
        alert(`Synced ${data?.synced_count || 0} departments from Azure AD`);
        void fetchData();
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    setSyncing(false);
  };

  const handleToggleCategoryActive = async (category: ServiceCatalogCategory) => {
    const { error } = await supabase
      .from('service_catalog_categories')
      .update({ is_active: !category.is_active })
      .eq('id', category.id);

    if (error) {
      alert('Error updating category: ' + error.message);
    } else {
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, is_active: !c.is_active } : c))
      );
    }
  };

  const handleToggleItemActive = async (item: ServiceCatalogItem) => {
    const { error } = await supabase
      .from('service_catalog_items')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);

    if (error) {
      alert('Error updating item: ' + error.message);
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_active: !i.is_active } : i))
      );
    }
  };

  const handleSaveCategory = async () => {
    if (!editingCategory) return;
    setSaving(true);

    if (editingCategory.id) {
      const { error } = await supabase
        .from('service_catalog_categories')
        .update({
          name: editingCategory.name,
          description: editingCategory.description,
          icon: editingCategory.icon,
          color: editingCategory.color,
          display_order: editingCategory.display_order,
        })
        .eq('id', editingCategory.id);

      if (error) {
        alert('Error saving category: ' + error.message);
      } else {
        setEditingCategory(null);
        void fetchData();
      }
    } else {
      const { error } = await supabase
        .from('service_catalog_categories')
        .insert({
          name: editingCategory.name,
          description: editingCategory.description,
          icon: editingCategory.icon,
          color: editingCategory.color,
          display_order: editingCategory.display_order,
        });

      if (error) {
        alert('Error creating category: ' + error.message);
      } else {
        setEditingCategory(null);
        void fetchData();
      }
    }

    setSaving(false);
  };

  const handleSaveItem = async () => {
    if (!editingItem) return;
    setSaving(true);

    if (editingItem.id) {
      const { error } = await supabase
        .from('service_catalog_items')
        .update({
          category_id: editingItem.category_id,
          name: editingItem.name,
          description: editingItem.description,
          icon: editingItem.icon,
          estimated_time: editingItem.estimated_time,
          requires_approval: editingItem.requires_approval,
          default_priority: editingItem.default_priority,
          display_order: editingItem.display_order,
        })
        .eq('id', editingItem.id);

      if (error) {
        alert('Error saving item: ' + error.message);
      } else {
        setEditingItem(null);
        void fetchData();
      }
    } else {
      const { error } = await supabase
        .from('service_catalog_items')
        .insert({
          category_id: editingItem.category_id,
          name: editingItem.name,
          description: editingItem.description,
          icon: editingItem.icon,
          estimated_time: editingItem.estimated_time,
          requires_approval: editingItem.requires_approval,
          default_priority: editingItem.default_priority,
          display_order: editingItem.display_order,
          form_schema: [],
        });

      if (error) {
        alert('Error creating item: ' + error.message);
      } else {
        setEditingItem(null);
        void fetchData();
      }
    }

    setSaving(false);
  };

  if (!isGlobalAdmin) {
    return (
      <div>
        <PageHeader title="Service Catalog Admin" subtitle="Manage service catalog" />
        <div style={{ padding: 'var(--itsm-space-6)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
          You do not have permission to access this page.
        </div>
      </div>
    );
  }

  // Edit Category Modal
  if (editingCategory) {
    return (
      <div>
        <PageHeader
          title={editingCategory.id ? 'Edit Category' : 'New Category'}
          breadcrumbs={[
            { label: 'Settings', to: '/settings' },
            { label: 'Service Catalog', to: '/settings/service-catalog' },
            { label: editingCategory.id ? 'Edit Category' : 'New Category' },
          ]}
        />
        <div style={{ padding: 'var(--itsm-space-6)', maxWidth: 600 }}>
          <Panel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
              <Input
                label="Name"
                value={editingCategory.name}
                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                required
              />
              <Input
                label="Description"
                value={editingCategory.description || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Icon (emoji)"
                  value={editingCategory.icon}
                  onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                />
                <Input
                  label="Color (hex)"
                  type="color"
                  value={editingCategory.color}
                  onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                />
              </div>
              <Input
                label="Display Order"
                type="number"
                value={editingCategory.display_order.toString()}
                onChange={(e) => setEditingCategory({ ...editingCategory, display_order: parseInt(e.target.value) || 0 })}
              />
              <div style={{ display: 'flex', gap: 'var(--itsm-space-3)', marginTop: 'var(--itsm-space-4)' }}>
                <Button variant="ghost" onClick={() => setEditingCategory(null)}>Cancel</Button>
                <Button variant="primary" onClick={handleSaveCategory} loading={saving}>Save Category</Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  // Edit Item Modal
  if (editingItem) {
    return (
      <div>
        <PageHeader
          title={editingItem.id ? 'Edit Service Item' : 'New Service Item'}
          breadcrumbs={[
            { label: 'Settings', to: '/settings' },
            { label: 'Service Catalog', to: '/settings/service-catalog' },
            { label: editingItem.id ? 'Edit Item' : 'New Item' },
          ]}
        />
        <div style={{ padding: 'var(--itsm-space-6)', maxWidth: 600 }}>
          <Panel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--itsm-space-1)', fontSize: 'var(--itsm-text-sm)', fontWeight: 500 }}>
                  Category *
                </label>
                <select
                  value={editingItem.category_id}
                  onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value })}
                  style={{
                    width: '100%',
                    height: 36,
                    padding: '0 var(--itsm-space-3)',
                    fontSize: 'var(--itsm-text-sm)',
                    border: '1px solid var(--itsm-border-default)',
                    borderRadius: 'var(--itsm-input-radius)',
                  }}
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Name"
                value={editingItem.name}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                required
              />
              <Input
                label="Description"
                value={editingItem.description || ''}
                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Icon (emoji)"
                  value={editingItem.icon}
                  onChange={(e) => setEditingItem({ ...editingItem, icon: e.target.value })}
                />
                <Input
                  label="Estimated Time"
                  value={editingItem.estimated_time || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, estimated_time: e.target.value })}
                  placeholder="e.g., 1-2 business days"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--itsm-space-1)', fontSize: 'var(--itsm-text-sm)', fontWeight: 500 }}>
                    Default Priority
                  </label>
                  <select
                    value={editingItem.default_priority}
                    onChange={(e) => setEditingItem({ ...editingItem, default_priority: e.target.value })}
                    style={{
                      width: '100%',
                      height: 36,
                      padding: '0 var(--itsm-space-3)',
                      fontSize: 'var(--itsm-text-sm)',
                      border: '1px solid var(--itsm-border-default)',
                      borderRadius: 'var(--itsm-input-radius)',
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <Input
                  label="Display Order"
                  type="number"
                  value={editingItem.display_order.toString()}
                  onChange={(e) => setEditingItem({ ...editingItem, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={editingItem.requires_approval}
                  onChange={(e) => setEditingItem({ ...editingItem, requires_approval: e.target.checked })}
                />
                <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Requires approval before processing</span>
              </label>
              <div style={{ display: 'flex', gap: 'var(--itsm-space-3)', marginTop: 'var(--itsm-space-4)' }}>
                <Button variant="ghost" onClick={() => setEditingItem(null)}>Cancel</Button>
                <Button variant="primary" onClick={handleSaveItem} loading={saving}>Save Item</Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Service Catalog Admin"
        subtitle="Manage categories, service items, and departments"
        breadcrumbs={[
          { label: 'Settings', to: '/settings' },
          { label: 'Service Catalog' },
        ]}
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--itsm-space-2)', marginBottom: 'var(--itsm-space-4)', borderBottom: '1px solid var(--itsm-border-subtle)', paddingBottom: 'var(--itsm-space-2)' }}>
          {[
            { key: 'categories', label: 'Categories' },
            { key: 'items', label: 'Service Items' },
            { key: 'departments', label: 'Departments' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as AdminTab)}
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
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--itsm-space-8)', color: 'var(--itsm-text-tertiary)' }}>
            Loading...
          </div>
        ) : (
          <>
            {/* Categories Tab */}
            {activeTab === 'categories' && (
              <Panel
                title="Categories"
                actions={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setEditingCategory({
                      id: '',
                      name: '',
                      description: '',
                      icon: '📋',
                      color: '#6366f1',
                      display_order: categories.length + 1,
                      is_active: true,
                    })}
                  >
                    Add Category
                  </Button>
                }
                noPadding
              >
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell width={60}>Icon</TableHeaderCell>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Description</TableHeaderCell>
                      <TableHeaderCell width={80}>Order</TableHeaderCell>
                      <TableHeaderCell width={100}>Status</TableHeaderCell>
                      <TableHeaderCell width={150}>Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {categories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell>
                          <span style={{ fontSize: 24 }}>{cat.icon}</span>
                        </TableCell>
                        <TableCell>
                          <span style={{ fontWeight: 500 }}>{cat.name}</span>
                        </TableCell>
                        <TableCell muted>{cat.description || '—'}</TableCell>
                        <TableCell>{cat.display_order}</TableCell>
                        <TableCell>
                          <Badge variant={cat.is_active ? 'success' : 'neutral'} size="sm">
                            {cat.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div style={{ display: 'flex', gap: 'var(--itsm-space-2)' }}>
                            <Button variant="ghost" size="sm" onClick={() => setEditingCategory(cat)}>
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleCategoryActive(cat)}
                            >
                              {cat.is_active ? 'Disable' : 'Enable'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Panel>
            )}

            {/* Items Tab */}
            {activeTab === 'items' && (
              <Panel
                title="Service Items"
                actions={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setEditingItem({
                      id: '',
                      category_id: categories[0]?.id || '',
                      name: '',
                      description: '',
                      icon: '📝',
                      estimated_time: '',
                      requires_approval: false,
                      default_priority: 'medium',
                      form_schema: [],
                      display_order: items.length + 1,
                      is_active: true,
                    })}
                  >
                    Add Service Item
                  </Button>
                }
                noPadding
              >
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell width={60}>Icon</TableHeaderCell>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Category</TableHeaderCell>
                      <TableHeaderCell width={120}>Est. Time</TableHeaderCell>
                      <TableHeaderCell width={100}>Status</TableHeaderCell>
                      <TableHeaderCell width={150}>Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => {
                      const category = categories.find((c) => c.id === item.category_id);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <span style={{ fontSize: 20 }}>{item.icon}</span>
                          </TableCell>
                          <TableCell>
                            <span style={{ fontWeight: 500 }}>{item.name}</span>
                            {item.requires_approval && (
                              <span style={{ marginLeft: 8 }}><Badge variant="warning" size="sm">Approval</Badge></span>
                            )}
                          </TableCell>
                          <TableCell muted>
                            {category ? `${category.icon} ${category.name}` : '—'}
                          </TableCell>
                          <TableCell muted>{item.estimated_time || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={item.is_active ? 'success' : 'neutral'} size="sm">
                              {item.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div style={{ display: 'flex', gap: 'var(--itsm-space-2)' }}>
                              <Button variant="ghost" size="sm" onClick={() => setEditingItem(item)}>
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleItemActive(item)}
                              >
                                {item.is_active ? 'Disable' : 'Enable'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Panel>
            )}

            {/* Departments Tab */}
            {activeTab === 'departments' && (
              <Panel
                title="Departments"
                subtitle="Departments are synced from Azure AD and used in service catalog forms"
                actions={
                  <Button variant="primary" size="sm" onClick={handleSyncDepartments} loading={syncing}>
                    Sync from Azure AD
                  </Button>
                }
                noPadding
              >
                {departments.length === 0 ? (
                  <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
                    No departments found. Click "Sync from Azure AD" to import departments from your directory.
                  </div>
                ) : (
                  <Table>
                    <TableHead>
                      <tr>
                        <TableHeaderCell>Name</TableHeaderCell>
                        <TableHeaderCell width={120}>Source</TableHeaderCell>
                        <TableHeaderCell width={100}>Status</TableHeaderCell>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {departments.map((dept) => (
                        <TableRow key={dept.id}>
                          <TableCell>
                            <span style={{ fontWeight: 500 }}>{dept.name}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={dept.synced_from_azure ? 'info' : 'neutral'} size="sm">
                              {dept.synced_from_azure ? 'Azure AD' : 'Manual'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={dept.is_active ? 'success' : 'neutral'} size="sm">
                              {dept.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}
