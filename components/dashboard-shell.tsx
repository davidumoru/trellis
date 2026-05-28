"use client";

import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import { PipelineSidebar } from "@/components/pipeline-sidebar";
import { AgentThread } from "@/components/agent-thread";
import { SidebarResizer } from "@/components/sidebar-resizer";
import { CollapsedSidebarTrigger } from "@/components/collapsed-sidebar-trigger";
import { MobileAgentSheet } from "@/components/mobile-agent-sheet";
import { GoogleConnectPopup } from "@/components/google-connect-popup";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Application } from "@/lib/types";

type ApplicationListItem = {
  id: string;
} & Pick<Application, "role_title" | "status" | "jd_structured">;

interface DashboardShellProps {
  applications: ApplicationListItem[];
  user: { name?: string | null; email: string; image?: string | null };
  googleConnected: boolean;
  children: React.ReactNode;
}

export function DashboardShell({
  applications,
  user,
  googleConnected,
  children,
}: DashboardShellProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const showAgent = pathname !== "/dashboard/new";

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "260px" } as React.CSSProperties}
    >
      <Sidebar collapsible="offcanvas">
        <PipelineSidebar
          applications={applications}
          user={user}
          googleConnected={googleConnected}
        />
        <SidebarResizer />
      </Sidebar>
      <SidebarInset
        className={
          isMobile || !showAgent
            ? "relative"
            : "relative grid grid-cols-[1fr_340px]"
        }
      >
        <CollapsedSidebarTrigger />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
        {showAgent && (isMobile ? <MobileAgentSheet /> : <AgentThread />)}
      </SidebarInset>
      <GoogleConnectPopup googleConnected={googleConnected} />
    </SidebarProvider>
  );
}
