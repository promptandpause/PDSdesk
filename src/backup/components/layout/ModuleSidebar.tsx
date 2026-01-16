import { useEffect, useMemo, useState } from "react";
import {
  Menu,
  Home,
  Search,
  User,
  Bell,
  Inbox,
  Mail,
  Phone,
  Users,
  BookOpen,
  FileText,
  AlertTriangle,
  Wrench,
  Repeat,
  FolderKanban,
  CalendarDays,
  Package,
  Shield,
  Briefcase,
  TrendingUp,
  ClipboardList,
  Building,
  Coffee,
  Settings,
  HelpCircle,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import { ModuleType } from "../../App";

interface ModuleSidebarProps {
  onOpenTab: (module: ModuleType, title: string) => void;
  activeModule?: ModuleType;
  userRole?: string; // 'service-desk', 'hr', 'devops', 'engineering', 'compliance', 'customer-support', 'admin'
  userId?: string;
}

interface MenuItem {
  id: string;
  icon: any;
  label: string;
  module: ModuleType;
  title: string;
  roles: string[]; // Which roles can see this
}

export function ModuleSidebar({
  onOpenTab,
  activeModule,
  userRole = "service-desk",
  userId,
}: ModuleSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    string[]
  >(["quick-access", "service-desk", "customer-support", "tools"]);

  const storageKeyPrefix = useMemo(() => {
    const key = userId && userId.trim() ? userId.trim() : userRole;
    return `pdsdesk.sidebar.${key}`;
  }, [userId, userRole]);

  // Check if user is global admin
  const isGlobalAdmin =
    userRole === "admin" || userRole === "global-admin";

  const defaultQuickAccessOrder = useMemo(
    () => [
      "home",
      "search",
      "notifications",
      "tickets-assigned-to-me",
      "incident-queue",
      "call-management",
      "change-management",
      "knowledge-base",
      "reservations-management",
      "bookmarks",
    ],
    [],
  );

  const [sidebarOrder, setSidebarOrder] = useState<string[]>([]);
  const [hiddenQuickAccessIds, setHiddenQuickAccessIds] = useState<string[]>([]);
  const [hiddenSectionIds, setHiddenSectionIds] = useState<string[]>([]);
  const [showSidebarSettings, setShowSidebarSettings] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const docsUrl = (import.meta.env.VITE_DOCS_URL ?? "").trim();

  const quickAccessItems: MenuItem[] = useMemo(
    () => [
      {
        id: "home",
        icon: Home,
        label: "Home",
        module: "dashboard",
        title: "Dashboard",
        roles: [
          "service-desk",
          "hr",
          "devops",
          "engineering",
          "compliance",
          "customer-support",
        ],
      },
      {
        id: "search",
        icon: Search,
        label: "Search",
        module: "search",
        title: "Search",
        roles: [
          "service-desk",
          "hr",
          "devops",
          "engineering",
          "compliance",
          "customer-support",
        ],
      },
      {
        id: "notifications",
        icon: Bell,
        label: "Notifications",
        module: "notifications",
        title: "Notifications",
        roles: [
          "service-desk",
          "hr",
          "devops",
          "engineering",
          "compliance",
          "customer-support",
        ],
      },
      {
        id: "tickets-assigned-to-me",
        icon: User,
        label: "Tickets Assigned to Me",
        module: "tickets-assigned-to-me",
        title: "Tickets Assigned to Me",
        roles: ["service-desk", "devops", "engineering"],
      },
      {
        id: "incident-queue",
        icon: Inbox,
        label: "Incident Queue",
        module: "incident-queue",
        title: "First Line Incidents",
        roles: ["service-desk"],
      },
      {
        id: "call-management",
        icon: Phone,
        label: "Call Management",
        module: "call-management",
        title: "Call Management",
        roles: ["service-desk"],
      },
      {
        id: "change-management",
        icon: Repeat,
        label: "Change Management",
        module: "change-management",
        title: "Change Management",
        roles: ["service-desk", "devops", "engineering"],
      },
      {
        id: "knowledge-base",
        icon: BookOpen,
        label: "Knowledge Base",
        module: "knowledge-base",
        title: "Knowledge Base",
        roles: [
          "service-desk",
          "hr",
          "devops",
          "engineering",
          "compliance",
          "customer-support",
        ],
      },
      {
        id: "reservations-management",
        icon: CalendarDays,
        label: "Reservations",
        module: "reservations-management",
        title: "Reservations Management",
        roles: ["service-desk"],
      },
      {
        id: "bookmarks",
        icon: ClipboardList,
        label: "Bookmarks",
        module: "bookmarks",
        title: "Bookmarks",
        roles: [
          "service-desk",
          "hr",
          "devops",
          "engineering",
          "compliance",
          "customer-support",
        ],
      },
      {
        id: "customer-support-queue",
        icon: Mail,
        label: "Customer Service Queue",
        module: "customer-support-queue",
        title: "Customer Support Queue",
        roles: ["customer-support"],
      },
    ],
    [],
  );

  useEffect(() => {
    try {
      const savedOrderRaw = localStorage.getItem(`${storageKeyPrefix}.quick_access_order`);
      const savedHiddenRaw = localStorage.getItem(`${storageKeyPrefix}.quick_access_hidden`);
      const savedSectionsRaw = localStorage.getItem(`${storageKeyPrefix}.sections_hidden`);
      const parsedOrder = savedOrderRaw ? (JSON.parse(savedOrderRaw) as unknown) : null;
      const parsedHidden = savedHiddenRaw ? (JSON.parse(savedHiddenRaw) as unknown) : null;
      const parsedSections = savedSectionsRaw ? (JSON.parse(savedSectionsRaw) as unknown) : null;

      if (Array.isArray(parsedOrder)) {
        setSidebarOrder(parsedOrder.filter((x): x is string => typeof x === "string"));
      } else {
        setSidebarOrder(defaultQuickAccessOrder);
      }

      if (Array.isArray(parsedHidden)) {
        setHiddenQuickAccessIds(parsedHidden.filter((x): x is string => typeof x === "string"));
      } else {
        setHiddenQuickAccessIds([]);
      }

      if (Array.isArray(parsedSections)) {
        setHiddenSectionIds(parsedSections.filter((x): x is string => typeof x === "string"));
      } else {
        setHiddenSectionIds([]);
      }
    } catch {
      setSidebarOrder(defaultQuickAccessOrder);
      setHiddenQuickAccessIds([]);
      setHiddenSectionIds([]);
    }
  }, [defaultQuickAccessOrder, storageKeyPrefix]);

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKeyPrefix}.quick_access_order`, JSON.stringify(sidebarOrder));
      localStorage.setItem(`${storageKeyPrefix}.quick_access_hidden`, JSON.stringify(hiddenQuickAccessIds));
      localStorage.setItem(`${storageKeyPrefix}.sections_hidden`, JSON.stringify(hiddenSectionIds));
    } catch {
      // ignore
    }
  }, [hiddenQuickAccessIds, hiddenSectionIds, sidebarOrder, storageKeyPrefix]);

  const serviceDeskItems: MenuItem[] = [
    {
      id: "dashboard",
      icon: TrendingUp,
      label: "Service Desk KPIs",
      module: "dashboard",
      title: "Dashboard",
      roles: ["service-desk"],
    },
    {
      id: "incident-queue",
      icon: Inbox,
      label: "Incident Queue",
      module: "incident-queue",
      title: "First Line Incidents",
      roles: ["service-desk"],
    },
    {
      id: "call-management",
      icon: Phone,
      label: "Call Management",
      module: "call-management",
      title: "Call Management",
      roles: ["service-desk"],
    },
    {
      id: "problem-management",
      icon: AlertTriangle,
      label: "Problem Management",
      module: "problem-management",
      title: "Problem Management",
      roles: ["service-desk"],
    },
    {
      id: "change-management",
      icon: Repeat,
      label: "Change Management",
      module: "change-management",
      title: "Change Management",
      roles: ["service-desk", "devops", "engineering"],
    },
    {
      id: "project-management",
      icon: FolderKanban,
      label: "Project Management",
      module: "project-management",
      title: "Project Management",
      roles: ["service-desk", "devops", "engineering"],
    },
    {
      id: "knowledge-base",
      icon: BookOpen,
      label: "Knowledge Base",
      module: "knowledge-base",
      title: "Knowledge Base",
      roles: ["service-desk", "devops", "engineering"],
    },
    {
      id: "operations",
      icon: Wrench,
      label: "Operations Management",
      module: "operations-management",
      title: "Operations Management",
      roles: ["service-desk", "devops"],
    },
    {
      id: "reservations",
      icon: CalendarDays,
      label: "Reservations Management",
      module: "reservations-management",
      title: "Reservations Management",
      roles: ["service-desk"],
    },
    {
      id: "items",
      icon: ClipboardList,
      label: "Item Management",
      module: "item-management",
      title: "Item Management",
      roles: ["service-desk"],
    },
    {
      id: "assets",
      icon: Package,
      label: "Asset Management",
      module: "asset-management",
      title: "Asset Management",
      roles: ["service-desk"],
    },
    {
      id: "contracts",
      icon: FileText,
      label: "Contract Management and SLM",
      module: "contracts-management",
      title: "Contract Management",
      roles: ["service-desk"],
    },
  ];

  const customerSupportItems: MenuItem[] = [
    {
      id: "customer-support-queue",
      icon: Mail,
      label: "Customer Support Queue",
      module: "customer-support-queue",
      title: "Customer Support Queue",
      roles: ["customer-support"],
    },
  ];

  const toolsItems: MenuItem[] = [
    {
      id: "task-board",
      icon: ClipboardList,
      label: "Task Board",
      module: "task-board",
      title: "Task Board",
      roles: ["service-desk", "devops", "engineering"],
    },
    {
      id: "kanban",
      icon: FolderKanban,
      label: "Kanban Board",
      module: "kanban",
      title: "Kanban Board",
      roles: ["service-desk", "devops", "engineering"],
    },
    {
      id: "plan-board",
      icon: CalendarDays,
      label: "Plan Board",
      module: "plan-board",
      title: "Plan Board",
      roles: ["service-desk", "devops", "engineering"],
    },
  ];

  // Filter items based on user role
  const filterByRole = (items: MenuItem[]) => {
    // Global admins see everything
    if (isGlobalAdmin) {
      return items;
    }
    return items.filter((item) =>
      item.roles.includes(userRole),
    );
  };

  useEffect(() => {
    const allowedIds = new Set(filterByRole(quickAccessItems).map((i) => i.id));
    setSidebarOrder((prev) => {
      const next: string[] = [];
      for (const id of prev) {
        if (allowedIds.has(id) && !next.includes(id)) next.push(id);
      }
      for (const id of allowedIds) {
        if (!next.includes(id)) next.push(id);
      }
      return next.length ? next : defaultQuickAccessOrder;
    });
    setHiddenQuickAccessIds((prev) => prev.filter((id) => allowedIds.has(id)));
  }, [defaultQuickAccessOrder, quickAccessItems, userRole, isGlobalAdmin]);

  const orderedQuickAccessItems = useMemo(() => {
    const allowed = filterByRole(quickAccessItems);
    const byId = new Map(allowed.map((i) => [i.id, i] as const));

    const ordered: MenuItem[] = [];
    for (const id of sidebarOrder) {
      const item = byId.get(id);
      if (item) ordered.push(item);
    }
    for (const item of allowed) {
      if (!ordered.some((x) => x.id === item.id)) ordered.push(item);
    }

    return ordered.filter((i) => !hiddenQuickAccessIds.includes(i.id));
  }, [hiddenQuickAccessIds, quickAccessItems, sidebarOrder, userRole, isGlobalAdmin]);

  const allAllowedQuickAccessItems = useMemo(() => {
    const allowed = filterByRole(quickAccessItems);
    const byId = new Map(allowed.map((i) => [i.id, i] as const));

    const ordered: MenuItem[] = [];
    for (const id of sidebarOrder) {
      const item = byId.get(id);
      if (item) ordered.push(item);
    }
    for (const item of allowed) {
      if (!ordered.some((x) => x.id === item.id)) ordered.push(item);
    }
    return ordered;
  }, [quickAccessItems, sidebarOrder, userRole, isGlobalAdmin]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId],
    );
  };

  const renderIconButton = (item: MenuItem) => (
    <button
      key={item.id}
      onClick={() => onOpenTab(item.module, item.title)}
      className={`h-12 flex items-center justify-center hover:bg-[#2a2a2a] transition-colors relative group w-full ${
        activeModule === item.module ? "bg-[#2a2a2a]" : ""
      }`}
      title={item.label}
    >
      <item.icon size={20} />
      {!isExpanded && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
          {item.label}
        </div>
      )}
    </button>
  );

  const renderExpandedItem = (item: MenuItem, isDraggable = false) => (
    <div
      key={item.id}
      draggable={isDraggable}
      onDragStart={() => setDraggingId(item.id)}
      onDragEnd={() => setDraggingId(null)}
      onDragOver={(e) => {
        if (!isDraggable || !draggingId || draggingId === item.id) return;
        e.preventDefault();
      }}
      onDrop={(e) => {
        if (!isDraggable || !draggingId || draggingId === item.id) return;
        e.preventDefault();
        setSidebarOrder((prev) => {
          const next = [...prev];
          const from = next.indexOf(draggingId);
          const to = next.indexOf(item.id);
          if (to === -1) return prev;
          if (from === -1) {
            next.splice(to, 0, draggingId);
            return next;
          }
          next.splice(from, 1);
          next.splice(to, 0, draggingId);
          return next;
        });
        setDraggingId(null);
      }}
      onClick={() => {
        if (draggingId) return;
        onOpenTab(item.module, item.title);
      }}
      className={`flex items-center gap-3 px-4 py-2 hover:bg-[#2a2a2a] transition-colors cursor-pointer group ${
        activeModule === item.module ? "bg-[#2a2a2a]" : ""
      }`}
    >
      {isDraggable && (
        <GripVertical
          size={14}
          className="text-gray-500 opacity-0 group-hover:opacity-100"
        />
      )}
      <item.icon size={18} />
      <span className="text-sm">{item.label}</span>
    </div>
  );

  const renderSection = (
    title: string,
    items: MenuItem[],
    sectionId: string,
    showInCollapsed = true,
  ) => {
    if (hiddenSectionIds.includes(sectionId)) return null;
    const filteredItems = filterByRole(items);
    if (filteredItems.length === 0) return null;

    const isExpanded = expandedSections.includes(sectionId);

    return (
      <div
        key={sectionId}
        className="border-b border-[#0a0a0a]"
      >
        <button
          onClick={() => toggleSection(sectionId)}
          className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#2a2a2a] transition-colors text-xs font-medium text-gray-400 uppercase tracking-wide"
        >
          <span>{title}</span>
          <ChevronRight
            size={14}
            className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
        </button>
        <div className={isExpanded ? "block" : "hidden"}>
          {filteredItems.map((item) =>
            renderExpandedItem(item),
          )}
        </div>
      </div>
    );
  };

  return (
    <aside
      className={`bg-[#1a1a1a] text-white transition-all duration-300 flex flex-col ${isExpanded ? "w-64" : "w-12"}`}
    >
      {/* Menu Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-12 flex items-center justify-center hover:bg-[#2a2a2a] transition-colors border-b border-[#0a0a0a] relative group"
      >
        <Menu size={20} />
        {!isExpanded && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
            Expand Menu
          </div>
        )}
      </button>

      {/* Quick Access Icons */}
      {!isExpanded && (
        <div className="flex flex-col border-b border-[#0a0a0a]">
          {orderedQuickAccessItems.map((item) =>
            renderIconButton(item),
          )}
        </div>
      )}

      {/* Expanded Menu */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto">
          {/* Quick Access Section */}
          <div className="border-b border-[#0a0a0a]">
            <button
              onClick={() => toggleSection("quick-access")}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#2a2a2a] transition-colors text-xs font-medium text-gray-400 uppercase tracking-wide"
            >
              <span>Quick Access</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSidebarSettings((v) => !v);
                  }}
                  className="p-1 hover:bg-[#3a3a3a] rounded"
                  title="Sidebar settings"
                >
                  <Settings size={14} className="text-gray-300" />
                </button>
                <ChevronRight
                  size={14}
                  className={`transition-transform ${expandedSections.includes("quick-access") ? "rotate-90" : ""}`}
                />
              </div>
            </button>
            {expandedSections.includes("quick-access") && (
              <div>
                {showSidebarSettings && (
                  <div className="px-4 py-3 border-b border-[#0a0a0a]">
                    <div className="text-xs text-gray-300 mb-2">Customize</div>
                    <div className="space-y-2 mb-3">
                      {["service-desk", "customer-support", "tools"].map((sectionId) => {
                        const label =
                          sectionId === "service-desk"
                            ? "Service Desk"
                            : sectionId === "customer-support"
                              ? "Customer Support"
                              : "Tools";
                        const checked = !hiddenSectionIds.includes(sectionId);
                        return (
                          <label
                            key={sectionId}
                            className="flex items-center justify-between gap-2 text-sm text-gray-200"
                          >
                            <span className="truncate">{label}</span>
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={checked}
                              onChange={(e) => {
                                const nextChecked = e.target.checked;
                                setHiddenSectionIds((prev) => {
                                  const has = prev.includes(sectionId);
                                  if (nextChecked) {
                                    return has ? prev.filter((x) => x !== sectionId) : prev;
                                  }
                                  return has ? prev : [...prev, sectionId];
                                });
                              }}
                            />
                          </label>
                        );
                      })}
                    </div>
                    <div className="space-y-2">
                      {allAllowedQuickAccessItems.map((item) => {
                        const checked = !hiddenQuickAccessIds.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className="flex items-center justify-between gap-2 text-sm text-gray-200"
                          >
                            <span className="truncate">{item.label}</span>
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={checked}
                              onChange={(e) => {
                                const nextChecked = e.target.checked;
                                setHiddenQuickAccessIds((prev) => {
                                  const has = prev.includes(item.id);
                                  if (nextChecked) {
                                    return has ? prev.filter((x) => x !== item.id) : prev;
                                  }
                                  return has ? prev : [...prev, item.id];
                                });
                              }}
                            />
                          </label>
                        );
                      })}
                    </div>
                    <div className="mt-3 text-xs text-gray-400">
                      Drag items below to reorder.
                    </div>
                  </div>
                )}
                {orderedQuickAccessItems.map((item) =>
                  renderExpandedItem(item, true),
                )}
              </div>
            )}
          </div>

          {/* Service Desk Section */}
          {renderSection(
            "Service Desk",
            serviceDeskItems,
            "service-desk",
          )}

          {/* Customer Support Section */}
          {renderSection(
            "Customer Support",
            customerSupportItems,
            "customer-support",
          )}

          {/* Tools Section */}
          {renderSection("Tools", toolsItems, "tools")}
        </div>
      )}

      {/* Bottom Icons */}
      <div className="border-t border-[#0a0a0a] flex flex-col">
        <button
          onClick={() => onOpenTab("settings", "Settings")}
          className="h-12 flex items-center justify-center hover:bg-[#2a2a2a] transition-colors relative group"
          title="Settings"
        >
          <Settings size={20} />
          {!isExpanded && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              Settings
            </div>
          )}
          {isExpanded && (
            <span className="ml-3 text-sm">Settings</span>
          )}
        </button>
        <button
          onClick={() => {
            if (!docsUrl) return;
            window.open(docsUrl, "_blank", "noopener,noreferrer");
          }}
          disabled={!docsUrl}
          className="h-12 flex items-center justify-center hover:bg-[#2a2a2a] transition-colors relative group"
          title={docsUrl ? "Help" : "Help (not configured)"}
        >
          <HelpCircle size={20} />
          {!isExpanded && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              Help
            </div>
          )}
          {isExpanded && (
            <span className="ml-3 text-sm">Help</span>
          )}
        </button>
      </div>
    </aside>
  );
}