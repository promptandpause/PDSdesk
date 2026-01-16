import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

export interface OperatorGroup {
  id: string;
  group_key: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OperatorGroupMember {
  group_id: string;
  user_id: string;
  created_at: string;
}

export function useOperatorGroups() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [groups, setGroups] = useState<OperatorGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('operator_groups')
      .select('*')
      .order('name');

    if (!error && data) {
      setGroups(data as OperatorGroup[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  const createGroup = useCallback(
    async (group: Omit<OperatorGroup, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('operator_groups')
        .insert(group)
        .select()
        .single();

      if (!error && data) {
        setGroups((prev) => [...prev, data as OperatorGroup].sort((a, b) => a.name.localeCompare(b.name)));
      }
      return { data, error };
    },
    [supabase]
  );

  const updateGroup = useCallback(
    async (id: string, updates: Partial<OperatorGroup>) => {
      const { data, error } = await supabase
        .from('operator_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        setGroups((prev) => prev.map((g) => (g.id === id ? (data as OperatorGroup) : g)));
      }
      return { data, error };
    },
    [supabase]
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('operator_groups').delete().eq('id', id);

      if (!error) {
        setGroups((prev) => prev.filter((g) => g.id !== id));
      }
      return { error };
    },
    [supabase]
  );

  return {
    groups,
    loading,
    refresh: fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
  };
}

export function useOperatorGroupMembers(groupId: string | null) {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [members, setMembers] = useState<OperatorGroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!groupId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('operator_group_members')
      .select('*')
      .eq('group_id', groupId);

    if (!error && data) {
      setMembers(data as OperatorGroupMember[]);
    }
    setLoading(false);
  }, [supabase, groupId]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const addMember = useCallback(
    async (userId: string) => {
      if (!groupId) return { error: new Error('No group selected') };

      const { error } = await supabase.from('operator_group_members').insert({
        group_id: groupId,
        user_id: userId,
      });

      if (!error) {
        await fetchMembers();
      }
      return { error };
    },
    [supabase, groupId, fetchMembers]
  );

  const removeMember = useCallback(
    async (userId: string) => {
      if (!groupId) return { error: new Error('No group selected') };

      const { error } = await supabase
        .from('operator_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (!error) {
        setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      }
      return { error };
    },
    [supabase, groupId]
  );

  return {
    members,
    loading,
    refresh: fetchMembers,
    addMember,
    removeMember,
  };
}
