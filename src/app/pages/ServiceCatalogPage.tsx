import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Badge } from '../components';

interface ServiceCatalogItem {
  id: string;
  item_key: string;
  name: string;
  description: string | null;
  is_active: boolean;
  default_ticket_type: string;
  default_category: string | null;
  default_priority: string | null;
  assignment_group_id: string | null;
  created_at: string;
}

export function ServiceCatalogPage() {
  const navigate = useNavigate();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user, isGlobalAdmin } = useAuth();

  const [items, setItems] = useState<ServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('service_catalog_items')
      .select('*')
      .order('name');

    if (!error && data) {
      setItems(data as ServiceCatalogItem[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const filteredItems = items.filter((item) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      (item.description?.toLowerCase().includes(searchLower) ?? false) ||
      item.item_key.toLowerCase().includes(searchLower)
    );
  });

  const handleRequestService = async (item: ServiceCatalogItem) => {
    if (!user) return;

    // Create a new ticket from the service catalog item
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        title: `Service Request: ${item.name}`,
        description: item.description ?? '',
        ticket_type: item.default_ticket_type,
        category: item.default_category,
        priority: item.default_priority ?? 'medium',
        assignment_group_id: item.assignment_group_id,
        requester_id: user.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (!error && ticket) {
      // Link to service catalog item
      await supabase.from('ticket_service_request_items').insert({
        ticket_id: ticket.id,
        catalog_item_id: item.id,
      });

      navigate(`/tickets/${ticket.id}`);
    }
  };

  return (
    <div>
      <PageHeader
        title="Service Catalog"
        subtitle="Request IT services and resources"
        actions={
          isGlobalAdmin && (
            <Button variant="ghost" onClick={() => navigate('/settings/service-catalog')}>
              Manage Catalog
            </Button>
          )
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {/* Search */}
        <div style={{ marginBottom: 'var(--itsm-space-4)', maxWidth: 400 }}>
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
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--itsm-space-8)', color: 'var(--itsm-text-tertiary)' }}>
            No services found
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 'var(--itsm-space-4)',
            }}
          >
            {filteredItems.filter((item) => item.is_active).map((item) => (
              <Panel key={item.id}>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--itsm-space-2)' }}>
                      <h3 style={{ fontSize: 'var(--itsm-text-base)', fontWeight: 'var(--itsm-weight-semibold)' as any, margin: 0 }}>
                        {item.name}
                      </h3>
                      {item.default_category && (
                        <Badge variant="info">{item.default_category}</Badge>
                      )}
                    </div>

                    {item.description && (
                      <p style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-secondary)', marginBottom: 'var(--itsm-space-3)', lineHeight: 'var(--itsm-leading-relaxed)' }}>
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div style={{ marginTop: 'var(--itsm-space-3)', paddingTop: 'var(--itsm-space-3)', borderTop: '1px solid var(--itsm-border-subtle)' }}>
                    <Button
                      variant="primary"
                      onClick={() => void handleRequestService(item)}
                      style={{ width: '100%' }}
                    >
                      Request Service
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
