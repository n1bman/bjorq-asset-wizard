import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { useConnection } from "@/contexts/ConnectionContext";
import { WifiOff } from "lucide-react";

export function AppLayout() {
  const { isMockMode } = useConnection();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {isMockMode && (
            <div className="bg-muted/80 border-b border-border px-4 py-1.5 flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <WifiOff className="h-3 w-3" />
              <span>Backend offline — using demo data</span>
            </div>
          )}
          <header className="h-12 flex items-center border-b border-border px-4 shrink-0">
            <SidebarTrigger />
            <span className="ml-3 text-sm text-muted-foreground font-medium">
              Asset Wizard
            </span>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
