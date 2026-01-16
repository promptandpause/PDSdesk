import { useState, useCallback } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

interface AIResponse {
  category?: string;
  priority?: string;
  suggestedReply?: string;
  summary?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  keywords?: string[];
}

interface UseAICopilotReturn {
  loading: boolean;
  error: string | null;
  categorizeTicket: (title: string, description: string) => Promise<AIResponse | null>;
  suggestReply: (ticketContent: string, context?: string) => Promise<string | null>;
  summarizeTicket: (comments: string[]) => Promise<string | null>;
  analyzeSentiment: (text: string) => Promise<AIResponse | null>;
}

export function useAICopilot(): UseAICopilotReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callAIEndpoint = useCallback(async (action: string, payload: Record<string, any>): Promise<any> => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-copilot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, ...payload }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `AI request failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI request failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const categorizeTicket = useCallback(async (title: string, description: string): Promise<AIResponse | null> => {
    return callAIEndpoint('categorize', { title, description });
  }, [callAIEndpoint]);

  const suggestReply = useCallback(async (ticketContent: string, context?: string): Promise<string | null> => {
    const result = await callAIEndpoint('suggest_reply', { ticketContent, context });
    return result?.suggestedReply ?? null;
  }, [callAIEndpoint]);

  const summarizeTicket = useCallback(async (comments: string[]): Promise<string | null> => {
    const result = await callAIEndpoint('summarize', { comments });
    return result?.summary ?? null;
  }, [callAIEndpoint]);

  const analyzeSentiment = useCallback(async (text: string): Promise<AIResponse | null> => {
    return callAIEndpoint('sentiment', { text });
  }, [callAIEndpoint]);

  return {
    loading,
    error,
    categorizeTicket,
    suggestReply,
    summarizeTicket,
    analyzeSentiment,
  };
}
