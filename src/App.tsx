import { useCallback, useEffect, useMemo, useState } from "react";
import { ModuleLayout } from "./components/layout/ModuleLayout";
import { DashboardView } from "./components/views/DashboardView";
import { ITDashboardView } from "./components/views/ITDashboardView";
import { FacilityDashboardView } from "./components/views/FacilityDashboardView";
import { OverviewView } from "./components/views/OverviewView";
import { TaskBoardView } from "./components/views/TaskBoardView";
import { KanbanBoardView } from "./components/views/KanbanBoardView";
import { CallManagementView } from "./components/views/CallManagementView";
import { SearchView } from "./components/views/SearchView";
import { TicketsAssignedToMeView } from "./components/views/TicketsAssignedToMeView";
import { IncidentQueueView } from "./components/views/IncidentQueueView";
import { CustomerSupportQueueView } from "./components/views/CustomerSupportQueueView";
import { ProblemManagementView } from "./components/views/ProblemManagementView";
import { ChangeManagementView } from "./components/views/ChangeManagementView";
import { KnowledgeBaseView } from "./components/views/KnowledgeBaseView";
import { AssetManagementView } from "./components/views/AssetManagementView";
import { OperationsManagementView } from "./components/views/OperationsManagementView";
import { ReservationsManagementView } from "./components/views/ReservationsManagementView";
import { ItemManagementView } from "./components/views/ItemManagementView";
import { ContractsManagementView } from "./components/views/ContractsManagementView";
import { PlanBoardView } from "./components/views/PlanBoardView";
import { ProjectManagementView } from "./components/views/ProjectManagementView";
import { VisitorRegistrationView } from "./components/views/VisitorRegistrationView";
import { LongTermPlanningView } from "./components/views/LongTermPlanningView";
import { SupportingFilesView } from "./components/views/SupportingFilesView";
import { BookmarksView } from "./components/views/BookmarksView";
import { SettingsView } from "./components/views/SettingsView";
import { useAuth } from "./lib/auth/AuthProvider";
import { SignInView } from "./components/views/SignInView";

// TODO: Replace with actual Supabase authentication
// import { createClient } from '@supabase/supabase-js'
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export type ModuleType =
  | "dashboard"
  | "it-dashboard"
  | "facility-dashboard"
  | "overview"
  | "search"
  | "tickets-assigned-to-me"
  | "incident-queue"
  | "customer-support-queue"
  | "call-management"
  | "problem-management"
  | "change-management"
  | "project-management"
  | "knowledge-base"
  | "operations-management"
  | "reservations-management"
  | "item-management"
  | "asset-management"
  | "contracts-management"
  | "visitor-registration"
  | "long-term-planning"
  | "supporting-files"
  | "bookmarks"
  | "task-board"
  | "kanban"
  | "plan-board"
  | "settings";

export interface Tab {
  id: string;
  title: string;
  module: ModuleType;
}

const ALL_MODULES: ModuleType[] = [
  "dashboard",
  "it-dashboard",
  "facility-dashboard",
  "overview",
  "search",
  "tickets-assigned-to-me",
  "incident-queue",
  "customer-support-queue",
  "call-management",
  "problem-management",
  "change-management",
  "project-management",
  "knowledge-base",
  "operations-management",
  "reservations-management",
  "item-management",
  "asset-management",
  "contracts-management",
  "visitor-registration",
  "long-term-planning",
  "supporting-files",
  "bookmarks",
  "task-board",
  "kanban",
  "plan-board",
  "settings",
];

const DEFAULT_TITLE_BY_MODULE: Record<ModuleType, string> = {
  "dashboard": "Dashboard",
  "it-dashboard": "IT Dashboard",
  "facility-dashboard": "Facility Dashboard",
  "overview": "Overview",
  "search": "Search",
  "tickets-assigned-to-me": "Tickets Assigned to Me",
  "incident-queue": "First Line Incidents",
  "customer-support-queue": "Customer Support Queue",
  "call-management": "Call Management",
  "problem-management": "Problem Management",
  "change-management": "Change Management",
  "project-management": "Project Management",
  "knowledge-base": "Knowledge Base",
  "operations-management": "Operations Management",
  "reservations-management": "Reservations Management",
  "item-management": "Item Management",
  "asset-management": "Asset Management",
  "contracts-management": "Contract Management",
  "visitor-registration": "Visitor Registration",
  "long-term-planning": "Long Term Planning",
  "supporting-files": "Supporting Files",
  "bookmarks": "Bookmarks",
  "task-board": "Task Board",
  "kanban": "Kanban Board",
  "plan-board": "Plan Board",
  "settings": "Settings",
};

function moduleFromHash(): ModuleType {
  if (typeof window === "undefined") return "dashboard";
  const raw = window.location.hash || "";
  const trimmed = raw.replace(/^#\/?/, "").trim();
  if (!trimmed) return "dashboard";
  const candidate = trimmed.split("?")[0]?.split("/")[0] ?? "";
  if ((ALL_MODULES as string[]).includes(candidate)) {
    return candidate as ModuleType;
  }
  return "dashboard";
}

function setModuleHash(module: ModuleType) {
  if (typeof window === "undefined") return;
  const next = `#/${module}`;
  if (window.location.hash === next) return;
  window.location.hash = next;
}

export default function App() {
  const { loading, user: authUser, profile, roles, operatorGroups } = useAuth();
  const initialModule = moduleFromHash();
  const [tabs, setTabs] = useState<Tab[]>(() => [
    { id: "tab-1", title: DEFAULT_TITLE_BY_MODULE[initialModule], module: initialModule },
  ]);
  const [activeTabId, setActiveTabId] = useState("tab-1");

  const user = useMemo(() => {
    const email =
      profile?.email ??
      authUser?.email ??
      null;

    const fullName =
      profile?.full_name ??
      (authUser?.user_metadata?.full_name as string | undefined) ??
      (authUser?.user_metadata?.name as string | undefined) ??
      null;

    const name = fullName ?? email ?? "User";

    const initialsSource = (fullName ?? email ?? "U")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");

    const isCustomerService = operatorGroups.includes("customer_service");

    const role = roles.includes("global_admin")
      ? "admin"
      : isCustomerService
        ? "customer-support"
        : roles.includes("operator")
          ? "service-desk"
          : "service-desk";

    return {
      id: authUser?.id ?? "",
      name,
      email: email ?? "",
      role,
      initials: initialsSource || "U",
    };
  }, [authUser?.email, authUser?.id, authUser?.user_metadata, operatorGroups, profile, roles]);

  const openTab = useCallback((module: ModuleType, title: string) => {
    setTabs((prev) => {
      const existing = prev.find((t) => t.module === module);
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }

      const id = `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setActiveTabId(id);
      return [...prev, { id, title, module }];
    });

    setModuleHash(module);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev;

      const remaining = prev.filter((t) => t.id !== tabId);
      if (remaining.length === prev.length) return prev;

      setActiveTabId((prevActive) => {
        if (prevActive !== tabId) return prevActive;
        const next = remaining[remaining.length - 1];
        if (next) setModuleHash(next.module);
        return next?.id ?? "tab-1";
      });

      return remaining;
    });
  }, []);

  const renderModule = (module: ModuleType) => {
    switch (module) {
      case "dashboard":
        return <DashboardView onOpenTab={openTab} />;
      case "it-dashboard":
        return <ITDashboardView />;
      case "facility-dashboard":
        return <FacilityDashboardView />;
      case "overview":
        return <OverviewView />;
      case "search":
        return <SearchView />;
      case "tickets-assigned-to-me":
        return <TicketsAssignedToMeView />;
      case "incident-queue":
        return <IncidentQueueView />;
      case "customer-support-queue":
        return <CustomerSupportQueueView />;
      case "call-management":
        return <CallManagementView />;
      case "problem-management":
        return <ProblemManagementView />;
      case "change-management":
        return <ChangeManagementView />;
      case "project-management":
        return <ProjectManagementView />;
      case "knowledge-base":
        return <KnowledgeBaseView />;
      case "operations-management":
        return <OperationsManagementView />;
      case "reservations-management":
        return <ReservationsManagementView />;
      case "item-management":
        return <ItemManagementView />;
      case "asset-management":
        return <AssetManagementView />;
      case "contracts-management":
        return <ContractsManagementView />;
      case "visitor-registration":
        return <VisitorRegistrationView />;
      case "long-term-planning":
        return <LongTermPlanningView />;
      case "supporting-files":
        return <SupportingFilesView />;
      case "bookmarks":
        return <BookmarksView />;
      case "task-board":
        return <TaskBoardView />;
      case "kanban":
        return <KanbanBoardView />;
      case "plan-board":
        return <PlanBoardView />;
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardView onOpenTab={openTab} />;
    }
  };

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const activeModule = activeTab?.module ?? "dashboard";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onHashChange = () => {
      const nextModule = moduleFromHash();
      setTabs((prev) => {
        const existing = prev.find((t) => t.module === nextModule);
        if (existing) {
          setActiveTabId(existing.id);
          return prev;
        }

        const id = `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setActiveTabId(id);
        return [...prev, { id, title: DEFAULT_TITLE_BY_MODULE[nextModule], module: nextModule }];
      });
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    const next = tabs.find((t) => t.id === tabId);
    if (next) setModuleHash(next.module);
  }, [tabs]);

  const handleRefresh = useCallback(() => {
    window.dispatchEvent(new CustomEvent("pdsdesk:refresh"));
  }, []);

  if (loading) {
    return null;
  }

  if (!authUser) {
    return <SignInView />;
  }

  return (
    <ModuleLayout
      tabs={tabs}
      activeTabId={activeTabId}
      onTabChange={handleTabChange}
      onTabClose={closeTab}
      onOpenTab={openTab}
      activeModule={activeModule}
      onRefresh={handleRefresh}
      user={user}
    >
      {activeModule && renderModule(activeModule)}
    </ModuleLayout>
  );
}