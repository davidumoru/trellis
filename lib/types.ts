import { ObjectId } from "mongodb";

export interface Application {
  _id: ObjectId;
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
  name: string;
  company_id: ObjectId;
  role_title: string;
  source: string;
  linkedin_url?: string;
  notes?: string;
  last_contact_at?: Date;
  embedding?: number[];
  created_at: Date;
}

export interface Conversation {
  _id: ObjectId;
  contact_id: ObjectId;
  application_id?: ObjectId;
  channel: "email" | "linkedin" | "phone" | "other";
  messages: Message[];
  last_message_at: Date;
  last_message_from: "me" | "them";
  embedding?: number[];
  created_at: Date;
}

export interface Message {
  from: "me" | "them";
  body: string;
  sent_at: Date;
}

export interface Artifact {
  _id: ObjectId;
  type: "resume_diff" | "cover_letter" | "research_note" | "note";
  application_id?: ObjectId;
  user_id: string;
  content_md: string;
  version: number;
  meta?: Record<string, unknown>;
  embedding?: number[];
  created_at: Date;
}

export interface Company {
  _id: ObjectId;
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

export interface TimelineEntry {
  stage: Application["status"];
  entered_at: Date;
  note?: string;
}
