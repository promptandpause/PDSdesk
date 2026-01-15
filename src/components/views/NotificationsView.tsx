import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Search, Ticket } from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";

type NotificationType = "assignment" | "escalation" | "update" | "sla" | "mention";

type NotificationRow = {
  id: string;
  type: NotificationType;
  message: string;
  created_at: string;
  read: boolean;
  ticket_id?: string;
};

export function NotificationsView() {
  const { user, operatorGroups } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<NotificationRow[]>([]);

  const [query, setQuery] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const readKey = user?.id
    ? `pdsdesk.notifications_read.${user.id}`
    : "pdsdesk.notifications_read";

  const loadReadSet = (): Set<string> => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(readKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      const ids = Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === "string")
        : [];
      return new Set(ids);
    } catch {
      return new Set();
    }
  };

  const saveReadSet = (set: Set<string>) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(readKey, JSON.stringify(Array.from(set)));
    } catch {
      // ignore
    }
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

  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const readSet = loadReadSet();

      const prefs = (() => {
        const defaults = {
          ticketAssigned: true,
          ticketEscalated: true,
          ticketUpdated: true,
          slaWarnings: true,
        };

        if (typeof window === "undefined") return defaults;
        try {
          const settingsKey = user?.id?.trim()
            ? `pdsdesk.settings.${user.id}`
            : "pdsdesk.settings";
          const raw = localStorage.getItem(settingsKey);
          const parsed = raw ? (JSON.parse(raw) as unknown) : null;
          if (!parsed || typeof parsed !== "object") return defaults;
          const obj = parsed as Record<string, unknown>;
          return {
            ticketAssigned: obj.ticketAssigned !== false,
            ticketEscalated: obj.ticketEscalated !== false,
            ticketUpdated: obj.ticketUpdated !== false,
            slaWarnings: obj.slaWarnings !== false,
          };
        } catch {
          return defaults;
        }
      })();

      const eventTypes = [
        "ticket_status_changed",
        "escalation",
        "follow_up_created",
        "ticket_updated",
        "ticket_auto_closed",
        "escalation_notification_sent",
      ];

      const groupKeys = operatorGroups ?? [];
      let groupIds: string[] = [];
      if (groupKeys.length) {
        const grpRes = await supabase
          .from("operator_groups")
          .select("id")
          .in("group_key", groupKeys)
          .limit(20);
        if (!grpRes.error) {
          groupIds = (grpRes.data ?? [])
            .map((r: any) => r.id)
            .filter(Boolean);
        }
      }

      const ticketIds = new Set<string>();

      const mineRes = await supabase
        .from("tickets")
        .select("id")
        .eq("assignee_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!mineRes.error) {
        for (const t of (mineRes.data ?? []) as any[]) ticketIds.add(t.id);
      }

      if (groupIds.length) {
        const queueRes = await supabase
          .from("tickets")
          .select("id")
          .in("assignment_group_id", groupIds)
          .order("created_at", { ascending: false })
          .limit(200);
        if (!queueRes.error) {
          for (const t of (queueRes.data ?? []) as any[]) ticketIds.add(t.id);
        }
      }

      const idsArr = Array.from(ticketIds);
      if (!idsArr.length) {
        setRows([]);
        setLoading(false);
        return;
      }

      const evRes = await supabase
        .from("ticket_events")
        .select(
          "id,ticket_id,event_type,created_at,payload,ticket:tickets!ticket_events_ticket_id_fkey(ticket_number,title)",
        )
        .in("ticket_id", idsArr)
        .in("event_type", eventTypes)
        .order("created_at", { ascending: false })
        .limit(200);

      if (evRes.error) {
        setError(evRes.error.message);
        setRows([]);
        setLoading(false);
        return;
      }

      const next = ((evRes.data ?? []) as any[]).map((r) => {
        const ticketNumber = r?.ticket?.ticket_number ?? "";
        const ticketTitle = r?.ticket?.title ?? "";
        const createdAt = r?.created_at ?? new Date().toISOString();

        const changes = (r?.payload as any)?.changes as Array<{ field?: unknown }> | undefined;
        const hasAssignmentChange =
          r.event_type === "ticket_updated" &&
          Array.isArray(changes) &&
          changes.some((c) => {
            const f = String((c as any)?.field ?? "");
            return f === "assignee_id" || f === "assignment_group_id";
          });

        const type: NotificationType =
          hasAssignmentChange
            ? "assignment"
            : r.event_type === "escalation"
              ? "escalation"
              : r.event_type === "ticket_auto_closed"
                ? "sla"
                : "update";

        const message =
          r.event_type === "ticket_status_changed"
            ? `Ticket ${ticketNumber || ""} status changed`
            : r.event_type === "follow_up_created"
              ? `Follow-up created for ${ticketNumber || "a ticket"}`
              : r.event_type === "ticket_auto_closed"
                ? `Ticket ${ticketNumber || ""} auto-closed`
                : r.event_type === "escalation_notification_sent"
                  ? `Escalation notification sent for ${ticketNumber || "a ticket"}`
                  : r.event_type === "escalation"
                    ? `Ticket ${ticketNumber || ""} escalated`
                    : `Ticket ${ticketNumber || ""} updated`;

        return {
          id: r.id as string,
          type,
          message: ticketTitle ? `${message}: ${ticketTitle}` : message,
          created_at: createdAt,
          read: readSet.has(r.id),
          ticket_id: r.ticket_id as string,
        } satisfies NotificationRow;
      });

      const filtered = next.filter((n) => {
        if (n.type === "assignment") return prefs.ticketAssigned;
        if (n.type === "escalation") return prefs.ticketEscalated;
        if (n.type === "sla") return prefs.slaWarnings;
        return prefs.ticketUpdated;
      });

      setRows(filtered);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
      setRows([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unreadCount = rows.filter((r) => !r.read).length;

  const markAllAsRead = async () => {
    const set = loadReadSet();
    for (const r of rows) set.add(r.id);
    saveReadSet(set);
    setRows((prev) => prev.map((r) => ({ ...r, read: true })));
  };

  const markAsRead = async (id: string) => {
    const set = loadReadSet();
    set.add(id);
    saveReadSet(set);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, read: true } : r)));
  };

  const visible = rows
    .filter((r) => (showUnreadOnly ? !r.read : true))
    .filter((r) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return r.message.toLowerCase().includes(q);
    });

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#2d3e50] flex items-center gap-2">
            <Bell size={18} />
            Notifications
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
              onClick={() => void loadNotifications()}
              disabled={loading}
            >
              Refresh
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-xs bg-[#4a9eff] text-white rounded hover:bg-[#3a8eef] transition-colors disabled:opacity-50"
              onClick={() => void markAllAsRead()}
              disabled={loading || unreadCount === 0}
              title={unreadCount === 0 ? "No unread notifications" : "Mark all as read"}
            >
              <span className="inline-flex items-center gap-1">
                <CheckCheck size={14} />
                Mark all read
              </span>
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
            />
          </div>
          <label className="text-sm text-gray-700 flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
            />
            Unread only
          </label>
          <div className="text-sm text-gray-600">
            {unreadCount} unread
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-[#fafafa]">
        {error && (
          <div className="bg-white border border-gray-300 rounded px-4 py-3 text-sm text-red-600 mb-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-gray-300 rounded px-4 py-3 text-sm text-gray-600">
            Loading notifications...
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white border border-gray-300 rounded px-4 py-8 text-center text-gray-600">
            <Bell size={28} className="mx-auto mb-2 text-gray-300" />
            <div className="text-sm">No notifications</div>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`w-full text-left bg-white border border-gray-300 rounded p-3 hover:shadow-sm transition-shadow ${
                  !n.read ? "bg-blue-50" : ""
                }`}
                onClick={() => {
                  void markAsRead(n.id);
                  if (n.ticket_id) {
                    window.location.hash = `#/call-management?ticketId=${encodeURIComponent(n.ticket_id)}`;
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        !n.read ? "bg-[#4a9eff]" : "bg-transparent"
                      }`}
                    />
                    <div>
                      <div className="text-sm font-medium text-[#2d3e50]">{n.message}</div>
                      <div className="text-xs text-gray-500 mt-1">{formatRelativeTime(n.created_at)}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Ticket size={14} />
                    Open
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
