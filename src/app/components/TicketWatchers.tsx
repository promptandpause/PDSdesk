import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { Button, Badge } from './index';

interface Watcher {
  id: string;
  user_id: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

interface TicketWatchersProps {
  ticketId: string;
}

export function TicketWatchers({ ticketId }: TicketWatchersProps) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();

  const [watchers, setWatchers] = useState<Watcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const isWatching = useMemo(() => {
    return watchers.some((w) => w.user_id === user?.id);
  }, [watchers, user]);

  const fetchWatchers = useCallback(async () => {
    const { data } = await supabase
      .from('ticket_watchers')
      .select('*, profile:profiles(full_name, email)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (data) {
      setWatchers(data as Watcher[]);
    }
    setLoading(false);
  }, [supabase, ticketId]);

  useEffect(() => {
    void fetchWatchers();
  }, [fetchWatchers]);

  const handleToggleWatch = async () => {
    if (!user) return;
    setToggling(true);

    if (isWatching) {
      await supabase
        .from('ticket_watchers')
        .delete()
        .eq('ticket_id', ticketId)
        .eq('user_id', user.id);
    } else {
      await supabase.from('ticket_watchers').insert({
        ticket_id: ticketId,
        user_id: user.id,
      });
    }

    await fetchWatchers();
    setToggling(false);
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
        <span style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
          {watchers.length} watcher{watchers.length !== 1 ? 's' : ''}
        </span>
        <Button
          variant={isWatching ? 'secondary' : 'ghost'}
          size="sm"
          onClick={handleToggleWatch}
          loading={toggling}
        >
          {isWatching ? '◉ Watching' : '○ Watch'}
        </Button>
      </div>

      {watchers.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--itsm-space-1)' }}>
          {watchers.map((watcher) => (
            <Badge key={watcher.id} variant="neutral" size="sm">
              {watcher.profile?.full_name || watcher.profile?.email?.split('@')[0] || watcher.user_id.slice(0, 8)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
