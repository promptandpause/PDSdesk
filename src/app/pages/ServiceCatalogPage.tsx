import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Badge } from '../components';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'textarea' | 'select' | 'date' | 'number';
  required: boolean;
  options?: string[] | 'departments';
  placeholder?: string;
}

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
  form_schema: FormField[];
  is_active: boolean;
  display_order: number;
}

interface Department {
  id: string;
  name: string;
}

export function ServiceCatalogPage() {
  const navigate = useNavigate();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { roles } = useAuth();
  const isGlobalAdmin = roles.includes('global_admin');

  const [categories, setCategories] = useState<ServiceCatalogCategory[]>([]);
  const [items, setItems] = useState<ServiceCatalogItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ServiceCatalogItem | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [catRes, itemRes, deptRes] = await Promise.all([
      supabase.from('service_catalog_categories').select('*').eq('is_active', true).order('display_order'),
      supabase.from('service_catalog_items').select('*').eq('is_active', true).order('display_order'),
      supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
    ]);

    if (catRes.data) setCategories(catRes.data as ServiceCatalogCategory[]);
    if (itemRes.data) setItems(itemRes.data as ServiceCatalogItem[]);
    if (deptRes.data) setDepartments(deptRes.data as Department[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredCategories = categories.filter((cat) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const categoryItems = items.filter((i) => i.category_id === cat.id);
    return (
      cat.name.toLowerCase().includes(searchLower) ||
      cat.description?.toLowerCase().includes(searchLower) ||
      categoryItems.some((i) => i.name.toLowerCase().includes(searchLower) || i.description?.toLowerCase().includes(searchLower))
    );
  });

  const getItemsForCategory = (categoryId: string) => {
    return items.filter((i) => i.category_id === categoryId).filter((item) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return item.name.toLowerCase().includes(searchLower) || item.description?.toLowerCase().includes(searchLower);
    });
  };

  const handleSelectItem = (item: ServiceCatalogItem) => {
    setSelectedItem(item);
    setFormData({});
  };

  const handleSubmitRequest = async () => {
    if (!selectedItem) return;

    // Validate required fields
    const schema = selectedItem.form_schema || [];
    for (const field of schema) {
      if (field.required && !formData[field.name]) {
        alert(`Please fill in: ${field.label}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('submit_service_catalog_request', {
        p_catalog_item_id: selectedItem.id,
        p_form_data: formData,
      });

      if (error) {
        alert('Error submitting request: ' + error.message);
      } else if (data?.ok) {
        alert(`Request submitted successfully! Ticket #${data.ticket_number} has been created.`);
        setSelectedItem(null);
        setFormData({});
        navigate(`/tickets/${data.ticket_id}`);
      } else {
        alert('Error: ' + (data?.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error submitting request: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }

    setSubmitting(false);
  };

  const renderFormField = (field: FormField) => {
    const value = formData[field.name] || '';

    if (field.type === 'textarea') {
      return (
        <div key={field.name} style={{ marginBottom: 'var(--itsm-space-4)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--itsm-space-1)', fontSize: 'var(--itsm-text-sm)', fontWeight: 500 }}>
            {field.label} {field.required && <span style={{ color: 'var(--itsm-danger-500)' }}>*</span>}
          </label>
          <textarea
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            placeholder={field.placeholder}
            rows={4}
            style={{
              width: '100%',
              padding: 'var(--itsm-space-2) var(--itsm-space-3)',
              fontSize: 'var(--itsm-text-sm)',
              border: '1px solid var(--itsm-border-default)',
              borderRadius: 'var(--itsm-input-radius)',
              resize: 'vertical',
            }}
          />
        </div>
      );
    }

    if (field.type === 'select') {
      let options: string[] = [];
      if (field.options === 'departments') {
        options = departments.map((d) => d.name);
      } else if (Array.isArray(field.options)) {
        options = field.options;
      }

      return (
        <div key={field.name} style={{ marginBottom: 'var(--itsm-space-4)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--itsm-space-1)', fontSize: 'var(--itsm-text-sm)', fontWeight: 500 }}>
            {field.label} {field.required && <span style={{ color: 'var(--itsm-danger-500)' }}>*</span>}
          </label>
          <select
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
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
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div key={field.name} style={{ marginBottom: 'var(--itsm-space-4)' }}>
        <label style={{ display: 'block', marginBottom: 'var(--itsm-space-1)', fontSize: 'var(--itsm-text-sm)', fontWeight: 500 }}>
          {field.label} {field.required && <span style={{ color: 'var(--itsm-danger-500)' }}>*</span>}
        </label>
        <input
          type={field.type}
          value={value}
          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          placeholder={field.placeholder}
          style={{
            width: '100%',
            height: 36,
            padding: '0 var(--itsm-space-3)',
            fontSize: 'var(--itsm-text-sm)',
            border: '1px solid var(--itsm-border-default)',
            borderRadius: 'var(--itsm-input-radius)',
          }}
        />
      </div>
    );
  };

  // Request Form Modal
  if (selectedItem) {
    const category = categories.find((c) => c.id === selectedItem.category_id);
    const schema = selectedItem.form_schema || [];

    return (
      <div>
        <PageHeader
          title={selectedItem.name}
          subtitle={category?.name}
          breadcrumbs={[
            { label: 'Service Catalog', to: '/service-catalog' },
            { label: category?.name || 'Category' },
            { label: selectedItem.name },
          ]}
        />

        <div style={{ padding: 'var(--itsm-space-6)', maxWidth: 700 }}>
          <Panel>
            <div style={{ marginBottom: 'var(--itsm-space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-3)', marginBottom: 'var(--itsm-space-3)' }}>
                <span style={{ fontSize: 32 }}>{selectedItem.icon}</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: 'var(--itsm-text-lg)', fontWeight: 600 }}>{selectedItem.name}</h2>
                  {selectedItem.estimated_time && (
                    <span style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-tertiary)' }}>
                      Estimated time: {selectedItem.estimated_time}
                    </span>
                  )}
                </div>
              </div>
              {selectedItem.description && (
                <p style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-secondary)', marginBottom: 'var(--itsm-space-4)' }}>
                  {selectedItem.description}
                </p>
              )}
              {selectedItem.requires_approval && (
                <div style={{ 
                  padding: 'var(--itsm-space-2) var(--itsm-space-3)', 
                  backgroundColor: 'var(--itsm-warning-50)', 
                  borderRadius: 'var(--itsm-radius-md)',
                  fontSize: 'var(--itsm-text-sm)',
                  color: 'var(--itsm-warning-700)',
                  marginBottom: 'var(--itsm-space-4)'
                }}>
                  This request requires approval before processing.
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--itsm-border-subtle)', paddingTop: 'var(--itsm-space-4)' }}>
              <h3 style={{ fontSize: 'var(--itsm-text-base)', fontWeight: 600, marginBottom: 'var(--itsm-space-4)' }}>
                Request Details
              </h3>

              {schema.length === 0 ? (
                <p style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-tertiary)' }}>
                  No additional information required. Click submit to create your request.
                </p>
              ) : (
                schema.map((field) => renderFormField(field))
              )}

              <div style={{ display: 'flex', gap: 'var(--itsm-space-3)', marginTop: 'var(--itsm-space-6)' }}>
                <Button variant="ghost" onClick={() => setSelectedItem(null)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSubmitRequest} loading={submitting} disabled={submitting}>
                  Submit Request
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  // Category View
  if (selectedCategory) {
    const category = categories.find((c) => c.id === selectedCategory);
    const categoryItems = getItemsForCategory(selectedCategory);

    return (
      <div>
        <PageHeader
          title={category?.name || 'Category'}
          subtitle={category?.description || undefined}
          breadcrumbs={[
            { label: 'Service Catalog', to: '/service-catalog' },
            { label: category?.name || 'Category' },
          ]}
        />

        <div style={{ padding: 'var(--itsm-space-6)' }}>
          <Button variant="ghost" onClick={() => setSelectedCategory(null)} style={{ marginBottom: 'var(--itsm-space-4)' }}>
            ← Back to Categories
          </Button>

          {categoryItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--itsm-space-8)', color: 'var(--itsm-text-tertiary)' }}>
              No services available in this category
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--itsm-space-4)' }}>
              {categoryItems.map((item) => (
                <Panel key={item.id}>
                  <div style={{ display: 'flex', gap: 'var(--itsm-space-3)' }}>
                    <span style={{ fontSize: 28 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: 'var(--itsm-text-base)', fontWeight: 600, marginBottom: 'var(--itsm-space-1)' }}>
                        {item.name}
                      </h3>
                      {item.description && (
                        <p style={{ margin: 0, fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-secondary)', marginBottom: 'var(--itsm-space-2)' }}>
                          {item.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', marginBottom: 'var(--itsm-space-3)' }}>
                        {item.estimated_time && (
                          <span style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                            ⏱️ {item.estimated_time}
                          </span>
                        )}
                        {item.requires_approval && (
                          <Badge variant="warning" size="sm">Requires Approval</Badge>
                        )}
                      </div>
                      <Button variant="primary" size="sm" onClick={() => handleSelectItem(item)}>
                        Request
                      </Button>
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Catalog View
  return (
    <div>
      <PageHeader
        title="Service Catalog"
        subtitle="Browse and request services from IT, HR, and other departments"
        actions={
          isGlobalAdmin ? (
            <Button variant="ghost" onClick={() => navigate('/settings/service-catalog')}>
              Manage Catalog
            </Button>
          ) : undefined
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {/* Search */}
        <div style={{ marginBottom: 'var(--itsm-space-6)', maxWidth: 500 }}>
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--itsm-space-8)', color: 'var(--itsm-text-tertiary)' }}>
            Loading...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--itsm-space-8)', color: 'var(--itsm-text-tertiary)' }}>
            No services found
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--itsm-space-4)' }}>
            {filteredCategories.map((category) => {
              const categoryItems = getItemsForCategory(category.id);
              return (
                <div
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  style={{
                    padding: 'var(--itsm-space-5)',
                    backgroundColor: 'var(--itsm-surface-raised)',
                    border: '1px solid var(--itsm-border-subtle)',
                    borderRadius: 'var(--itsm-radius-lg)',
                    cursor: 'pointer',
                    transition: 'all var(--itsm-transition-fast)',
                    borderLeft: `4px solid ${category.color}`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--itsm-shadow-md)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.transform = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-3)', marginBottom: 'var(--itsm-space-3)' }}>
                    <span style={{ fontSize: 32 }}>{category.icon}</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 'var(--itsm-text-lg)', fontWeight: 600 }}>{category.name}</h3>
                      <span style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                        {categoryItems.length} service{categoryItems.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {category.description && (
                    <p style={{ margin: 0, fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-secondary)' }}>
                      {category.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
