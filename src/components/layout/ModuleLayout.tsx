import { ReactNode } from "react";
import { ModuleSidebar } from "./ModuleSidebar";
import { ModuleHeader } from "./ModuleHeader";
import { ModuleType, Tab } from "../../App";

interface ModuleLayoutProps {
  children: ReactNode;
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onOpenTab: (module: ModuleType, title: string) => void;
  activeModule?: ModuleType;
  onRefresh?: () => void;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    initials: string;
  };
}

export function ModuleLayout({
  children,
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onOpenTab,
  activeModule,
  onRefresh,
  user,
}: ModuleLayoutProps) {
  const handleOpenSettings = () => {
    onOpenTab("settings", "Settings");
  };

  return (
    <div className="flex h-screen bg-[#e8e8e8] overflow-hidden">
      <ModuleSidebar
        onOpenTab={onOpenTab}
        activeModule={activeModule}
        userRole={user.role}
        userId={user.id}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ModuleHeader
          user={user}
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={onTabChange}
          onTabClose={onTabClose}
          onOpenSettings={handleOpenSettings}
          onRefresh={onRefresh}
        />
        <main className="flex-1 overflow-auto bg-[#e8e8e8]">
          {children}
        </main>
      </div>
    </div>
  );
}