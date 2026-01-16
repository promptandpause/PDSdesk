import {
  Plus,
  Search,
  BookOpen,
  ThumbsUp,
  Eye,
  Tag,
  Download,
  Filter,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

// TODO: Fetch knowledge base articles from Supabase
export function KnowledgeBaseView() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"any" | "draft_only">("any");

  const [viewSettingsOpen, setViewSettingsOpen] = useState(false);
  const [showTagsInList, setShowTagsInList] = useState(true);
  const [showStatsInList, setShowStatsInList] = useState(true);

  const kbPrefsKey = useMemo(() => {
    const id = user?.id?.trim();
    return id ? `pdsdesk.kb.prefs.${id}` : "pdsdesk.kb.prefs";
  }, [user?.id]);

  const kbPrefsLoadedRef = useRef(false);

  useEffect(() => {
    kbPrefsLoadedRef.current = false;
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(kbPrefsKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      if (!parsed || typeof parsed !== "object") {
        kbPrefsLoadedRef.current = true;
        return;
      }

      const obj = parsed as Record<string, unknown>;
      if (typeof obj.selectedCategory === "string") setSelectedCategory(obj.selectedCategory);
      if (typeof obj.includeDrafts === "boolean") setIncludeDrafts(obj.includeDrafts);
      if (obj.statusFilter === "any" || obj.statusFilter === "draft_only") {
        setStatusFilter(obj.statusFilter);
      }
      if (typeof obj.showTagsInList === "boolean") setShowTagsInList(obj.showTagsInList);
      if (typeof obj.showStatsInList === "boolean") setShowStatsInList(obj.showStatsInList);
    } catch {
      // ignore
    } finally {
      kbPrefsLoadedRef.current = true;
    }
  }, [kbPrefsKey]);

  useEffect(() => {
    if (!kbPrefsLoadedRef.current) return;
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        kbPrefsKey,
        JSON.stringify({
          selectedCategory,
          includeDrafts,
          statusFilter,
          showTagsInList,
          showStatsInList,
        }),
      );
    } catch {
      // ignore
    }
  }, [kbPrefsKey, includeDrafts, selectedCategory, showStatsInList, showTagsInList, statusFilter]);

  type ArticleRow = {
    id: string;
    slug: string;
    title: string;
    body: string;
    status: string;
    tags: string[];
    category: string | null;
    view_count: number;
    like_count: number;
    updated_at: string;
  };

  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ArticleRow | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [likedByMe, setLikedByMe] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSlug, setCreateSlug] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [createTags, setCreateTags] = useState("");
  const [createStatus, setCreateStatus] = useState("draft");
  const [createBody, setCreateBody] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editSlug, setEditSlug] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editStatus, setEditStatus] = useState("draft");
  const [editBody, setEditBody] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      const res = await supabase
        .from("knowledge_articles")
        .select("id,slug,title,body,status,tags,category,view_count,like_count,updated_at")
        .order("updated_at", { ascending: false })
        .limit(200);

      if (cancelled) return;

      if (res.error) {
        setError(res.error.message);
        setArticles([]);
        setLoading(false);
        return;
      }

      setArticles((res.data ?? []) as ArticleRow[]);
      setLoading(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromHash = () => {
      const raw = window.location.hash || "";
      const [path, query] = raw.replace(/^#\/?/, "").split("?");
      if ((path ?? "").split("/")[0] !== "knowledge-base") return;
      const params = new URLSearchParams(query ?? "");
      const id = params.get("articleId");
      setSelectedArticleId(id && id.trim() ? id.trim() : null);
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!selectedArticleId) {
      setSelectedArticle(null);
      setSelectedError(null);
      setLikedByMe(false);
      setSelectedLoading(false);
      setEditMode(false);
      setEditSubmitting(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setSelectedLoading(true);
      setSelectedError(null);

      void supabase.rpc("increment_knowledge_article_view", { article_id: selectedArticleId });

      const res = await supabase
        .from("knowledge_articles")
        .select("id,slug,title,body,status,tags,category,view_count,like_count,updated_at")
        .eq("id", selectedArticleId)
        .single();

      if (cancelled) return;

      if (res.error) {
        setSelectedError(res.error.message);
        setSelectedArticle(null);
        setSelectedLoading(false);
        return;
      }

      const likeRes = await supabase
        .from("knowledge_article_likes")
        .select("article_id")
        .eq("article_id", selectedArticleId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      setLikedByMe(Boolean(likeRes.data));
      setSelectedArticle(res.data as ArticleRow);
      setEditMode(false);
      setEditSubmitting(false);
      setArticles((prev) =>
        prev.map((a) => (a.id === selectedArticleId ? ({ ...a, view_count: (a.view_count ?? 0) + 1 } as ArticleRow) : a)),
      );
      setSelectedLoading(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [selectedArticleId, supabase, user]);

  useEffect(() => {
    if (!selectedArticle) return;
    setEditSlug(selectedArticle.slug ?? "");
    setEditTitle(selectedArticle.title ?? "");
    setEditCategory((selectedArticle.category ?? "").trim());
    setEditTags((selectedArticle.tags ?? []).join(", "));
    setEditStatus(selectedArticle.status ?? "draft");
    setEditBody(selectedArticle.body ?? "");
  }, [selectedArticle]);

  useEffect(() => {
    if (!createOpen) return;
    setCreateError(null);
    setCreateSubmitting(false);
    setCreateSlug("");
    setCreateTitle("");
    setCreateCategory("");
    setCreateTags("");
    setCreateStatus("draft");
    setCreateBody("");
  }, [createOpen]);

  const refreshArticles = async () => {
    if (!user) return;
    setError(null);
    setLoading(true);

    const res = await supabase
      .from("knowledge_articles")
      .select("id,slug,title,body,status,tags,category,view_count,like_count,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (res.error) {
      setError(res.error.message);
      setArticles([]);
      setLoading(false);
      return;
    }

    setArticles((res.data ?? []) as ArticleRow[]);
    setLoading(false);
  };

  const submitCreate = async () => {
    if (!user) return;

    const slug = createSlug.trim();
    const title = createTitle.trim();
    const body = createBody.trim();
    const status = createStatus.trim() || "draft";
    const category = createCategory.trim() || null;
    const tags = createTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!slug || !title || !body) {
      setCreateError("Slug, title, and body are required.");
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);

    const inserted = await supabase
      .from("knowledge_articles")
      .insert({
        slug,
        title,
        body,
        status,
        tags,
        category,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (inserted.error) {
      setCreateError(inserted.error.message);
      setCreateSubmitting(false);
      return;
    }

    setCreateSubmitting(false);
    setCreateOpen(false);
    await refreshArticles();
    openArticle(inserted.data.id as string);
  };

  const submitEdit = async () => {
    if (!user) return;
    if (!selectedArticleId) return;

    const slug = editSlug.trim();
    const title = editTitle.trim();
    const body = editBody.trim();
    const status = editStatus.trim() || "draft";
    const category = editCategory.trim() || null;
    const tags = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!slug || !title || !body) {
      setSelectedError("Slug, title, and body are required.");
      return;
    }

    setEditSubmitting(true);
    setSelectedError(null);

    const upd = await supabase
      .from("knowledge_articles")
      .update({
        slug,
        title,
        body,
        status,
        tags,
        category,
      })
      .eq("id", selectedArticleId);

    if (upd.error) {
      setSelectedError(upd.error.message);
      setEditSubmitting(false);
      return;
    }

    setEditMode(false);
    setEditSubmitting(false);
    await refreshArticles();
    const refreshed = await supabase
      .from("knowledge_articles")
      .select("id,slug,title,body,status,tags,category,view_count,like_count,updated_at")
      .eq("id", selectedArticleId)
      .single();

    if (!refreshed.error) {
      setSelectedArticle(refreshed.data as ArticleRow);
    }
  };

  const toggleLike = async () => {
    if (!user) return;
    if (!selectedArticleId) return;

    const res = await supabase.rpc("toggle_knowledge_article_like", { article_id: selectedArticleId });
    if (res.error) {
      setSelectedError(res.error.message);
      return;
    }

    const nowLiked = Boolean(res.data);
    setLikedByMe(nowLiked);
    setSelectedArticle((prev) => {
      if (!prev) return prev;
      const nextCount = Math.max(0, (prev.like_count ?? 0) + (nowLiked ? 1 : -1));
      return { ...prev, like_count: nextCount };
    });
    setArticles((prev) =>
      prev.map((a) => {
        if (a.id !== selectedArticleId) return a;
        const nextCount = Math.max(0, (a.like_count ?? 0) + (nowLiked ? 1 : -1));
        return { ...a, like_count: nextCount };
      }),
    );
  };

  const openArticle = (articleId: string) => {
    if (typeof window === "undefined") return;
    const id = articleId.trim();
    if (!id) return;
    const next = `#/knowledge-base?articleId=${encodeURIComponent(id)}`;
    if (window.location.hash === next) return;
    window.location.hash = next;
  };

  const closeArticle = () => {
    if (typeof window === "undefined") return;
    window.location.hash = "#/knowledge-base";
  };

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) {
      const cat = (a.category ?? "Uncategorized").trim() || "Uncategorized";
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    const rows = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [{ name: "All", count: articles.length }, ...rows];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return articles.filter((a) => {
      const cat = (a.category ?? "Uncategorized").trim() || "Uncategorized";
      if (selectedCategory !== "All" && cat !== selectedCategory) return false;

      const status = String(a.status ?? "").trim().toLowerCase();
      if (statusFilter === "draft_only") {
        if (status !== "draft") return false;
      } else if (!includeDrafts) {
        if (status !== "published") return false;
      }

      if (!q) return true;
      const haystack = `${a.slug} ${a.title} ${(a.tags ?? []).join(" ")} ${cat}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [articles, includeDrafts, searchTerm, selectedCategory, statusFilter]);

  const exportCsv = () => {
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      if (s.includes("\"")) {
        return `"${s.replace(/\"/g, '""')}"`;
      }
      if (s.includes(",") || s.includes("\n") || s.includes("\r")) {
        return `"${s}"`;
      }
      return s;
    };

    const headers = [
      "Title",
      "Slug",
      "Status",
      "Category",
      "Tags",
      "Views",
      "Likes",
      "Updated",
    ];

    const lines: string[] = [];
    lines.push(headers.map((h) => escape(h)).join(","));
    for (const a of filteredArticles) {
      lines.push(
        [
          a.title,
          a.slug,
          a.status,
          (a.category ?? "Uncategorized").trim() || "Uncategorized",
          (a.tags ?? []).join("; "),
          a.view_count ?? 0,
          a.like_count ?? 0,
          a.updated_at ? new Date(a.updated_at).toISOString() : "",
        ]
          .map((v) => escape(v))
          .join(","),
      );
    }

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `knowledge-articles-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pds-page flex-1">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Article</DialogTitle>
            <DialogDescription>Create a new knowledge base article.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Slug
              </label>
              <input
                className="pds-input pds-focus"
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value)}
                placeholder="article-slug"
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Title
              </label>
              <input
                className="pds-input pds-focus"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Article title"
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Category
              </label>
              <input
                className="pds-input pds-focus"
                value={createCategory}
                onChange={(e) => setCreateCategory(e.target.value)}
                placeholder="Category"
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Tags (comma separated)
              </label>
              <input
                className="pds-input pds-focus"
                value={createTags}
                onChange={(e) => setCreateTags(e.target.value)}
                placeholder="tag1, tag2"
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Status
              </label>
              <select
                className="pds-input pds-focus"
                value={createStatus}
                onChange={(e) => setCreateStatus(e.target.value)}
                disabled={createSubmitting}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Body
              </label>
              <textarea
                className="pds-input pds-focus"
                rows={8}
                value={createBody}
                onChange={(e) => setCreateBody(e.target.value)}
                disabled={createSubmitting}
              />
            </div>
            {createError && (
              <div className="text-sm" style={{ color: "var(--pds-danger)" }}>
                {createError}
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              className="pds-btn pds-btn--outline pds-focus"
              onClick={() => setCreateOpen(false)}
              disabled={createSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pds-btn pds-btn--primary pds-focus"
              onClick={() => void submitCreate()}
              disabled={createSubmitting}
            >
              {createSubmitting ? "Creating..." : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>Filter knowledge base articles.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Drafts
              </label>
              <div className="pds-panel flex items-center justify-between gap-3 p-3">
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--pds-text)" }}>
                    Include drafts
                  </div>
                  <div className="text-xs" style={{ color: "var(--pds-text-muted)" }}>
                    Show draft articles alongside published.
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="rounded pds-focus"
                  checked={includeDrafts}
                  onChange={(e) => {
                    setIncludeDrafts(e.target.checked);
                    if (!e.target.checked) setStatusFilter("any");
                  }}
                  disabled={statusFilter === "draft_only"}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Status
              </label>
              <select
                className="pds-input pds-focus"
                value={statusFilter}
                onChange={(e) => {
                  const v = e.target.value === "draft_only" ? "draft_only" : "any";
                  setStatusFilter(v);
                  if (v === "draft_only") setIncludeDrafts(true);
                }}
              >
                <option value="any">Published + Drafts (controlled by checkbox)</option>
                <option value="draft_only">Draft only</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              className="pds-btn pds-btn--outline pds-focus"
              onClick={() => {
                setIncludeDrafts(true);
                setStatusFilter("any");
              }}
            >
              Reset
            </button>
            <button
              type="button"
              className="pds-btn pds-btn--primary pds-focus"
              onClick={() => setFiltersOpen(false)}
            >
              Apply
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewSettingsOpen} onOpenChange={setViewSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>View settings</DialogTitle>
            <DialogDescription>Choose what appears in the list.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="flex items-center justify-between gap-3 text-sm" style={{ color: "var(--pds-text)" }}>
              <span>Show tags</span>
              <input
                type="checkbox"
                className="rounded pds-focus"
                checked={showTagsInList}
                onChange={(e) => setShowTagsInList(e.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm" style={{ color: "var(--pds-text)" }}>
              <span>Show stats (views, likes, updated)</span>
              <input
                type="checkbox"
                className="rounded pds-focus"
                checked={showStatsInList}
                onChange={(e) => setShowStatsInList(e.target.checked)}
              />
            </label>
          </div>

          <DialogFooter>
            <button
              type="button"
              className="pds-btn pds-btn--outline pds-focus"
              onClick={() => setViewSettingsOpen(false)}
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sidebar - Categories */}
      <div className="w-64 pds-panel flex flex-col" style={{ borderRadius: 0, borderRight: "1px solid var(--pds-border)" }}>
        <div className="pds-panel px-4 py-3" style={{ borderRadius: 0, border: 0, borderBottom: "1px solid var(--pds-border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>
            Categories
          </h3>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              onClick={() => setSelectedCategory(category.name)}
              className="pds-btn pds-btn--outline pds-focus w-full justify-between"
              style={{ justifyContent: "space-between" }}
            >
              <span style={{ color: "var(--pds-text)", fontWeight: 650 }}>{category.name}</span>
              <span className="pds-chip" data-tone="muted">
                {category.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="pds-page-header px-4 py-3 flex items-center justify-between">
            <h2 className="pds-page-title">Knowledge Base</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="pds-btn pds-btn--primary pds-focus"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={14} />
                New Article
              </button>
              <button
                type="button"
                className="pds-btn pds-btn--outline pds-focus"
                onClick={() => exportCsv()}
              >
                <Download size={14} />
                Export
              </button>
              <button
                type="button"
                className="pds-btn pds-btn--outline pds-btn--icon pds-focus"
                onClick={() => setViewSettingsOpen(true)}
                title="View settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          <div className="pds-panel">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--pds-text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search knowledge base..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pds-input pds-focus w-full pl-10"
                />
              </div>
              <button
                type="button"
                className="pds-btn pds-btn--outline pds-focus"
                onClick={() => setFiltersOpen(true)}
              >
                <Filter size={14} />
                Filters
              </button>
            </div>
          </div>

          <div className="pds-panel flex-1 overflow-auto p-0">
            {error && (
              <div className="pds-panel px-3 py-2 text-sm" style={{ color: "var(--pds-danger)" }}>
                {error}
              </div>
            )}

            {loading ? (
              <div className="p-4 text-sm" style={{ color: "var(--pds-text-muted)" }}>
                Loading...
              </div>
            ) : (
              <table className="pds-table">
                <thead className="pds-thead">
                  <tr>
                    <th className="pds-th">Title</th>
                    <th className="pds-th">Category</th>
                    <th className="pds-th">Status</th>
                    {showStatsInList && <th className="pds-th">Views</th>}
                    {showStatsInList && <th className="pds-th">Likes</th>}
                    {showStatsInList && <th className="pds-th">Updated</th>}
                    {showTagsInList && <th className="pds-th">Tags</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredArticles.length === 0 ? (
                    <tr className="pds-row">
                      <td
                        className="pds-td"
                        colSpan={3 + (showStatsInList ? 3 : 0) + (showTagsInList ? 1 : 0)}
                        style={{ color: "var(--pds-text-muted)" }}
                      >
                        No articles found.
                      </td>
                    </tr>
                  ) : (
                    filteredArticles.map((article) => {
                      const category = (article.category ?? "Uncategorized").trim() || "Uncategorized";
                      const selected = selectedArticleId === article.id;
                      const tone = String(article.status ?? "").trim().toLowerCase() === "published" ? "success" : "muted";

                      return (
                        <tr
                          key={article.id}
                          className="pds-row pds-focus"
                          data-selected={selected}
                          aria-selected={selected}
                          role="button"
                          tabIndex={0}
                          onClick={() => openArticle(article.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openArticle(article.id);
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <td className="pds-td">
                            <span className="inline-flex items-center gap-2" style={{ color: "var(--pds-text)" }}>
                              <BookOpen size={14} style={{ color: "var(--pds-accent)" }} />
                              <span style={{ fontWeight: 650 }}>{article.title}</span>
                            </span>
                          </td>
                          <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                            {category}
                          </td>
                          <td className="pds-td">
                            <span className="pds-chip" data-tone={tone}>
                              {article.status}
                            </span>
                          </td>
                          {showStatsInList && (
                            <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                              {article.view_count}
                            </td>
                          )}
                          {showStatsInList && (
                            <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                              {article.like_count}
                            </td>
                          )}
                          {showStatsInList && (
                            <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                              {new Date(article.updated_at).toLocaleDateString()}
                            </td>
                          )}
                          {showTagsInList && (
                            <td className="pds-td">
                              <div className="flex gap-1 flex-wrap">
                                {(article.tags ?? []).slice(0, 6).map((tag) => (
                                  <span key={tag} className="pds-chip" data-tone="muted">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {selectedArticleId && (
          <div className="w-[440px] pds-panel flex flex-col" style={{ borderRadius: 0, borderLeft: "1px solid var(--pds-border)" }}>
            <div className="pds-panel px-4 py-3 flex items-center justify-between" style={{ borderRadius: 0, border: 0, borderBottom: "1px solid var(--pds-border)" }}>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>Article</div>
                {!selectedLoading && selectedArticle && (
                  <button
                    type="button"
                    className="pds-btn pds-btn--sm pds-btn--outline pds-focus"
                    onClick={() => {
                      if (editSubmitting) return;
                      setEditMode((prev) => !prev);
                    }}
                  >
                    {editMode ? "View" : "Edit"}
                  </button>
                )}
                {editMode && (
                  <button
                    type="button"
                    className="pds-btn pds-btn--sm pds-btn--primary pds-focus"
                    onClick={() => void submitEdit()}
                    disabled={editSubmitting}
                  >
                    {editSubmitting ? "Saving..." : "Save"}
                  </button>
                )}
                {editMode && (
                  <button
                    type="button"
                    className="pds-btn pds-btn--sm pds-btn--outline pds-focus"
                    onClick={() => {
                      if (!selectedArticle) return;
                      setEditMode(false);
                      setEditSlug(selectedArticle.slug ?? "");
                      setEditTitle(selectedArticle.title ?? "");
                      setEditCategory((selectedArticle.category ?? "").trim());
                      setEditTags((selectedArticle.tags ?? []).join(", "));
                      setEditStatus(selectedArticle.status ?? "draft");
                      setEditBody(selectedArticle.body ?? "");
                    }}
                    disabled={editSubmitting}
                  >
                    Cancel
                  </button>
                )}
              </div>
              <button
                type="button"
                className="pds-btn pds-btn--outline pds-btn--icon pds-focus"
                onClick={closeArticle}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {selectedError && (
                <div className="pds-panel px-3 py-2 text-sm" style={{ color: "var(--pds-danger)" }}>
                  {selectedError}
                </div>
              )}

              {selectedLoading || !selectedArticle ? (
                <div className="text-sm" style={{ color: "var(--pds-text-muted)" }}>Loading...</div>
              ) : (
                <div className="space-y-3">
                  <div>
                    {editMode ? (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs mb-1" style={{ color: "var(--pds-text-muted)" }}>Title</label>
                          <input
                            className="pds-input pds-focus"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            disabled={editSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: "var(--pds-text-muted)" }}>Slug</label>
                          <input
                            className="pds-input pds-focus"
                            value={editSlug}
                            onChange={(e) => setEditSlug(e.target.value)}
                            disabled={editSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: "var(--pds-text-muted)" }}>Category</label>
                          <input
                            className="pds-input pds-focus"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            disabled={editSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: "var(--pds-text-muted)" }}>Tags (comma separated)</label>
                          <input
                            className="pds-input pds-focus"
                            value={editTags}
                            onChange={(e) => setEditTags(e.target.value)}
                            disabled={editSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: "var(--pds-text-muted)" }}>Status</label>
                          <select
                            className="pds-input pds-focus"
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            disabled={editSubmitting}
                          >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-lg font-semibold" style={{ color: "var(--pds-text)" }}>
                          {selectedArticle.title}
                        </div>
                        <div className="mt-1 text-xs" style={{ color: "var(--pds-text-muted)" }}>
                          {selectedArticle.slug}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs" style={{ color: "var(--pds-text-muted)" }}>
                      Updated: {new Date(selectedArticle.updated_at).toLocaleString()}
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleLike()}
                      className={`pds-btn pds-btn--sm pds-focus ${likedByMe ? "pds-btn--secondary" : "pds-btn--outline"}`}
                    >
                      <ThumbsUp size={12} />
                      {likedByMe ? "Liked" : "Like"}
                      <span style={{ color: "var(--pds-text-muted)" }}>({selectedArticle.like_count})</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-xs" style={{ color: "var(--pds-text-muted)" }}>
                    <span className="flex items-center gap-1">
                      <Eye size={12} />
                      {selectedArticle.view_count} views
                    </span>
                    <span>
                      {(selectedArticle.category ?? "Uncategorized").trim() || "Uncategorized"}
                    </span>
                  </div>

                  <div className="flex gap-1 flex-wrap">
                    {(selectedArticle.tags ?? []).map((tag) => (
                      <span key={tag} className="pds-chip" data-tone="muted">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="pt-3" style={{ borderTop: "1px solid var(--pds-border)" }}>
                    {editMode ? (
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "var(--pds-text-muted)" }}>Body</label>
                        <textarea
                          className="pds-input pds-focus"
                          rows={10}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          disabled={editSubmitting}
                        />
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap" style={{ color: "var(--pds-text)" }}>
                        {selectedArticle.body}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}