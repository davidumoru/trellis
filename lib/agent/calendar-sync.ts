import { ObjectId } from "mongodb";
import { generateObject } from "ai";
import { z } from "zod";
import { agentModel } from "@/lib/ai";
import { getCollections } from "@/lib/db";
import {
  listUpcomingEvents,
  parseEvent,
  type ParsedEvent,
} from "@/lib/agent/calendar";

const KEYWORDS = [
  "interview",
  "screen",
  "intro call",
  "chat",
  "phone",
  "onsite",
  "loop",
  "panel",
  "recruiter",
  "hiring manager",
  "take home",
  "take-home",
  "coffee",
];

const classificationSchema = z.object({
  is_job_related: z
    .boolean()
    .describe(
      "True if this event is part of a job application process (interview, recruiter chat, hiring manager meeting, etc.)",
    ),
  is_interview: z
    .boolean()
    .describe("True if the event is a formal interview (not just a casual chat)"),
  company: z
    .string()
    .nullable()
    .describe(
      "Company the event is associated with, inferred from title, attendees, or description. Null if unclear.",
    ),
});

export interface CalendarSyncResult {
  scanned: number;
  filtered: number;
  classified: number;
  jobRelated: number;
  newEvents: number;
  updatedEvents: number;
}

export async function syncCalendar({
  accessToken,
  userId,
}: {
  accessToken: string;
  userId: string;
}): Promise<CalendarSyncResult> {
  const result: CalendarSyncResult = {
    scanned: 0,
    filtered: 0,
    classified: 0,
    jobRelated: 0,
    newEvents: 0,
    updatedEvents: 0,
  };

  const rawEvents = await listUpcomingEvents(accessToken, {
    daysPast: 7,
    daysAhead: 30,
    maxResults: 100,
  });
  result.scanned = rawEvents.length;

  const { applications, contacts, calendarEvents } = await getCollections();

  const userApps = (await applications
    .find({ user_id: userId })
    .project({ role_title: 1, "jd_structured.company": 1, company_id: 1 })
    .toArray()) as unknown as {
    _id: ObjectId;
    jd_structured?: { company?: string };
    company_id?: ObjectId;
  }[];

  const userContacts = await contacts
    .find({ user_id: userId })
    .project({ email: 1, name: 1, company_id: 1 })
    .toArray();
  const contactByEmail = new Map(
    userContacts
      .filter((c) => c.email)
      .map((c) => [c.email!.toLowerCase(), c]),
  );

  for (const raw of rawEvents) {
    const parsed = parseEvent(raw);
    if (!parsed) continue;
    if (parsed.attendees.length === 0 && !parsed.organizerEmail) continue;

    if (!passesPrefilter(parsed, contactByEmail)) continue;
    result.filtered++;

    const existing = await calendarEvents.findOne({
      user_id: userId,
      google_event_id: parsed.googleId,
    });

    let classification: z.infer<typeof classificationSchema>;
    try {
      const { object } = await generateObject({
        model: agentModel,
        schema: classificationSchema,
        prompt: buildClassifyPrompt(parsed),
      });
      classification = object;
      result.classified++;
    } catch {
      continue;
    }

    if (!classification.is_job_related) continue;
    result.jobRelated++;

    const matchedApp = matchApplication(
      classification.company,
      userApps,
      parsed,
      contactByEmail,
    );

    const baseDoc = {
      user_id: userId,
      google_event_id: parsed.googleId,
      title: parsed.title,
      description: parsed.description,
      location: parsed.location,
      hangout_link: parsed.hangoutLink,
      start_at: parsed.startAt,
      end_at: parsed.endAt,
      is_all_day: parsed.isAllDay,
      timezone: parsed.timezone,
      attendees: parsed.attendees,
      organizer_email: parsed.organizerEmail,
      application_id: matchedApp?._id,
      is_interview: classification.is_interview,
      source: "google_calendar" as const,
      status: parsed.status,
      updated_at: new Date(),
    };

    if (existing) {
      await calendarEvents.updateOne({ _id: existing._id }, { $set: baseDoc });
      result.updatedEvents++;
    } else {
      await calendarEvents.insertOne({
        _id: new ObjectId(),
        ...baseDoc,
        created_at: new Date(),
      });
      result.newEvents++;
    }
  }

  return result;
}

function passesPrefilter(
  event: ParsedEvent,
  contactByEmail: Map<string, unknown>,
): boolean {
  const haystack = [event.title, event.description ?? ""]
    .join(" ")
    .toLowerCase();
  if (KEYWORDS.some((k) => haystack.includes(k))) return true;

  for (const a of event.attendees) {
    if (contactByEmail.has(a.email)) return true;
  }
  if (event.organizerEmail && contactByEmail.has(event.organizerEmail))
    return true;

  return false;
}

function buildClassifyPrompt(event: ParsedEvent): string {
  return `Classify this calendar event.

Title: ${event.title}
${event.description ? `Description: ${event.description.slice(0, 1000)}\n` : ""}Attendees: ${event.attendees
    .map((a) => `${a.name ?? a.email} <${a.email}>`)
    .join(", ")}
${event.organizerEmail ? `Organizer: ${event.organizerEmail}\n` : ""}Date: ${event.startAt.toISOString()}`;
}

function matchApplication(
  classifiedCompany: string | null,
  userApps: {
    _id: ObjectId;
    jd_structured?: { company?: string };
    company_id?: ObjectId;
  }[],
  event: ParsedEvent,
  contactByEmail: Map<string, { company_id?: ObjectId } | unknown>,
) {
  const target = (classifiedCompany ?? "").toLowerCase().trim();

  if (target) {
    const byName = userApps.find(
      (a) => (a.jd_structured?.company ?? "").toLowerCase() === target,
    );
    if (byName) return byName;

    const byPartial = userApps.find((a) => {
      const name = (a.jd_structured?.company ?? "").toLowerCase();
      return name && (name.includes(target) || target.includes(name));
    });
    if (byPartial) return byPartial;
  }

  for (const attendee of event.attendees) {
    const contact = contactByEmail.get(attendee.email) as
      | { company_id?: ObjectId }
      | undefined;
    if (contact?.company_id) {
      const matchedApp = userApps.find(
        (a) => a.company_id?.toString() === contact.company_id!.toString(),
      );
      if (matchedApp) return matchedApp;
    }
  }

  return null;
}
