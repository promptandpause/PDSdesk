import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Badge } from '../components';

interface Article {
  id: string;
  title: string;
  category: string | null;
  status: string;
  views: number;
  created_at: string;
  updated_at: string;
}

export function KnowledgeBasePage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      let q = supabase
        .from('knowledge_articles')
        .select('id,title,category,status,views,created_at,updated_at', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .limit(50);

      if (statusFilter) {
        q = q.eq('status', statusFilter);
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
  }, [supabase, statusFilter, query]);

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

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        subtitle={`${totalCount} articles`}
        actions={
          <Button variant="primary" onClick={() => navigate('/kb/new')}>
            New Article
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--itsm-space-3)',
            marginBottom: 'var(--itsm-space-4)',
          }}
        >
          <div style={{ flex: 1, maxWidth: 320 }}>
            <Input
              placeholder="Search articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              icon={<span style={{ fontSize: 14 }}>🔍</span>}
            />
          </div>
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
        </div>

        {/* Table */}
        <Panel noPadding>
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
            <div
              style={{
                padding: 'var(--itsm-space-8)',
                textAlign: 'center',
                color: 'var(--itsm-text-tertiary)',
              }}
            >
              No articles found
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Title</TableHeaderCell>
                  <TableHeaderCell width={140}>Category</TableHeaderCell>
                  <TableHeaderCell width={100}>Status</TableHeaderCell>
                  <TableHeaderCell width={80} align="right">Views</TableHeaderCell>
                  <TableHeaderCell width={100} align="right">Updated</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {articles.map((article) => (
                  <TableRow
                    key={article.id}
                    onClick={() => navigate(`/kb/${article.id}`)}
                  >
                    <TableCell>
                      <span style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                        {article.title}
                      </span>
                    </TableCell>
                    <TableCell muted>
                      {article.category ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(article.status) as any}>
                        {article.status}
                      </Badge>
                    </TableCell>
                    <TableCell align="right" muted>
                      {article.views}
                    </TableCell>
                    <TableCell align="right" muted>
                      {formatTime(article.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>

        {!loading && articles.length > 0 && (
          <div
            style={{
              marginTop: 'var(--itsm-space-3)',
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
