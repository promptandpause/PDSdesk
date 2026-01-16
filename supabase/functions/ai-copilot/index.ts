import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIRequest {
  action: 'categorize' | 'suggest_reply' | 'summarize' | 'sentiment';
  title?: string;
  description?: string;
  ticketContent?: string;
  context?: string;
  comments?: string[];
  text?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: AIRequest = await req.json();
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      // Fallback responses when OpenAI is not configured
      return handleFallback(body);
    }

    // Call OpenAI API
    const result = await callOpenAI(openaiKey, body);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI Copilot error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function handleFallback(body: AIRequest): Response {
  let result: Record<string, any> = {};

  switch (body.action) {
    case 'categorize':
      // Simple keyword-based categorization
      const text = `${body.title ?? ''} ${body.description ?? ''}`.toLowerCase();
      if (text.includes('password') || text.includes('login') || text.includes('access')) {
        result = { category: 'Access & Authentication', priority: 'high' };
      } else if (text.includes('email') || text.includes('outlook') || text.includes('calendar')) {
        result = { category: 'Email & Calendar', priority: 'medium' };
      } else if (text.includes('network') || text.includes('wifi') || text.includes('internet')) {
        result = { category: 'Network & Connectivity', priority: 'high' };
      } else if (text.includes('printer') || text.includes('print')) {
        result = { category: 'Printing', priority: 'low' };
      } else if (text.includes('software') || text.includes('install') || text.includes('application')) {
        result = { category: 'Software & Applications', priority: 'medium' };
      } else if (text.includes('hardware') || text.includes('laptop') || text.includes('computer') || text.includes('monitor')) {
        result = { category: 'Hardware', priority: 'medium' };
      } else {
        result = { category: 'General IT Support', priority: 'medium' };
      }
      result.keywords = extractKeywords(text);
      break;

    case 'suggest_reply':
      result = {
        suggestedReply: `Thank you for reaching out. I've reviewed your request and will assist you with this issue.\n\nI'll need a bit more information to proceed:\n1. When did this issue first occur?\n2. Have you tried any troubleshooting steps?\n3. Is this affecting other users as well?\n\nPlease let me know and I'll get this resolved for you as quickly as possible.`,
      };
      break;

    case 'summarize':
      const comments = body.comments ?? [];
      if (comments.length === 0) {
        result = { summary: 'No comments to summarize.' };
      } else {
        result = { summary: `Ticket has ${comments.length} comment(s). Latest activity involves ongoing communication between support and the requester.` };
      }
      break;

    case 'sentiment':
      const sentimentText = (body.text ?? '').toLowerCase();
      if (sentimentText.includes('urgent') || sentimentText.includes('frustrated') || sentimentText.includes('angry') || sentimentText.includes('unacceptable')) {
        result = { sentiment: 'negative', keywords: ['urgent', 'frustrated'] };
      } else if (sentimentText.includes('thank') || sentimentText.includes('great') || sentimentText.includes('excellent') || sentimentText.includes('appreciate')) {
        result = { sentiment: 'positive', keywords: ['appreciation'] };
      } else {
        result = { sentiment: 'neutral', keywords: [] };
      }
      break;

    default:
      result = { error: 'Unknown action' };
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  const keywordPatterns = [
    'password', 'login', 'access', 'email', 'outlook', 'calendar',
    'network', 'wifi', 'internet', 'vpn', 'printer', 'print',
    'software', 'install', 'update', 'hardware', 'laptop', 'computer',
    'monitor', 'keyboard', 'mouse', 'phone', 'teams', 'zoom',
  ];

  for (const pattern of keywordPatterns) {
    if (text.includes(pattern)) {
      keywords.push(pattern);
    }
  }

  return keywords.slice(0, 5);
}

async function callOpenAI(apiKey: string, body: AIRequest): Promise<Record<string, any>> {
  let systemPrompt = '';
  let userPrompt = '';

  switch (body.action) {
    case 'categorize':
      systemPrompt = `You are an IT helpdesk assistant. Analyze the ticket and return a JSON object with:
- category: one of "Access & Authentication", "Email & Calendar", "Network & Connectivity", "Printing", "Software & Applications", "Hardware", "General IT Support"
- priority: one of "low", "medium", "high", "critical"
- keywords: array of up to 5 relevant keywords
Only return valid JSON, no other text.`;
      userPrompt = `Title: ${body.title ?? ''}\nDescription: ${body.description ?? ''}`;
      break;

    case 'suggest_reply':
      systemPrompt = `You are a professional IT support agent. Write a helpful, friendly reply to the customer's ticket. Be concise but thorough. Ask clarifying questions if needed.`;
      userPrompt = `Ticket content: ${body.ticketContent ?? ''}\n${body.context ? `Additional context: ${body.context}` : ''}`;
      break;

    case 'summarize':
      systemPrompt = `Summarize the following ticket conversation in 2-3 sentences. Focus on the main issue, current status, and any pending actions.`;
      userPrompt = (body.comments ?? []).join('\n---\n');
      break;

    case 'sentiment':
      systemPrompt = `Analyze the sentiment of the following text. Return a JSON object with:
- sentiment: "positive", "neutral", or "negative"
- keywords: array of words that indicate the sentiment
Only return valid JSON, no other text.`;
      userPrompt = body.text ?? '';
      break;

    default:
      return { error: 'Unknown action' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  // Try to parse as JSON for categorize and sentiment actions
  if (body.action === 'categorize' || body.action === 'sentiment') {
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  }

  // Return as suggestedReply or summary
  if (body.action === 'suggest_reply') {
    return { suggestedReply: content };
  }

  if (body.action === 'summarize') {
    return { summary: content };
  }

  return { result: content };
}
