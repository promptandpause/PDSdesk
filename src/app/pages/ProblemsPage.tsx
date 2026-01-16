import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, StatusBadge, PriorityBadge } from '../components';

interface Problem {
  id: string;
  problem_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function ProblemsPage() {
  const navigate = useNavigate();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();

  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [showForm, setShowForm] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
  });
  const [saving, setSaving] = useState(false);

  const fetchProblems = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('problems')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter === 'open') {
      query = query.in('status', ['open', 'investigating', 'root_cause_identified']);
    } else if (statusFilter === 'closed') {
      query = query.in('status', ['resolved', 'closed']);
    }

    const { data, error } = await query;

    if (!error && data) {
      setProblems(data as Problem[]);
    }
    setLoading(false);
  }, [supabase, statusFilter]);

  useEffect(() => {
    void fetchProblems();
  }, [fetchProblems]);

  const filteredProblems = problems.filter((problem) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      problem.title.toLowerCase().includes(searchLower) ||
      problem.problem_number.toLowerCase().includes(searchLower) ||
      (problem.description?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      status: 'open',
    });
    setEditingProblem(null);
    setShowForm(false);
  };

  const handleEdit = (problem: Problem) => {
    setEditingProblem(problem);
    setFormData({
      title: problem.title,
      description: problem.description ?? '',
      priority: problem.priority,
      status: problem.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !user) return;

    setSaving(true);

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      priority: formData.priority,
      status: formData.status,
    };

    if (editingProblem) {
      await supabase.from('problems').update(payload).eq('id', editingProblem.id);
    } else {
      await supabase.from('problems').insert({
        ...payload,
        created_by: user.id,
      });
    }

    setSaving(false);
    resetForm();
    void fetchProblems();
  };

  const handleDelete = async (problem: Problem) => {
    if (!confirm(`Delete problem "${problem.problem_number}"?`)) return;
    await supabase.from('problems').delete().eq('id', problem.id);
    void fetchProblems();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  return (
    <div>
      <PageHeader
        title="Problem Management"
        subtitle="Track and resolve root causes of incidents"
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            New Problem
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {showForm && (
          <Panel
            title={editingProblem ? 'Edit Problem' : 'New Problem'}
            style={{ marginBottom: 'var(--itsm-space-4)' }}
          >
            <form onSubmit={handleSubmit}>
              <Input
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Problem title"
                required
              />

              <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the problem, symptoms, and affected systems..."
                  style={{
                    width: '100%',
                    minHeight: 100,
                    padding: 'var(--itsm-space-3)',
                    fontSize: 'var(--itsm-text-sm)',
                    border: '1px solid var(--itsm-border-default)',
                    borderRadius: 'var(--itsm-input-radius)',
                    resize: 'vertical',
                    backgroundColor: 'var(--itsm-surface-base)',
                  }}
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
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
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="root_cause_identified">Root Cause Identified</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-2)' }}>
                <Button variant="ghost" type="button" onClick={resetForm}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={saving} disabled={saving}>
                  {editingProblem ? 'Save Changes' : 'Create Problem'}
                </Button>
              </div>
            </form>
          </Panel>
        )}

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
              placeholder="Search problems..."
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
            <option value="open">Open Problems</option>
            <option value="closed">Closed Problems</option>
            <option value="all">All Problems</option>
          </select>
        </div>

        <Panel noPadding>
          {loading ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              Loading...
            </div>
          ) : filteredProblems.length === 0 ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              No problems found
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell width={100}>Number</TableHeaderCell>
                  <TableHeaderCell>Title</TableHeaderCell>
                  <TableHeaderCell width={120}>Status</TableHeaderCell>
                  <TableHeaderCell width={100}>Priority</TableHeaderCell>
                  <TableHeaderCell width={100}>Created</TableHeaderCell>
                  <TableHeaderCell width={100} align="right">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {filteredProblems.map((problem) => (
                  <TableRow key={problem.id} onClick={() => handleEdit(problem)} style={{ cursor: 'pointer' }}>
                    <TableCell mono>{problem.problem_number}</TableCell>
                    <TableCell>
                      <div style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                        {problem.title}
                      </div>
                      {problem.description && (
                        <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginTop: 2 }}>
                          {problem.description.slice(0, 80)}{problem.description.length > 80 ? '...' : ''}
                        </div>
                      )}
                    </TableCell>
                    <TableCell><StatusBadge status={problem.status} /></TableCell>
                    <TableCell><PriorityBadge priority={problem.priority} /></TableCell>
                    <TableCell muted>{formatDate(problem.created_at)}</TableCell>
                    <TableCell align="right">
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-1)' }} onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(problem)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void handleDelete(problem)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
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
