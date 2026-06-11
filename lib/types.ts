import { Binary, ObjectId } from "mongodb";

export interface Application {
  _id: ObjectId;
  user_id: string;
  company_id: ObjectId;
  role_title: string;
  status:
    | "bookmarked"
    | "applying"
    | "applied"
    | "interviewing"
    | "offered"
    | "rejected"
    | "withdrawn";
  jd_raw: string;
  jd_structured: {
    company: string;
    role: string;
    comp_band?: string;
    stack: string[];
    requirements: string[];
    location: string;
    remote_policy?: string;
  };
  applied_at?: Date;
  timeline: TimelineEntry[];
  tailored_resume_artifact_id?: ObjectId;
  cover_letter_artifact_id?: ObjectId;
  research_note_artifact_id?: ObjectId;
  hiring_manager_contact_id?: ObjectId;
  embedding?: number[];
  created_at: Date;
  updated_at: Date;
}

export interface Contact {
  _id: ObjectId;
  user_id: string;
  name: string;
  company_id?: ObjectId;
  role_title?: string;
  source: string;
  email?: string;
  linkedin_url?: string;
  notes?: string;
  last_contact_at?: Date;
  embedding?: number[];
  created_at: Date;
}

export interface Conversation {
  _id: ObjectId;
  user_id: string;
  contact_id: ObjectId;
  application_id?: ObjectId;
  channel: "email" | "linkedin" | "phone" | "other";
  source?: "gmail" | "manual" | "seed";
  gmail_thread_id?: string;
  subject?: string;
  messages: Message[];
  last_message_at: Date;
  last_message_from: "me" | "them";
  embedding?: number[];
  created_at: Date;
  updated_at?: Date;
}

export interface Message {
  from: "me" | "them";
  body: string;
  sent_at: Date;
  gmail_message_id?: string;
  gmail_labels?: string[];
}

export interface Artifact {
  _id: ObjectId;
  type:
    | "resume_diff"
    | "tailored_resume"
    | "cover_letter"
    | "research_note"
    | "note";
  application_id?: ObjectId;
  user_id: string;
  content_md: string;
  version: number;
  meta?: Record<string, unknown>;
  embedding?: number[];
  created_at: Date;
}

export interface StoredFile {
  _id: ObjectId;
  user_id: string;
  artifact_id: ObjectId;
  filename: string;
  content_type: string;
  data: Binary;
  created_at: Date;
}

export interface Company {
  _id: ObjectId;
  user_id: string;
  name: string;
  domain?: string;
  research_notes_md?: string;
  embedding?: number[];
  created_at: Date;
}

export interface Event {
  _id: ObjectId;
  application_id: ObjectId;
  type: string;
  payload: Record<string, unknown>;
  created_at: Date;
}

export interface GmailRejection {
  _id: ObjectId;
  user_id: string;
  gmail_thread_id: string;
  rejected_at: Date;
}

export interface CalendarEvent {
  _id: ObjectId;
  user_id: string;
  google_event_id: string;
  title: string;
  description?: string;
  location?: string;
  hangout_link?: string;
  start_at: Date;
  end_at: Date;
  is_all_day: boolean;
  timezone?: string;
  attendees: {
    email: string;
    name?: string;
    response?: string;
  }[];
  organizer_email?: string;
  application_id?: ObjectId;
  is_interview?: boolean;
  signals?: {
    stage_transition?: Application["status"];
  };
  source: "google_calendar";
  status: "confirmed" | "tentative" | "cancelled";
  created_at: Date;
  updated_at?: Date;
}

export interface TimelineEntry {
  stage: Application["status"];
  entered_at: Date;
  note?: string;
}
