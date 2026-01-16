import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Command as CommandPrimitive } from "cmdk";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";

type SidebarItem = {
  label: string;
  to: string;
  hidden?: boolean;
};

function SidebarLink({
  to,
  label,
  onClick,
  right,
}: {
  to: string;
  label: string;
  onClick?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `-all flex h-7 cursor-pointer items-center rounded pl-2 pr-1 text-gray-800 duration-300 ease-in-out ${
          isActive ? "bg-white shadow-sm" : "hover:bg-gray-100"
        }`
      }
      onClick={() => onClick?.()}
      end
    >
      <div className="-all ml-2 flex grow items-center justify-between text-sm duration-300 ease-in-out">
        {label}
        {right}
      </div>
    </NavLink>
  );
}

function AppHeader() {
  return <div className="flex border-b pr-5" />;
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
}: {
  visible: boolean;
  onClose: () => void;
  sidebarWidth: number;
  onOpenTicket: (ticketId: string) => void;
}) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<UserNotificationRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) return;
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("user_notifications")
        .select("id,ticket_id,title,body,event_type,is_read,created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data as UserNotificationRow[]) ?? []);
      }
      setLoading(false);
    }

    if (visible) {
      void load();
    }

    return () => {
      cancelled = true;
    };
  }, [supabase, user, visible]);

  if (!visible) return null;

  return (
    <span
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
        <div>
          <button type="button" className="pds-btn pds-btn--outline pds-focus" onClick={onClose}>
            Close
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
    </span>
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

  const isAgent = roles.includes("operator") || roles.includes("service_desk_admin") || roles.includes("global_admin");
  const sidebarWidth = 230;

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
    { label: "Tickets", to: "/tickets" },
    { label: "Knowledge Base", to: "/kb" },
    { label: "Customers", to: "/customers" },
    { label: "Contacts", to: "/contacts" },
    { label: "Call Logs", to: "/call-logs" },
  ];

  const customerItems: SidebarItem[] = [
    { label: "Tickets", to: "/my-tickets" },
    { label: "Knowledge Base", to: "/kb-public" },
  ];

  return (
    <div className="flex h-screen w-screen">
      <div
        className="relative z-10 flex h-full w-[230px] flex-col border-r bg-gray-50 transition-all duration-300 ease-in-out"
        style={{ width: sidebarWidth }}
      >
        <div className="p-1">
          <div className="pds-panel" style={{ padding: 10 }}>
            <div className="text-sm" style={{ fontWeight: 750, color: "var(--pds-text)" }}>
              Service Desk
            </div>
            <div className="pds-text-muted" style={{ fontSize: 12, marginTop: 2 }}>
              {profile?.full_name ?? profile?.email ?? "Signed in"}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button type="button" className="pds-btn pds-btn--outline pds-focus" onClick={() => setShowCommandPalette(true)} style={{ flex: 1 }}>
                Cmd+K
              </button>
              <button type="button" className="pds-btn pds-btn--outline pds-focus" onClick={() => void signOut()} style={{ flex: 1 }}>
                Log out
              </button>
            </div>
          </div>
        </div>

        {isAgent ? (
          <div className="overflow-y-auto px-2">
            <div className="mb-3 flex flex-col gap-1">
              <button
                id="notifications-btn"
                type="button"
                className="-all flex h-7 cursor-pointer items-center rounded pl-2 pr-1 text-gray-800 duration-300 ease-in-out hover:bg-gray-100"
                onClick={() => setShowNotifications((v) => !v)}
              >
                <div className="-all ml-2 flex grow items-center justify-between text-sm duration-300 ease-in-out">
                  Notifications
                  {unreadCount ? (
                    <span className="pds-badge pds-badge--neutral" style={{ height: 18 }}>
                      {unreadCount}
                    </span>
                  ) : null}
                </div>
              </button>
              <SidebarLink to="/dashboard" label="Dashboard" />
            </div>
          </div>
        ) : null}

        <div className="mx-2 my-2 h-1" />
        <div className="flex flex-col ml-2 mr-1">
          {(isAgent ? agentItems : customerItems)
            .filter((i) => !i.hidden)
            .map((item) => (
              <SidebarLink key={item.to} to={item.to} label={item.label} />
            ))}
        </div>

        {!isAgent ? (
          <div style={{ marginTop: "auto" }} className="p-2">
            <button type="button" className="pds-btn pds-btn--outline pds-focus w-full" onClick={() => navigate("/tickets")}>Agent portal</button>
          </div>
        ) : (
          <div style={{ marginTop: "auto" }} className="p-2">
            <button type="button" className="pds-btn pds-btn--outline pds-focus w-full" onClick={() => navigate("/my-tickets")}>Customer portal</button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col h-full overflow-auto">
        <AppHeader />
        <Outlet />
      </div>

      <NotificationsDrawer
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        sidebarWidth={sidebarWidth}
        onOpenTicket={(ticketId) => navigate(`/tickets/${ticketId}`)}
      />

      <CommandPalette open={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
    </div>
  );
}
