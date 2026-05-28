"use client";

import { useState } from "react";
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
import {
  CommandPalette,
  useCommandPaletteShortcut,
} from "@/components/command-palette";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Application } from "@/lib/types";

type ApplicationListItem = {
  id: string;
} & Pick<Application, "role_title" | "status" | "jd_structured">;

type ContactListItem = {
  id: string;
  name: string;
  role_title: string | null;
  email: string | null;
  company_id: string | null;
};

type CompanyListItem = {
  id: string;
  name: string;
  domain: string | null;
};

interface DashboardShellProps {
  applications: ApplicationListItem[];
  contacts: ContactListItem[];
  companies: CompanyListItem[];
  user: { name?: string | null; email: string; image?: string | null };
  googleConnected: boolean;
  children: React.ReactNode;
}

export function DashboardShell({
  applications,
  contacts,
  companies,
  user,
  googleConnected,
  children,
}: DashboardShellProps) {
  const isMobile = useIsMobile();
  const [paletteOpen, setPaletteOpen] = useState(false);
  useCommandPaletteShortcut(setPaletteOpen);

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "260px" } as React.CSSProperties}
    >
      <Sidebar collapsible="offcanvas">
        <PipelineSidebar
          applications={applications}
          user={user}
          googleConnected={googleConnected}
          onOpenSearch={() => setPaletteOpen(true)}
        />
        <SidebarResizer />
      </Sidebar>
      <SidebarInset
        className={
          isMobile ? "relative" : "relative grid grid-cols-[1fr_340px]"
        }
      >
        <CollapsedSidebarTrigger />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
        {isMobile ? <MobileAgentSheet /> : <AgentThread />}
      </SidebarInset>
      <GoogleConnectPopup googleConnected={googleConnected} />
      <CommandPalette
        applications={applications}
        contacts={contacts}
        companies={companies}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />
    </SidebarProvider>
  );
}
