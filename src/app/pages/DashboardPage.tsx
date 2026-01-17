import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, MetricCard, MetricRow, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, StatusBadge, PriorityBadge, Button, Badge } from '../components';

interface TicketRow {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  updated_at: string;
  operator_group_id?: string;
}

interface Stats {
  openTickets: number;
  inProgressTickets: number;
  pendingTickets: number;
  resolvedToday: number;
  avgResponseTime: string;
}

interface OperatorQueue {
  id: string;
  group_key: string;
  name: string;
  stats: {
    open: number;
    in_progress: number;
    pending: number;
  };
  recentTickets: TicketRow[];
}

export function DashboardPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const navigate = useNavigate();
  const { user, roles } = useAuth();

  const isGlobalAdmin = roles.includes('global_admin');
  const isServiceDeskAdmin = roles.includes('service_desk_admin');
  const canViewAllQueues = isGlobalAdmin || isServiceDeskAdmin;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    openTickets: 0,
    inProgressTickets: 0,
    pendingTickets: 0,
    resolvedToday: 0,
    avgResponseTime: '—',
  });
  const [recentTickets, setRecentTickets] = useState<TicketRow[]>([]);
  const [operatorQueues, setOperatorQueues] = useState<OperatorQueue[]>([]);

  const fetchQueueStats = useCallback(async (queueId: string): Promise<{ open: number; in_progress: number; pending: number }> => {
    const [
      { count: openCount },
      { count: inProgressCount },
      { count: pendingCount },
    ] = await Promise.all([
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('operator_group_id', queueId).eq('status', 'open'),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('operator_group_id', queueId).eq('status', 'in_progress'),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('operator_group_id', queueId).eq('status', 'pending'),
    ]);
    return {
      open: openCount ?? 0,
      in_progress: inProgressCount ?? 0,
      pending: pendingCount ?? 0,
    };
  }, [supabase]);

  const fetchQueueTickets = useCallback(async (queueId: string): Promise<TicketRow[]> => {
    const { data } = await supabase
      .from('tickets')
      .select('id,ticket_number,title,status,priority,updated_at,operator_group_id')
      .eq('operator_group_id', queueId)
      .in('status', ['open', 'in_progress', 'pending'])
      .order('updated_at', { ascending: false })
      .limit(5);
    return (data as TicketRow[]) ?? [];
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch overall stats
      const [
        { count: openCount },
        { count: inProgressCount },
        { count: pendingCount },
        { count: resolvedCount },
        { data: recent },
      ] = await Promise.all([
        supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'resolved').gte('updated_at', today.toISOString()),
        supabase.from('tickets').select('id,ticket_number,title,status,priority,updated_at').order('updated_at', { ascending: false }).limit(10),
      ]);

      if (cancelled) return;

      setStats({
        openTickets: openCount ?? 0,
        inProgressTickets: inProgressCount ?? 0,
        pendingTickets: pendingCount ?? 0,
        resolvedToday: resolvedCount ?? 0,
        avgResponseTime: '—',
      });
      setRecentTickets((recent as TicketRow[]) ?? []);

      // Fetch operator's queues
      let queues: { id: string; group_key: string; name: string }[] = [];
      
      if (canViewAllQueues) {
        // Admins see all queues
        const { data } = await supabase
          .from('operator_groups')
          .select('id, group_key, name')
          .eq('is_active', true)
          .order('name');
        queues = data ?? [];
      } else if (user) {
        // Operators see only their assigned queues
        const { data: memberData } = await supabase
          .from('operator_group_members')
          .select('group_id')
          .eq('user_id', user.id);

        if (memberData && memberData.length > 0) {
          const groupIds = memberData.map((m: { group_id: string }) => m.group_id);
          const { data } = await supabase
            .from('operator_groups')
            .select('id, group_key, name')
            .in('id', groupIds)
            .eq('is_active', true)
            .order('name');
          queues = data ?? [];
        }
      }

      if (cancelled) return;

      // Fetch stats and tickets for each queue
      const queueData: OperatorQueue[] = await Promise.all(
        queues.map(async (q) => {
          const [queueStats, queueTickets] = await Promise.all([
            fetchQueueStats(q.id),
            fetchQueueTickets(q.id),
          ]);
          return {
            ...q,
            stats: queueStats,
            recentTickets: queueTickets,
          };
        })
      );

      if (cancelled) return;

      setOperatorQueues(queueData);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [supabase, user, canViewAllQueues, fetchQueueStats, fetchQueueTickets]);

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
        title="Dashboard"
        subtitle="Service desk overview and recent activity"
        actions={
          <Button variant="primary" onClick={() => navigate('/tickets/new')}>
            New Ticket
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {loading ? (
          <div style={{ color: 'var(--itsm-text-tertiary)', fontSize: 'var(--itsm-text-sm)' }}>
            Loading...
          </div>
        ) : (
          <>
            {/* Metrics Row */}
            <MetricRow>
              <MetricCard
                label="Open"
                value={stats.openTickets}
                onClick={() => navigate('/tickets?status=open')}
              />
              <MetricCard
                label="In Progress"
                value={stats.inProgressTickets}
                onClick={() => navigate('/tickets?status=in_progress')}
              />
              <MetricCard
                label="Pending"
                value={stats.pendingTickets}
                onClick={() => navigate('/tickets?status=pending')}
              />
              <MetricCard
                label="Resolved Today"
                value={stats.resolvedToday}
              />
              <MetricCard
                label="Avg Response"
                value={stats.avgResponseTime}
              />
            </MetricRow>

            {/* My Queues Section */}
            {operatorQueues.length > 0 && (
              <div style={{ marginTop: 'var(--itsm-space-6)' }}>
                <h2 style={{ 
                  fontSize: 'var(--itsm-text-lg)', 
                  fontWeight: 600, 
                  color: 'var(--itsm-text-primary)',
                  marginBottom: 'var(--itsm-space-4)'
                }}>
                  My Queues
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--itsm-space-4)' }}>
                  {operatorQueues.map((queue) => (
                    <Panel
                      key={queue.id}
                      title={queue.name}
                      actions={
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/${queue.group_key}`)}>
                          View Queue
                        </Button>
                      }
                    >
                      {/* Queue Stats */}
                      <div style={{ display: 'flex', gap: 'var(--itsm-space-4)', marginBottom: 'var(--itsm-space-4)' }}>
                        <div 
                          style={{ 
                            flex: 1, 
                            textAlign: 'center', 
                            padding: 'var(--itsm-space-2)',
                            backgroundColor: 'var(--itsm-danger-50)',
                            borderRadius: 'var(--itsm-radius-md)',
                            cursor: 'pointer'
                          }}
                          onClick={() => navigate(`/${queue.group_key}?status=open`)}
                        >
                          <div style={{ fontSize: 'var(--itsm-text-xl)', fontWeight: 700, color: 'var(--itsm-danger-600)' }}>
                            {queue.stats.open}
                          </div>
                          <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-danger-600)' }}>Open</div>
                        </div>
                        <div 
                          style={{ 
                            flex: 1, 
                            textAlign: 'center', 
                            padding: 'var(--itsm-space-2)',
                            backgroundColor: 'var(--itsm-info-50)',
                            borderRadius: 'var(--itsm-radius-md)',
                            cursor: 'pointer'
                          }}
                          onClick={() => navigate(`/${queue.group_key}?status=in_progress`)}
                        >
                          <div style={{ fontSize: 'var(--itsm-text-xl)', fontWeight: 700, color: 'var(--itsm-info-600)' }}>
                            {queue.stats.in_progress}
                          </div>
                          <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-info-600)' }}>In Progress</div>
                        </div>
                        <div 
                          style={{ 
                            flex: 1, 
                            textAlign: 'center', 
                            padding: 'var(--itsm-space-2)',
                            backgroundColor: 'var(--itsm-warning-50)',
                            borderRadius: 'var(--itsm-radius-md)',
                            cursor: 'pointer'
                          }}
                          onClick={() => navigate(`/${queue.group_key}?status=pending`)}
                        >
                          <div style={{ fontSize: 'var(--itsm-text-xl)', fontWeight: 700, color: 'var(--itsm-warning-600)' }}>
                            {queue.stats.pending}
                          </div>
                          <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-warning-600)' }}>Pending</div>
                        </div>
                      </div>

                      {/* Recent Queue Tickets */}
                      {queue.recentTickets.length > 0 ? (
                        <div style={{ borderTop: '1px solid var(--itsm-border-subtle)', paddingTop: 'var(--itsm-space-3)' }}>
                          <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginBottom: 'var(--itsm-space-2)' }}>
                            Recent tickets
                          </div>
                          {queue.recentTickets.slice(0, 3).map((ticket) => (
                            <div
                              key={ticket.id}
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--itsm-space-2)',
                                padding: 'var(--itsm-space-2) 0',
                                borderBottom: '1px solid var(--itsm-border-subtle)',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', fontFamily: 'monospace' }}>
                                {ticket.ticket_number}
                              </span>
                              <span style={{ flex: 1, fontSize: 'var(--itsm-text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ticket.title}
                              </span>
                              <StatusBadge status={ticket.status} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-tertiary)', textAlign: 'center', padding: 'var(--itsm-space-4)' }}>
                          No active tickets
                        </div>
                      )}
                    </Panel>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Tickets (for admins) */}
            {canViewAllQueues && (
              <div style={{ marginTop: 'var(--itsm-space-6)' }}>
                <Panel
                  title="Recent Tickets (All)"
                  subtitle={`${recentTickets.length} most recent across all queues`}
                  actions={
                    <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')}>
                      View All
                    </Button>
                  }
                  noPadding
                >
                  {recentTickets.length === 0 ? (
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
                          <TableHeaderCell width={100} align="right">Updated</TableHeaderCell>
                        </tr>
                      </TableHead>
                      <TableBody>
                        {recentTickets.map((ticket) => (
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
                            <TableCell align="right" muted>
                              {formatTime(ticket.updated_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Panel>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
