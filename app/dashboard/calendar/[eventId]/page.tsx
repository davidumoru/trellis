import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import {
  VideoCamera as VideoIcon,
  MapPin as MapPinIcon,
  Briefcase as BriefcaseIcon,
  Clock as ClockIcon,
  CheckCircle as CheckIcon,
  Question as QuestionIcon,
  XCircle as XIcon,
  CalendarBlank as CalendarIcon,
} from "@phosphor-icons/react/dist/ssr";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBody } from "@/components/message-body";
import { auth } from "@/lib/auth";
import { fetchEvent, type EventAttendee } from "@/lib/calendar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { title: "Calendar" };
  const { eventId } = await params;
  const event = await fetchEvent(session.user.id, eventId);
  return { title: event?.title || "Calendar" };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { eventId } = await params;
  const event = await fetchEvent(session.user.id, eventId);
  if (!event) notFound();

  return (
    <div className="flex h-full min-w-0 flex-col">
      {event.hangout_link && (
        <header className="flex shrink-0 items-center justify-end gap-3 border-b border-border px-6 py-3">
          <a
            href={event.hangout_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background transition-opacity hover:opacity-90"
          >
            <VideoIcon className="size-3.5" weight="fill" />
            Join Meet
          </a>
        </header>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-8">
          <div className="flex flex-col gap-3">
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              {event.is_interview && (
                <Pill className="bg-violet-500/15 text-violet-700 dark:text-violet-300">
                  Interview
                </Pill>
              )}
              {event.status === "tentative" && (
                <Pill className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  Tentative
                </Pill>
              )}
              {event.is_past && (
                <Pill className="bg-muted text-muted-foreground">Past</Pill>
              )}
              {event.is_all_day && (
                <Pill className="bg-muted text-muted-foreground">All day</Pill>
              )}
            </div>
          </div>

          <section className="flex flex-col gap-3">
            <Row icon={CalendarIcon}>
              <span className="text-foreground">{event.fullDateLabel}</span>
              <span className="text-muted-foreground">
                {" "}
                · {event.timeLabel}
              </span>
            </Row>
            {!event.is_all_day && (
              <Row icon={ClockIcon}>
                <span className="text-muted-foreground">
                  {event.durationLabel}
                </span>
              </Row>
            )}
            {event.location && (
              <Row icon={MapPinIcon}>
                <span className="text-foreground">{event.location}</span>
              </Row>
            )}
            {event.application && (
              <Row icon={BriefcaseIcon}>
                <Link
                  href={`/dashboard/${event.application.id}`}
                  className="text-foreground underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground"
                >
                  {event.application.role_title || "Application"}
                </Link>
                {event.application.company && (
                  <span className="text-muted-foreground">
                    {" "}
                    at {event.application.company}
                  </span>
                )}
              </Row>
            )}
          </section>

          {event.description && (
            <section className="flex flex-col gap-2">
              <h2 className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                Description
              </h2>
              <MessageBody text={event.description} />
            </section>
          )}

          {event.attendees.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                Attendees · {event.attendees.length}
              </h2>
              <ul className="flex flex-col divide-y divide-border border-y border-border">
                {event.attendees.map((a) => (
                  <li key={a.email} className="flex items-center gap-3 py-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-foreground">
                      {initials(a.name, a.email)}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {a.name || a.email.split("@")[0]}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {a.email}
                      </span>
                    </div>
                    <ResponseBadge response={a.response} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

function Row({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string; weight?: "fill" | "bold" }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="size-4 shrink-0 text-muted-foreground" weight="fill" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function initials(name: string | undefined, email: string): string {
  const src = name?.trim() || email.split("@")[0];
  const words = src
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2);
  const out = words.map((w) => w[0]?.toUpperCase() ?? "").join("");
  return out || "?";
}

function ResponseBadge({ response }: { response: EventAttendee["response"] }) {
  if (!response || response === "needsAction") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <QuestionIcon className="size-3" weight="fill" />
        Pending
      </span>
    );
  }
  if (response === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
        <CheckIcon className="size-3" weight="fill" />
        Yes
      </span>
    );
  }
  if (response === "declined") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
        <XIcon className="size-3" weight="fill" />
        No
      </span>
    );
  }
  if (response === "tentative") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
        <QuestionIcon className="size-3" weight="fill" />
        Maybe
      </span>
    );
  }
  return null;
}
