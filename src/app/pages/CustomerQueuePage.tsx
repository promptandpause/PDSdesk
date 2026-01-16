import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { PageHeader } from '../layout/PageHeader';
import {
  Panel,
  Button,
  Input,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  StatusBadge,
  PriorityBadge,
  Badge,
} from '../components';

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  channel: string;
  mailbox: string | null;
  assignee_id: string | null;
  requester_id: string | null;
  created_at: string;
  updated_at: string;
}

export function CustomerQueuePage() {
  const navigate = useNavigate();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');

  const fetchTickets = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('tickets')
      .select('*')
      .eq('ticket_type', 'customer_service')
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter === 'open') {
      query = query.in('status', ['new', 'open', 'pending', 'in_progress']);
    } else if (statusFilter === 'closed') {
      query = query.in('status', ['resolved', 'closed']);
    }

    const { data, error } = await query;

    if (!error && data) {
      setTickets(data as Ticket[]);
    }
    setLoading(false);
  }, [supabase, statusFilter]);

  useEffect(() => {
    void fetchTickets();

    // Subscribe to real-time updates for customer service tickets
    const channel = supabase
      .channel('customer-service-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: 'ticket_type=eq.customer_service',
        },
        () => {
          void fetchTickets();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, fetchTickets]);

  const filteredTickets = tickets.filter((ticket) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      ticket.title.toLowerCase().includes(searchLower) ||
      ticket.ticket_number.toLowerCase().includes(searchLower) ||
      (ticket.category?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const formatDate = (dateStr: string) => {
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

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Badge variant="blue" size="sm">Email</Badge>;
      case 'web':
        return <Badge variant="purple" size="sm">Web</Badge>;
      case 'phone':
        return <Badge variant="green" size="sm">Phone</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{channel}</Badge>;
    }
  };

  const openCount = tickets.filter((t) => ['new', 'open', 'pending', 'in_progress'].includes(t.status)).length;
  const newCount = tickets.filter((t) => t.status === 'new').length;

  return (
    <div>
      <PageHeader
        title="Customer Queue"
        subtitle="Support tickets from Prompt & Pause customers"
        actions={
          <Button variant="primary" onClick={() => navigate('/customer-queue/new')}>
            New Ticket
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {/* Stats */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--itsm-space-4)',
            marginBottom: 'var(--itsm-space-4)',
          }}
        >
          <div
            style={{
              padding: 'var(--itsm-space-4)',
              backgroundColor: 'var(--itsm-surface-base)',
              borderRadius: 'var(--itsm-panel-radius)',
              border: '1px solid var(--itsm-border-subtle)',
              minWidth: 120,
            }}
          >
            <div style={{ fontSize: 'var(--itsm-text-2xl)', fontWeight: 'var(--itsm-weight-bold)' as any, color: 'var(--itsm-primary-600)' }}>
              {openCount}
            </div>
            <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginTop: 2 }}>
              Open Tickets
            </div>
          </div>
          <div
            style={{
              padding: 'var(--itsm-space-4)',
              backgroundColor: 'var(--itsm-surface-base)',
              borderRadius: 'var(--itsm-panel-radius)',
              border: '1px solid var(--itsm-border-subtle)',
              minWidth: 120,
            }}
          >
            <div style={{ fontSize: 'var(--itsm-text-2xl)', fontWeight: 'var(--itsm-weight-bold)' as any, color: 'var(--itsm-status-critical)' }}>
              {newCount}
            </div>
            <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginTop: 2 }}>
              New (Unassigned)
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--itsm-space-3)',
            marginBottom: 'var(--itsm-space-4)',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1, maxWidth: 300 }}>
            <Input
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: 32,
              padding: '0 var(--itsm-space-3)',
              fontSize: 'var(--itsm-text-sm)',
              border: '1px solid var(--itsm-border-default)',
              borderRadius: 'var(--itsm-input-radius)',
              backgroundColor: 'var(--itsm-surface-base)',
              cursor: 'pointer',
            }}
          >
            <option value="open">Open Tickets</option>
            <option value="closed">Closed Tickets</option>
            <option value="all">All Tickets</option>
          </select>
          <Button variant="ghost" onClick={() => void fetchTickets()}>
            Refresh
          </Button>
        </div>

        {/* Table */}
        <Panel noPadding>
          {loading ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              Loading...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              No tickets found
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell width={100}>Number</TableHeaderCell>
                  <TableHeaderCell>Subject</TableHeaderCell>
                  <TableHeaderCell width={80}>Channel</TableHeaderCell>
                  <TableHeaderCell width={90}>Status</TableHeaderCell>
                  <TableHeaderCell width={80}>Priority</TableHeaderCell>
                  <TableHeaderCell width={100}>Created</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    onClick={() => navigate(`/customer-queue/${ticket.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell mono>{ticket.ticket_number}</TableCell>
                    <TableCell>
                      <div style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                        {ticket.title}
                      </div>
                      {ticket.category && (
                        <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginTop: 2 }}>
                          {ticket.category}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getChannelBadge(ticket.channel)}</TableCell>
                    <TableCell><StatusBadge status={ticket.status} /></TableCell>
                    <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                    <TableCell muted>{formatDate(ticket.created_at)}</TableCell>
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
