import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Badge } from '../components';

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
}

interface KBCategory {
  id: string;
  name: string;
  is_active: boolean;
}

export function KBArticleEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();

  const isNew = !id || id === 'new';
  
  // Check if coming from a ticket
  const fromTicketId = searchParams.get('fromTicket');
  const prefilledTitle = searchParams.get('title') || '';
  const prefilledCategory = searchParams.get('category') || '';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  const [formData, setFormData] = useState({
    slug: '',
    title: prefilledTitle,
    body: '',
    category: prefilledCategory,
    status: 'draft',
    tags: '',
  });
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [sourceTicket, setSourceTicket] = useState<{ ticket_number: string; description: string | null } | null>(null);

  // Fetch categories from database
  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from('kb_categories')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (data) {
        setCategories(data as KBCategory[]);
      }
    }
    void loadCategories();
  }, [supabase]);

  // Load ticket data if coming from a ticket
  useEffect(() => {
    if (!fromTicketId || !isNew) return;

    async function loadTicketData() {
      const { data, error } = await supabase
        .from('tickets')
        .select('ticket_number, description')
        .eq('id', fromTicketId)
        .single();

      if (!error && data) {
        setSourceTicket(data);
        // Pre-fill the body with ticket description as a starting point
        if (data.description) {
          setFormData(prev => ({
            ...prev,
            body: `## Problem\n\n${data.description}\n\n## Solution\n\n[Describe the solution here]\n\n## Additional Notes\n\n[Any additional information]`,
            slug: prev.slug || prefilledTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          }));
        }
      }
    }
    void loadTicketData();
  }, [fromTicketId, isNew, supabase, prefilledTitle]);

  useEffect(() => {
    if (isNew) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('knowledge_articles')
        .select('*')
        .eq('id', id)
        .single();

      if (cancelled) return;

      if (!error && data) {
        const art = data as Article;
        setArticle(art);
        setFormData({
          slug: art.slug,
          title: art.title,
          body: art.body,
          category: art.category || '',
          status: art.status,
          tags: art.tags.join(', '),
        });
      }
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, isNew, supabase]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: isNew ? generateSlug(title) : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.slug.trim() || !user) return;

    setSaving(true);

    const payload = {
      slug: formData.slug.trim(),
      title: formData.title.trim(),
      body: formData.body,
      category: formData.category.trim() || null,
      status: formData.status,
      tags: formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    if (isNew) {
      const { data, error } = await supabase
        .from('knowledge_articles')
        .insert({ ...payload, created_by: user.id })
        .select()
        .single();

      if (error) {
        console.error('Error creating article:', error);
        alert('Error creating article: ' + error.message);
        setSaving(false);
        return;
      }

      if (data) {
        navigate(`/kb/${data.id}`);
      }
    } else {
      const { error } = await supabase
        .from('knowledge_articles')
        .update(payload)
        .eq('id', id);

      if (error) {
        console.error('Error updating article:', error);
        alert('Error updating article: ' + error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);

    if (!isNew) {
      navigate('/kb');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('kb-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) {
      console.error('Upload error:', error);
      alert('Error uploading image: ' + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('kb-images')
      .getPublicUrl(data.path);

    const imageMarkdown = `![${file.name}](${urlData.publicUrl})`;
    setFormData((prev) => ({
      ...prev,
      body: prev.body + '\n\n' + imageMarkdown,
    }));

    setUploading(false);
    e.target.value = '';
  };

  const handlePublish = async () => {
    if (!id || isNew) return;

    setSaving(true);
    await supabase
      .from('knowledge_articles')
      .update({ status: 'published' })
      .eq('id', id);

    setFormData((prev) => ({ ...prev, status: 'published' }));
    setSaving(false);
  };

  const handleUnpublish = async () => {
    if (!id || isNew) return;

    setSaving(true);
    await supabase
      .from('knowledge_articles')
      .update({ status: 'draft' })
      .eq('id', id);

    setFormData((prev) => ({ ...prev, status: 'draft' }));
    setSaving(false);
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

  return (
    <div>
      <PageHeader
        title={isNew ? 'New Article' : 'Edit Article'}
        subtitle={isNew ? 'Create a new knowledge base article' : article?.title}
        breadcrumbs={[
          { label: 'Knowledge Base', to: '/kb' },
          { label: isNew ? 'New' : 'Edit' },
        ]}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('/kb')}>
              Cancel
            </Button>
            {!isNew && formData.status === 'draft' && (
              <Button variant="secondary" onClick={handlePublish} disabled={saving}>
                Publish
              </Button>
            )}
            {!isNew && formData.status === 'published' && (
              <Button variant="ghost" onClick={handleUnpublish} disabled={saving}>
                Unpublish
              </Button>
            )}
            <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={saving}>
              {isNew ? 'Create Article' : 'Save Changes'}
            </Button>
          </>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)', maxWidth: 900 }}>
        {/* Source ticket indicator */}
        {sourceTicket && (
          <div
            style={{
              marginBottom: 'var(--itsm-space-4)',
              padding: 'var(--itsm-space-3)',
              backgroundColor: 'var(--itsm-primary-50)',
              border: '1px solid var(--itsm-primary-200)',
              borderRadius: 'var(--itsm-panel-radius)',
              fontSize: 'var(--itsm-text-sm)',
              color: 'var(--itsm-primary-700)',
            }}
          >
            📝 Creating KB article from ticket <strong>{sourceTicket.ticket_number}</strong>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Panel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
              {!isNew && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)' }}>
                  <Badge variant={formData.status === 'published' ? 'success' : 'neutral'}>
                    {formData.status === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                </div>
              )}

              <Input
                label="Title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Article title"
                required
              />

              <Input
                label="Slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="article-url-slug"
                required
                hint="URL-friendly identifier"
              />

              <div>
                <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-1)' }}>
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{
                    width: '100%',
                    height: 36,
                    padding: '0 var(--itsm-space-3)',
                    fontSize: 'var(--itsm-text-sm)',
                    border: '1px solid var(--itsm-border-default)',
                    borderRadius: 'var(--itsm-input-radius)',
                    backgroundColor: 'var(--itsm-surface-base)',
                    color: 'var(--itsm-text-primary)',
                  }}
                >
                  <option value="">Select a category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--itsm-space-2)' }}>
                  <label className="itsm-label">Content</label>
                  <label style={{ cursor: 'pointer' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                    <Button variant="ghost" size="sm" type="button" loading={uploading} disabled={uploading}>
                      {uploading ? 'Uploading...' : '📷 Add Image'}
                    </Button>
                  </label>
                </div>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Write your article content here... (Markdown supported)"
                  style={{
                    width: '100%',
                    minHeight: 400,
                    padding: 'var(--itsm-space-3)',
                    fontSize: 'var(--itsm-text-sm)',
                    fontFamily: 'var(--itsm-font-mono)',
                    lineHeight: 'var(--itsm-leading-relaxed)',
                    border: '1px solid var(--itsm-border-default)',
                    borderRadius: 'var(--itsm-input-radius)',
                    resize: 'vertical',
                    backgroundColor: 'var(--itsm-surface-base)',
                  }}
                />
              </div>

              <Input
                label="Tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., password, reset, account"
                hint="Comma-separated tags for search"
              />
            </div>
          </Panel>
        </form>
      </div>
    </div>
  );
}
