import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { Button, Badge, Input } from './index';

interface TicketLink {
  id: string;
  source_ticket_id: string;
  target_ticket_id: string;
  link_type: string;
  created_at: string;
  source_ticket?: {
    id: string;
    ticket_number: string;
    title: string;
    status: string;
  };
  target_ticket?: {
    id: string;
    ticket_number: string;
    title: string;
    status: string;
  };
}

interface TicketLinksProps {
  ticketId: string;
}

const LINK_TYPES = [
  { value: 'related', label: 'Related to' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'blocked_by', label: 'Blocked by' },
  { value: 'duplicates', label: 'Duplicates' },
  { value: 'duplicated_by', label: 'Duplicated by' },
  { value: 'parent', label: 'Parent of' },
  { value: 'child', label: 'Child of' },
];

export function TicketLinks({ ticketId }: TicketLinksProps) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();

  const [links, setLinks] = useState<TicketLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [formData, setFormData] = useState({
    link_type: 'related',
    search: '',
    target_ticket_id: '',
  });

  const fetchLinks = useCallback(async () => {
    // Fetch links where this ticket is source or target
    const [{ data: sourceLinks }, { data: targetLinks }] = await Promise.all([
      supabase
        .from('ticket_links')
        .select('*, target_ticket:tickets!ticket_links_target_ticket_id_fkey(id, ticket_number, title, status)')
        .eq('source_ticket_id', ticketId),
      supabase
        .from('ticket_links')
        .select('*, source_ticket:tickets!ticket_links_source_ticket_id_fkey(id, ticket_number, title, status)')
        .eq('target_ticket_id', ticketId),
    ]);

    const allLinks = [
      ...(sourceLinks || []),
      ...(targetLinks || []),
    ] as TicketLink[];

    setLinks(allLinks);
    setLoading(false);
  }, [supabase, ticketId]);

  useEffect(() => {
    void fetchLinks();
  }, [fetchLinks]);

  const handleSearch = async (query: string) => {
    setFormData({ ...formData, search: query, target_ticket_id: '' });

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const { data } = await supabase
      .from('tickets')
      .select('id, ticket_number, title, status')
      .neq('id', ticketId)
      .or(`ticket_number.ilike.%${query}%,title.ilike.%${query}%`)
      .limit(5);

    setSearchResults(data || []);
    setSearching(false);
  };

  const handleSelectTicket = (ticket: any) => {
    setFormData({
      ...formData,
      search: `${ticket.ticket_number} - ${ticket.title}`,
      target_ticket_id: ticket.id,
    });
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.target_ticket_id || !user) return;

    setSaving(true);

    await supabase.from('ticket_links').insert({
      source_ticket_id: ticketId,
      target_ticket_id: formData.target_ticket_id,
      link_type: formData.link_type,
      created_by: user.id,
    });

    setFormData({ link_type: 'related', search: '', target_ticket_id: '' });
    setShowForm(false);
    setSaving(false);
    await fetchLinks();
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm('Remove this link?')) return;
    await supabase.from('ticket_links').delete().eq('id', linkId);
    await fetchLinks();
  };

  const getLinkLabel = (link: TicketLink) => {
    const type = LINK_TYPES.find((t) => t.value === link.link_type);
    return type?.label || link.link_type;
  };

  const getLinkedTicket = (link: TicketLink) => {
    if (link.source_ticket_id === ticketId) {
      return link.target_ticket;
    }
    return link.source_ticket;
  };

  if (loading) {
    return (
      <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--itsm-space-2)' }}>
        <span style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
          {links.length} linked ticket{links.length !== 1 ? 's' : ''}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Link'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 'var(--itsm-space-3)', padding: 'var(--itsm-space-3)', backgroundColor: 'var(--itsm-surface-sunken)', borderRadius: 'var(--itsm-panel-radius)' }}>
          <div style={{ marginBottom: 'var(--itsm-space-2)' }}>
            <label style={{ display: 'block', fontSize: 'var(--itsm-text-xs)', fontWeight: 'var(--itsm-weight-medium)' as any, marginBottom: 'var(--itsm-space-1)', color: 'var(--itsm-text-secondary)' }}>
              Link Type
            </label>
            <select
              value={formData.link_type}
              onChange={(e) => setFormData({ ...formData, link_type: e.target.value })}
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
              {LINK_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ position: 'relative' }}>
            <Input
              label="Search Ticket"
              value={formData.search}
              onChange={(e) => void handleSearch(e.target.value)}
              placeholder="Search by ticket number or title..."
            />
            {searching && (
              <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginTop: 'var(--itsm-space-1)' }}>
                Searching...
              </div>
            )}
            {searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--itsm-surface-base)',
                  border: '1px solid var(--itsm-border-default)',
                  borderRadius: 'var(--itsm-panel-radius)',
                  boxShadow: 'var(--itsm-shadow-md)',
                  zIndex: 10,
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                {searchResults.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                    style={{
                      padding: 'var(--itsm-space-2) var(--itsm-space-3)',
                      cursor: 'pointer',
                      fontSize: 'var(--itsm-text-sm)',
                      borderBottom: '1px solid var(--itsm-border-subtle)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--itsm-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <strong>{ticket.ticket_number}</strong> - {ticket.title}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 'var(--itsm-space-2)', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={saving}
              disabled={!formData.target_ticket_id}
            >
              Add Link
            </Button>
          </div>
        </form>
      )}

      {links.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-2)' }}>
          {links.map((link) => {
            const linkedTicket = getLinkedTicket(link);
            if (!linkedTicket) return null;

            return (
              <div
                key={link.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--itsm-space-2)',
                  backgroundColor: 'var(--itsm-surface-sunken)',
                  borderRadius: 'var(--itsm-panel-radius)',
                  fontSize: 'var(--itsm-text-xs)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', marginBottom: 'var(--itsm-space-1)' }}>
                    <Badge variant="neutral" size="sm">{getLinkLabel(link)}</Badge>
                  </div>
                  <Link
                    to={`/tickets/${linkedTicket.id}`}
                    style={{
                      color: 'var(--itsm-primary-600)',
                      textDecoration: 'none',
                      fontWeight: 'var(--itsm-weight-medium)' as any,
                    }}
                  >
                    {linkedTicket.ticket_number}
                  </Link>
                  <span style={{ color: 'var(--itsm-text-secondary)', marginLeft: 'var(--itsm-space-1)' }}>
                    {linkedTicket.title.length > 40 ? linkedTicket.title.slice(0, 40) + '...' : linkedTicket.title}
                  </span>
                </div>
                <button
                  onClick={() => void handleDelete(link.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--itsm-text-tertiary)',
                    fontSize: 'var(--itsm-text-xs)',
                    marginLeft: 'var(--itsm-space-2)',
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
