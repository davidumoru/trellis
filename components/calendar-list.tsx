"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarBlank, FunnelSimple } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Event, EventBucket } from "@/lib/calendar";

type FilterKey = "upcoming" | "interviews" | "past";

const FILTER_LABEL: Record<FilterKey, string> = {
  upcoming: "Upcoming",
  interviews: "Interviews",
  past: "Past",
};

const BUCKET_LABEL: Record<EventBucket, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  thisweek: "This week",
  later: "Later",
  past: "Past",
};

const BUCKET_ORDER: EventBucket[] = [
  "today",
  "tomorrow",
  "thisweek",
  "later",
  "past",
];

function matches(filter: FilterKey, event: Event): boolean {
  if (filter === "upcoming") return !event.is_past;
  if (filter === "past") return event.is_past;
  if (filter === "interviews") return event.is_interview;
  return true;
}

export function CalendarList({ events }: { events: Event[] }) {
  const pathname = usePathname();
  const activeId = pathname.match(/^\/dashboard\/calendar\/([^/]+)/)?.[1];
  const [filter, setFilter] = useState<FilterKey>("upcoming");

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      upcoming: 0,
      interviews: 0,
      past: 0,
    };
    for (const e of events) {
      if (matches("upcoming", e)) c.upcoming++;
      if (matches("interviews", e)) c.interviews++;
      if (matches("past", e)) c.past++;
    }
    return c;
  }, [events]);

  const visible = useMemo(() => {
    const list = events.filter((e) => matches(filter, e));
    if (filter === "past") {
      return list
        .slice()
        .sort((a, b) => b.start_at.getTime() - a.start_at.getTime());
    }
    return list;
  }, [events, filter]);

  const groups = useMemo(() => {
    const map = new Map<EventBucket, Event[]>();
    for (const e of visible) {
      const list = map.get(e.bucket) ?? [];
      list.push(e);
      map.set(e.bucket, list);
    }
    return BUCKET_ORDER.filter((b) => map.has(b)).map((b) => ({
      bucket: b,
      events: map.get(b)!,
    }));
  }, [visible]);

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="flex flex-col gap-4 px-6 pt-14 pb-4 md:pt-8">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Calendar
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
          events.length === 0 ? (
            <EmptyState
              icon={<CalendarBlank className="size-5" />}
              title="No events synced yet"
              body={
                <>
                  Interviews and calls from your Google Calendar will land here.
                  Hit{" "}
                  <span className="font-medium text-foreground">
                    Sync inbox &amp; calendar
                  </span>{" "}
                  in the sidebar to pull them in.
                </>
              }
            />
          ) : (
            <EmptyState
              icon={<FunnelSimple className="size-5" />}
              title={`Nothing under ${FILTER_LABEL[filter]}`}
              body="Try a different filter."
            />
          )
        ) : (
          <div className="flex flex-col">
            {groups.map((g) => (
              <section key={g.bucket} className="flex flex-col">
                <div className="border-t border-border bg-muted/30 px-6 py-1.5">
                  <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    {BUCKET_LABEL[g.bucket]}
                  </span>
                </div>
                <ul className="flex flex-col">
                  {g.events.map((e) => {
                    const active = activeId === e.id;
                    return (
                      <li
                        key={e.id}
                        className="border-t border-border first:border-t-0"
                      >
                        <Link
                          href={`/dashboard/calendar/${e.id}`}
                          className={cn(
                            "group flex w-full items-center gap-3 px-6 py-3 text-left transition-colors",
                            active ? "bg-muted/60" : "hover:bg-muted/30",
                            e.is_past && "opacity-60",
                          )}
                        >
                          <div className="flex shrink-0 flex-col items-center justify-center rounded-md border border-border bg-card px-2 py-1 text-center">
                            <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                              {e.dateTile.day}
                            </span>
                            <span className="font-heading text-sm font-semibold leading-tight tabular-nums">
                              {e.dateTile.date}
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate text-sm font-medium text-foreground">
                              {e.title}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {e.timeLabel}
                              {e.application?.role_title && (
                                <>
                                  {" · "}
                                  {e.application.role_title}
                                  {e.application.company &&
                                    ` at ${e.application.company}`}
                                </>
                              )}
                            </span>
                            {e.is_interview && (
                              <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-violet-500/15 px-1.5 py-px text-[10px] font-medium text-violet-700 dark:text-violet-300">
                                Interview
                              </span>
                            )}
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

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <h2 className="font-heading text-base font-medium tracking-tight">
        {title}
      </h2>
      <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
