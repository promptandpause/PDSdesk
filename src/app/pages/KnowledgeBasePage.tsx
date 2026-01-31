import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Badge } from '../components';
import { 
  SearchIcon, 
  RocketIcon, 
  WrenchIcon, 
  BookOpenIcon, 
  HelpCircleIcon, 
  ScrollTextIcon, 
  ShieldIcon, 
  UserIcon, 
  LaptopIcon, 
  FileTextIcon 
} from '../components/Icons';

interface Article {
  id: string;
  title: string;
  body: string;
  category: string | null;
  status: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface KBCategory {
  id: string;
  name: string;
  icon_name: string | null;
  is_active: boolean;
}

export function KnowledgeBasePage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const navigate = useNavigate();
  const { roles } = useAuth();

  const isAgent = roles.includes('operator') || roles.includes('service_desk_admin') || roles.includes('global_admin');

  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [categoryIconMap, setCategoryIconMap] = useState<Record<string, string>>({});

  // Fetch categories from database
  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from('kb_categories')
        .select('id, name, icon_name, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (data) {
        setCategories(data as KBCategory[]);
        // Build icon map for quick lookup
        const iconMap: Record<string, string> = {};
        data.forEach((cat: KBCategory) => {
          if (cat.icon_name) {
            iconMap[cat.name.toLowerCase()] = cat.icon_name;
          }
        });
        setCategoryIconMap(iconMap);
      }
    }
    void loadCategories();
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      let q = supabase
        .from('knowledge_articles')
        .select('id,title,body,category,status,view_count,created_at,updated_at', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .limit(50);

      // For non-agents, only show published articles
      if (!isAgent) {
        q = q.eq('status', 'published');
      } else if (statusFilter) {
        q = q.eq('status', statusFilter);
      }

      if (categoryFilter) {
        q = q.eq('category', categoryFilter);
      }

      const trimmed = query.trim();
      if (trimmed) {
        q = q.ilike('title', `%${trimmed}%`);
      }

      const { data, count, error } = await q;

      if (cancelled) return;

      if (error) {
        setArticles([]);
        setTotalCount(0);
      } else {
        setArticles((data as Article[]) ?? []);
        setTotalCount(count ?? 0);
      }
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [supabase, statusFilter, categoryFilter, query, isAgent]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  // Get a mini description from the body (first 100 chars, strip markdown)
  const getMiniDescription = (body: string) => {
    if (!body) return 'No description available';
    // Strip markdown formatting
    let text = body
      .replace(/#{1,6}\s/g, '') // headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
      .replace(/\*([^*]+)\*/g, '$1') // italic
      .replace(/`([^`]+)`/g, '$1') // inline code
      .replace(/```[\s\S]*?```/g, '') // code blocks
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
      .replace(/[-*]\s/g, '') // list markers
      .replace(/\n+/g, ' ') // newlines to spaces
      .trim();
    
    if (text.length > 120) {
      text = text.substring(0, 120) + '...';
    }
    return text || 'No description available';
  };

  // Icon component map
  const iconComponents: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    RocketIcon,
    WrenchIcon,
    BookOpenIcon,
    HelpCircleIcon,
    ScrollTextIcon,
    ShieldIcon,
    UserIcon,
    LaptopIcon,
    FileTextIcon,
  };

  // Get icon component based on category (uses DB icon_name or falls back to keyword matching)
  const getCategoryIcon = (category: string | null) => {
    const iconProps = { size: 28, color: 'var(--itsm-primary-600)' };
    const cat = (category || '').toLowerCase();
    
    // First try to get icon from database mapping
    const dbIconName = categoryIconMap[cat];
    if (dbIconName && iconComponents[dbIconName]) {
      const IconComponent = iconComponents[dbIconName];
      return <IconComponent {...iconProps} />;
    }
    
    // Fallback to keyword matching for categories not in DB
    if (cat.includes('onboarding') || cat.includes('getting started')) return <RocketIcon {...iconProps} />;
    if (cat.includes('it support') || cat.includes('technical') || cat.includes('troubleshoot')) return <WrenchIcon {...iconProps} />;
    if (cat.includes('how-to') || cat.includes('guide') || cat.includes('procedure')) return <BookOpenIcon {...iconProps} />;
    if (cat.includes('faq') || cat.includes('question')) return <HelpCircleIcon {...iconProps} />;
    if (cat.includes('policy') || cat.includes('compliance')) return <ScrollTextIcon {...iconProps} />;
    if (cat.includes('security') || cat.includes('password') || cat.includes('access')) return <ShieldIcon {...iconProps} />;
    if (cat.includes('hr') || cat.includes('human resources') || cat.includes('benefit')) return <UserIcon {...iconProps} />;
    if (cat.includes('software') || cat.includes('tool') || cat.includes('app')) return <LaptopIcon {...iconProps} />;
    return <FileTextIcon {...iconProps} />;
  };

  const handleArticleClick = (articleId: string) => {
    // Agents go to editor, requesters go to viewer
    if (isAgent) {
      navigate(`/kb/${articleId}/edit`);
    } else {
      navigate(`/kb/${articleId}`);
    }
  };

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        subtitle={`${totalCount} articles`}
        actions={
          isAgent ? (
            <Button variant="primary" onClick={() => navigate('/kb/new')}>
              New Article
            </Button>
          ) : null
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--itsm-space-3)',
            marginBottom: 'var(--itsm-space-5)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
            <Input
              placeholder="Search articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              icon={<SearchIcon size={14} />}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              height: 32,
              padding: '0 var(--itsm-space-3)',
              fontSize: 'var(--itsm-text-sm)',
              border: '1px solid var(--itsm-border-default)',
              borderRadius: 'var(--itsm-input-radius)',
              backgroundColor: 'var(--itsm-surface-base)',
              color: 'var(--itsm-text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          {isAgent && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                height: 32,
                padding: '0 var(--itsm-space-3)',
                fontSize: 'var(--itsm-text-sm)',
                border: '1px solid var(--itsm-border-default)',
                borderRadius: 'var(--itsm-input-radius)',
                backgroundColor: 'var(--itsm-surface-base)',
                color: 'var(--itsm-text-primary)',
                cursor: 'pointer',
              }}
            >
              <option value="">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          )}
        </div>

        {/* Card Grid */}
        {loading ? (
          <div
            style={{
              padding: 'var(--itsm-space-8)',
              textAlign: 'center',
              color: 'var(--itsm-text-tertiary)',
            }}
          >
            Loading...
          </div>
        ) : articles.length === 0 ? (
          <Panel>
            <div
              style={{
                padding: 'var(--itsm-space-8)',
                textAlign: 'center',
                color: 'var(--itsm-text-tertiary)',
              }}
            >
              No articles found
            </div>
          </Panel>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 'var(--itsm-space-4)',
            }}
          >
            {articles.map((article) => (
              <div
                key={article.id}
                onClick={() => handleArticleClick(article.id)}
                style={{
                  backgroundColor: 'var(--itsm-surface-base)',
                  border: '1px solid var(--itsm-border-default)',
                  borderRadius: 'var(--itsm-panel-radius)',
                  padding: 'var(--itsm-space-5)',
                  cursor: 'pointer',
                  transition: 'all var(--itsm-transition-fast)',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 180,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--itsm-primary-400)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--itsm-border-default)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    marginBottom: 'var(--itsm-space-3)',
                  }}
                >
                  {getCategoryIcon(article.category)}
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontSize: 'var(--itsm-text-base)',
                    fontWeight: 'var(--itsm-weight-semibold)' as any,
                    color: 'var(--itsm-text-primary)',
                    marginBottom: 'var(--itsm-space-2)',
                    lineHeight: 'var(--itsm-leading-snug)',
                  }}
                >
                  {article.title}
                </h3>

                {/* Description */}
                <p
                  style={{
                    fontSize: 'var(--itsm-text-sm)',
                    color: 'var(--itsm-text-tertiary)',
                    lineHeight: 'var(--itsm-leading-relaxed)',
                    flex: 1,
                    marginBottom: 'var(--itsm-space-3)',
                  }}
                >
                  {getMiniDescription(article.body)}
                </p>

                {/* Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 'var(--itsm-space-3)',
                    borderTop: '1px solid var(--itsm-border-subtle)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--itsm-text-xs)',
                      color: 'var(--itsm-text-tertiary)',
                    }}
                  >
                    {article.category || 'General'}
                  </span>
                  {isAgent && (
                    <Badge variant={getStatusVariant(article.status) as any} size="sm">
                      {article.status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && articles.length > 0 && (
          <div
            style={{
              marginTop: 'var(--itsm-space-4)',
              fontSize: 'var(--itsm-text-xs)',
              color: 'var(--itsm-text-tertiary)',
            }}
          >
            Showing {articles.length} of {totalCount} articles
          </div>
        )}
      </div>
    </div>
  );
}
