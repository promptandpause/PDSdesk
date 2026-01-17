import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Badge } from '../components';

interface SavedReply {
  id: string;
  user_id: string;
  name: string;
  content: string;
  visibility: 'private' | 'global';
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
    content: '',
    visibility: 'private' as 'private' | 'global',
  });
  const [saving, setSaving] = useState(false);

  const fetchReplies = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('saved_replies')
      .select('*')
      .or(`user_id.eq.${user.id},visibility.eq.global`)
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
      reply.content.toLowerCase().includes(searchLower)
    );
  });

  const resetForm = () => {
    setFormData({
      name: '',
      content: '',
      visibility: 'private',
    });
    setEditingReply(null);
    setShowForm(false);
  };

  const handleEdit = (reply: SavedReply) => {
    setEditingReply(reply);
    setFormData({
      name: reply.name,
      content: reply.content,
      visibility: reply.visibility,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.content.trim() || !user) return;

    setSaving(true);

    const payload = {
      name: formData.name.trim(),
      content: formData.content,
      visibility: formData.visibility,
    };

    let result;
    if (editingReply) {
      result = await supabase
        .from('saved_replies')
        .update(payload)
        .eq('id', editingReply.id);
    } else {
      result = await supabase.from('saved_replies').insert({
        ...payload,
        user_id: user.id,
      });
    }

    if (result.error) {
      console.error('Error saving reply:', result.error);
      alert('Error saving reply: ' + result.error.message);
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

  const handleCopy = (content: string) => {
    void navigator.clipboard.writeText(content);
    alert('Copied to clipboard!');
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
                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                    Visibility
                  </label>
                  <select
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'private' | 'global' })}
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
                    <option value="private">Private (only me)</option>
                    <option value="global">Global (shared with team)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                  Reply Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
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
                  <TableHeaderCell width={100}>Visibility</TableHeaderCell>
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
                        {reply.content.slice(0, 100)}{reply.content.length > 100 ? '...' : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={reply.visibility === 'global' ? 'blue' : 'neutral'}>
                        {reply.visibility === 'global' ? 'Global' : 'Private'}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-1)' }}>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy(reply.content)}>
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
