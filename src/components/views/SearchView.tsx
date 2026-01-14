import { useEffect, useMemo, useState } from "react";
import { BookOpen, Package, Search, Ticket } from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";

// TODO: Implement Supabase search across all modules
export function SearchView() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type SearchKind = "ticket" | "asset" | "knowledge";
  type SearchResult = {
    kind: SearchKind;
    id: string;
    title: string;
    subtitle: string | null;
    date: string | null;
  };

  const [results, setResults] = useState<SearchResult[]>([]);

  const modules = [
    { id: "all", label: "All" },
    { id: "assets", label: "Assets" },
    { id: "knowledge", label: "Knowledge Base" },
    { id: "tickets", label: "Tickets" },
  ];

  useEffect(() => {
    if (!user) return;

    const raw = searchTerm.trim();
    if (!raw) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const term = raw.replace(/,/g, " ");
    const like = `%${term}%`;

    let cancelled = false;
    const t = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      const shouldSearchTickets = selectedModule === "all" || selectedModule === "tickets";
      const shouldSearchAssets = selectedModule === "all" || selectedModule === "assets";
      const shouldSearchKnowledge = selectedModule === "all" || selectedModule === "knowledge";

      const ticketPromise = shouldSearchTickets
        ? supabase
            .from("tickets")
            .select("id,title,status,priority,created_at")
            .or(`title.ilike.${like},description.ilike.${like}`)
            .order("created_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null } as any);

      const assetPromise = shouldSearchAssets
        ? supabase
            .from("assets")
            .select("id,asset_tag,name,asset_type,serial_number,updated_at")
            .or(`asset_tag.ilike.${like},name.ilike.${like},serial_number.ilike.${like},model.ilike.${like},manufacturer.ilike.${like}`)
            .order("updated_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null } as any);

      const knowledgePromise = shouldSearchKnowledge
        ? supabase
            .from("knowledge_articles")
            .select("id,slug,title,category,updated_at")
            .or(`slug.ilike.${like},title.ilike.${like},category.ilike.${like}`)
            .order("updated_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null } as any);

      const [ticketsRes, assetsRes, knowledgeRes] = await Promise.all([
        ticketPromise,
        assetPromise,
        knowledgePromise,
      ]);

      if (cancelled) return;

      const next: SearchResult[] = [];

      if (ticketsRes?.error) {
        setError(ticketsRes.error.message);
      } else {
        for (const t of (ticketsRes?.data ?? []) as any[]) {
          next.push({
            kind: "ticket",
            id: t.id,
            title: t.title,
            subtitle: `${t.status ?? ""}${t.priority ? ` · ${t.priority}` : ""}`.trim() || null,
            date: t.created_at ?? null,
          });
        }
      }

      if (assetsRes?.error) {
        setError(assetsRes.error.message);
      } else {
        for (const a of (assetsRes?.data ?? []) as any[]) {
          next.push({
            kind: "asset",
            id: a.id,
            title: a.name,
            subtitle: [a.asset_tag, a.asset_type, a.serial_number].filter(Boolean).join(" · ") || null,
            date: a.updated_at ?? null,
          });
        }
      }

      if (knowledgeRes?.error) {
        setError(knowledgeRes.error.message);
      } else {
        for (const k of (knowledgeRes?.data ?? []) as any[]) {
          next.push({
            kind: "knowledge",
            id: k.id,
            title: k.title,
            subtitle: [k.slug, k.category].filter(Boolean).join(" · ") || null,
            date: k.updated_at ?? null,
          });
        }
      }

      setResults(next);
      setLoading(false);
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [searchTerm, selectedModule, supabase, user]);

  const grouped = useMemo(() => {
    const byKind: Record<SearchKind, SearchResult[]> = {
      ticket: [],
      asset: [],
      knowledge: [],
    };
    for (const r of results) byKind[r.kind].push(r);
    return byKind;
  }, [results]);

  const openResult = (r: SearchResult) => {
    if (r.kind === "ticket") {
      window.location.hash = "#/call-management";
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("pdsdesk:call-management:open-ticket", { detail: { ticketId: r.id } }));
      }, 50);
      return;
    }

    if (r.kind === "asset") {
      window.location.hash = `#/asset-management?assetId=${encodeURIComponent(r.id)}`;
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("pdsdesk:asset-management:open-asset", { detail: { assetId: r.id } }));
      }, 50);
      return;
    }

    window.location.hash = `#/knowledge-base?articleId=${encodeURIComponent(r.id)}`;
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("pdsdesk:knowledge-base:open-article", { detail: { articleId: r.id } }));
    }, 50);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Search
        </h2>
      </div>

      {/* Search Bar */}
      <div className="border-b border-gray-300 px-4 py-4 bg-white">
        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search across all modules..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
              />
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {modules.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setSelectedModule(module.id)}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    selectedModule === module.id
                      ? "bg-[#4a9eff] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {module.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="px-4 py-2.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors"
            onClick={() => setSearchTerm((prev) => prev)}
          >
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-4">
        {searchTerm ? (
          <div className="space-y-3">
            {error && (
              <div className="bg-white border border-gray-300 rounded p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <p className="text-sm text-gray-600">
              {loading ? "Searching..." : `Found ${results.length} results`}
            </p>

            {(["ticket", "asset", "knowledge"] as const).map((kind) => {
              const rows = grouped[kind];
              if (!rows.length) return null;

              const heading =
                kind === "ticket" ? "Tickets" : kind === "asset" ? "Assets" : "Knowledge Base";
              const kindLabel =
                kind === "ticket" ? "Ticket" : kind === "asset" ? "Asset" : "Knowledge";
              const Icon = kind === "ticket" ? Ticket : kind === "asset" ? Package : BookOpen;

              return (
                <div key={kind} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <Icon size={14} className="text-[#4a9eff]" />
                    <span>{heading}</span>
                    <span className="text-gray-500">({rows.length})</span>
                  </div>

                  {rows.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => openResult(r)}
                      className="w-full text-left bg-white border border-gray-300 rounded p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500">
                              {kindLabel}
                            </span>
                            <span className="text-sm font-semibold text-[#4a9eff]">
                              {r.kind === "asset" ? r.subtitle?.split(" · ")[0] ?? r.id : r.id}
                            </span>
                          </div>
                          <h3 className="text-sm font-medium text-[#2d3e50] mb-1">
                            {r.title}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {r.subtitle}
                          </p>
                        </div>
                        {r.date && (
                          <div className="text-xs text-gray-400">
                            {new Date(r.date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <Search
                size={48}
                className="mx-auto mb-3 text-gray-300"
              />
              <p className="text-sm">
                Enter a search term to find results
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}