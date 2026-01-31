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

interface TOCItem {
  level: number;
  title: string;
  id: string;
}

export function KBArticleViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { roles } = useAuth();

  const isAgent = roles.includes('operator') || roles.includes('service_desk_admin') || roles.includes('global_admin');

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [toc, setToc] = useState<TOCItem[]>([]);

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
        // Generate table of contents
        setToc(extractTOC((data as Article).body));
        // Load related articles
        void loadRelatedArticles((data as Article).category, (data as Article).id);
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

  // Extract table of contents from markdown headers
  const extractTOC = (content: string): TOCItem[] => {
    const lines = content.split('\n');
    const tocItems: TOCItem[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        tocItems.push({
          level: 1,
          title: trimmed.slice(2),
          id: slugify(trimmed.slice(2)),
        });
      } else if (trimmed.startsWith('## ')) {
        tocItems.push({
          level: 2,
          title: trimmed.slice(3),
          id: slugify(trimmed.slice(3)),
        });
      } else if (trimmed.startsWith('### ')) {
        tocItems.push({
          level: 3,
          title: trimmed.slice(4),
          id: slugify(trimmed.slice(4)),
        });
      }
    });
    
    return tocItems;
  };

  // Create a URL-friendly slug from text
  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  };

  // Load related articles from the same category
  const loadRelatedArticles = async (category: string | null, currentId: string) => {
    if (!category) return;
    
    const { data } = await supabase
      .from('knowledge_articles')
      .select('id, title, slug, category')
      .eq('category', category)
      .neq('id', currentId)
      .eq('status', 'published')
      .limit(5);
    
    if (data) {
      setRelatedArticles(data as Article[]);
    }
  };

  // Scroll to section when TOC item is clicked
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Apply inline formatting (bold, italic, code, links)
  const applyInlineFormatting = (text: string): string => {
    let result = text;
    // Bold
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic
    result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Inline code
    result = result.replace(/`([^`]+)`/g, '<code style="background:var(--itsm-surface-raised);padding:2px 6px;border-radius:4px;font-size:0.9em;font-family:monospace;">$1</code>');
    // Links
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--itsm-primary-600);text-decoration:underline;">$1</a>');
    return result;
  };

  // Render markdown content line by line for better control
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    let key = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        i++;
        continue;
      }

      // H1 Header
      if (trimmedLine.startsWith('# ')) {
        const title = trimmedLine.slice(2);
        const headerId = slugify(title);
        elements.push(
          <h1 key={key++} id={headerId} style={{ 
            fontSize: 'var(--itsm-text-2xl)', 
            fontWeight: 600,
            marginTop: 'var(--itsm-space-6)',
            marginBottom: 'var(--itsm-space-4)',
            color: 'var(--itsm-text-primary)',
            borderBottom: '1px solid var(--itsm-border-default)',
            paddingBottom: 'var(--itsm-space-2)',
            scrollMarginTop: '80px',
          }}>
            {title}
          </h1>
        );
        i++;
        continue;
      }

      // H2 Header
      if (trimmedLine.startsWith('## ')) {
        const title = trimmedLine.slice(3);
        const headerId = slugify(title);
        elements.push(
          <h2 key={key++} id={headerId} style={{ 
            fontSize: 'var(--itsm-text-xl)', 
            fontWeight: 600,
            marginTop: 'var(--itsm-space-5)',
            marginBottom: 'var(--itsm-space-3)',
            color: 'var(--itsm-text-primary)',
            scrollMarginTop: '80px',
          }}>
            {title}
          </h2>
        );
        i++;
        continue;
      }

      // H3 Header
      if (trimmedLine.startsWith('### ')) {
        const title = trimmedLine.slice(4);
        const headerId = slugify(title);
        elements.push(
          <h3 key={key++} id={headerId} style={{ 
            fontSize: 'var(--itsm-text-lg)', 
            fontWeight: 600,
            marginTop: 'var(--itsm-space-4)',
            marginBottom: 'var(--itsm-space-2)',
            color: 'var(--itsm-text-primary)',
            scrollMarginTop: '80px',
          }}>
            {title}
          </h3>
        );
        i++;
        continue;
      }

      // Code block
      if (trimmedLine.startsWith('```')) {
        const codeLines: string[] = [];
        i++; // Skip opening ```
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // Skip closing ```
        elements.push(
          <pre key={key++} style={{
            backgroundColor: 'var(--itsm-surface-raised)',
            padding: 'var(--itsm-space-4)',
            borderRadius: 'var(--itsm-panel-radius)',
            overflow: 'auto',
            marginBottom: 'var(--itsm-space-4)',
            fontSize: 'var(--itsm-text-sm)',
            fontFamily: 'monospace',
            border: '1px solid var(--itsm-border-default)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        continue;
      }

      // Bullet list (- or *)
      if (trimmedLine.match(/^[-*]\s/)) {
        const listItems: string[] = [];
        while (i < lines.length && lines[i].trim().match(/^[-*]\s/)) {
          listItems.push(lines[i].trim().replace(/^[-*]\s/, ''));
          i++;
        }
        elements.push(
          <ul key={key++} style={{ 
            marginBottom: 'var(--itsm-space-4)',
            paddingLeft: 'var(--itsm-space-6)',
            listStyleType: 'disc',
          }}>
            {listItems.map((item, idx) => (
              <li key={idx} style={{ 
                marginBottom: 'var(--itsm-space-2)',
                color: 'var(--itsm-text-secondary)',
                lineHeight: '1.6',
              }}
              dangerouslySetInnerHTML={{ __html: applyInlineFormatting(item) }}
              />
            ))}
          </ul>
        );
        continue;
      }

      // Numbered list
      if (trimmedLine.match(/^\d+\.\s/)) {
        const listItems: string[] = [];
        while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
          listItems.push(lines[i].trim().replace(/^\d+\.\s/, ''));
          i++;
        }
        elements.push(
          <ol key={key++} style={{ 
            marginBottom: 'var(--itsm-space-4)',
            paddingLeft: 'var(--itsm-space-6)',
            listStyleType: 'decimal',
          }}>
            {listItems.map((item, idx) => (
              <li key={idx} style={{ 
                marginBottom: 'var(--itsm-space-2)',
                color: 'var(--itsm-text-secondary)',
                lineHeight: '1.6',
              }}
              dangerouslySetInnerHTML={{ __html: applyInlineFormatting(item) }}
              />
            ))}
          </ol>
        );
        continue;
      }

      // Image
      const imageMatch = trimmedLine.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageMatch) {
        elements.push(
          <div key={key++} style={{ marginBottom: 'var(--itsm-space-4)' }}>
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
        i++;
        continue;
      }

      // Regular paragraph - collect consecutive non-special lines
      const paragraphLines: string[] = [];
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        // Stop if we hit a special line or empty line
        if (!currentLine || 
            currentLine.startsWith('#') || 
            currentLine.startsWith('```') ||
            currentLine.match(/^[-*]\s/) ||
            currentLine.match(/^\d+\.\s/) ||
            currentLine.match(/^!\[/)) {
          break;
        }
        paragraphLines.push(currentLine);
        i++;
      }

      if (paragraphLines.length > 0) {
        const paragraphText = paragraphLines.join(' ');
        elements.push(
          <p 
            key={key++} 
            style={{ 
              marginBottom: 'var(--itsm-space-4)',
              color: 'var(--itsm-text-secondary)',
              lineHeight: '1.7',
              fontSize: 'var(--itsm-text-base)',
            }}
            dangerouslySetInnerHTML={{ __html: applyInlineFormatting(paragraphText) }}
          />
        );
      }
    }

    return elements;
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

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        <div style={{ display: 'flex', gap: 'var(--itsm-space-6)', alignItems: 'flex-start' }}>
          {/* Main Article Content */}
          <div style={{ flex: 1 }}>
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

          {/* Sidebar */}
          <div style={{ width: 280, flexShrink: 0 }}>
            {/* Table of Contents */}
            {toc.length > 0 && (
              <Panel style={{ marginBottom: 'var(--itsm-space-4)' }}>
                <div style={{ 
                  fontSize: 'var(--itsm-text-sm)', 
                  fontWeight: 600,
                  color: 'var(--itsm-text-primary)',
                  marginBottom: 'var(--itsm-space-3)',
                  paddingBottom: 'var(--itsm-space-2)',
                  borderBottom: '1px solid var(--itsm-border-default)',
                }}>
                  Contents
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-1)' }}>
                  {toc.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => scrollToSection(item.id)}
                      style={{
                        textAlign: 'left',
                        padding: 'var(--itsm-space-1) var(--itsm-space-2)',
                        paddingLeft: `calc(var(--itsm-space-2) + ${(item.level - 1) * 12}px)`,
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--itsm-button-radius)',
                        cursor: 'pointer',
                        fontSize: item.level === 1 ? 'var(--itsm-text-sm)' : 'var(--itsm-text-xs)',
                        fontWeight: item.level === 1 ? 500 : 400,
                        color: 'var(--itsm-text-secondary)',
                        transition: 'background-color 0.15s, color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--itsm-surface-raised)';
                        e.currentTarget.style.color = 'var(--itsm-text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--itsm-text-secondary)';
                      }}
                    >
                      {item.title}
                    </button>
                  ))}
                </nav>
              </Panel>
            )}

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <Panel>
                <div style={{ 
                  fontSize: 'var(--itsm-text-sm)', 
                  fontWeight: 600,
                  color: 'var(--itsm-text-primary)',
                  marginBottom: 'var(--itsm-space-3)',
                  paddingBottom: 'var(--itsm-space-2)',
                  borderBottom: '1px solid var(--itsm-border-default)',
                }}>
                  Related Articles
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-2)' }}>
                  {relatedArticles.map((related) => (
                    <button
                      key={related.id}
                      onClick={() => navigate(`/kb/${related.id}`)}
                      style={{
                        textAlign: 'left',
                        padding: 'var(--itsm-space-2)',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--itsm-button-radius)',
                        cursor: 'pointer',
                        fontSize: 'var(--itsm-text-sm)',
                        color: 'var(--itsm-text-secondary)',
                        lineHeight: 1.4,
                        transition: 'background-color 0.15s, color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--itsm-surface-raised)';
                        e.currentTarget.style.color = 'var(--itsm-primary-600)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--itsm-text-secondary)';
                      }}
                    >
                      {related.title}
                    </button>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
