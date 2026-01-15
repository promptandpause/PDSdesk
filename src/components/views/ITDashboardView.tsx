import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Server,
  HardDrive,
  Cpu,
  Wifi,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";

// TODO: Fetch IT metrics from Supabase
export function ITDashboardView() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIncidents, setActiveIncidents] = useState<number | null>(null);
  const [resolvedToday, setResolvedToday] = useState<number | null>(null);
  const [avgFirstResponseMinutes, setAvgFirstResponseMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startIso = today.toISOString();

        const [activeIncidentsRes, resolvedTodayRes, slasRes] = await Promise.all([
          supabase
            .from("tickets")
            .select("id", { count: "exact", head: true })
            .eq("ticket_type", "itsm_incident")
            .in("status", ["new", "open", "in_progress", "pending"]),
          supabase
            .from("tickets")
            .select("id", { count: "exact", head: true })
            .eq("ticket_type", "itsm_incident")
            .eq("status", "resolved")
            .gte("resolved_at", startIso),
          supabase
            .from("ticket_slas")
            .select("created_at,first_response_at")
            .not("first_response_at", "is", null)
            .order("first_response_at", { ascending: false })
            .limit(200),
        ]);

        if (cancelled) return;

        const firstError = activeIncidentsRes.error ?? resolvedTodayRes.error;
        if (firstError) {
          setError(firstError.message);
          setActiveIncidents(null);
          setResolvedToday(null);
          setAvgFirstResponseMinutes(null);
          setLoading(false);
          return;
        }

        setActiveIncidents(activeIncidentsRes.count ?? 0);
        setResolvedToday(resolvedTodayRes.count ?? 0);

        if (!slasRes.error) {
          const rows = (slasRes.data ?? []) as Array<{ created_at: string; first_response_at: string }>;
          const diffs = rows
            .map((r) => {
              const a = new Date(r.created_at).getTime();
              const b = new Date(r.first_response_at).getTime();
              const d = Math.floor((b - a) / 60000);
              return Number.isFinite(d) && d >= 0 ? d : null;
            })
            .filter((d): d is number => typeof d === "number");
          if (diffs.length) {
            setAvgFirstResponseMinutes(Math.round(diffs.reduce((x, y) => x + y, 0) / diffs.length));
          } else {
            setAvgFirstResponseMinutes(null);
          }
        } else {
          setAvgFirstResponseMinutes(null);
        }

        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load IT dashboard");
        setActiveIncidents(null);
        setResolvedToday(null);
        setAvgFirstResponseMinutes(null);
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
          IT Infrastructure Dashboard
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-4 bg-white border border-gray-300 rounded p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* System Uptime */}
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                System Uptime
              </span>
              <Server size={16} className="text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {loading ? "…" : "N/A"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              &nbsp;
            </div>
          </div>

          {/* Active Servers */}
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Active Servers
              </span>
              <CheckCircle
                size={16}
                className="text-blue-600"
              />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              {loading ? "…" : "N/A"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              &nbsp;
            </div>
          </div>

          {/* Active Incidents */}
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Active Incidents
              </span>
              <AlertCircle
                size={16}
                className="text-orange-600"
              />
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {loading ? "…" : (activeIncidents ?? 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {loading
                ? ""
                : resolvedToday != null
                  ? `${resolvedToday} resolved today`
                  : ""}
            </div>
          </div>

          {/* Avg Response Time */}
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">
                Avg Response Time
              </span>
              <Clock size={16} className="text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-[#2d3e50]">
              {loading
                ? "…"
                : avgFirstResponseMinutes != null
                  ? `${avgFirstResponseMinutes} min`
                  : "N/A"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              &nbsp;
            </div>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu size={18} className="text-blue-600" />
                <span className="font-medium text-sm">
                  CPU Usage
                </span>
              </div>
              <span className="text-sm font-semibold">
                {loading ? "…" : "N/A"}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: "0%" }}
              ></div>
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Server size={18} className="text-orange-600" />
                <span className="font-medium text-sm">
                  Memory Usage
                </span>
              </div>
              <span className="text-sm font-semibold">
                {loading ? "…" : "N/A"}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full"
                style={{ width: "0%" }}
              ></div>
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive size={18} className="text-red-600" />
                <span className="font-medium text-sm">
                  Storage Usage
                </span>
              </div>
              <span className="text-sm font-semibold">
                {loading ? "…" : "N/A"}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full"
                style={{ width: "0%" }}
              ></div>
            </div>
          </div>
        </div>

        {/* Network Status */}
        <div className="bg-white border border-gray-300 rounded p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Wifi size={18} className="text-green-600" />
            <h3 className="font-semibold text-sm">
              Network Status
            </h3>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-4 text-xs text-gray-600">No network telemetry connected.</div>
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-white border border-gray-300 rounded p-4">
          <h3 className="font-semibold text-sm mb-3">
            Recent System Events
          </h3>
          <div className="space-y-2">
            <div className="text-xs text-gray-600">No system telemetry connected.</div>
          </div>
        </div>
      </div>
    </div>
  );
}