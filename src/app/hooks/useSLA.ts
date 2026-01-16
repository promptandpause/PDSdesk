import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

export interface SLAPolicy {
  id: string;
  policy_key: string;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  match_ticket_type: string | null;
  match_priority: string | null;
  match_category: string | null;
  first_response_minutes: number | null;
  resolution_minutes: number | null;
  created_at: string;
}

export interface TicketSLA {
  ticket_id: string;
  sla_policy_id: string | null;
  first_response_due_at: string | null;
  resolution_due_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SLAStatus = 'within' | 'warning' | 'breached';

export function calculateSLAStatus(dueAt: string | null): { status: SLAStatus; timeRemaining: number } {
  if (!dueAt) {
    return { status: 'within', timeRemaining: Infinity };
  }

  const now = new Date().getTime();
  const due = new Date(dueAt).getTime();
  const remaining = due - now;
  const remainingMinutes = Math.floor(remaining / 60000);

  if (remaining < 0) {
    return { status: 'breached', timeRemaining: remainingMinutes };
  }

  // Warning if less than 1 hour remaining
  if (remaining < 3600000) {
    return { status: 'warning', timeRemaining: remainingMinutes };
  }

  return { status: 'within', timeRemaining: remainingMinutes };
}

export function formatTimeRemaining(minutes: number): string {
  const absMinutes = Math.abs(minutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) {
    return `${days}d ${remainingHours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function useSLAPolicies() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sla_policies')
      .select('*')
      .order('priority');

    if (!error && data) {
      setPolicies(data as SLAPolicy[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchPolicies();
  }, [fetchPolicies]);

  const createPolicy = useCallback(
    async (policy: Omit<SLAPolicy, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('sla_policies')
        .insert(policy)
        .select()
        .single();

      if (!error && data) {
        setPolicies((prev) => [...prev, data as SLAPolicy].sort((a, b) => a.priority - b.priority));
      }
      return { data, error };
    },
    [supabase]
  );

  const updatePolicy = useCallback(
    async (id: string, updates: Partial<SLAPolicy>) => {
      const { data, error } = await supabase
        .from('sla_policies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        setPolicies((prev) => prev.map((p) => (p.id === id ? (data as SLAPolicy) : p)));
      }
      return { data, error };
    },
    [supabase]
  );

  const deletePolicy = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('sla_policies').delete().eq('id', id);

      if (!error) {
        setPolicies((prev) => prev.filter((p) => p.id !== id));
      }
      return { error };
    },
    [supabase]
  );

  return {
    policies,
    loading,
    refresh: fetchPolicies,
    createPolicy,
    updatePolicy,
    deletePolicy,
  };
}

export function useTicketSLA(ticketId: string | null) {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [sla, setSLA] = useState<TicketSLA | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSLA = useCallback(async () => {
    if (!ticketId) {
      setSLA(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('ticket_slas')
      .select('*')
      .eq('ticket_id', ticketId)
      .single();

    if (!error && data) {
      setSLA(data as TicketSLA);
    } else {
      setSLA(null);
    }
    setLoading(false);
  }, [supabase, ticketId]);

  useEffect(() => {
    void fetchSLA();
  }, [fetchSLA]);

  const responseStatus = calculateSLAStatus(sla?.first_response_due_at ?? null);
  const resolutionStatus = calculateSLAStatus(sla?.resolution_due_at ?? null);

  return {
    sla,
    loading,
    refresh: fetchSLA,
    responseStatus,
    resolutionStatus,
    isResponseMet: sla?.first_response_at != null,
    isResolved: sla?.resolved_at != null,
  };
}
