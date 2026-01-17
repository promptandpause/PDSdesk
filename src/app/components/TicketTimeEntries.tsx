import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { Button, Input, Badge } from './index';

interface TimeEntry {
  id: string;
  ticket_id: string;
  user_id: string;
  duration_minutes: number;
  description: string | null;
  work_date: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

interface TicketTimeEntriesProps {
  ticketId: string;
}

export function TicketTimeEntries({ ticketId }: TicketTimeEntriesProps) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    hours: '',
    minutes: '',
    description: '',
    work_date: new Date().toISOString().split('T')[0],
  });

  const totalMinutes = useMemo(() => {
    return entries.reduce((sum, e) => sum + e.duration_minutes, 0);
  }, [entries]);

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase
      .from('ticket_time_entries')
      .select('*, profile:profiles(full_name, email)')
      .eq('ticket_id', ticketId)
      .order('work_date', { ascending: false });

    if (data) {
      setEntries(data as TimeEntry[]);
    }
    setLoading(false);
  }, [supabase, ticketId]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const hours = parseInt(formData.hours) || 0;
    const minutes = parseInt(formData.minutes) || 0;
    const totalMins = hours * 60 + minutes;

    if (totalMins <= 0) return;

    setSaving(true);

    await supabase.from('ticket_time_entries').insert({
      ticket_id: ticketId,
      user_id: user.id,
      duration_minutes: totalMins,
      description: formData.description.trim() || null,
      work_date: formData.work_date,
    });

    setFormData({
      hours: '',
      minutes: '',
      description: '',
      work_date: new Date().toISOString().split('T')[0],
    });
    setShowForm(false);
    setSaving(false);
    await fetchEntries();
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('Delete this time entry?')) return;
    await supabase.from('ticket_time_entries').delete().eq('id', entryId);
    await fetchEntries();
  };

  if (loading) {
    return (
      <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--itsm-space-2)' }}>
        <div>
          <span style={{ fontSize: 'var(--itsm-text-sm)', fontWeight: 'var(--itsm-weight-semibold)' as any }}>
            {formatDuration(totalMinutes)}
          </span>
          <span style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginLeft: 'var(--itsm-space-1)' }}>
            logged
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Log Time'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 'var(--itsm-space-3)', padding: 'var(--itsm-space-3)', backgroundColor: 'var(--itsm-surface-sunken)', borderRadius: 'var(--itsm-panel-radius)' }}>
          <div style={{ display: 'flex', gap: 'var(--itsm-space-2)', marginBottom: 'var(--itsm-space-2)' }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Hours"
                type="number"
                min="0"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="0"
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label="Minutes"
                type="number"
                min="0"
                max="59"
                value={formData.minutes}
                onChange={(e) => setFormData({ ...formData, minutes: e.target.value })}
                placeholder="0"
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label="Date"
                type="date"
                value={formData.work_date}
                onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
              />
            </div>
          </div>
          <Input
            label="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What did you work on?"
          />
          <div style={{ marginTop: 'var(--itsm-space-2)', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" size="sm" type="submit" loading={saving}>
              Log Time
            </Button>
          </div>
        </form>
      )}

      {entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-2)' }}>
          {entries.slice(0, 5).map((entry) => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: 'var(--itsm-space-2)',
                backgroundColor: 'var(--itsm-surface-sunken)',
                borderRadius: 'var(--itsm-panel-radius)',
                fontSize: 'var(--itsm-text-xs)',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)' }}>
                  <Badge variant="info" size="sm">{formatDuration(entry.duration_minutes)}</Badge>
                  <span style={{ color: 'var(--itsm-text-tertiary)' }}>
                    {new Date(entry.work_date).toLocaleDateString()}
                  </span>
                </div>
                {entry.description && (
                  <div style={{ marginTop: 'var(--itsm-space-1)', color: 'var(--itsm-text-secondary)' }}>
                    {entry.description}
                  </div>
                )}
                <div style={{ marginTop: 'var(--itsm-space-1)', color: 'var(--itsm-text-tertiary)' }}>
                  by {entry.profile?.full_name || entry.profile?.email?.split('@')[0] || 'Unknown'}
                </div>
              </div>
              {entry.user_id === user?.id && (
                <button
                  onClick={() => void handleDelete(entry.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--itsm-text-tertiary)',
                    fontSize: 'var(--itsm-text-xs)',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {entries.length > 5 && (
            <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', textAlign: 'center' }}>
              +{entries.length - 5} more entries
            </div>
          )}
        </div>
      )}
    </div>
  );
}
