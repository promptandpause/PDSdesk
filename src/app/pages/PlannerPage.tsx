import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Badge } from '../components';

interface PlannerTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

const STATUS_COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'var(--itsm-gray-500)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--itsm-status-in-progress)' },
  { key: 'review', label: 'Review', color: 'var(--itsm-status-pending)' },
  { key: 'done', label: 'Done', color: 'var(--itsm-status-resolved)' },
];

export function PlannerPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();

  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine'>('mine');

  const fetchTasks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    let query = supabase
      .from('planner_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter === 'mine') {
      query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
    }

    const { data, error } = await query;

    if (!error && data) {
      setTasks(data as PlannerTask[]);
    }
    setLoading(false);
  }, [supabase, user, filter]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      due_date: '',
      tags: '',
    });
    setEditingTask(null);
    setShowForm(false);
  };

  const handleEdit = (task: PlannerTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      tags: task.tags.join(', '),
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
      status: formData.status,
      priority: formData.priority,
      due_date: formData.due_date || null,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      completed_at: formData.status === 'done' ? new Date().toISOString() : null,
    };

    if (editingTask) {
      await supabase.from('planner_tasks').update(payload).eq('id', editingTask.id);
    } else {
      await supabase.from('planner_tasks').insert({
        ...payload,
        created_by: user.id,
        assigned_to: user.id,
      });
    }

    setSaving(false);
    resetForm();
    void fetchTasks();
  };

  const handleStatusChange = async (task: PlannerTask, newStatus: string) => {
    await supabase
      .from('planner_tasks')
      .update({
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', task.id);
    void fetchTasks();
  };

  const handleDelete = async (task: PlannerTask) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    await supabase.from('planner_tasks').delete().eq('id', task.id);
    void fetchTasks();
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="danger">High</Badge>;
      case 'medium':
        return <Badge variant="warning">Medium</Badge>;
      case 'low':
        return <Badge variant="neutral">Low</Badge>;
      default:
        return <Badge variant="neutral">{priority}</Badge>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const isOverdue = date < now;
    const formatted = date.toLocaleDateString();
    return { formatted, isOverdue };
  };

  const tasksByStatus = STATUS_COLUMNS.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => t.status === col.key),
  }));

  return (
    <div>
      <PageHeader
        title="Planner"
        subtitle="Personal task management"
        actions={
          <>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'mine')}
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
              <option value="mine">My Tasks</option>
              <option value="all">All Tasks</option>
            </select>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              New Task
            </Button>
          </>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {showForm && (
          <Panel
            title={editingTask ? 'Edit Task' : 'New Task'}
            style={{ marginBottom: 'var(--itsm-space-4)' }}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Task title"
                  required
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--itsm-space-3)' }}>
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
                      {STATUS_COLUMNS.map((col) => (
                        <option key={col.key} value={col.key}>{col.label}</option>
                      ))}
                    </select>
                  </div>
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
                    </select>
                  </div>
                  <Input
                    label="Due Date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task description..."
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: 'var(--itsm-space-3)',
                    fontSize: 'var(--itsm-text-sm)',
                    border: '1px solid var(--itsm-border-default)',
                    borderRadius: 'var(--itsm-input-radius)',
                    resize: 'vertical',
                    backgroundColor: 'var(--itsm-surface-base)',
                  }}
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                <Input
                  label="Tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., urgent, project-x"
                  hint="Comma-separated"
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-2)' }}>
                <Button variant="ghost" type="button" onClick={resetForm}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={saving} disabled={saving}>
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </Button>
              </div>
            </form>
          </Panel>
        )}

        {/* Kanban-style columns */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--itsm-space-8)', color: 'var(--itsm-text-tertiary)' }}>
            Loading...
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--itsm-space-4)',
              minHeight: 400,
            }}
          >
            {tasksByStatus.map((column) => (
              <div
                key={column.key}
                style={{
                  backgroundColor: 'var(--itsm-surface-sunken)',
                  borderRadius: 'var(--itsm-panel-radius)',
                  padding: 'var(--itsm-space-3)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--itsm-space-2)',
                    marginBottom: 'var(--itsm-space-3)',
                    paddingBottom: 'var(--itsm-space-2)',
                    borderBottom: '2px solid',
                    borderColor: column.color,
                  }}
                >
                  <span style={{ fontWeight: 'var(--itsm-weight-semibold)' as any, fontSize: 'var(--itsm-text-sm)' }}>
                    {column.label}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--itsm-text-xs)',
                      color: 'var(--itsm-text-tertiary)',
                      backgroundColor: 'var(--itsm-gray-200)',
                      padding: '2px 6px',
                      borderRadius: 10,
                    }}
                  >
                    {column.tasks.length}
                  </span>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-2)', overflowY: 'auto' }}>
                  {column.tasks.map((task) => {
                    const dueInfo = formatDate(task.due_date);
                    return (
                      <div
                        key={task.id}
                        style={{
                          backgroundColor: 'var(--itsm-surface-base)',
                          borderRadius: 'var(--itsm-panel-radius)',
                          padding: 'var(--itsm-space-3)',
                          border: '1px solid var(--itsm-border-subtle)',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleEdit(task)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--itsm-space-2)' }}>
                          <span style={{ fontWeight: 'var(--itsm-weight-medium)' as any, fontSize: 'var(--itsm-text-sm)' }}>
                            {task.title}
                          </span>
                          {getPriorityBadge(task.priority)}
                        </div>

                        {task.description && (
                          <p style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginBottom: 'var(--itsm-space-2)', lineHeight: 1.4 }}>
                            {task.description.slice(0, 80)}{task.description.length > 80 ? '...' : ''}
                          </p>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {dueInfo && (
                            <span
                              style={{
                                fontSize: 'var(--itsm-text-xs)',
                                color: dueInfo.isOverdue && task.status !== 'done' ? 'var(--itsm-status-critical)' : 'var(--itsm-text-tertiary)',
                              }}
                            >
                              {dueInfo.isOverdue && task.status !== 'done' ? '⚠ ' : ''}
                              {dueInfo.formatted}
                            </span>
                          )}

                          {task.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: 2 }}>
                              {task.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  style={{
                                    fontSize: 10,
                                    padding: '1px 4px',
                                    backgroundColor: 'var(--itsm-primary-100)',
                                    color: 'var(--itsm-primary-700)',
                                    borderRadius: 2,
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Quick status change */}
                        <div
                          style={{ marginTop: 'var(--itsm-space-2)', display: 'flex', gap: 'var(--itsm-space-1)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {STATUS_COLUMNS.filter((c) => c.key !== task.status).map((col) => (
                            <button
                              key={col.key}
                              type="button"
                              onClick={() => void handleStatusChange(task, col.key)}
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                border: '1px solid var(--itsm-border-subtle)',
                                borderRadius: 3,
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                color: 'var(--itsm-text-tertiary)',
                              }}
                            >
                              → {col.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {column.tasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 'var(--itsm-space-4)', color: 'var(--itsm-text-tertiary)', fontSize: 'var(--itsm-text-xs)' }}>
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
