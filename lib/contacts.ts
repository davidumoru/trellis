import { cache } from "react";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import type { Application, Conversation } from "@/lib/types";

export interface ContactListItem {
  id: string;
  name: string;
  initials: string;
  role_title?: string;
  email?: string;
  companyName?: string;
  lastContactLabel?: string;
}

export interface ContactConversation {
  id: string;
  subject: string;
  channel: Conversation["channel"];
  messageCount: number;
  lastLabel: string;
  lastFrom: "me" | "them";
}

export interface ContactApplication {
  id: string;
  role_title: string;
  status: Application["status"];
  company: string;
}

export interface ContactDetail {
  id: string;
  name: string;
  initials: string;
  role_title?: string;
  email?: string;
  linkedin_url?: string;
  source: string;
  notes?: string;
  companyId?: string;
  companyName?: string;
  lastContactLabel?: string;
  addedLabel: string;
  applications: ContactApplication[];
  conversations: ContactConversation[];
}

export const fetchContacts = cache(
  async (userId: string): Promise<ContactListItem[]> => {
    const { contacts, companies } = await getCollections();

    const contactDocs = await contacts
      .find({ user_id: userId })
      .sort({ name: 1 })
      .toArray();
    if (contactDocs.length === 0) return [];

    const companyIds = uniqueObjectIds(contactDocs.map((c) => c.company_id));
    const companyDocs = companyIds.length
      ? await companies
          .find({ _id: { $in: companyIds }, user_id: userId })
          .project<{ _id: ObjectId; name: string }>({ name: 1 })
          .toArray()
      : [];
    const companyById = new Map(companyDocs.map((c) => [c._id.toString(), c]));

    return contactDocs.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      initials: deriveInitials(c.name),
      role_title: c.role_title,
      email: c.email,
      companyName: c.company_id
        ? companyById.get(c.company_id.toString())?.name
        : undefined,
      lastContactLabel: c.last_contact_at
        ? formatRelative(c.last_contact_at)
        : undefined,
    }));
  },
);

export const fetchContact = cache(
  async (userId: string, contactId: string): Promise<ContactDetail | null> => {
    if (!ObjectId.isValid(contactId)) return null;
    const { contacts, companies, conversations, applications } =
      await getCollections();

    const contact = await contacts.findOne({
      _id: new ObjectId(contactId),
      user_id: userId,
    });
    if (!contact) return null;

    const [company, convDocs, appDocs] = await Promise.all([
      contact.company_id
        ? companies.findOne({ _id: contact.company_id, user_id: userId })
        : null,
      conversations
        .find({ user_id: userId, contact_id: contact._id })
        .sort({ last_message_at: -1 })
        .toArray(),
      applications
        .find({ user_id: userId, hiring_manager_contact_id: contact._id })
        .sort({ created_at: -1 })
        .toArray(),
    ]);

    return {
      id: contact._id.toString(),
      name: contact.name,
      initials: deriveInitials(contact.name),
      role_title: contact.role_title,
      email: contact.email,
      linkedin_url: contact.linkedin_url,
      source: contact.source,
      notes: contact.notes,
      companyId: company?._id.toString(),
      companyName: company?.name,
      lastContactLabel: contact.last_contact_at
        ? formatRelative(contact.last_contact_at)
        : undefined,
      addedLabel: formatDate(contact.created_at),
      applications: appDocs.map((a) => ({
        id: a._id.toString(),
        role_title: a.role_title,
        status: a.status,
        company: a.jd_structured?.company ?? "",
      })),
      conversations: convDocs.map((c) => ({
        id: c._id.toString(),
        subject: c.subject?.trim() || channelSubject(c.channel),
        channel: c.channel,
        messageCount: c.messages?.length ?? 0,
        lastLabel: formatRelative(c.last_message_at),
        lastFrom: c.last_message_from,
      })),
    };
  },
);

function channelSubject(channel: Conversation["channel"]): string {
  if (channel === "email") return "Email conversation";
  if (channel === "linkedin") return "LinkedIn conversation";
  if (channel === "phone") return "Phone conversation";
  return "Conversation";
}

function uniqueObjectIds(ids: (ObjectId | undefined)[]): ObjectId[] {
  const seen = new Set<string>();
  const out: ObjectId[] = [];
  for (const id of ids) {
    if (!id) continue;
    const key = id.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(id);
  }
  return out;
}

function deriveInitials(name: string): string {
  const words = name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2);
  const out = words.map((w) => w[0]?.toUpperCase() ?? "").join("");
  return out || "?";
}

function formatRelative(date: Date): string {
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  const months = Math.floor(diffDays / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
