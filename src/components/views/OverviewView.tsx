import {
  TrendingUp,
  Users,
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";

// TODO: Fetch overview data from Supabase
export function OverviewView() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<{
    totalTickets: number;
    activeTickets: number;
    assetsTracked: number;
    knowledgeArticles: number;
    avgResolutionSeconds: number | null;
    slaCompliancePct: number | null;
  } | null>(null);

  type ActivityRow = {
    id: string;
    created_at: string;
    event_type: string;
    payload: any;
    ticket: { ticket_number: string | null; title: string | null } | null;
    actor: { full_name: string | null; email: string | null } | null;
  };

  const [activity, setActivity] = useState<ActivityRow[]>([]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return "N/A";
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = mins / 60;
    return `${hrs.toFixed(1)}h`;
  };

  const formatRelativeTime = (iso: string) => {
    const ts = new Date(iso).getTime();
    if (!Number.isFinite(ts)) return "";
    const diffMs = Date.now() - ts;
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          totalTicketsRes,
          activeTicketsRes,
          assetsRes,
          kbRes,
          resolvedSampleRes,
          slaRes,
          activityRes,
        ] = await Promise.all([
          supabase.from("tickets").select("id", { count: "exact", head: true }),
          supabase
            .from("tickets")
            .select("id", { count: "exact", head: true })
            .in("status", ["new", "open", "in_progress", "pending"]),
          supabase.from("assets").select("id", { count: "exact", head: true }),
          supabase.from("knowledge_articles").select("id", { count: "exact", head: true }),
          supabase
            .from("tickets")
            .select("created_at,resolved_at")
            .not("resolved_at", "is", null)
            .order("resolved_at", { ascending: false })
            .limit(200),
          supabase
            .from("ticket_slas")
            .select("resolution_due_at,resolved_at")
            .not("resolution_due_at", "is", null)
            .limit(500),
          supabase
            .from("ticket_events")
            .select(
              "id,created_at,event_type,payload,ticket:tickets!ticket_events_ticket_id_fkey(ticket_number,title),actor:profiles!ticket_events_actor_id_fkey(full_name,email)",
            )
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        if (cancelled) return;

        const firstError =
          totalTicketsRes.error ??
          activeTicketsRes.error ??
          assetsRes.error ??
          kbRes.error ??
          resolvedSampleRes.error ??
          activityRes.error;

        if (firstError) {
          setError(firstError.message);
          setMetrics(null);
          setActivity([]);
          setLoading(false);
          return;
        }

        let avgResolutionSeconds: number | null = null;
        const sample = (resolvedSampleRes.data ?? []) as Array<{ created_at: string; resolved_at: string }>;
        if (sample.length) {
          const diffs = sample
            .map((r) => {
              const a = new Date(r.created_at).getTime();
              const b = new Date(r.resolved_at).getTime();
              const d = Math.floor((b - a) / 1000);
              return Number.isFinite(d) && d > 0 ? d : null;
            })
            .filter((d): d is number => typeof d === "number");
          if (diffs.length) {
            avgResolutionSeconds = Math.round(diffs.reduce((x, y) => x + y, 0) / diffs.length);
          }
        }

        let slaCompliancePct: number | null = null;
        if (!slaRes.error) {
          const rows = (slaRes.data ?? []) as Array<{ resolution_due_at: string | null; resolved_at: string | null }>;
          const withResolved = rows.filter((r) => r.resolution_due_at && r.resolved_at);
          if (withResolved.length) {
            const onTime = withResolved.filter((r) => {
              const due = new Date(r.resolution_due_at as string).getTime();
              const resolved = new Date(r.resolved_at as string).getTime();
              return Number.isFinite(due) && Number.isFinite(resolved) && resolved <= due;
            }).length;
            slaCompliancePct = Math.round((onTime / withResolved.length) * 1000) / 10;
          }
        }

        setMetrics({
          totalTickets: totalTicketsRes.count ?? 0,
          activeTickets: activeTicketsRes.count ?? 0,
          assetsTracked: assetsRes.count ?? 0,
          knowledgeArticles: kbRes.count ?? 0,
          avgResolutionSeconds,
          slaCompliancePct,
        });

        const normalizedActivity = ((activityRes.data ?? []) as any[]).map((row) => {
          const ticket = Array.isArray(row?.ticket) ? (row.ticket[0] ?? null) : (row?.ticket ?? null);
          const actor = Array.isArray(row?.actor) ? (row.actor[0] ?? null) : (row?.actor ?? null);
          return {
            id: String(row?.id ?? ""),
            created_at: String(row?.created_at ?? new Date().toISOString()),
            event_type: String(row?.event_type ?? ""),
            payload: row?.payload ?? {},
            ticket: ticket
              ? {
                  ticket_number: ticket.ticket_number ?? null,
                  title: ticket.title ?? null,
                }
              : null,
            actor: actor
              ? {
                  full_name: actor.full_name ?? null,
                  email: actor.email ?? null,
                }
              : null,
          } satisfies ActivityRow;
        });

        setActivity(normalizedActivity);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load overview");
        setMetrics(null);
        setActivity([]);
        setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          System Overview
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-4 bg-white border border-gray-300 rounded p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Total Tickets
              </span>
              <Ticket size={16} className="text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              {loading ? "…" : (metrics?.totalTickets ?? 0)}
            </div>
            <div className="text-xs text-green-600 mt-1">
              &nbsp;
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Active Users
              </span>
              <Users size={16} className="text-green-600" />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              {loading ? "…" : "N/A"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              &nbsp;
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Avg Resolution Time
              </span>
              <Clock size={16} className="text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              {loading ? "…" : formatDuration(metrics?.avgResolutionSeconds ?? null)}
            </div>
            <div className="text-xs text-green-600 mt-1">
              &nbsp;
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                SLA Compliance
              </span>
              <CheckCircle2
                size={16}
                className="text-purple-600"
              />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              {loading
                ? "…"
                : metrics?.slaCompliancePct != null
                  ? `${metrics.slaCompliancePct}%`
                  : "N/A"}
            </div>
            <div className="text-xs text-green-600 mt-1">
              &nbsp;
            </div>
          </div>
        </div>

        {/* Module Status */}
        <div className="bg-white border border-gray-300 rounded p-4 mb-6">
          <h3 className="font-semibold text-sm mb-4">
            Module Status
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                name: "Tickets",
                status: "Operational",
                detail: `${metrics?.activeTickets ?? 0} active tickets`,
                color: "green",
              },
              {
                name: "Asset Management",
                status: "Operational",
                detail: `${metrics?.assetsTracked ?? 0} assets tracked`,
                color: "green",
              },
              {
                name: "Knowledge Base",
                status: "Operational",
                detail: `${metrics?.knowledgeArticles ?? 0} articles`,
                color: "green",
              },
            ].map((module, idx) => (
              <div
                key={idx}
                className="p-3 border border-gray-200 rounded hover:bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {module.name}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      module.color === "green"
                        ? "bg-green-500"
                        : "bg-yellow-500"
                    }`}
                  ></span>
                </div>
                <div className="text-xs text-gray-600">
                  {loading ? "Loading..." : module.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-gray-300 rounded p-4">
          <h3 className="font-semibold text-sm mb-3">
            Recent System Activity
          </h3>
          <div className="space-y-2">
            {loading ? (
              <div className="text-xs text-gray-600">Loading...</div>
            ) : activity.length === 0 ? (
              <div className="text-xs text-gray-600">No recent activity.</div>
            ) : (
              activity.map((a, idx) => {
                const actorName = a.actor?.full_name ?? a.actor?.email ?? "System";
                const ticketRef = a.ticket?.ticket_number ?? "";
                const ticketTitle = a.ticket?.title ?? "";
                const type =
                  a.event_type === "ticket_status_changed"
                    ? "success"
                    : a.event_type === "escalation" || a.event_type === "escalation_notification_sent"
                      ? "warning"
                      : "info";

                const action = ticketTitle
                  ? `${a.event_type.replace(/_/g, " ")} ${ticketRef ? `(${ticketRef})` : ""}: ${ticketTitle}`
                  : `${a.event_type.replace(/_/g, " ")} ${ticketRef ? `(${ticketRef})` : ""}`.trim();

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        type === "success"
                          ? "bg-green-500"
                          : type === "warning"
                            ? "bg-yellow-500"
                            : "bg-blue-500"
                      }`}
                    ></div>
                    <span className="text-xs text-gray-500 w-20">
                      {formatRelativeTime(a.created_at)}
                    </span>
                    <span className="text-xs font-medium w-32">{actorName}</span>
                    <span className="text-xs flex-1">{action}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}