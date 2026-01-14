import { ReactNode } from "react";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({
  children,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-[#f5f7fa] overflow-hidden">
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}