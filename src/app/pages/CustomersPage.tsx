import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components';
import { SearchIcon } from '../components/Icons';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export function CustomersPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      let q = supabase
        .from('customers')
        .select('id,name,email,phone,created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(50);

      const trimmed = query.trim();
      if (trimmed) {
        q = q.or(`name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`);
      }

      const { data, count, error } = await q;

      if (cancelled) return;

      if (error) {
        setCustomers([]);
        setTotalCount(0);
      } else {
        setCustomers((data as Customer[]) ?? []);
        setTotalCount(count ?? 0);
      }
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [supabase, query]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${totalCount} customers`}
        actions={
          <Button variant="primary">
            Add Customer
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        <div style={{ marginBottom: 'var(--itsm-space-4)', maxWidth: 320 }}>
          <Input
            placeholder="Search customers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            icon={<SearchIcon size={14} />}
          />
        </div>

        <Panel noPadding>
          {loading ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              Loading...
            </div>
          ) : customers.length === 0 ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              No customers found
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Phone</TableHeaderCell>
                  <TableHeaderCell width={100} align="right">Created</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-3)' }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            backgroundColor: 'var(--itsm-primary-100)',
                            color: 'var(--itsm-primary-700)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'var(--itsm-text-xs)',
                            fontWeight: 'var(--itsm-weight-semibold)' as any,
                            flexShrink: 0,
                          }}
                        >
                          {customer.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <span style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                          {customer.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell muted>{customer.email ?? '—'}</TableCell>
                    <TableCell muted>{customer.phone ?? '—'}</TableCell>
                    <TableCell align="right" muted>{formatDate(customer.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>

        {!loading && customers.length > 0 && (
          <div style={{ marginTop: 'var(--itsm-space-3)', fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
            Showing {customers.length} of {totalCount} customers
          </div>
        )}
      </div>
    </div>
  );
}
