"use client";

import { usePathname } from "next/navigation";
import { CalendarList } from "@/components/calendar/calendar-list";
import { cn } from "@/lib/utils";
import type { Event } from "@/lib/calendar";

export function CalendarShell({
  events,
  children,
}: {
  events: Event[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const onDetail = /^\/dashboard\/calendar\/[^/]+/.test(pathname);

  return (
    <div className="flex h-full min-w-0">
      <aside
        className={cn(
          "h-full w-full shrink-0 border-r border-border md:w-90",
          onDetail ? "hidden md:flex md:flex-col" : "flex flex-col",
        )}
      >
        <CalendarList events={events} />
      </aside>

      <section
        className={cn(
          "h-full min-w-0 flex-1",
          onDetail ? "block" : "hidden md:block",
        )}
      >
        {children}
      </section>
    </div>
  );
}
