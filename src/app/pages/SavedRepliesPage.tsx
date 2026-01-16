import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Badge } from '../components';

interface SavedReply {
  id: string;
  user_id: string;
  name: string;
  shortcut: string | null;
  body: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export function SavedRepliesPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();

  const [replies, setReplies] = useState<SavedReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingReply, setEditingReply] = useState<SavedReply | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    shortcut: '',
    body: '',
    is_shared: false,
  });
  const [saving, setSaving] = useState(false);

  const fetchReplies = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('saved_replies')
      .select('*')
      .or(`user_id.eq.${user.id},is_shared.eq.true`)
      .order('name');

    if (!error && data) {
      setReplies(data as SavedReply[]);
    }
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    void fetchReplies();
  }, [fetchReplies]);

  const filteredReplies = replies.filter((reply) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      reply.name.toLowerCase().includes(searchLower) ||
      (reply.shortcut?.toLowerCase().includes(searchLower) ?? false) ||
      reply.body.toLowerCase().includes(searchLower)
    );
  });

  const resetForm = () => {
    setFormData({
      name: '',
      shortcut: '',
      body: '',
      is_shared: false,
    });
    setEditingReply(null);
    setShowForm(false);
  };

  const handleEdit = (reply: SavedReply) => {
    setEditingReply(reply);
    setFormData({
      name: reply.name,
      shortcut: reply.shortcut ?? '',
      body: reply.body,
      is_shared: reply.is_shared,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.body.trim() || !user) return;

    setSaving(true);

    const payload = {
      name: formData.name.trim(),
      shortcut: formData.shortcut.trim() || null,
      body: formData.body,
      is_shared: formData.is_shared,
    };

    if (editingReply) {
      await supabase
        .from('saved_replies')
        .update(payload)
        .eq('id', editingReply.id);
    } else {
      await supabase.from('saved_replies').insert({
        ...payload,
        user_id: user.id,
      });
    }

    setSaving(false);
    resetForm();
    void fetchReplies();
  };

  const handleDelete = async (reply: SavedReply) => {
    if (!confirm(`Delete saved reply "${reply.name}"?`)) return;
    await supabase.from('saved_replies').delete().eq('id', reply.id);
    void fetchReplies();
  };

  const handleCopy = (body: string) => {
    void navigator.clipboard.writeText(body);
  };

  return (
    <div>
      <PageHeader
        title="Saved Replies"
        subtitle="Reusable response templates for tickets"
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            New Reply
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {showForm && (
          <Panel
            title={editingReply ? 'Edit Saved Reply' : 'New Saved Reply'}
            style={{ marginBottom: 'var(--itsm-space-4)' }}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Password Reset Instructions"
                  required
                />
                <Input
                  label="Shortcut"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                  placeholder="e.g., /pwreset"
                  hint="Type this in ticket reply to insert"
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                  Reply Content
                </label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Enter your saved reply text..."
                  required
                  style={{
                    width: '100%',
                    minHeight: 150,
                    padding: 'var(--itsm-space-3)',
                    fontSize: 'var(--itsm-text-sm)',
                    fontFamily: 'inherit',
                    lineHeight: 'var(--itsm-leading-relaxed)',
                    border: '1px solid var(--itsm-border-default)',
                    borderRadius: 'var(--itsm-input-radius)',
                    resize: 'vertical',
                    backgroundColor: 'var(--itsm-surface-base)',
                  }}
                />
                <div style={{ marginTop: 'var(--itsm-space-2)', fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                  Tip: Use {'{{requester_name}}'}, {'{{ticket_number}}'}, {'{{agent_name}}'} for dynamic placeholders
                </div>
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_shared}
                    onChange={(e) => setFormData({ ...formData, is_shared: e.target.checked })}
                  />
                  <span style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-primary)' }}>
                    Share with team (visible to all agents)
                  </span>
                </label>
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-2)' }}>
                <Button variant="ghost" type="button" onClick={resetForm}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={saving} disabled={saving}>
                  {editingReply ? 'Save Changes' : 'Create Reply'}
                </Button>
              </div>
            </form>
          </Panel>
        )}

        {/* Search */}
        <div style={{ marginBottom: 'var(--itsm-space-4)', maxWidth: 300 }}>
          <Input
            placeholder="Search replies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Panel noPadding>
          {loading ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              Loading...
            </div>
          ) : filteredReplies.length === 0 ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              No saved replies found
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell width={120}>Shortcut</TableHeaderCell>
                  <TableHeaderCell width={80}>Scope</TableHeaderCell>
                  <TableHeaderCell width={150} align="right">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {filteredReplies.map((reply) => (
                  <TableRow key={reply.id}>
                    <TableCell>
                      <div style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                        {reply.name}
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--itsm-text-xs)',
                          color: 'var(--itsm-text-tertiary)',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 400,
                        }}
                      >
                        {reply.body.slice(0, 100)}...
                      </div>
                    </TableCell>
                    <TableCell mono muted>{reply.shortcut ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={reply.is_shared ? 'blue' : 'neutral'}>
                        {reply.is_shared ? 'Shared' : 'Personal'}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-1)' }}>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy(reply.body)}>
                          Copy
                        </Button>
                        {reply.user_id === user?.id && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(reply)}>
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => void handleDelete(reply)}>
                              Delete
                            </Button>
                          </>
                        )}
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
