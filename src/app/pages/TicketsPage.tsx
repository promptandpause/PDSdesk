import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
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
} from '../components';

interface TicketRow {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  assigned_to: string | null;
  assigned_group_id: string | null;
  created_at: string;
  updated_at: string;
}

interface OperatorGroup {
  id: string;
  name: string;
  group_key: string;
}

const STATUS_OPTIONS = ['', 'open', 'in_progress', 'pending', 'resolved', 'closed'];

export function TicketsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, roles } = useAuth();

  const isGlobalAdmin = roles.includes('global_admin');
  const isServiceDeskAdmin = roles.includes('service_desk_admin');
  const canViewAllTickets = isGlobalAdmin || isServiceDeskAdmin;

  // Redirect non-admins to /my-tickets
  useEffect(() => {
    if (!canViewAllTickets && user) {
      navigate('/my-tickets', { replace: true });
    }
  }, [canViewAllTickets, user, navigate]);

  const statusParam = searchParams.get('status') ?? '';
  const queryParam = searchParams.get('q') ?? '';
  const queueParam = searchParams.get('queue') ?? '';

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState(queryParam);
  const [statusFilter, setStatusFilter] = useState(statusParam);
  const [queueFilter, setQueueFilter] = useState(queueParam);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<OperatorGroup[]>([]);

  const fetchUserGroups = useCallback(async () => {
    if (!user) return;

    const [{ data: membershipData }, { data: groupsData }] = await Promise.all([
      supabase.from('operator_group_members').select('group_id').eq('user_id', user.id),
      supabase.from('operator_groups').select('id, name, group_key').eq('is_active', true).order('name'),
    ]);

    if (membershipData) {
      setUserGroups(membershipData.map((m: { group_id: string }) => m.group_id));
    }
    if (groupsData) {
      setAllGroups(groupsData as OperatorGroup[]);
    }
  }, [supabase, user]);

  useEffect(() => {
    void fetchUserGroups();
  }, [fetchUserGroups]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      let q = supabase
        .from('tickets')
        .select('id,ticket_number,title,status,priority,category,assigned_to,assigned_group_id,created_at,updated_at', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .limit(50);

      if (statusFilter) {
        q = q.eq('status', statusFilter);
      }

      if (queueFilter) {
        q = q.eq('assigned_group_id', queueFilter);
      } else if (!canViewAllTickets && userGroups.length > 0) {
        q = q.in('assigned_group_id', userGroups);
      }

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
  }, [supabase, statusFilter, query, queueFilter, canViewAllTickets, userGroups]);

  const handleSearch = (value: string) => {
    setQuery(value);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('q', value);
    } else {
      params.delete('q');
    }
    setSearchParams(params, { replace: true });
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('status', value);
    } else {
      params.delete('status');
    }
    setSearchParams(params, { replace: true });
  };

  const handleQueueChange = (value: string) => {
    setQueueFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('queue', value);
    } else {
      params.delete('queue');
    }
    setSearchParams(params, { replace: true });
  };

  const visibleGroups = canViewAllTickets ? allGroups : allGroups.filter((g) => userGroups.includes(g.id));

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
        title="Tickets"
        subtitle={`${totalCount} total tickets`}
        actions={
          <Button variant="primary" onClick={() => navigate('/tickets/new')}>
            New Ticket
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
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
              onChange={(e) => handleSearch(e.target.value)}
              icon={<span style={{ fontSize: 14 }}>🔍</span>}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
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
          {visibleGroups.length > 0 && (
            <select
              value={queueFilter}
              onChange={(e) => handleQueueChange(e.target.value)}
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
              <option value="">{canViewAllTickets ? 'All Queues' : 'My Queues'}</option>
              {visibleGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Table */}
        <Panel noPadding>
          {loading ? (
            <div
              style={{
                padding: 'var(--itsm-space-8)',
                textAlign: 'center',
                color: 'var(--itsm-text-tertiary)',
              }}
            >
              Loading...
            </div>
          ) : tickets.length === 0 ? (
            <div
              style={{
                padding: 'var(--itsm-space-8)',
                textAlign: 'center',
                color: 'var(--itsm-text-tertiary)',
              }}
            >
              No tickets found
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell width={120}>ID</TableHeaderCell>
                  <TableHeaderCell>Subject</TableHeaderCell>
                  <TableHeaderCell width={120}>Status</TableHeaderCell>
                  <TableHeaderCell width={100}>Priority</TableHeaderCell>
                  <TableHeaderCell width={140}>Category</TableHeaderCell>
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
                    <TableCell muted>
                      {ticket.category ?? '—'}
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
        {!loading && tickets.length > 0 && (
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
