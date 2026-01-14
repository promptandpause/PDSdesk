import {
  Bell,
  User,
  ChevronDown,
  Settings,
  LogOut,
  UserCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/auth/AuthProvider";

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

  // Mock data - replace with Supabase query
  const notifications: Notification[] = [
    {
      id: "1",
      type: "assignment",
      message: "New ticket I 2024 045 assigned to you",
      time: "5 mins ago",
      read: false,
      ticket_id: "I-2024-045",
      created_at: "2024-01-11T14:55:00Z",
    },
    {
      id: "2",
      type: "escalation",
      message: "Ticket I 2024 042 escalated to your team",
      time: "15 mins ago",
      read: false,
      ticket_id: "I-2024-042",
      created_at: "2024-01-11T14:45:00Z",
    },
    {
      id: "3",
      type: "update",
      message: "Ticket I 2024 038 updated by caller",
      time: "1 hour ago",
      read: true,
      ticket_id: "I-2024-038",
      created_at: "2024-01-11T13:00:00Z",
    },
    {
      id: "4",
      type: "sla",
      message: "SLA breach warning for I 2024 035",
      time: "2 hours ago",
      read: true,
      ticket_id: "I-2024-035",
      created_at: "2024-01-11T12:00:00Z",
    },
    {
      id: "5",
      type: "mention",
      message: "You were mentioned in ticket I 2024 030",
      time: "3 hours ago",
      read: true,
      ticket_id: "I-2024-030",
      created_at: "2024-01-11T11:00:00Z",
    },
  ];

  const unreadCount = notifications.filter(
    (n) => !n.read,
  ).length;

  const markAllAsRead = async () => {
    // TODO: Update all notifications as read in Supabase
    // await supabase
    //   .from('notifications')
    //   .update({ read: true })
    //   .eq('user_id', currentUser.id)
    //   .eq('read', false);
    console.log("Marking all as read...");
  };

  const markAsRead = async (notificationId: string) => {
    // TODO: Mark single notification as read in Supabase
    // await supabase
    //   .from('notifications')
    //   .update({ read: true })
    //   .eq('id', notificationId);
    console.log(
      "Marking notification as read:",
      notificationId,
    );
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
              {notifications.length === 0 ? (
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
                      // TODO: Navigate to ticket if ticket_id exists
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
                  // TODO: Open notifications page
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