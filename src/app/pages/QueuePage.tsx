import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { SearchIcon } from '../components/Icons';
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

interface TicketRow {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  assigned_to: string | null;
  escalation_level: number;
  created_at: string;
  updated_at: string;
}

interface QueueInfo {
  id: string;
  group_key: string;
  name: string;
  description: string | null;
}

const STATUS_OPTIONS = ['', 'open', 'in_progress', 'pending', 'resolved', 'closed'];

export function QueuePage() {
  const { queueKey } = useParams<{ queueKey: string }>();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const navigate = useNavigate();
  const { user, roles } = useAuth();

  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueInfo | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hasAccess, setHasAccess] = useState(true);

  const isGlobalAdmin = roles.includes('global_admin');
  const isServiceDeskAdmin = roles.includes('service_desk_admin');

  const fetchQueueAndTickets = useCallback(async () => {
    if (!queueKey || !user) return;

    setLoading(true);

    // Fetch queue info
    const { data: queueData, error: queueError } = await supabase
      .from('operator_groups')
      .select('id, group_key, name, description')
      .eq('group_key', queueKey)
      .eq('is_active', true)
      .single();

    if (queueError || !queueData) {
      setQueue(null);
      setHasAccess(false);
      setLoading(false);
      return;
    }

    setQueue(queueData as QueueInfo);

    // Check access for non-admins
    if (!isGlobalAdmin && !isServiceDeskAdmin) {
      const { data: memberData } = await supabase
        .from('operator_group_members')
        .select('group_id')
        .eq('group_id', queueData.id)
        .eq('user_id', user.id)
        .single();

      if (!memberData) {
        setHasAccess(false);
        setLoading(false);
        return;
      }
    }

    setHasAccess(true);

    // Fetch tickets for this queue
    let q = supabase
      .from('tickets')
      .select('id,ticket_number,title,status,priority,category,assignee_id,escalation_level,created_at,updated_at', { count: 'exact' })
      .eq('assignment_group_id', queueData.id)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (statusFilter) {
      q = q.eq('status', statusFilter);
    }

    const trimmed = query.trim();
    if (trimmed) {
      q = q.or(`title.ilike.%${trimmed}%,ticket_number.ilike.%${trimmed}%`);
    }

    const { data, count } = await q;

    setTickets((data as unknown as TicketRow[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [supabase, queueKey, user, isGlobalAdmin, isServiceDeskAdmin, statusFilter, query]);

  useEffect(() => {
    void fetchQueueAndTickets();

    // Subscribe to real-time updates for tickets in this queue
    const channel = supabase
      .channel(`queue-tickets-${queueKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        () => {
          void fetchQueueAndTickets();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_comments',
        },
        () => {
          void fetchQueueAndTickets();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchQueueAndTickets, supabase, queueKey]);

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

  if (loading) {
    return (
      <div>
        <PageHeader title="Loading..." />
        <div style={{ padding: 'var(--itsm-space-6)', color: 'var(--itsm-text-tertiary)' }}>
          Loading queue...
        </div>
      </div>
    );
  }

  if (!queue || !hasAccess) {
    return (
      <div>
        <PageHeader title="Queue Not Found" />
        <div style={{ padding: 'var(--itsm-space-6)' }}>
          <Panel>
            <div style={{ textAlign: 'center', padding: 'var(--itsm-space-8)', color: 'var(--itsm-text-tertiary)' }}>
              {!queue ? (
                <>
                  <div style={{ fontSize: 'var(--itsm-text-lg)', marginBottom: 'var(--itsm-space-2)' }}>
                    Queue not found
                  </div>
                  <div style={{ fontSize: 'var(--itsm-text-sm)' }}>
                    The queue "{queueKey}" does not exist or has been deactivated.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 'var(--itsm-text-lg)', marginBottom: 'var(--itsm-space-2)' }}>
                    Access Denied
                  </div>
                  <div style={{ fontSize: 'var(--itsm-text-sm)' }}>
                    You are not a member of this queue. Contact your administrator to request access.
                  </div>
                </>
              )}
              <Button variant="secondary" onClick={() => navigate('/tickets')} style={{ marginTop: 'var(--itsm-space-4)' }}>
                Go to All Tickets
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={queue.name}
        subtitle={`${totalCount} tickets in queue`}
        actions={
          <Button variant="primary" onClick={() => navigate('/tickets/new')}>
            New Ticket
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {/* Queue Info Banner */}
        {queue.description && (
          <div
            style={{
              padding: 'var(--itsm-space-3)',
              marginBottom: 'var(--itsm-space-4)',
              backgroundColor: 'var(--itsm-info-100)',
              borderRadius: 'var(--itsm-panel-radius)',
              fontSize: 'var(--itsm-text-sm)',
              color: 'var(--itsm-info-700)',
            }}
          >
            {queue.description}
          </div>
        )}

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--itsm-space-3)',
            marginBottom: 'var(--itsm-space-4)',
          }}
        >
          <div style={{ flex: 1, maxWidth: 320 }}>
            <Input
              placeholder="Search tickets..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              icon={<SearchIcon size={14} />}
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
              color: 'var(--itsm-text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="">All Status</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <Panel noPadding>
          {tickets.length === 0 ? (
            <div
              style={{
                padding: 'var(--itsm-space-8)',
                textAlign: 'center',
                color: 'var(--itsm-text-tertiary)',
              }}
            >
              No tickets in this queue
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell width={120}>ID</TableHeaderCell>
                  <TableHeaderCell>Subject</TableHeaderCell>
                  <TableHeaderCell width={120}>Status</TableHeaderCell>
                  <TableHeaderCell width={100}>Priority</TableHeaderCell>
                  <TableHeaderCell width={80}>Level</TableHeaderCell>
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
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell>
                      {ticket.escalation_level > 0 ? (
                        <Badge variant="warning" size="sm">L{ticket.escalation_level}</Badge>
                      ) : (
                        <span style={{ color: 'var(--itsm-text-tertiary)' }}>—</span>
                      )}
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

        {/* Footer Stats */}
        {tickets.length > 0 && (
          <div
            style={{
              marginTop: 'var(--itsm-space-3)',
              fontSize: 'var(--itsm-text-xs)',
              color: 'var(--itsm-text-tertiary)',
            }}
          >
            Showing {tickets.length} of {totalCount} tickets
          </div>
        )}
      </div>
    </div>
  );
}
