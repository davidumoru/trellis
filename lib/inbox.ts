import { cache } from "react";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import type {
  Application,
  Company,
  Contact,
  Conversation,
  Message,
} from "@/lib/types";

export type ThreadState = "unread" | "waiting" | "read";

export interface ThreadMessage {
  id: string;
  from: "you" | "them";
  date: string;
  body: string;
}

export interface Thread {
  id: string;
  name: string;
  email: string;
  company: string;
  initials: string;
  subject: string;
  snippet: string;
  when: string;
  state: ThreadState;
  messages: ThreadMessage[];
}

const UNREAD_WINDOW_DAYS = 3;

export const fetchThreads = cache(async (userId: string): Promise<Thread[]> => {
  const { conversations, contacts, applications, companies } =
    await getCollections();

  const convs = await conversations
    .find({ user_id: userId })
    .sort({ last_message_at: -1 })
    .toArray();
  if (convs.length === 0) return [];

  const contactIds = uniqueObjectIds(convs.map((c) => c.contact_id));
  const contactDocs = contactIds.length
    ? await contacts
        .find({ _id: { $in: contactIds }, user_id: userId })
        .toArray()
    : [];
  const contactById = new Map(contactDocs.map((c) => [c._id.toString(), c]));

  const appIds = uniqueObjectIds(convs.map((c) => c.application_id));
  const appDocs = appIds.length
    ? await applications
        .find({ _id: { $in: appIds }, user_id: userId })
        .toArray()
    : [];
  const appById = new Map(appDocs.map((a) => [a._id.toString(), a]));

  const companyIds = uniqueObjectIds(contactDocs.map((c) => c.company_id));
  const companyDocs = companyIds.length
    ? await companies
        .find({ _id: { $in: companyIds }, user_id: userId })
        .toArray()
    : [];
  const companyById = new Map(companyDocs.map((c) => [c._id.toString(), c]));

  return convs
    .map((c) => buildThread(c, contactById, appById, companyById))
    .filter((t) => !isNoiseThread(t));
});

export const fetchThread = cache(
  async (userId: string, threadId: string): Promise<Thread | null> => {
    const all = await fetchThreads(userId);
    return all.find((t) => t.id === threadId) ?? null;
  },
);

function buildThread(
  c: Conversation,
  contactById: Map<string, Contact>,
  appById: Map<string, Application>,
  companyById: Map<string, Company>,
): Thread {
  const contact = c.contact_id
    ? (contactById.get(c.contact_id.toString()) ?? null)
    : null;
  const app = c.application_id
    ? (appById.get(c.application_id.toString()) ?? null)
    : null;
  const company = contact?.company_id
    ? (companyById.get(contact.company_id.toString()) ?? null)
    : null;

  const name = contact?.name ?? "Unknown sender";
  const email = contact?.email ?? "";
  const companyName = app?.jd_structured?.company ?? company?.name ?? "";
  const messages = mapMessages(c.messages ?? [], c._id.toString());

  const firstBody = cleanBody(c.messages?.[0]?.body ?? "");
  const lastBody = cleanBody(c.messages?.[c.messages.length - 1]?.body ?? "");

  return {
    id: c._id.toString(),
    name,
    email,
    company: companyName,
    initials: deriveInitials(name),
    subject: deriveSubject(firstBody, app),
    snippet: deriveSnippet(lastBody),
    when: formatRelative(c.last_message_at),
    state: deriveState(c.last_message_from, c.last_message_at, email),
    messages,
  };
}

function mapMessages(messages: Message[], convId: string): ThreadMessage[] {
  return messages.map((m, i) => ({
    id: `${convId}-${i}`,
    from: m.from === "me" ? "you" : "them",
    date: formatMessageDate(m.sent_at),
    body: cleanBody(m.body ?? ""),
  }));
}

const NOISE_EMAIL_PATTERNS = [
  /noreply@linkedin\.com$/i,
  /no-reply@linkedin\.com$/i,
  /^invitations@linkedin\.com$/i,
  /noreply@(indeed|glassdoor|ziprecruiter|wellfound|angellist|monster|dice|simplyhired)\./i,
  /no-reply@(indeed|glassdoor|ziprecruiter|wellfound|angellist|monster|dice|simplyhired)\./i,
  /^digest@/i,
  /^alerts?@/i,
  /^newsletter@/i,
  /^updates?@/i,
];

const NOISE_NAME_PATTERNS = [
  /job alerts?$/i,
  /job digest/i,
  /jobs? for you/i,
  /weekly digest/i,
];

const NOISE_SUBJECT_PATTERNS = [
  /^your job alert/i,
  /\bnew jobs? for you\b/i,
  /\bjobs? matching\b/i,
  /\bjob alert\b/i,
];

function isNoiseThread(t: Thread): boolean {
  if (NOISE_EMAIL_PATTERNS.some((r) => r.test(t.email))) return true;
  if (NOISE_NAME_PATTERNS.some((r) => r.test(t.name))) return true;
  if (NOISE_SUBJECT_PATTERNS.some((r) => r.test(t.subject))) return true;
  return false;
}

function cleanBody(body: string): string {
  let s = body.replace(/​|‌|‍|﻿/g, "").replace(/\r\n/g, "\n");

  if (looksLikeHtml(s)) s = htmlToText(s);
  s = s.replace(/https?:\/\/[^\s<>"']+/g, (url) => {
    if (url.length <= 80) return url;
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return `[${host}]`;
    } catch {
      return "[link]";
    }
  });
  s = s.replace(/^[\s\-=_*]{6,}$/gm, "");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function looksLikeHtml(s: string): boolean {
  return /<\/?(p|div|br|span|a|img|table|tr|td|html|body|h[1-6]|ul|ol|li)\b[^>]*>/i.test(
    s,
  );
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&hellip;": "…",
  "&mdash;": "—",
  "&ndash;": "–",
  "&lsquo;": "‘",
  "&rsquo;": "’",
  "&ldquo;": "“",
  "&rdquo;": "”",
};

function htmlToText(s: string): string {
  let out = s;
  out = out.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(
    /<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (_m, _tag, inner) => `**${inner}**`,
  );
  out = out.replace(
    /<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (_m, _tag, inner) => `*${inner}*`,
  );
  out = out.replace(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href, inner) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      if (!text || text === href) return href;
      return `${text} (${href})`;
    },
  );
  out = out.replace(/<\/(p|div|h[1-6]|li|tr|table|blockquote)\s*>/gi, "\n\n");
  out = out.replace(/<li\b[^>]*>/gi, "• ");
  out = out.replace(/<[^>]+>/g, "");
  out = out.replace(
    /&(amp|lt|gt|quot|apos|nbsp|copy|reg|trade|hellip|mdash|ndash|lsquo|rsquo|ldquo|rdquo);/g,
    (m) => HTML_ENTITIES[m] ?? m,
  );
  out = out.replace(/&#(\d+);/g, (_, n) =>
    String.fromCodePoint(parseInt(n, 10)),
  );
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, n) =>
    String.fromCodePoint(parseInt(n, 16)),
  );
  out = out.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n");
  return out;
}

function deriveState(
  lastFrom: "me" | "them",
  lastAt: Date,
  senderEmail: string,
): ThreadState {
  if (lastFrom === "me") return "read";
  if (isNoReply(senderEmail)) return "read";
  return isWithinDays(lastAt, UNREAD_WINDOW_DAYS) ? "unread" : "waiting";
}

function isNoReply(email: string): boolean {
  if (!email) return false;
  return /(^|[._+-])(no-?reply|donotreply|do-not-reply|notifications?|alerts?|mailer-daemon|bounce)@/i.test(
    email,
  );
}

function deriveInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = words.map((w) => w[0]?.toUpperCase() ?? "").join("");
  return initials || "?";
}

function deriveSubject(firstBody: string, app: Application | null): string {
  if (app?.role_title && app?.jd_structured?.company) {
    return `Re: ${app.role_title} at ${app.jd_structured.company}`;
  }
  const firstLine = firstBody.split(/\n/)[0]?.trim() ?? "";
  if (firstLine.length > 0) return truncate(firstLine, 80);
  return "(no subject)";
}

function deriveSnippet(lastBody: string): string {
  const cleaned = lastBody.replace(/\s+/g, " ").trim();
  return truncate(cleaned, 120);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

function formatRelative(date: Date): string {
  const d = new Date(date).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - d);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

function formatMessageDate(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function isWithinDays(date: Date, days: number): boolean {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(date).getTime() > cutoff;
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
