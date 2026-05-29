import { cache } from "react";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import type { Application, CalendarEvent } from "@/lib/types";
import { cleanBody } from "@/lib/inbox";

export type EventBucket =
  | "today"
  | "tomorrow"
  | "thisweek"
  | "later"
  | "past";

export interface EventAttendee {
  email: string;
  name?: string;
  response?: string;
}

export interface EventApplication {
  id: string;
  role_title: string;
  company: string;
}

export interface Event {
  id: string;
  title: string;
  start_at: Date;
  end_at: Date;
  is_all_day: boolean;
  is_interview: boolean;
  is_past: boolean;
  bucket: EventBucket;
  hangout_link?: string;
  location?: string;
  description?: string;
  status: "confirmed" | "tentative" | "cancelled";
  attendees: EventAttendee[];
  application?: EventApplication;
  organizer_email?: string;
  dayLabel: string;
  dateTile: { day: string; date: string };
  timeLabel: string;
  durationLabel: string;
  fullDateLabel: string;
}

export const fetchEvents = cache(async (userId: string): Promise<Event[]> => {
  const { calendarEvents, applications } = await getCollections();

  const events = await calendarEvents
    .find({ user_id: userId, status: { $ne: "cancelled" } })
    .sort({ start_at: 1 })
    .toArray();

  if (events.length === 0) return [];

  const appIds = Array.from(
    new Set(events.map((e) => e.application_id?.toString()).filter(Boolean)),
  )
    .filter((s): s is string => !!s)
    .map((id) => new ObjectId(id));

  const appDocs = appIds.length
    ? await applications
        .find({ _id: { $in: appIds }, user_id: userId })
        .project<Pick<Application, "_id" | "role_title" | "jd_structured">>({
          role_title: 1,
          "jd_structured.company": 1,
        })
        .toArray()
    : [];

  const appById = new Map(appDocs.map((a) => [a._id.toString(), a]));

  return events.map((e) => buildEvent(e, appById));
});

export const fetchEvent = cache(
  async (userId: string, eventId: string): Promise<Event | null> => {
    const all = await fetchEvents(userId);
    return all.find((e) => e.id === eventId) ?? null;
  },
);

function buildEvent(
  e: CalendarEvent,
  appById: Map<string, Pick<Application, "_id" | "role_title" | "jd_structured">>,
): Event {
  const app = e.application_id
    ? appById.get(e.application_id.toString())
    : null;
  const now = new Date();
  const isPast = e.end_at < now;
  const bucket = getBucket(e.start_at, now);

  return {
    id: e._id.toString(),
    title: e.title,
    start_at: e.start_at,
    end_at: e.end_at,
    is_all_day: e.is_all_day,
    is_interview: e.is_interview ?? false,
    is_past: isPast,
    bucket,
    hangout_link: e.hangout_link,
    location: e.location,
    description: e.description ? cleanBody(e.description) : undefined,
    status: e.status,
    attendees: e.attendees ?? [],
    application: app
      ? {
          id: app._id.toString(),
          role_title: app.role_title ?? "",
          company: app.jd_structured?.company ?? "",
        }
      : undefined,
    organizer_email: e.organizer_email,
    dayLabel: formatDay(e.start_at),
    dateTile: formatDateTile(e.start_at),
    timeLabel: formatTime(e.start_at, e.end_at, e.is_all_day),
    durationLabel: formatDuration(e.start_at, e.end_at, e.is_all_day),
    fullDateLabel: formatFullDate(e.start_at),
  };
}

function getBucket(start: Date, now: Date): EventBucket {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const dayAfter = addDays(today, 2);
  const nextWeekStart = addDays(today, 7 - now.getDay() + 1);
  if (start < today) return "past";
  if (start < tomorrow) return "today";
  if (start < dayAfter) return "tomorrow";
  if (start < nextWeekStart) return "thisweek";
  return "later";
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

function formatDay(d: Date): string {
  const now = new Date();
  const today = startOfDay(now);
  const target = startOfDay(d);
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatDateTile(d: Date): { day: string; date: string } {
  return {
    day: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3),
    date: d.getDate().toString().padStart(2, "0"),
  };
}

function formatTime(start: Date, end: Date, allDay: boolean): string {
  if (allDay) return "All day";
  const s = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const e = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${s} – ${e}`;
}

function formatDuration(start: Date, end: Date, allDay: boolean): string {
  if (allDay) return "All day";
  const minutes = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

function formatFullDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
