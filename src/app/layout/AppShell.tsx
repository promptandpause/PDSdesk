import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Command as CommandPrimitive } from "cmdk";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";

type SidebarItem = {
  label: string;
  to: string;
  icon: string;
  hidden?: boolean;
};

function SidebarLink({
  to,
  label,
  icon,
  isExpanded,
  isActive,
  onClick,
  right,
}: {
  to: string;
  label: string;
  icon: string;
  isExpanded: boolean;
  isActive: boolean;
  onClick?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={`flex items-center gap-3 px-3 py-2 hover:bg-[#2a2a2a] transition-colors cursor-pointer group ${
        isActive ? "bg-[#2a2a2a]" : ""
      }`}
      onClick={() => onClick?.()}
      title={!isExpanded ? label : undefined}
    >
      <span style={{ fontSize: 18, width: 20, textAlign: "center" }}>{icon}</span>
      {isExpanded && <span className="text-sm">{label}</span>}
      {isExpanded && right}
    </NavLink>
  );
}

function AppHeader() {
  return <div className="flex border-b pr-5 h-0" />;
}

type UserNotificationRow = {
  id: string;
  ticket_id: string | null;
  title: string | null;
  body: string | null;
  event_type: string;
  is_read: boolean;
  created_at: string;
};

function NotificationsDrawer({
  visible,
  onClose,
  sidebarWidth,
  onOpenTicket,
  onUnreadCountChange,
}: {
  visible: boolean;
  onClose: () => void;
  sidebarWidth: number;
  onOpenTicket: (ticketId: string) => void;
  onUnreadCountChange?: (count: number) => void;
}) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<UserNotificationRow[]>([]);
  const [markingAll, setMarkingAll] = useState(false);

  const reload = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("user_notifications")
      .select("id,ticket_id,title,body,event_type,is_read,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      const list = (data as UserNotificationRow[]) ?? [];
      setRows(list);
      onUnreadCountChange?.(list.filter((r) => !r.is_read).length);
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    if (visible) {
      void reload();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node | null;
      if (drawerRef.current && !drawerRef.current.contains(target)) {
        const notifBtn = document.getElementById("notifications-btn");
        if (notifBtn && notifBtn.contains(target)) return;
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [visible, onClose]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    setMarkingAll(true);

    const unreadIds = rows.filter((r) => !r.is_read).map((r) => r.id);
    if (unreadIds.length === 0) {
      setMarkingAll(false);
      return;
    }

    const { error } = await supabase
      .from("user_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unreadIds);

    if (!error) {
      setRows((prev) => prev.map((r) => ({ ...r, is_read: true })));
      onUnreadCountChange?.(0);
    }
    setMarkingAll(false);
  };

  if (!visible) return null;

  const unreadCount = rows.filter((r) => !r.is_read).length;

  return (
    <div
      ref={drawerRef}
      className="fixed z-10 h-screen overflow-auto bg-white"
      style={{
        boxShadow: "8px 0px 8px rgba(0, 0, 0, 0.1)",
        maxWidth: 350,
        minWidth: 350,
        left: sidebarWidth,
      }}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-2.5">
        <span className="text-lg font-medium">Notifications</span>
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <button
              type="button"
              className="pds-btn pds-btn--ghost pds-focus"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              title="Mark all as read"
            >
              ✓✓
            </button>
          ) : null}
          <button type="button" className="pds-btn pds-btn--ghost pds-focus" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
      </div>
      {error ? (
        <div className="pds-text-muted" style={{ fontSize: 13, padding: 12 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="pds-text-muted" style={{ fontSize: 13, padding: 12 }}>
          Loading...
        </div>
      ) : rows.length === 0 ? (
        <div className="p-5 text-center text-gray-500 flex flex-col items-center justify-center gap-2 mt-20">
          <p className="text-base text-ink-gray-8">You are all caught up!</p>
        </div>
      ) : (
        <div className="divide-y text-base">
          {rows.map((n) => (
            <button
              key={n.id}
              type="button"
              className="flex w-full cursor-pointer items-start gap-3.5 px-5 py-2.5 hover:bg-gray-100 text-left"
              onClick={() => {
                if (n.ticket_id) {
                  onOpenTicket(n.ticket_id);
                  onClose();
                }
              }}
            >
              <span className="flex-1">
                <div className="mb-2 leading-5">
                  <span className="space-x-1 text-gray-700">
                    <span className="font-medium text-gray-900">
                      {n.title || n.event_type}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600">{new Date(n.created_at).toLocaleString()}</div>
                  {!n.is_read ? <div className="h-1.5 w-1.5 rounded-full bg-blue-400" /> : null}
                </div>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const navigate = useNavigate();

  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState("");
  const [ticketMatches, setTicketMatches] = useState<{ id: string; ticket_number: string; title: string }[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTicketMatches([]);
    setLoadingTickets(false);
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();

    async function loadTickets() {
      if (!open) return;

      // Helpdesk supports "#123" for ticket navigation.
      // Our ids are UUIDs, so we approximate by searching ticket_number/external_number.
      if (!q.startsWith("#") || q.length < 2) {
        setTicketMatches([]);
        setLoadingTickets(false);
        return;
      }

      const needle = q.slice(1).trim();
      if (!needle) {
        setTicketMatches([]);
        setLoadingTickets(false);
        return;
      }

      setLoadingTickets(true);

      const { data, error } = await supabase
        .from("tickets")
        .select("id,ticket_number,title")
        .or(`ticket_number.ilike.%${needle}%,external_number.ilike.%${needle}%`)
        .order("updated_at", { ascending: false })
        .limit(8);

      if (cancelled) return;

      if (error) {
        setTicketMatches([]);
      } else {
        setTicketMatches(((data as any[]) ?? []).map((r) => ({
          id: r.id as string,
          ticket_number: (r.ticket_number as string) ?? "",
          title: (r.title as string) ?? "",
        })));
      }

      setLoadingTickets(false);
    }

    const timer = window.setTimeout(() => {
      void loadTickets();
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query, supabase]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[6500] flex items-start justify-center pt-10"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="pds-overlay fixed inset-0" onClick={onClose} />

      <div className="relative pds-overlay-surface w-[720px] max-w-[calc(100vw-24px)] overflow-hidden">
        <CommandPrimitive
          className="w-full"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
        >
          <div className="relative">
            <div className="pl-4.5 absolute inset-y-0 left-0 flex items-center">
              <span className="pds-text-muted" style={{ fontSize: 12 }}>
                🔎
              </span>
            </div>
            <CommandPrimitive.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder={'Search tickets, comments, or "#123" to navigate to a ticket'}
              className="pl-11.5 pr-4.5 w-full border-none bg-transparent py-3 text-base text-gray-800 placeholder:text-gray-500 focus:ring-0 outline-none"
              autoComplete="off"
            />
          </div>

          <CommandPrimitive.List className="max-h-96 overflow-auto border-t border-gray-100">
            <CommandPrimitive.Group heading="Jump to" className="mt-3">
              <div className="px-2.5">
                <CommandPrimitive.Item
                  value="Tickets"
                  onSelect={() => {
                    navigate("/tickets");
                    onClose();
                  }}
                  className="pds-menu-item flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm data-[selected=true]:bg-[var(--pds-accent-soft)]"
                >
                  Tickets
                </CommandPrimitive.Item>
                <CommandPrimitive.Item
                  value="Knowledge Base"
                  onSelect={() => {
                    navigate("/kb");
                    onClose();
                  }}
                  className="pds-menu-item flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm data-[selected=true]:bg-[var(--pds-accent-soft)]"
                >
                  Knowledge Base
                </CommandPrimitive.Item>
              </div>
            </CommandPrimitive.Group>

            {query.trim().length > 2 ? (
              <CommandPrimitive.Group heading="Search" className="mt-4.5">
                <div className="px-2.5">
                  <CommandPrimitive.Item
                    value={`Search for ${query.trim()}`}
                    onSelect={() => {
                      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                      onClose();
                    }}
                    className="pds-menu-item flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm data-[selected=true]:bg-[var(--pds-accent-soft)]"
                  >
                    Search for “{query.trim()}”
                  </CommandPrimitive.Item>
                </div>
              </CommandPrimitive.Group>
            ) : null}

            {query.trim().startsWith("#") ? (
              <CommandPrimitive.Group heading="Tickets" className="mt-4.5">
                <div className="px-2.5">
                  {loadingTickets ? (
                    <div className="pds-text-muted" style={{ fontSize: 12, padding: "8px 12px" }}>
                      Searching tickets...
                    </div>
                  ) : ticketMatches.length === 0 ? (
                    <div className="pds-text-muted" style={{ fontSize: 12, padding: "8px 12px" }}>
                      No matching tickets.
                    </div>
                  ) : (
                    ticketMatches.map((t) => (
                      <CommandPrimitive.Item
                        key={t.id}
                        value={`${t.ticket_number} ${t.title}`}
                        onSelect={() => {
                          navigate(`/tickets/${t.id}`);
                          onClose();
                        }}
                        className="pds-menu-item flex cursor-pointer items-center justify-between gap-3 rounded px-3 py-2 text-sm data-[selected=true]:bg-[var(--pds-accent-soft)]"
                      >
                        <span style={{ fontWeight: 650 }}>{t.ticket_number}</span>
                        <span className="pds-text-muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.title}
                        </span>
                      </CommandPrimitive.Item>
                    ))
                  )}
                </div>
              </CommandPrimitive.Group>
            ) : null}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </div>
    </div>
  );
}

export function AppShell() {
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAgent = roles.includes("operator") || roles.includes("service_desk_admin") || roles.includes("global_admin");

  const [isExpanded, setIsExpanded] = useState(true);
  const sidebarWidth = isExpanded ? 220 : 56;

  const [showNotifications, setShowNotifications] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function loadUnread() {
      if (!user || !isAgent) return;
      const { count, error } = await supabase
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);

      if (cancelled) return;
      if (error) {
        setUnreadCount(0);
      } else {
        setUnreadCount(count ?? 0);
      }
    }

    void loadUnread();

    return () => {
      cancelled = true;
    };
  }, [isAgent, supabase, user]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const agentItems: SidebarItem[] = [
    { label: "Search", to: "/search", icon: "🔍" },
    { label: "Notifications", to: "#notifications", icon: "🔔" },
    { label: "Tickets", to: "/tickets", icon: "🎫" },
    { label: "Knowledge Base", to: "/kb", icon: "📚" },
    { label: "Canned Responses", to: "/saved-replies", icon: "💬" },
    { label: "Customers", to: "/customers", icon: "🏢" },
    { label: "Contacts", to: "/contacts", icon: "👤" },
  ];

  const customerItems: SidebarItem[] = [
    { label: "My Tickets", to: "/my-tickets", icon: "🎫" },
    { label: "Knowledge Base", to: "/kb-public", icon: "📚" },
  ];

  const currentPath = location.pathname;

  return (
    <div className="flex h-screen w-screen">
      {/* Dark Sidebar */}
      <aside
        className="bg-[#1a1a1a] text-white transition-all duration-300 flex flex-col"
        style={{ width: sidebarWidth }}
      >
        {/* Header with logo and toggle */}
        <div
          className="flex items-center gap-3 px-3 py-3 border-b border-[#2a2a2a] cursor-pointer hover:bg-[#2a2a2a]"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div
            className="flex items-center justify-center rounded-lg bg-[#2563eb] text-white"
            style={{ width: 32, height: 32, fontSize: 14, fontWeight: 700 }}
          >
            HD
          </div>
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">Helpdesk</div>
              <div className="text-xs text-gray-400 truncate">
                {profile?.full_name ?? "Administrator"}
              </div>
            </div>
          )}
          {isExpanded && (
            <span className="text-gray-400 text-xs">▼</span>
          )}
        </div>

        {/* Search shortcut */}
        <button
          type="button"
          className="flex items-center gap-3 px-3 py-2 hover:bg-[#2a2a2a] transition-colors cursor-pointer border-b border-[#2a2a2a]"
          onClick={() => setShowCommandPalette(true)}
          title={!isExpanded ? "Search (⌘K)" : undefined}
        >
          <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>🔍</span>
          {isExpanded && (
            <>
              <span className="text-sm text-gray-300 flex-1 text-left">Search</span>
              <span className="text-xs text-gray-500 bg-[#2a2a2a] px-1.5 py-0.5 rounded">⌘K</span>
            </>
          )}
        </button>

        {/* Notifications */}
        <button
          id="notifications-btn"
          type="button"
          className={`flex items-center gap-3 px-3 py-2 hover:bg-[#2a2a2a] transition-colors cursor-pointer ${
            showNotifications ? "bg-[#2a2a2a]" : ""
          }`}
          onClick={() => setShowNotifications((v) => !v)}
          title={!isExpanded ? "Notifications" : undefined}
        >
          <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>🔔</span>
          {isExpanded && (
            <>
              <span className="text-sm flex-1 text-left">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount}
                </span>
              )}
            </>
          )}
          {!isExpanded && unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        {/* Main nav items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {(isAgent ? agentItems : customerItems)
            .filter((i) => !i.hidden && i.to !== "#notifications")
            .map((item) => (
              <SidebarLink
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                isExpanded={isExpanded}
                isActive={currentPath === item.to || currentPath.startsWith(item.to + "/")}
              />
            ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-[#2a2a2a] py-2">
          {isAgent ? (
            <button
              type="button"
              className="flex items-center gap-3 px-3 py-2 hover:bg-[#2a2a2a] transition-colors cursor-pointer w-full"
              onClick={() => navigate("/my-tickets")}
              title={!isExpanded ? "Customer Portal" : undefined}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>🌐</span>
              {isExpanded && <span className="text-sm">Customer Portal</span>}
            </button>
          ) : (
            <button
              type="button"
              className="flex items-center gap-3 px-3 py-2 hover:bg-[#2a2a2a] transition-colors cursor-pointer w-full"
              onClick={() => navigate("/tickets")}
              title={!isExpanded ? "Agent Portal" : undefined}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>🛠️</span>
              {isExpanded && <span className="text-sm">Agent Portal</span>}
            </button>
          )}

          {/* Help link */}
          <button
            type="button"
            className="flex items-center gap-3 px-3 py-2 hover:bg-[#2a2a2a] transition-colors cursor-pointer w-full"
            onClick={() => window.open("https://docs.frappe.io/helpdesk", "_blank")}
            title={!isExpanded ? "Help" : undefined}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>❓</span>
            {isExpanded && <span className="text-sm">Help</span>}
          </button>

          {/* Sign out */}
          <button
            type="button"
            className="flex items-center gap-3 px-3 py-2 hover:bg-[#2a2a2a] transition-colors cursor-pointer w-full text-red-400"
            onClick={() => void signOut()}
            title={!isExpanded ? "Sign Out" : undefined}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>🚪</span>
            {isExpanded && <span className="text-sm">Sign Out</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-auto bg-white">
        <AppHeader />
        <Outlet />
      </div>

      <NotificationsDrawer
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        sidebarWidth={sidebarWidth}
        onOpenTicket={(ticketId) => navigate(`/tickets/${ticketId}`)}
        onUnreadCountChange={(count) => setUnreadCount(count)}
      />

      <CommandPalette open={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
    </div>
  );
}
