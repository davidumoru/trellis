"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export function CollapsedSidebarTrigger() {
  const { state, isMobile, openMobile } = useSidebar();

  const shouldShow = isMobile ? !openMobile : state === "collapsed";
  if (!shouldShow) return null;

  return (
    <div className="absolute top-2 left-2 z-30">
      <SidebarTrigger />
    </div>
  );
}
