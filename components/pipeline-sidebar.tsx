"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<Application["status"], string> = {
  bookmarked: "Bookmarked",
  applying: "Applying",
  applied: "Applied",
  interviewing: "Interviewing",
  offered: "Offered",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const STATUS_ORDER: Application["status"][] = [
  "bookmarked",
  "applying",
  "applied",
  "interviewing",
  "offered",
  "rejected",
  "withdrawn",
];

type ApplicationListItem = {
  id: string;
} & Pick<Application, "role_title" | "status" | "jd_structured">;

interface PipelineSidebarProps {
  applications: ApplicationListItem[];
}

export function PipelineSidebar({ applications }: PipelineSidebarProps) {
  const pathname = usePathname();

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    items: applications.filter((a) => a.status === status),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-sm font-semibold">Pipeline</h2>
        <Button asChild size="icon-xs" variant="ghost">
          <Link href="/dashboard/new" aria-label="New application">
            <PlusIcon />
          </Link>
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 px-1 pb-3">
          {grouped.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No applications yet
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.status} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 px-2 py-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {group.label}
                  </span>
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    {group.items.length}
                  </Badge>
                </div>
                {group.items.map((app) => {
                  const href = `/dashboard/${app.id}`;
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={app.id}
                      href={href}
                      className={cn(
                        "flex flex-col gap-0.5 rounded-md px-2 py-1.5 transition-colors",
                        isActive ? "bg-muted" : "hover:bg-muted/50",
                      )}
                    >
                      <span className="truncate text-sm font-medium">
                        {app.role_title}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {app.jd_structured?.company}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
