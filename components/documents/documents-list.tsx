"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileTextIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import {
  GROUP_LABEL,
  GROUP_ORDER,
  type DocumentGroup,
} from "@/lib/documents-meta";
import type { DocumentListItem } from "@/lib/documents";

export function DocumentsList({
  documents,
}: {
  documents: DocumentListItem[];
}) {
  const pathname = usePathname();
  const activeId = pathname.match(/^\/dashboard\/documents\/([^/]+)/)?.[1];

  const groups = useMemo(() => {
    const map = new Map<DocumentGroup, DocumentListItem[]>();
    for (const d of documents) {
      const list = map.get(d.group) ?? [];
      list.push(d);
      map.set(d.group, list);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      group: g,
      documents: map.get(g)!,
    }));
  }, [documents]);

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="flex items-baseline gap-2 px-6 pt-14 pb-4 md:pt-8">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Documents
        </h1>
        {documents.length > 0 && (
          <span className="text-sm tabular-nums text-muted-foreground">
            {documents.length}
          </span>
        )}
      </header>

      <ScrollArea className="min-h-0 flex-1">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FileTextIcon className="size-5" />
            </div>
            <h2 className="font-heading text-base font-medium tracking-tight">
              No documents yet
            </h2>
            <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
              Tailored resumes, cover letters, and research notes appear here
              as the agent drafts them for each application.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {groups.map((g) => (
              <section key={g.group} className="flex flex-col">
                <div className="border-t border-border bg-muted/30 px-6 py-1.5">
                  <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    {GROUP_LABEL[g.group]}
                  </span>
                </div>
                <ul className="flex flex-col">
                  {g.documents.map((d) => {
                    const active = activeId === d.id;
                    return (
                      <li
                        key={d.id}
                        className="border-t border-border first:border-t-0"
                      >
                        <Link
                          href={`/dashboard/documents/${d.id}`}
                          className={cn(
                            "flex w-full items-center gap-3 px-6 py-3 text-left transition-colors",
                            active ? "bg-muted/60" : "hover:bg-muted/30",
                          )}
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                            <FileTextIcon className="size-4" />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate text-sm font-medium text-foreground">
                              {d.title}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {d.subtitle
                                ? `${d.subtitle} · ${d.whenLabel}`
                                : d.whenLabel}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
