"use client";

import { useState } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import { PipelineSidebar } from "@/components/pipeline-sidebar";
import { RecordDetail } from "@/components/record-detail";
import { AgentThread } from "@/components/agent-thread";
import { SidebarResizer } from "@/components/sidebar-resizer";
import { CollapsedSidebarTrigger } from "@/components/collapsed-sidebar-trigger";
import { MobileAgentSheet } from "@/components/mobile-agent-sheet";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DashboardPage() {
  const [selectedId, setSelectedId] = useState<string>();
  const isMobile = useIsMobile();

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "260px" } as React.CSSProperties}
    >
      <Sidebar collapsible="offcanvas">
        <PipelineSidebar
          applications={[]}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNewApplication={() => {}}
        />
        <SidebarResizer />
      </Sidebar>
      <SidebarInset
        className={
          isMobile
            ? "relative"
            : "relative grid grid-cols-[1fr_340px]"
        }
      >
        <CollapsedSidebarTrigger />
        <RecordDetail applicationId={selectedId} />
        {isMobile ? <MobileAgentSheet /> : <AgentThread />}
      </SidebarInset>
    </SidebarProvider>
  );
}
