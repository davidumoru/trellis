"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EnvelopeOpen, FunnelSimple } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Thread, ThreadState } from "@/lib/inbox";

type FilterKey = "all" | "unread" | "waiting";

const FILTER_LABEL: Record<FilterKey, string> = {
  all: "All",
  unread: "Unread",
  waiting: "Waiting on you",
};

function matches(filter: FilterKey, state: ThreadState): boolean {
  if (filter === "all") return true;
  if (filter === "unread") return state === "unread";
  if (filter === "waiting") return state === "waiting" || state === "unread";
  return true;
}

export function InboxList({ threads }: { threads: Thread[] }) {
  const pathname = usePathname();
  const activeId = pathname.match(/^\/dashboard\/inbox\/([^/]+)/)?.[1];
  const [filter, setFilter] = useState<FilterKey>("all");

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: 0, unread: 0, waiting: 0 };
    for (const t of threads) {
      if (matches("all", t.state)) c.all++;
      if (matches("unread", t.state)) c.unread++;
      if (matches("waiting", t.state)) c.waiting++;
    }
    return c;
  }, [threads]);

  const visible = useMemo(
    () => threads.filter((t) => matches(filter, t.state)),
    [threads, filter],
  );

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="flex flex-col gap-4 px-6 pt-14 pb-4 md:pt-8">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Inbox
        </h1>
        <div className="flex items-center gap-1">
          {(Object.keys(FILTER_LABEL) as FilterKey[]).map((k) => {
            const active = filter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {FILTER_LABEL[k]}
                <span className="tabular-nums opacity-60">{counts[k]}</span>
              </button>
            );
          })}
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        {visible.length === 0 ? (
          threads.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <EnvelopeOpen className="size-5" />
              </div>
              <h2 className="font-heading text-base font-medium tracking-tight">
                Your inbox is empty
              </h2>
              <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
                Recruiter threads from your connected Gmail will land here. Hit{" "}
                <span className="font-medium text-foreground">
                  Sync inbox &amp; calendar
                </span>{" "}
                in the sidebar to pull them in.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FunnelSimple className="size-5" />
              </div>
              <h2 className="font-heading text-base font-medium tracking-tight">
                Nothing under {FILTER_LABEL[filter]}
              </h2>
              <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
                Try a different filter — there&rsquo;s nothing here right now.
              </p>
            </div>
          )
        ) : (
          <ul className="flex flex-col border-t border-border">
            {visible.map((t) => {
              const active = activeId === t.id;
              return (
                <li
                  key={t.id}
                  className="border-b border-border last:border-b-0"
                >
                  <Link
                    href={`/dashboard/inbox/${t.id}`}
                    className={cn(
                      "group flex w-full items-start gap-3 px-6 py-3 text-left transition-colors",
                      active ? "bg-muted/60" : "hover:bg-muted/30",
                    )}
                  >
                    <div className="relative flex shrink-0 items-center">
                      {t.state === "unread" && (
                        <span
                          aria-hidden
                          className="absolute -left-3 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-foreground"
                        />
                      )}
                      <div className="flex size-8 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-foreground">
                        {t.initials}
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex min-w-0 items-baseline gap-1.5">
                          <span
                            className={cn(
                              "truncate text-sm",
                              t.state === "read"
                                ? "text-foreground"
                                : "font-medium text-foreground",
                            )}
                          >
                            {t.name}
                          </span>
                          {t.company && (
                            <>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                ·
                              </span>
                              <span className="truncate text-xs text-muted-foreground">
                                {t.company}
                              </span>
                            </>
                          )}
                        </div>
                        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                          {t.when}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "truncate text-sm",
                          t.state === "read"
                            ? "text-muted-foreground"
                            : "text-foreground",
                        )}
                      >
                        {t.subject}
                      </span>
                      {t.state === "waiting" && (
                        <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] font-medium text-amber-700 dark:text-amber-400">
                          Waiting on you
                        </span>
                      )}
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
