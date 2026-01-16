import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components';

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  customer_id: string | null;
  created_at: string;
}

export function ContactsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      let q = supabase
        .from('contacts')
        .select('id,full_name,email,phone,customer_id,created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(50);

      const trimmed = query.trim();
      if (trimmed) {
        q = q.or(`full_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`);
      }

      const { data, count, error } = await q;

      if (cancelled) return;

      if (error) {
        setContacts([]);
        setTotalCount(0);
      } else {
        setContacts((data as Contact[]) ?? []);
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
        title="Contacts"
        subtitle={`${totalCount} contacts`}
        actions={
          <Button variant="primary">
            Add Contact
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        <div style={{ marginBottom: 'var(--itsm-space-4)', maxWidth: 320 }}>
          <Input
            placeholder="Search contacts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            icon={<span style={{ fontSize: 14 }}>🔍</span>}
          />
        </div>

        <Panel noPadding>
          {loading ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              Loading...
            </div>
          ) : contacts.length === 0 ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              No contacts found
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
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-3)' }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            backgroundColor: 'var(--itsm-gray-200)',
                            color: 'var(--itsm-gray-600)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'var(--itsm-text-xs)',
                            fontWeight: 'var(--itsm-weight-semibold)' as any,
                            flexShrink: 0,
                          }}
                        >
                          {contact.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <span style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                          {contact.full_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell muted>{contact.email ?? '—'}</TableCell>
                    <TableCell muted>{contact.phone ?? '—'}</TableCell>
                    <TableCell align="right" muted>{formatDate(contact.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>

        {!loading && contacts.length > 0 && (
          <div style={{ marginTop: 'var(--itsm-space-3)', fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
            Showing {contacts.length} of {totalCount} contacts
          </div>
        )}
      </div>
    </div>
  );
}
