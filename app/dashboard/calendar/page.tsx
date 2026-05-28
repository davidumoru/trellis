import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import Link from "next/link";
import { getCollections } from "@/lib/db";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, VideoIcon, MapPinIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function CalendarPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const userId = session.user.id;

  const { calendarEvents, applications } = await getCollections();

  const events = await calendarEvents
    .find({ user_id: userId, status: { $ne: "cancelled" } })
    .sort({ start_at: 1 })
    .toArray();

  if (events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="flex max-w-sm flex-col items-center gap-2 text-center">
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted">
            <CalendarIcon className="size-5 text-muted-foreground" />
          </div>
          <h1 className="text-base font-medium">No events synced yet</h1>
          <p className="text-sm text-muted-foreground">
            Interviews, calls, and other job-related events will appear here
            once you sync.
          </p>
        </div>
      </div>
    );
  }

  const linkedAppIds = Array.from(
    new Set(
      events
        .map((e) => e.application_id?.toString())
        .filter((s): s is string => Boolean(s)),
    ),
  ).map((id) => new ObjectId(id));

  const linkedApps = linkedAppIds.length
    ? await applications
        .find({ _id: { $in: linkedAppIds }, user_id: userId })
        .project({ role_title: 1, "jd_structured.company": 1 })
        .toArray()
    : [];
  const appById = new Map(linkedApps.map((a) => [a._id.toString(), a]));

  const buckets = bucketEvents(events);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-10">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Job-related events pulled from Google Calendar.
          </p>
        </header>

        {buckets.map((bucket) =>
          bucket.events.length === 0 ? null : (
            <section key={bucket.label} className="flex flex-col gap-3">
              <h2 className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                {bucket.label}
              </h2>
              <div className="flex flex-col">
                {bucket.events.map((e) => {
                  const app = e.application_id
                    ? appById.get(e.application_id.toString())
                    : null;
                  return (
                    <EventRow
                      key={e._id.toString()}
                      title={e.title}
                      startAt={e.start_at}
                      endAt={e.end_at}
                      isAllDay={e.is_all_day}
                      isPast={bucket.label === "Past"}
                      hangoutLink={e.hangout_link}
                      location={e.location}
                      attendees={e.attendees}
                      appLink={
                        app
                          ? {
                              href: `/dashboard/${app._id.toString()}`,
                              label: `${app.role_title} · ${app.jd_structured?.company ?? ""}`,
                            }
                          : null
                      }
                    />
                  );
                })}
              </div>
            </section>
          ),
        )}
      </div>
    </ScrollArea>
  );
}

function EventRow({
  title,
  startAt,
  endAt,
  isAllDay,
  isPast,
  hangoutLink,
  location,
  attendees,
  appLink,
}: {
  title: string;
  startAt: Date;
  endAt: Date;
  isAllDay: boolean;
  isPast: boolean;
  hangoutLink?: string;
  location?: string;
  attendees: { email: string; name?: string }[];
  appLink: { href: string; label: string } | null;
}) {
  const timeLabel = formatTimeLabel(startAt, endAt, isAllDay);
  const visibleAttendees = attendees.slice(0, 3);
  const extraAttendees = attendees.length - visibleAttendees.length;

  return (
    <div
      className={cn(
        "grid grid-cols-[100px_1fr] gap-4 border-t py-3 first:border-t-0 first:pt-0",
        isPast && "opacity-60",
      )}
    >
      <div className="flex flex-col text-xs text-muted-foreground tabular-nums">
        <span>{formatDayLabel(startAt)}</span>
        <span>{timeLabel}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="truncate text-sm font-medium">{title}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {hangoutLink && (
            <span className="inline-flex items-center gap-1">
              <VideoIcon className="size-3" />
              Meet
            </span>
          )}
          {location && !hangoutLink && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPinIcon className="size-3" />
              <span className="truncate">{location}</span>
            </span>
          )}
          {appLink && (
            <Link
              href={appLink.href}
              className="truncate text-foreground/80 hover:text-foreground hover:underline"
            >
              {appLink.label}
            </Link>
          )}
        </div>
        {attendees.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {visibleAttendees.map((a, i) => {
                const initial = (a.name?.[0] ?? a.email[0]).toUpperCase();
                return (
                  <Avatar key={i} size="sm" className="ring-2 ring-background">
                    <AvatarFallback className="text-[10px]">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
            </div>
            {extraAttendees > 0 && (
              <span className="text-xs text-muted-foreground">
                +{extraAttendees}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface CalendarEventDoc {
  _id: ObjectId;
  start_at: Date;
}

function bucketEvents<T extends CalendarEventDoc>(events: T[]) {
  const now = new Date();
  const startOfToday = startOfDay(now);
  const startOfTomorrow = addDays(startOfToday, 1);
  const startOfDayAfter = addDays(startOfToday, 2);
  const startOfNextWeek = addDays(startOfToday, 7 - now.getDay() + 1);
  const startOfWeekAfter = addDays(startOfNextWeek, 7);

  const buckets: { label: string; events: T[] }[] = [
    { label: "Today", events: [] },
    { label: "Tomorrow", events: [] },
    { label: "This week", events: [] },
    { label: "Next week", events: [] },
    { label: "Later", events: [] },
    { label: "Past", events: [] },
  ];

  for (const event of events) {
    const s = event.start_at;
    if (s < startOfToday) {
      buckets[5].events.push(event);
    } else if (s < startOfTomorrow) {
      buckets[0].events.push(event);
    } else if (s < startOfDayAfter) {
      buckets[1].events.push(event);
    } else if (s < startOfNextWeek) {
      buckets[2].events.push(event);
    } else if (s < startOfWeekAfter) {
      buckets[3].events.push(event);
    } else {
      buckets[4].events.push(event);
    }
  }

  // Past events: most-recent first
  buckets[5].events.sort((a, b) => b.start_at.getTime() - a.start_at.getTime());

  return buckets;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTimeLabel(start: Date, end: Date, allDay: boolean): string {
  if (allDay) return "All day";
  const startTime = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${startTime} – ${endTime}`;
}
