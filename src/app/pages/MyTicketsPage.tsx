import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, StatusBadge, PriorityBadge } from '../components';
import { SearchIcon } from '../components/Icons';

interface TicketRow {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  updated_at: string;
}

export function MyTicketsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);

      let q = supabase
        .from('tickets')
        .select('id,ticket_number,title,status,priority,updated_at', { count: 'exact' })
        .eq('assignee_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      const trimmed = query.trim();
      if (trimmed) {
        q = q.or(`title.ilike.%${trimmed}%,ticket_number.ilike.%${trimmed}%`);
      }

      const { data, count, error } = await q;

      if (cancelled) return;

      if (error) {
        setTickets([]);
        setTotalCount(0);
      } else {
        setTickets((data as TicketRow[]) ?? []);
        setTotalCount(count ?? 0);
      }
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [supabase, user, query]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div>
      <PageHeader
        title="My Tickets"
        subtitle={`${totalCount} tickets assigned to you`}
        actions={
          <Button variant="primary" onClick={() => navigate('/tickets/new')}>
            New Ticket
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        <div style={{ marginBottom: 'var(--itsm-space-4)', maxWidth: 320 }}>
          <Input
            placeholder="Search tickets..."
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
          ) : tickets.length === 0 ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              No tickets found
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell width={120}>ID</TableHeaderCell>
                  <TableHeaderCell>Subject</TableHeaderCell>
                  <TableHeaderCell width={100}>Priority</TableHeaderCell>
                  <TableHeaderCell width={120}>Status</TableHeaderCell>
                  <TableHeaderCell width={100} align="right">Updated</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <TableCell mono>{ticket.ticket_number}</TableCell>
                    <TableCell>
                      <span style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                        {ticket.title}
                      </span>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell align="right" muted>
                      {formatTime(ticket.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>

        {!loading && tickets.length > 0 && (
          <div style={{ marginTop: 'var(--itsm-space-3)', fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
            Showing {tickets.length} of {totalCount} tickets
          </div>
        )}
      </div>
    </div>
  );
}
