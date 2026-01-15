import {
  Bell,
  User,
  ChevronDown,
  Settings,
  LogOut,
  UserCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";

interface Notification {
  id: string;
  type:
    | "assignment"
    | "escalation"
    | "update"
    | "sla"
    | "mention";
  message: string;
  time: string;
  read: boolean;
  ticket_id?: string;
  created_at: string;
}

interface NotificationDropdownProps {
  onOpenSettings?: () => void;
}

// TODO: Fetch notifications from Supabase with real-time subscriptions
// const { data: notifications } = await supabase
//   .from('notifications')
//   .select('*')
//   .eq('user_id', currentUser.id)
//   .order('created_at', { ascending: false })
//   .limit(10);
//
// // Real-time subscription
// supabase
//   .channel('notifications')
//   .on('postgres_changes', {
//     event: 'INSERT',
//     schema: 'public',
//     table: 'notifications',
//     filter: `user_id=eq.${currentUser.id}`
//   }, (payload) => {
//     setNotifications(prev => [payload.new, ...prev]);
//   })
//   .subscribe();

export function NotificationDropdown({
  onOpenSettings,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const { user, operatorGroups } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const readKey = user?.id ? `pdsdesk.notifications_read.${user.id}` : "pdsdesk.notifications_read";

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

  const loadReadSet = (): Set<string> => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(readKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      const ids = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
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

  const loadNotifications = async () => {
    if (!user) return;
    setNotificationsLoading(true);

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
          .limit(10);
        if (!grpRes.error) {
          groupIds = (grpRes.data ?? []).map((r: any) => r.id).filter(Boolean);
        }
      }

      const ticketIds = new Set<string>();

      const mineRes = await supabase
        .from("tickets")
        .select("id")
        .eq("assignee_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!mineRes.error) {
        for (const t of (mineRes.data ?? []) as any[]) ticketIds.add(t.id);
      }

      if (groupIds.length) {
        const queueRes = await supabase
          .from("tickets")
          .select("id")
          .in("assignment_group_id", groupIds)
          .order("created_at", { ascending: false })
          .limit(50);
        if (!queueRes.error) {
          for (const t of (queueRes.data ?? []) as any[]) ticketIds.add(t.id);
        }
      }

      const idsArr = Array.from(ticketIds);
      if (!idsArr.length) {
        setNotifications([]);
        setNotificationsLoading(false);
        return;
      }

      const evRes = await supabase
        .from("ticket_events")
        .select("id,ticket_id,event_type,created_at,payload,ticket:tickets!ticket_events_ticket_id_fkey(ticket_number,title)")
        .in("ticket_id", idsArr)
        .in("event_type", eventTypes)
        .order("created_at", { ascending: false })
        .limit(20);

      if (evRes.error) {
        setNotifications([]);
        setNotificationsLoading(false);
        return;
      }

      const rows = (evRes.data ?? []) as any[];
      const next: Notification[] = rows
        .filter((r) => {
          const et = String(r?.event_type ?? "");
          if (et === "escalation" || et === "escalation_notification_sent") return prefs.ticketEscalated;
          if (et === "ticket_auto_closed") return prefs.slaWarnings;
          if (et === "ticket_status_changed" || et === "follow_up_created") return prefs.ticketUpdated;

          if (et === "ticket_updated") {
            const changes = (r?.payload as any)?.changes as Array<{ field?: unknown }> | undefined;
            const hasAssignmentChange =
              Array.isArray(changes) &&
              changes.some((c) => {
                const f = String((c as any)?.field ?? "");
                return f === "assignee_id" || f === "assignment_group_id";
              });
            return hasAssignmentChange ? prefs.ticketAssigned : prefs.ticketUpdated;
          }

          return true;
        })
        .map((r) => {
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

        const type: Notification["type"] =
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
          id: r.id,
          type,
          message: ticketTitle ? `${message}: ${ticketTitle}` : message,
          time: formatRelativeTime(createdAt),
          read: readSet.has(r.id),
          ticket_id: r.ticket_id,
          created_at: createdAt,
        };
      });

      setNotifications(next);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const unreadCount = notifications.filter(
    (n) => !n.read,
  ).length;

  const markAllAsRead = async () => {
    const set = loadReadSet();
    for (const n of notifications) set.add(n.id);
    saveReadSet(set);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = async (notificationId: string) => {
    const set = loadReadSet();
    set.add(notificationId);
    saveReadSet(set);
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
  };

  useEffect(() => {
    if (!user) return;
    void loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!isOpen) return;
    if (!user) return;
    void loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("touchstart", onPointerDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("touchstart", onPointerDown, true);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1 hover:bg-[#b0b0b0] rounded transition-colors"
        title="Notifications"
      >
        <Bell size={14} className="text-[#2d3e50]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-300 z-50">
            {/* Header */}
            <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#2d3e50]">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-xs text-[#4a9eff] hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notificationsLoading ? (
                <div className="p-6 text-center text-gray-500">
                  <p className="text-sm">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell
                    size={32}
                    className="mx-auto mb-2 text-gray-300"
                  />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      markAsRead(notification.id);
                      setIsOpen(false);
                      if (notification.ticket_id) {
                        window.location.hash = `#/call-management?ticketId=${encodeURIComponent(notification.ticket_id)}`;
                      }
                    }}
                    className={`px-4 py-3 border-b border-gray-200 hover:bg-[#f9f9f9] cursor-pointer transition-colors ${
                      !notification.read ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          !notification.read
                            ? "bg-[#4a9eff]"
                            : "bg-transparent"
                        }`}
                      />
                      <div className="flex-1">
                        <p
                          className={`text-sm ${!notification.read ? "font-medium text-[#2d3e50]" : "text-gray-700"}`}
                        >
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="bg-[#f5f5f5] border-t border-gray-300 px-4 py-2 rounded-b-lg">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  window.location.hash = "#/notifications";
                }}
                className="text-xs text-[#4a9eff] hover:underline w-full text-center"
              >
                View all notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface UserProfileDropdownProps {
  onOpenSettings?: () => void;
}

// TODO: Fetch user data from Supabase
// const { data: user } = await supabase.auth.getUser();
// const { data: profile } = await supabase
//   .from('users')
//   .select('*')
//   .eq('id', user.id)
//   .single();

export function UserProfileDropdown({
  onOpenSettings,
}: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const { user: authUser, profile, roles, signOut } = useAuth();

  const email = profile?.email ?? authUser?.email ?? "";
  const fullName =
    profile?.full_name ??
    (authUser?.user_metadata?.full_name as string | undefined) ??
    (authUser?.user_metadata?.name as string | undefined) ??
    null;

  const name = fullName ?? email;
  const initials = (name || "U")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "U";

  const roleLabel = roles.includes("global_admin")
    ? "Global Admin"
    : roles.includes("service_desk_admin")
      ? "Service Desk Admin"
      : roles.includes("operator")
        ? "Operator"
        : "Requester";

  const handleSignOut = async () => {
    await signOut();
  };

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("touchstart", onPointerDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("touchstart", onPointerDown, true);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 hover:bg-[#b0b0b0] rounded transition-colors"
        title="User Profile"
      >
        <div className="w-6 h-6 rounded-full bg-[#4a9eff] flex items-center justify-center">
          <span className="text-white text-[10px] font-semibold">
            {initials}
          </span>
        </div>
        <ChevronDown size={12} className="text-[#2d3e50]" />
      </button>

      {isOpen && (
        <>
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-300 z-50">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-[#4a9eff] flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">
                    {initials}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#2d3e50] text-sm">
                    {name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {roleLabel}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                {email}
              </p>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  // TODO: Navigate to profile page
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors text-[#2d3e50] flex items-center gap-2"
              >
                <UserCircle size={16} />
                My Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings?.();
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors text-[#2d3e50] flex items-center gap-2"
              >
                <Settings size={16} />
                Settings
              </button>
            </div>

            {/* Logout */}
            <div className="border-t border-gray-300 py-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors text-red-600 flex items-center gap-2"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}