import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Badge, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components';

interface TicketLog {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  requester?: {
    full_name: string | null;
    email: string | null;
  };
  assignee?: {
    full_name: string | null;
    email: string | null;
  };
}

export function CallLogsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [logs, setLogs] = useState<TicketLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const pageSize = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('tickets')
      .select(`
        id, ticket_number, title, status, priority, category, created_at, updated_at,
        requester:profiles!tickets_requester_id_fkey(full_name, email),
        assignee:profiles!tickets_assignee_id_fkey(full_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query = query.gte('created_at', filterDate.toISOString()).lt('created_at', nextDay.toISOString());
    }

    if (search.trim()) {
      query = query.or(`ticket_number.ilike.%${search.trim()}%,title.ilike.%${search.trim()}%`);
    }

    const { data, count, error } = await query;

    if (!error && data) {
      setLogs(data as TicketLog[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [supabase, page, statusFilter, dateFilter, search]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const handleExportCSV = () => {
    let csvContent = 'Ticket Number,Title,Status,Priority,Category,Created At,Requester,Assignee\n';
    
    logs.forEach((log) => {
      csvContent += `"${log.ticket_number}","${log.title.replace(/"/g, '""')}","${log.status}","${log.priority}","${log.category || ''}","${log.created_at}","${log.requester?.full_name || log.requester?.email || ''}","${log.assignee?.full_name || log.assignee?.email || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `call_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'open': return 'info';
      case 'in_progress': return 'warning';
      case 'pending': return 'neutral';
      case 'resolved': return 'success';
      case 'closed': return 'neutral';
      default: return 'neutral';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'neutral';
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      <PageHeader
        title="Call Logs"
        subtitle={`${totalCount} total ticket logs`}
        actions={
          <Button variant="secondary" onClick={handleExportCSV} disabled={logs.length === 0}>
            Export CSV
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {/* Info Banner */}
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
          📋 This log shows all ticket activity. Logs older than 90 days are automatically archived.
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 'var(--itsm-space-3)', marginBottom: 'var(--itsm-space-4)', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
            <Input
              placeholder="Search by ticket # or title..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            style={{
              height: 32,
              padding: '0 var(--itsm-space-3)',
              fontSize: 'var(--itsm-text-sm)',
              border: '1px solid var(--itsm-border-default)',
              borderRadius: 'var(--itsm-input-radius)',
              backgroundColor: 'var(--itsm-surface-base)',
            }}
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(0); }}
            style={{ width: 160 }}
          />
          {(statusFilter || dateFilter || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStatusFilter(''); setDateFilter(''); setSearch(''); setPage(0); }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Table */}
        <Panel noPadding>
          {loading ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              No logs found
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell width={100}>Ticket #</TableHeaderCell>
                  <TableHeaderCell>Title</TableHeaderCell>
                  <TableHeaderCell width={100}>Status</TableHeaderCell>
                  <TableHeaderCell width={80}>Priority</TableHeaderCell>
                  <TableHeaderCell width={150}>Requester</TableHeaderCell>
                  <TableHeaderCell width={150}>Assignee</TableHeaderCell>
                  <TableHeaderCell width={160}>Created</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell mono>
                      <Link
                        to={`/tickets/${log.id}`}
                        style={{ color: 'var(--itsm-primary-600)', textDecoration: 'none' }}
                      >
                        {log.ticket_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                        {log.title.length > 50 ? log.title.slice(0, 50) + '...' : log.title}
                      </div>
                      {log.category && (
                        <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                          {log.category}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(log.status) as any}>
                        {log.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityVariant(log.priority) as any} size="sm">
                        {log.priority}
                      </Badge>
                    </TableCell>
                    <TableCell muted>
                      {log.requester?.full_name || log.requester?.email?.split('@')[0] || '—'}
                    </TableCell>
                    <TableCell muted>
                      {log.assignee?.full_name || log.assignee?.email?.split('@')[0] || 'Unassigned'}
                    </TableCell>
                    <TableCell muted>
                      {formatDateTime(log.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--itsm-space-4)' }}>
            <div style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-tertiary)' }}>
              Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
            </div>
            <div style={{ display: 'flex', gap: 'var(--itsm-space-2)' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
              >
                ← Previous
              </Button>
              <span style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-secondary)', padding: '0 var(--itsm-space-2)' }}>
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
