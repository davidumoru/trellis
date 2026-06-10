"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { CompanyListItem } from "@/lib/companies";

export function CompaniesList({ companies }: { companies: CompanyListItem[] }) {
  const pathname = usePathname();
  const activeId = pathname.match(/^\/dashboard\/companies\/([^/]+)/)?.[1];

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="flex items-baseline gap-2 px-6 pt-14 pb-4 md:pt-8">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Companies
        </h1>
        {companies.length > 0 && (
          <span className="text-sm tabular-nums text-muted-foreground">
            {companies.length}
          </span>
        )}
      </header>

      <ScrollArea className="min-h-0 flex-1">
        {companies.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Building2Icon className="size-5" />
            </div>
            <h2 className="font-heading text-base font-medium tracking-tight">
              No companies yet
            </h2>
            <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
              Companies are added automatically when you track a new
              application — along with the agent&apos;s research notes.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {companies.map((c) => {
              const active = activeId === c.id;
              const meta = [
                countLabel(c.applicationCount, "application"),
                countLabel(c.contactCount, "contact"),
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={c.id} className="border-t border-border first:border-t-0">
                  <Link
                    href={`/dashboard/companies/${c.id}`}
                    className={cn(
                      "flex w-full items-center gap-3 px-6 py-3 text-left transition-colors",
                      active ? "bg-muted/60" : "hover:bg-muted/30",
                    )}
                  >
                    <span
                      aria-hidden
                      className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-xs font-semibold"
                    >
                      {(c.name[0] ?? "?").toUpperCase()}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {c.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {c.domain ? `${c.domain}${meta ? ` · ${meta}` : ""}` : meta || "—"}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

function countLabel(count: number, noun: string): string {
  if (count === 0) return "";
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
