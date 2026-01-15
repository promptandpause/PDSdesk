import { type DragEvent, useCallback, useEffect, useMemo, useState } from "react";
import { NavigatorPanel } from "../dashboard/NavigatorPanel";
import { KPIWidget } from "../dashboard/KPIWidget";
import { ReportKPIWidget } from "../dashboard/ReportKPIWidget";
import { ReportsListWidget } from "../dashboard/ReportsListWidget";
import { SelectionsWidget } from "../dashboard/SelectionsWidget";
import { NewWidget } from "../dashboard/NewWidget";
import {
  Plus,
  RefreshCw,
  ChevronRight,
  Inbox,
  Ticket,
  LayoutDashboard,
  FolderKanban,
  Settings,
} from "lucide-react";
import { ModuleType } from "../../App";
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
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

// TODO: Fetch dashboard configuration from Supabase
export function DashboardView({
  onOpenTab,
}: {
  onOpenTab: (module: ModuleType, title: string) => void;
}) {
  const [showNavigator, setShowNavigator] = useState(true);
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [maximizedWidgetId, setMaximizedWidgetId] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<{
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    assignedToMe: number;
    customerSupport: number;
    ticketTasksOpen: number;
    ticketTasksInProgress: number;
    ticketTasksCompleted: number;
  } | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const loadMetrics = useCallback(async () => {
    if (!user) return;

    setMetricsError(null);
    setMetricsLoading(true);

    const [ticketsTotal, ticketsOpen, ticketsResolved, ticketsMine, ticketsCustomerSupport, tasksOpen, tasksInProgress, tasksCompleted] = await Promise.all([
      supabase.from("tickets").select("id", { count: "exact", head: true }),
      supabase.from("tickets").select("id", { count: "exact", head: true }).in("status", ["new", "open", "pending"]),
      supabase.from("tickets").select("id", { count: "exact", head: true }).in("status", ["resolved", "closed"]),
      supabase.from("tickets").select("id", { count: "exact", head: true }).eq("assignee_id", user.id),
      supabase.from("tickets").select("id", { count: "exact", head: true }).eq("ticket_type", "customer_service"),
      supabase.from("ticket_tasks").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("ticket_tasks").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
      supabase.from("ticket_tasks").select("id", { count: "exact", head: true }).eq("status", "completed"),
    ]);

    const firstError =
      ticketsTotal.error ??
      ticketsOpen.error ??
      ticketsResolved.error ??
      ticketsMine.error ??
      ticketsCustomerSupport.error ??
      tasksOpen.error ??
      tasksInProgress.error ??
      tasksCompleted.error;

    if (firstError) {
      setMetrics(null);
      setMetricsError(firstError.message);
      setMetricsLoading(false);
      return;
    }

    setMetrics({
      totalTickets: ticketsTotal.count ?? 0,
      openTickets: ticketsOpen.count ?? 0,
      resolvedTickets: ticketsResolved.count ?? 0,
      assignedToMe: ticketsMine.count ?? 0,
      customerSupport: ticketsCustomerSupport.count ?? 0,
      ticketTasksOpen: tasksOpen.count ?? 0,
      ticketTasksInProgress: tasksInProgress.count ?? 0,
      ticketTasksCompleted: tasksCompleted.count ?? 0,
    });
    setMetricsLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    const handler = () => {
      void loadMetrics();
    };

    window.addEventListener("pdsdesk:refresh", handler as EventListener);
    return () => {
      window.removeEventListener("pdsdesk:refresh", handler as EventListener);
    };
  }, [loadMetrics]);

  type WidgetId =
    | "kpi"
    | "report-main"
    | "new"
    | "report-dual"
    | "reports"
    | "selections";

  type WidgetSize = "sm" | "md" | "lg";

  type DashboardWidgetRow = {
    id: string;
    user_id: string;
    widget_id: WidgetId;
    position: number;
    size: WidgetSize;
    title: string | null;
    subtitle: string | null;
    is_hidden: boolean;
    settings: Record<string, unknown>;
  };

  const defaultWidgetOrder: WidgetId[] = [
    "kpi",
    "report-main",
    "new",
    "report-dual",
    "reports",
    "selections",
  ];

  const [widgets, setWidgets] = useState<Record<WidgetId, DashboardWidgetRow>>({} as Record<WidgetId, DashboardWidgetRow>);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(defaultWidgetOrder);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const safeWidgetOrder = useMemo(() => {
    const cleaned = widgetOrder.filter((id) => defaultWidgetOrder.includes(id));
    for (const id of defaultWidgetOrder) {
      if (!cleaned.includes(id)) cleaned.push(id);
    }
    return cleaned;
  }, [widgetOrder]);

  const loadDashboardState = useCallback(async () => {
    if (!user) return;

    setDashboardError(null);
    setDashboardLoading(true);

    const ensure = await supabase.rpc("ensure_default_dashboard_state");
    if (ensure.error) {
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem("pdsdesk:dashboard:widgets:v1");
          const parsed = raw ? (JSON.parse(raw) as WidgetId[]) : null;
          if (parsed && Array.isArray(parsed)) {
            setWidgetOrder(parsed.filter((id) => defaultWidgetOrder.includes(id)) as WidgetId[]);
          }
        } catch {
          // ignore
        }
      }
      setDashboardError(ensure.error.message);
      setDashboardLoading(false);
      return;
    }

    const res = await supabase
      .from("dashboard_widgets")
      .select("id,user_id,widget_id,position,size,title,subtitle,is_hidden,settings")
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    if (res.error) {
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem("pdsdesk:dashboard:widgets:v1");
          const parsed = raw ? (JSON.parse(raw) as WidgetId[]) : null;
          if (parsed && Array.isArray(parsed)) {
            setWidgetOrder(parsed.filter((id) => defaultWidgetOrder.includes(id)) as WidgetId[]);
          }
        } catch {
          // ignore
        }
      }

      setDashboardError(res.error.message);
      setDashboardLoading(false);
      return;
    }

    const rows = (res.data ?? []) as DashboardWidgetRow[];
    const byId = {} as Record<WidgetId, DashboardWidgetRow>;
    const order: WidgetId[] = [];
    for (const row of rows) {
      if (!defaultWidgetOrder.includes(row.widget_id)) continue;
      byId[row.widget_id] = row;
      if (!row.is_hidden) order.push(row.widget_id);
    }

    setWidgets(byId);
    setWidgetOrder(order.length > 0 ? order : defaultWidgetOrder);

    if (typeof window !== "undefined") {
      window.localStorage.setItem("pdsdesk:dashboard:widgets:v1", JSON.stringify(order.length > 0 ? order : defaultWidgetOrder));
    }

    setDashboardLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    void loadDashboardState();
  }, [loadDashboardState]);

  const persistWidgetOrder = useCallback(async (nextOrder: WidgetId[]) => {
    if (!user) return;

    const updates = nextOrder.map((id, idx) => ({
      user_id: user.id,
      widget_id: id,
      position: idx,
    }));

    const { error } = await supabase
      .from("dashboard_widgets")
      .upsert(updates, { onConflict: "user_id,widget_id" });

    if (error) setDashboardError(error.message);
  }, [supabase, user]);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, id: WidgetId) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, overId: WidgetId) => {
    e.preventDefault();
    const dragged = e.dataTransfer.getData("text/plain") as WidgetId;
    if (!dragged || dragged === overId) return;

    setWidgetOrder((prev) => {
      const next = prev.slice();
      const from = next.indexOf(dragged);
      const to = next.indexOf(overId);
      if (from < 0 || to < 0) return prev;
      next.splice(from, 1);
      next.splice(to, 0, dragged);
      void persistWidgetOrder(next);
      return next;
    });
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const quickActions = useMemo(
    () => [
      {
        title: "Incident Queue",
        subtitle: "First line incidents",
        icon: Inbox,
        module: "incident-queue" as ModuleType,
      },
      {
        title: "Assigned to Me",
        subtitle: "My active tickets",
        icon: Ticket,
        module: "tickets-assigned-to-me" as ModuleType,
      },
      {
        title: "Customer Support",
        subtitle: "Support inbox queue",
        icon: LayoutDashboard,
        module: "customer-support-queue" as ModuleType,
      },
      {
        title: "Task Board",
        subtitle: "Ticket tasks",
        icon: FolderKanban,
        module: "task-board" as ModuleType,
      },
    ],
    [],
  );

  const [savedReports, setSavedReports] = useState<string[]>([]);
  const [savedSelections, setSavedSelections] = useState<string[]>([]);
  const [savedListsLoading, setSavedListsLoading] = useState(false);
  const [savedListsError, setSavedListsError] = useState<string | null>(null);

  const openSearchPrefill = useCallback(
    (term: string, module: "all" | "tickets" | "assets" | "knowledge" = "all") => {
      onOpenTab("search", "Search");

      if (typeof window === "undefined") return;
      const params = new URLSearchParams();
      params.set("term", term);
      params.set("module", module);
      window.location.hash = `#/search?${params.toString()}`;
    },
    [onOpenTab],
  );

  const openReport = useCallback(
    (name: string) => {
      openSearchPrefill(name, "tickets");
    },
    [openSearchPrefill],
  );

  const openSelection = useCallback(
    (name: string) => {
      const normalized = name.trim().toLowerCase();
      if (normalized === "customer support queue") {
        onOpenTab("customer-support-queue", "Customer Support Queue");
        return;
      }
      if (normalized === "my open tickets") {
        onOpenTab("tickets-assigned-to-me", "Tickets Assigned to Me");
        return;
      }
      if (normalized === "recently updated tickets") {
        onOpenTab("call-management", "Call Management");
        return;
      }

      openSearchPrefill(name, "tickets");
    },
    [onOpenTab, openSearchPrefill],
  );

  const getWidgetSettingsArray = useCallback(
    (id: WidgetId, key: string): string[] => {
      const raw = widgets[id]?.settings?.[key];
      if (!raw || !Array.isArray(raw)) return [];
      return raw.filter((v): v is string => typeof v === "string");
    },
    [widgets],
  );

  const getWidgetSettingsNumber = useCallback(
    (id: WidgetId, key: string, fallback: number): number => {
      const raw = widgets[id]?.settings?.[key];
      if (typeof raw === "number" && Number.isFinite(raw)) return raw;
      return fallback;
    },
    [widgets],
  );

  const loadSavedLists = useCallback(async () => {
    if (!user) return;

    setSavedListsError(null);
    setSavedListsLoading(true);

    const reportsLimit = Math.max(1, Math.min(20, getWidgetSettingsNumber("reports", "limit", 7)));
    const selectionsLimit = Math.max(1, Math.min(20, getWidgetSettingsNumber("selections", "limit", 5)));

    const [reportsRes, selectionsRes] = await Promise.all([
      supabase
        .from("saved_reports")
        .select("name")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(reportsLimit),
      supabase
        .from("saved_selections")
        .select("name")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(selectionsLimit),
    ]);

    const firstError = reportsRes.error ?? selectionsRes.error;
    if (firstError) {
      const message = firstError.message ?? "";
      const isMissingSchema =
        message.includes("does not exist") ||
        message.includes("relation") ||
        message.includes("function") ||
        message.includes("rpc");
      if (!isMissingSchema) {
        setSavedListsError(message);
      }
      setSavedListsLoading(false);
      return;
    }

    setSavedReports((reportsRes.data ?? []).map((r) => (r as { name: string }).name));
    setSavedSelections((selectionsRes.data ?? []).map((s) => (s as { name: string }).name));
    setSavedListsLoading(false);
  }, [getWidgetSettingsNumber, supabase, user]);

  useEffect(() => {
    void loadSavedLists();
  }, [loadSavedLists]);

  useEffect(() => {
    const handler = () => {
      void loadDashboardState();
      void loadSavedLists();
    };

    window.addEventListener("pdsdesk:refresh", handler as EventListener);
    return () => {
      window.removeEventListener("pdsdesk:refresh", handler as EventListener);
    };
  }, [loadDashboardState, loadSavedLists]);

  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeSettingsWidgetId, setActiveSettingsWidgetId] = useState<WidgetId | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const openWidgetSettings = useCallback((id: WidgetId) => {
    setActiveSettingsWidgetId(id);
    setSettingsError(null);
    setSettingsOpen(true);
  }, []);

  const activeWidgetRow = activeSettingsWidgetId ? widgets[activeSettingsWidgetId] : undefined;
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editSize, setEditSize] = useState<WidgetSize>("md");
  const [editSettings, setEditSettings] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!activeWidgetRow) return;
    setEditTitle(activeWidgetRow.title ?? "");
    setEditSubtitle(activeWidgetRow.subtitle ?? "");
    setEditSize(activeWidgetRow.size ?? "md");
    const base = (activeWidgetRow.settings ?? {}) as Record<string, unknown>;
    const next = { ...base };

    if (activeWidgetRow.widget_id === "kpi") {
      if (!Array.isArray(next.metrics)) next.metrics = ["openTickets", "resolvedTickets", "assignedToMe"];
    }
    if (activeWidgetRow.widget_id === "report-main") {
      if (!Array.isArray(next.cards)) next.cards = ["totalTickets", "openTickets", "resolvedTickets", "customerSupport"];
    }
    if (activeWidgetRow.widget_id === "report-dual") {
      if (!Array.isArray(next.gauges)) next.gauges = ["ticketTasksOpen", "ticketTasksCompleted"];
    }
    if (activeWidgetRow.widget_id === "reports") {
      if (typeof next.limit !== "number") next.limit = 7;
    }
    if (activeWidgetRow.widget_id === "selections") {
      if (typeof next.limit !== "number") next.limit = 5;
    }

    setEditSettings(next);
  }, [activeWidgetRow]);

  const setSettingsArrayValue = useCallback(
    (key: string, value: string, checked: boolean) => {
      setEditSettings((prev) => {
        const current = prev[key];
        const arr = Array.isArray(current)
          ? current.filter((v): v is string => typeof v === "string")
          : [];
        const next = checked
          ? (arr.includes(value) ? arr : arr.concat(value))
          : arr.filter((v) => v !== value);
        return { ...prev, [key]: next };
      });
    },
    [],
  );

  const setSettingsNumberValue = useCallback((key: string, value: number) => {
    setEditSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const widgetLibrary = useMemo(
    () =>
      defaultWidgetOrder.map((id) => {
        const row = widgets[id];
        const label = row?.title ?? id;
        const isVisible = safeWidgetOrder.includes(id);
        return { id, label, isVisible };
      }),
    [safeWidgetOrder, widgets],
  );

  const toggleWidgetVisibility = useCallback(
    async (id: WidgetId, nextVisible: boolean) => {
      if (!user) return;
      setDashboardError(null);

      const { error } = await supabase
        .from("dashboard_widgets")
        .upsert(
          {
            user_id: user.id,
            widget_id: id,
            is_hidden: !nextVisible,
          },
          { onConflict: "user_id,widget_id" },
        );

      if (error) {
        setDashboardError(error.message);
        return;
      }

      setWidgetOrder((prev) => {
        if (nextVisible) {
          if (prev.includes(id)) return prev;
          const next = prev.concat(id);
          void persistWidgetOrder(next);
          return next;
        }

        const next = prev.filter((w) => w !== id);
        void persistWidgetOrder(next);
        return next;
      });

      setWidgets((prev) => {
        const existing = prev[id];
        const nextRow: DashboardWidgetRow = {
          id: existing?.id ?? "",
          user_id: user.id,
          widget_id: id,
          position: existing?.position ?? 0,
          size: (existing?.size ?? "md") as WidgetSize,
          title: existing?.title ?? null,
          subtitle: existing?.subtitle ?? null,
          is_hidden: !nextVisible,
          settings: (existing?.settings ?? {}) as Record<string, unknown>,
        };

        return {
          ...prev,
          [id]: nextRow,
        };
      });
    },
    [persistWidgetOrder, supabase, user],
  );

  const saveWidgetSettings = useCallback(async () => {
    if (!user || !activeSettingsWidgetId) return;

    const normalizedTitle = editTitle.trim();
    if (!normalizedTitle) {
      setSettingsError("Title is required");
      return;
    }
    if (normalizedTitle.length > 60) {
      setSettingsError("Title must be 60 characters or less");
      return;
    }
    if (editSubtitle.length > 120) {
      setSettingsError("Subtitle must be 120 characters or less");
      return;
    }

    const metricsRaw = editSettings.metrics;
    const cardsRaw = editSettings.cards;
    const gaugesRaw = editSettings.gauges;

    if (activeSettingsWidgetId === "kpi") {
      const metrics = Array.isArray(metricsRaw)
        ? metricsRaw.filter((v): v is string => typeof v === "string")
        : [];
      if (metrics.length === 0) {
        setSettingsError("Select at least one KPI metric");
        return;
      }
    }

    if (activeSettingsWidgetId === "report-main") {
      const cards = Array.isArray(cardsRaw)
        ? cardsRaw.filter((v): v is string => typeof v === "string")
        : [];
      if (cards.length === 0) {
        setSettingsError("Select at least one card");
        return;
      }
    }

    if (activeSettingsWidgetId === "report-dual") {
      const gauges = Array.isArray(gaugesRaw)
        ? gaugesRaw.filter((v): v is string => typeof v === "string")
        : [];
      if (gauges.length === 0) {
        setSettingsError("Select at least one gauge");
        return;
      }
      if (gauges.length > 2) {
        setSettingsError("Select no more than two gauges");
        return;
      }
    }

    if (activeSettingsWidgetId === "reports" || activeSettingsWidgetId === "selections") {
      const limitRaw = editSettings.limit;
      const limit = typeof limitRaw === "number" ? limitRaw : Number(limitRaw);
      if (!Number.isFinite(limit) || limit < 1 || limit > 20) {
        setSettingsError("Limit must be a number between 1 and 20");
        return;
      }
    }

    setSettingsError(null);
    setSavingSettings(true);

    const { error } = await supabase
      .from("dashboard_widgets")
      .upsert(
        {
          user_id: user.id,
          widget_id: activeSettingsWidgetId,
          title: normalizedTitle,
          subtitle: editSubtitle.trim() || null,
          size: editSize,
          settings: editSettings,
        },
        { onConflict: "user_id,widget_id" },
      );

    if (error) {
      setSettingsError(error.message);
      setSavingSettings(false);
      return;
    }

    setWidgets((prev) => {
      const existing = prev[activeSettingsWidgetId];
      const nextRow: DashboardWidgetRow = {
        id: existing?.id ?? "",
        user_id: user.id,
        widget_id: activeSettingsWidgetId,
        position: existing?.position ?? 0,
        size: editSize,
        title: normalizedTitle,
        subtitle: editSubtitle.trim() || null,
        is_hidden: existing?.is_hidden ?? false,
        settings: editSettings,
      };

      return {
        ...prev,
        [activeSettingsWidgetId]: nextRow,
      };
    });

    setSavingSettings(false);
    setSettingsOpen(false);
  }, [activeSettingsWidgetId, editSettings, editSize, editSubtitle, editTitle, supabase, user]);

  const widgetElements = useMemo(() => {
    const widgetSize = (id: WidgetId): WidgetSize => (widgets[id]?.size ?? "md") as WidgetSize;

    const colSpanFor = (id: WidgetId): string => {
      const size = widgetSize(id);
      const map: Record<WidgetId, Record<WidgetSize, string>> = {
        "kpi": { sm: "lg:col-span-4", md: "lg:col-span-6", lg: "lg:col-span-12" },
        "report-main": { sm: "lg:col-span-4", md: "lg:col-span-6", lg: "lg:col-span-12" },
        "new": { sm: "lg:col-span-4", md: "lg:col-span-4", lg: "lg:col-span-6" },
        "report-dual": { sm: "lg:col-span-6", md: "lg:col-span-8", lg: "lg:col-span-12" },
        "reports": { sm: "lg:col-span-4", md: "lg:col-span-4", lg: "lg:col-span-6" },
        "selections": { sm: "lg:col-span-6", md: "lg:col-span-8", lg: "lg:col-span-12" },
      };
      return map[id][size];
    };

    const kpiTitle = widgets.kpi?.title ?? "KPI";
    const reportMainTitle = widgets["report-main"]?.title ?? "Service Desk";
    const reportMainSubtitle = widgets["report-main"]?.subtitle ?? "Ticket overview";
    const reportDualTitle = widgets["report-dual"]?.title ?? "Tasks";
    const reportDualSubtitle = widgets["report-dual"]?.subtitle ?? "Ticket tasks status";
    const reportsTitle = widgets.reports?.title ?? "Reports list";
    const selectionsTitle = widgets.selections?.title ?? "Selections";

    const kpiEnabled = getWidgetSettingsArray("kpi", "metrics");
    const reportCardsEnabled = getWidgetSettingsArray("report-main", "cards");
    const gaugesEnabled = getWidgetSettingsArray("report-dual", "gauges");

    const kpiTableAll = [
      {
        indicator: "Tickets open",
        now: metrics?.openTickets ?? 0,
        min: 0,
        max: metrics?.totalTickets ?? 0,
        norm: Math.max(1, metrics?.totalTickets ?? 1),
        key: "openTickets",
      },
      {
        indicator: "Tickets resolved",
        now: metrics?.resolvedTickets ?? 0,
        min: 0,
        max: metrics?.totalTickets ?? 0,
        norm: Math.max(1, metrics?.totalTickets ?? 1),
        key: "resolvedTickets",
      },
      {
        indicator: "Assigned to me",
        now: metrics?.assignedToMe ?? 0,
        min: 0,
        max: metrics?.totalTickets ?? 0,
        norm: Math.max(1, metrics?.totalTickets ?? 1),
        key: "assignedToMe",
      },
      {
        indicator: "Customer support",
        now: metrics?.customerSupport ?? 0,
        min: 0,
        max: metrics?.totalTickets ?? 0,
        norm: Math.max(1, metrics?.totalTickets ?? 1),
        key: "customerSupport",
      },
    ];

    const kpiTableData =
      kpiEnabled.length > 0
        ? kpiTableAll.filter((r) => kpiEnabled.includes(r.key))
        : kpiTableAll;

    const reportCardsAll = [
      {
        label: "Total Tickets",
        value: metrics?.totalTickets ?? 0,
        color: "#4a9eff",
        key: "totalTickets",
      },
      {
        label: "Open",
        value: metrics?.openTickets ?? 0,
        color: "#ff9800",
        key: "openTickets",
      },
      {
        label: "Resolved",
        value: metrics?.resolvedTickets ?? 0,
        color: "#4caf50",
        key: "resolvedTickets",
      },
      {
        label: "Customer Support",
        value: metrics?.customerSupport ?? 0,
        color: "#9c27b0",
        key: "customerSupport",
      },
      {
        label: "Assigned to me",
        value: metrics?.assignedToMe ?? 0,
        color: "#607d8b",
        key: "assignedToMe",
      },
    ];

    const reportCards =
      reportCardsEnabled.length > 0
        ? reportCardsAll.filter((c) => reportCardsEnabled.includes(c.key))
        : reportCardsAll;

    const totalTasks = Math.max(
      1,
      (metrics?.ticketTasksOpen ?? 0) + (metrics?.ticketTasksInProgress ?? 0) + (metrics?.ticketTasksCompleted ?? 0),
    );

    const gaugesAll = [
      {
        title: "Tasks open",
        now: metrics?.ticketTasksOpen ?? 0,
        min: 0,
        norm: Math.max(1, metrics?.ticketTasksOpen ?? 1),
        max: totalTasks,
        key: "ticketTasksOpen",
      },
      {
        title: "Tasks in progress",
        now: metrics?.ticketTasksInProgress ?? 0,
        min: 0,
        norm: Math.max(1, metrics?.ticketTasksInProgress ?? 1),
        max: totalTasks,
        key: "ticketTasksInProgress",
      },
      {
        title: "Tasks completed",
        now: metrics?.ticketTasksCompleted ?? 0,
        min: 0,
        norm: Math.max(1, metrics?.ticketTasksCompleted ?? 1),
        max: totalTasks,
        key: "ticketTasksCompleted",
      },
    ];

    const dualGauges = (gaugesEnabled.length > 0
      ? gaugesAll.filter((g) => gaugesEnabled.includes(g.key))
      : gaugesAll
    ).slice(0, 2);

    const byId: Record<WidgetId, { colSpan: string; element: JSX.Element }> = {
      "kpi": {
        colSpan: colSpanFor("kpi"),
        element: (
          <KPIWidget
            data={kpiTableData}
            title={kpiTitle}
            loading={dashboardLoading || metricsLoading}
            error={dashboardError ?? metricsError}
            onSettings={() => openWidgetSettings("kpi")}
            onMaximize={() => setMaximizedWidgetId("kpi")}
          />
        ),
      },
      "report-main": {
        colSpan: colSpanFor("report-main"),
        element: (
          <ReportKPIWidget
            title={reportMainTitle}
            subtitle={reportMainSubtitle}
            cards={reportCards}
            onSettings={() => openWidgetSettings("report-main")}
            onMaximize={() => setMaximizedWidgetId("report-main")}
          />
        ),
      },
      "new": {
        colSpan: colSpanFor("new"),
        element: (
          <NewWidget
            onSettings={() => openWidgetSettings("new")}
            onAddWidget={() => setAddWidgetOpen(true)}
            onMaximize={() => setMaximizedWidgetId("new")}
          />
        ),
      },
      "report-dual": {
        colSpan: colSpanFor("report-dual"),
        element: (
          <ReportKPIWidget
            title={reportDualTitle}
            subtitle={reportDualSubtitle}
            variant="dual-gauge"
            gauges={dualGauges}
            onSettings={() => openWidgetSettings("report-dual")}
            onMaximize={() => setMaximizedWidgetId("report-dual")}
          />
        ),
      },
      "reports": {
        colSpan: colSpanFor("reports"),
        element: (
          <ReportsListWidget
            title={reportsTitle}
            items={savedReports}
            loading={dashboardLoading || savedListsLoading}
            error={dashboardError ?? savedListsError}
            onOpenItem={openReport}
            onSettings={() => openWidgetSettings("reports")}
            onMaximize={() => setMaximizedWidgetId("reports")}
          />
        ),
      },
      "selections": {
        colSpan: colSpanFor("selections"),
        element: (
          <SelectionsWidget
            title={selectionsTitle}
            items={savedSelections}
            loading={dashboardLoading || savedListsLoading}
            error={dashboardError ?? savedListsError}
            onOpenItem={openSelection}
            onSettings={() => openWidgetSettings("selections")}
            onMaximize={() => setMaximizedWidgetId("selections")}
          />
        ),
      },
    };

    return byId;
  }, [dashboardError, dashboardLoading, metrics, metricsError, metricsLoading, openReport, openSelection, openWidgetSettings, savedListsError, savedListsLoading, savedReports, savedSelections, widgets]);

  return (
    <div className="flex h-full">
      {showNavigator && (
        <NavigatorPanel
          onClose={() => setShowNavigator(false)}
          onOpenTab={onOpenTab}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-300 px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {!showNavigator && (
                <button
                  onClick={() => setShowNavigator(true)}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                  title="Show Navigator"
                >
                  <ChevronRight size={16} className="text-[#2d3e50]" />
                </button>
              )}
              <h1 className="text-lg font-normal text-[#2d3e50]">
                Dashboard <span className="font-semibold">Service Desk</span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors text-[#2d3e50] flex items-center gap-1.5"
                onClick={() => onOpenTab("settings", "Settings")}
              >
                <Settings size={14} />
                Settings
              </button>
              <button
                className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors text-[#2d3e50] flex items-center gap-1.5"
                onClick={() => setAddWidgetOpen(true)}
              >
                <Plus size={14} />
                Add widget
              </button>
              <button
                className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                title="Refresh"
                onClick={() => window.dispatchEvent(new CustomEvent("pdsdesk:refresh"))}
              >
                <RefreshCw size={14} className="text-[#2d3e50]" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 w-full">
          <div className="w-full space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.module}
                  onClick={() => onOpenTab(action.module, action.title)}
                  className="text-left bg-white border border-gray-300 rounded p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#2d3e50]">
                        {action.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {action.subtitle}
                      </div>
                    </div>
                    <action.icon size={18} className="text-[#4a9eff]" />
                  </div>
                </button>
              ))}
            </div>

            {metricsError && (
              <div className="bg-white border border-gray-300 rounded px-4 py-3 text-sm text-red-600">
                {metricsError}
              </div>
            )}

            {dashboardError && (
              <div className="bg-white border border-gray-300 rounded px-4 py-3 text-sm text-red-600">
                {dashboardError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
              {safeWidgetOrder.map((id) => {
                const w = widgetElements[id];
                if (!w) return null;

                return (
                  <div
                    key={id}
                    className={`${w.colSpan}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, id)}
                  >
                    {w.element}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {maximizedWidgetId && widgetElements[maximizedWidgetId as WidgetId] && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
          <div className="w-full h-full max-w-7xl max-h-[90vh] bg-white rounded border border-gray-300 overflow-auto">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-[#2d3e50]">Widget</div>
              <button
                className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 transition-colors"
                onClick={() => setMaximizedWidgetId(null)}
              >
                Close
              </button>
            </div>
            <div className="p-4">{widgetElements[maximizedWidgetId as WidgetId].element}</div>
          </div>
        </div>
      )}

      <Dialog open={addWidgetOpen} onOpenChange={setAddWidgetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Widget library</DialogTitle>
            <DialogDescription>
              Choose which widgets appear on your dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {widgetLibrary.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-4 rounded border border-gray-200 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#2d3e50] truncate">{w.label}</div>
                  <div className="text-xs text-gray-500 truncate">{w.id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={w.isVisible}
                    onCheckedChange={(checked) => void toggleWidgetVisibility(w.id, Boolean(checked))}
                  />
                  <Label className="text-sm">Visible</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openWidgetSettings(w.id)}
                  >
                    Settings
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddWidgetOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Widget settings</DialogTitle>
            <DialogDescription>
              Customize this widget’s header and size.
            </DialogDescription>
          </DialogHeader>

          {activeSettingsWidgetId ? (
            <div className="space-y-4">
              {settingsError && (
                <div className="text-sm text-red-600">{settingsError}</div>
              )}
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Widget title" />
                <div className="text-xs text-gray-500">Required. Max 60 characters.</div>
              </div>

              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} placeholder="Optional subtitle" />
                <div className="text-xs text-gray-500">Optional. Max 120 characters.</div>
              </div>

              <div className="space-y-2">
                <Label>Size</Label>
                <Select value={editSize} onValueChange={(v) => setEditSize(v as WidgetSize)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">Small</SelectItem>
                    <SelectItem value="md">Medium</SelectItem>
                    <SelectItem value="lg">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {activeSettingsWidgetId === "kpi" && (
                <div className="space-y-2">
                  <Label>Metrics</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {([
                      { key: "openTickets", label: "Tickets open" },
                      { key: "resolvedTickets", label: "Tickets resolved" },
                      { key: "assignedToMe", label: "Assigned to me" },
                      { key: "customerSupport", label: "Customer support" },
                    ] as const).map((m) => {
                      const selected = Array.isArray(editSettings.metrics)
                        ? (editSettings.metrics as unknown[]).includes(m.key)
                        : false;
                      return (
                        <div key={m.key} className="flex items-center gap-2">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) =>
                              setSettingsArrayValue("metrics", m.key, Boolean(checked))
                            }
                          />
                          <Label className="text-sm">{m.label}</Label>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-xs text-gray-500">Select at least one.</div>
                </div>
              )}

              {activeSettingsWidgetId === "report-main" && (
                <div className="space-y-2">
                  <Label>Cards</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {([
                      { key: "totalTickets", label: "Total tickets" },
                      { key: "openTickets", label: "Open" },
                      { key: "resolvedTickets", label: "Resolved" },
                      { key: "customerSupport", label: "Customer support" },
                      { key: "assignedToMe", label: "Assigned to me" },
                    ] as const).map((c) => {
                      const selected = Array.isArray(editSettings.cards)
                        ? (editSettings.cards as unknown[]).includes(c.key)
                        : false;
                      return (
                        <div key={c.key} className="flex items-center gap-2">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) =>
                              setSettingsArrayValue("cards", c.key, Boolean(checked))
                            }
                          />
                          <Label className="text-sm">{c.label}</Label>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-xs text-gray-500">Select at least one.</div>
                </div>
              )}

              {activeSettingsWidgetId === "report-dual" && (
                <div className="space-y-2">
                  <Label>Gauges (max 2)</Label>
                  {(() => {
                    const selected = Array.isArray(editSettings.gauges)
                      ? (editSettings.gauges as unknown[]).filter((v): v is string => typeof v === "string")
                      : [];
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {([
                          { key: "ticketTasksOpen", label: "Tasks open" },
                          { key: "ticketTasksInProgress", label: "Tasks in progress" },
                          { key: "ticketTasksCompleted", label: "Tasks completed" },
                        ] as const).map((g) => {
                          const isChecked = selected.includes(g.key);
                          const disabled = !isChecked && selected.length >= 2;
                          return (
                            <div key={g.key} className="flex items-center gap-2">
                              <Checkbox
                                checked={isChecked}
                                disabled={disabled}
                                onCheckedChange={(checked) =>
                                  setSettingsArrayValue("gauges", g.key, Boolean(checked))
                                }
                              />
                              <Label className="text-sm">{g.label}</Label>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  <div className="text-xs text-gray-500">Pick up to two gauges.</div>
                </div>
              )}

              {(activeSettingsWidgetId === "reports" || activeSettingsWidgetId === "selections") && (
                <div className="space-y-2">
                  <Label>List limit</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={typeof editSettings.limit === "number" ? editSettings.limit : 10}
                    onChange={(e) => {
                      const parsed = Number(e.target.value);
                      setSettingsNumberValue("limit", parsed);
                    }}
                  />
                  <div className="text-xs text-gray-500">Between 1 and 20.</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-600">Select a widget to edit.</div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button disabled={savingSettings} onClick={() => void saveWidgetSettings()}>
              {savingSettings ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}