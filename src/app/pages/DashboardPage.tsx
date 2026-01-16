import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { PageHeader } from '../layout/PageHeader';
import { Panel, MetricCard, MetricRow, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, StatusBadge, Button } from '../components';

interface TicketRow {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  updated_at: string;
}

interface Stats {
  openTickets: number;
  inProgressTickets: number;
  pendingTickets: number;
  resolvedToday: number;
  avgResponseTime: string;
}

export function DashboardPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    openTickets: 0,
    inProgressTickets: 0,
    pendingTickets: 0,
    resolvedToday: 0,
    avgResponseTime: '—',
  });
  const [recentTickets, setRecentTickets] = useState<TicketRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

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
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

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

            {/* Recent Tickets */}
            <div style={{ marginTop: 'var(--itsm-space-6)' }}>
              <Panel
                title="Recent Tickets"
                subtitle={`${recentTickets.length} most recent`}
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
                            <span
                              style={{
                                fontSize: 'var(--itsm-text-xs)',
                                color: 'var(--itsm-text-secondary)',
                                textTransform: 'capitalize',
                              }}
                            >
                              {ticket.priority}
                            </span>
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
          </>
        )}
      </div>
    </div>
  );
}
