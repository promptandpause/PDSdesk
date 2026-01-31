import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Badge } from '../components';

interface Article {
  id: string;
  slug: string;
  title: string;
  body: string;
  category: string | null;
  status: string;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  view_count: number;
}

export function KBArticleViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { roles } = useAuth();

  const isAgent = roles.includes('operator') || roles.includes('service_desk_admin') || roles.includes('global_admin');

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<Article | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      
      // Increment view count (silently fail if RPC doesn't exist)
      try {
        await supabase.rpc('increment_kb_view_count', { article_id: id });
      } catch {
        // RPC may not exist
      }

      const { data, error } = await supabase
        .from('knowledge_articles')
        .select('*')
        .eq('id', id)
        .single();

      if (cancelled) return;

      if (!error && data) {
        setArticle(data as Article);
      }
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Simple markdown-like rendering (basic support)
  const renderContent = (content: string) => {
    // Split by double newlines for paragraphs
    const paragraphs = content.split(/\n\n+/);
    
    return paragraphs.map((para, idx) => {
      // Check for headers
      if (para.startsWith('### ')) {
        return (
          <h3 key={idx} style={{ 
            fontSize: 'var(--itsm-text-lg)', 
            fontWeight: 'var(--itsm-weight-semibold)' as any,
            marginTop: 'var(--itsm-space-6)',
            marginBottom: 'var(--itsm-space-3)',
            color: 'var(--itsm-text-primary)',
          }}>
            {para.slice(4)}
          </h3>
        );
      }
      if (para.startsWith('## ')) {
        return (
          <h2 key={idx} style={{ 
            fontSize: 'var(--itsm-text-xl)', 
            fontWeight: 'var(--itsm-weight-semibold)' as any,
            marginTop: 'var(--itsm-space-6)',
            marginBottom: 'var(--itsm-space-3)',
            color: 'var(--itsm-text-primary)',
          }}>
            {para.slice(3)}
          </h2>
        );
      }
      if (para.startsWith('# ')) {
        return (
          <h1 key={idx} style={{ 
            fontSize: 'var(--itsm-text-2xl)', 
            fontWeight: 'var(--itsm-weight-bold)' as any,
            marginTop: 'var(--itsm-space-6)',
            marginBottom: 'var(--itsm-space-3)',
            color: 'var(--itsm-text-primary)',
          }}>
            {para.slice(2)}
          </h1>
        );
      }

      // Check for bullet lists
      if (para.match(/^[-*]\s/m)) {
        const items = para.split(/\n/).filter(line => line.trim());
        return (
          <ul key={idx} style={{ 
            marginBottom: 'var(--itsm-space-4)',
            paddingLeft: 'var(--itsm-space-6)',
          }}>
            {items.map((item, i) => (
              <li key={i} style={{ 
                marginBottom: 'var(--itsm-space-2)',
                color: 'var(--itsm-text-secondary)',
                lineHeight: 'var(--itsm-leading-relaxed)',
              }}>
                {item.replace(/^[-*]\s/, '')}
              </li>
            ))}
          </ul>
        );
      }

      // Check for numbered lists
      if (para.match(/^\d+\.\s/m)) {
        const items = para.split(/\n/).filter(line => line.trim());
        return (
          <ol key={idx} style={{ 
            marginBottom: 'var(--itsm-space-4)',
            paddingLeft: 'var(--itsm-space-6)',
          }}>
            {items.map((item, i) => (
              <li key={i} style={{ 
                marginBottom: 'var(--itsm-space-2)',
                color: 'var(--itsm-text-secondary)',
                lineHeight: 'var(--itsm-leading-relaxed)',
              }}>
                {item.replace(/^\d+\.\s/, '')}
              </li>
            ))}
          </ol>
        );
      }

      // Check for images
      const imageMatch = para.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imageMatch) {
        return (
          <div key={idx} style={{ marginBottom: 'var(--itsm-space-4)' }}>
            <img 
              src={imageMatch[2]} 
              alt={imageMatch[1]} 
              style={{ 
                maxWidth: '100%', 
                borderRadius: 'var(--itsm-panel-radius)',
                border: '1px solid var(--itsm-border-default)',
              }} 
            />
          </div>
        );
      }

      // Check for code blocks
      if (para.startsWith('```')) {
        const code = para.replace(/^```\w*\n?/, '').replace(/```$/, '');
        return (
          <pre key={idx} style={{
            backgroundColor: 'var(--itsm-surface-raised)',
            padding: 'var(--itsm-space-4)',
            borderRadius: 'var(--itsm-panel-radius)',
            overflow: 'auto',
            marginBottom: 'var(--itsm-space-4)',
            fontSize: 'var(--itsm-text-sm)',
            fontFamily: 'var(--itsm-font-mono)',
            border: '1px solid var(--itsm-border-default)',
          }}>
            <code>{code}</code>
          </pre>
        );
      }

      // Regular paragraph with inline formatting
      let text = para;
      // Bold
      text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // Italic
      text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      // Inline code
      text = text.replace(/`([^`]+)`/g, '<code style="background:var(--itsm-surface-raised);padding:2px 6px;border-radius:4px;font-size:0.9em;">$1</code>');
      // Links
      text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--itsm-primary-600);">$1</a>');

      return (
        <p 
          key={idx} 
          style={{ 
            marginBottom: 'var(--itsm-space-4)',
            color: 'var(--itsm-text-secondary)',
            lineHeight: 'var(--itsm-leading-relaxed)',
            fontSize: 'var(--itsm-text-base)',
          }}
          dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br />') }}
        />
      );
    });
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Loading..." />
        <div style={{ padding: 'var(--itsm-space-6)', color: 'var(--itsm-text-tertiary)' }}>
          Loading article...
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div>
        <PageHeader title="Article Not Found" />
        <div style={{ padding: 'var(--itsm-space-6)' }}>
          <Panel>
            <div style={{ textAlign: 'center', padding: 'var(--itsm-space-8)' }}>
              <p style={{ color: 'var(--itsm-text-tertiary)', marginBottom: 'var(--itsm-space-4)' }}>
                The article you're looking for doesn't exist or has been removed.
              </p>
              <Button variant="primary" onClick={() => navigate('/kb')}>
                Back to Knowledge Base
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={article.title}
        breadcrumbs={[
          { label: 'Knowledge Base', to: '/kb' },
          { label: article.title },
        ]}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('/kb')}>
              ← Back
            </Button>
            {isAgent && (
              <Button variant="secondary" onClick={() => navigate(`/kb/${article.id}/edit`)}>
                Edit Article
              </Button>
            )}
          </>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)', maxWidth: 900 }}>
        <Panel>
          {/* Article Header */}
          <div style={{ 
            borderBottom: '1px solid var(--itsm-border-default)', 
            paddingBottom: 'var(--itsm-space-4)',
            marginBottom: 'var(--itsm-space-6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-3)', marginBottom: 'var(--itsm-space-3)' }}>
              {article.category && (
                <Badge variant="info">{article.category}</Badge>
              )}
              <Badge variant={article.status === 'published' ? 'success' : 'neutral'}>
                {article.status}
              </Badge>
            </div>
            
            <h1 style={{ 
              fontSize: 'var(--itsm-text-2xl)', 
              fontWeight: 'var(--itsm-weight-bold)' as any,
              color: 'var(--itsm-text-primary)',
              marginBottom: 'var(--itsm-space-3)',
            }}>
              {article.title}
            </h1>
            
            <div style={{ 
              display: 'flex', 
              gap: 'var(--itsm-space-4)', 
              fontSize: 'var(--itsm-text-sm)',
              color: 'var(--itsm-text-tertiary)',
            }}>
              <span>Updated {formatDate(article.updated_at)}</span>
              <span>•</span>
              <span>{article.view_count} views</span>
            </div>
          </div>

          {/* Article Content */}
          <div style={{ minHeight: 200 }}>
            {article.body ? renderContent(article.body) : (
              <p style={{ color: 'var(--itsm-text-tertiary)', fontStyle: 'italic' }}>
                This article has no content yet.
              </p>
            )}
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div style={{ 
              marginTop: 'var(--itsm-space-6)', 
              paddingTop: 'var(--itsm-space-4)',
              borderTop: '1px solid var(--itsm-border-default)',
            }}>
              <div style={{ 
                fontSize: 'var(--itsm-text-xs)', 
                color: 'var(--itsm-text-tertiary)',
                marginBottom: 'var(--itsm-space-2)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Tags
              </div>
              <div style={{ display: 'flex', gap: 'var(--itsm-space-2)', flexWrap: 'wrap' }}>
                {article.tags.map((tag, idx) => (
                  <span 
                    key={idx}
                    style={{
                      padding: 'var(--itsm-space-1) var(--itsm-space-2)',
                      backgroundColor: 'var(--itsm-surface-raised)',
                      borderRadius: 'var(--itsm-badge-radius)',
                      fontSize: 'var(--itsm-text-xs)',
                      color: 'var(--itsm-text-secondary)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
