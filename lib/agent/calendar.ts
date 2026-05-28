const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export interface GoogleAttendee {
  email: string;
  displayName?: string;
  responseStatus?: "accepted" | "declined" | "tentative" | "needsAction";
  organizer?: boolean;
  self?: boolean;
}

export interface GoogleCalendarEvent {
  id: string;
  status?: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: GoogleAttendee[];
  hangoutLink?: string;
  organizer?: { email?: string; displayName?: string };
}

export interface ParsedEvent {
  googleId: string;
  title: string;
  description?: string;
  location?: string;
  hangoutLink?: string;
  startAt: Date;
  endAt: Date;
  isAllDay: boolean;
  timezone?: string;
  attendees: { email: string; name?: string; response?: string }[];
  organizerEmail?: string;
  status: "confirmed" | "tentative" | "cancelled";
}

export async function listUpcomingEvents(
  accessToken: string,
  options: { daysPast?: number; daysAhead?: number; maxResults?: number } = {},
): Promise<GoogleCalendarEvent[]> {
  const daysPast = options.daysPast ?? 7;
  const daysAhead = options.daysAhead ?? 30;
  const maxResults = options.maxResults ?? 100;

  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - daysPast);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + daysAhead);

  const url = `${CALENDAR_API}/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin.toISOString())}&timeMax=${encodeURIComponent(timeMax.toISOString())}&maxResults=${maxResults}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(
      `Calendar list failed: ${res.status} ${await res.text()}`,
    );
  }
  const data = (await res.json()) as { items?: GoogleCalendarEvent[] };
  return data.items ?? [];
}

export function parseEvent(event: GoogleCalendarEvent): ParsedEvent | null {
  if (event.status === "cancelled") return null;
  if (!event.id) return null;

  const startRaw = event.start?.dateTime ?? event.start?.date;
  const endRaw = event.end?.dateTime ?? event.end?.date;
  if (!startRaw || !endRaw) return null;

  const isAllDay = !event.start?.dateTime;
  const startAt = new Date(startRaw);
  const endAt = new Date(endRaw);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return null;

  return {
    googleId: event.id,
    title: event.summary?.trim() || "(no title)",
    description: event.description,
    location: event.location,
    hangoutLink: event.hangoutLink,
    startAt,
    endAt,
    isAllDay,
    timezone: event.start?.timeZone,
    attendees: (event.attendees ?? [])
      .filter((a) => a.email && !a.self)
      .map((a) => ({
        email: a.email.toLowerCase(),
        name: a.displayName,
        response: a.responseStatus,
      })),
    organizerEmail: event.organizer?.email?.toLowerCase(),
    status: event.status ?? "confirmed",
  };
}
