import clientPromise from "./mongodb";
import type {
  Application,
  Artifact,
  CalendarEvent,
  Company,
  Contact,
  Conversation,
  Event,
  GmailRejection,
} from "./types";

export async function getDb() {
  const client = await clientPromise;
  return client.db("trellis");
}

export async function getCollections() {
  const db = await getDb();
  return {
    applications: db.collection<Application>("applications"),
    contacts: db.collection<Contact>("contacts"),
    conversations: db.collection<Conversation>("conversations"),
    artifacts: db.collection<Artifact>("artifacts"),
    companies: db.collection<Company>("companies"),
    events: db.collection<Event>("events"),
    calendarEvents: db.collection<CalendarEvent>("calendar_events"),
    gmailRejections: db.collection<GmailRejection>("gmail_rejections"),
  };
}
