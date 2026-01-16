import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { PageHeader } from '../../layout/PageHeader';
import { Panel, Button, Input, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Badge } from '../../components';

interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  actor?: { full_name: string | null; email: string | null } | null;
}

export function AuditLogPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('audit_logs')
      .select('*, actor:profiles!audit_logs_actor_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (entityFilter !== 'all') {
      query = query.eq('entity_type', entityFilter);
    }

    if (actionFilter !== 'all') {
      query = query.eq('action', actionFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setLogs(data as AuditLog[]);
    }
    setLoading(false);
  }, [supabase, entityFilter, actionFilter]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.entity_type.toLowerCase().includes(searchLower) ||
      (log.actor?.full_name?.toLowerCase().includes(searchLower) ?? false) ||
      (log.actor?.email?.toLowerCase().includes(searchLower) ?? false) ||
      JSON.stringify(log.metadata).toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getActionBadge = (action: string) => {
    if (action.includes('create') || action.includes('insert')) {
      return <Badge variant="success">{action}</Badge>;
    }
    if (action.includes('update') || action.includes('edit')) {
      return <Badge variant="info">{action}</Badge>;
    }
    if (action.includes('delete') || action.includes('remove')) {
      return <Badge variant="danger">{action}</Badge>;
    }
    return <Badge variant="neutral">{action}</Badge>;
  };

  const uniqueEntityTypes = [...new Set(logs.map((l) => l.entity_type))].sort();
  const uniqueActions = [...new Set(logs.map((l) => l.action))].sort();

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="System activity and change history"
        breadcrumbs={[
          { label: 'Settings', to: '/settings' },
          { label: 'Audit Log' },
        ]}
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--itsm-space-3)',
            marginBottom: 'var(--itsm-space-4)',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
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
            <option value="all">All Entities</option>
            {uniqueEntityTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
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
            <option value="all">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
          <Button variant="ghost" onClick={() => void fetchLogs()}>
            Refresh
          </Button>
        </div>

        <Panel noPadding>
          {loading ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              Loading...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              No audit logs found
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell width={160}>Timestamp</TableHeaderCell>
                  <TableHeaderCell width={150}>User</TableHeaderCell>
                  <TableHeaderCell width={120}>Action</TableHeaderCell>
                  <TableHeaderCell width={120}>Entity</TableHeaderCell>
                  <TableHeaderCell>Details</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell muted>{formatDate(log.created_at)}</TableCell>
                    <TableCell>
                      {log.actor ? (
                        <div>
                          <div style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                            {log.actor.full_name ?? 'Unknown'}
                          </div>
                          <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                            {log.actor.email}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--itsm-text-tertiary)' }}>System</span>
                      )}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div>
                        <span style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>{log.entity_type}</span>
                        {log.entity_id && (
                          <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', fontFamily: 'var(--itsm-font-mono)' }}>
                            {log.entity_id.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {Object.keys(log.metadata).length > 0 ? (
                        <details style={{ fontSize: 'var(--itsm-text-xs)' }}>
                          <summary style={{ cursor: 'pointer', color: 'var(--itsm-primary-600)' }}>
                            View details
                          </summary>
                          <pre
                            style={{
                              marginTop: 'var(--itsm-space-2)',
                              padding: 'var(--itsm-space-2)',
                              backgroundColor: 'var(--itsm-surface-sunken)',
                              borderRadius: 4,
                              overflow: 'auto',
                              maxHeight: 150,
                              fontSize: 11,
                            }}
                          >
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span style={{ color: 'var(--itsm-text-tertiary)' }}>—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>

        <div style={{ marginTop: 'var(--itsm-space-3)', fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
          Showing {filteredLogs.length} of {logs.length} logs (max 200)
        </div>
      </div>
    </div>
  );
}
