const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailPayload {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { size?: number; data?: string };
  parts?: GmailPayload[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPayload;
}

export interface ParsedEmail {
  messageId: string;
  threadId: string;
  fromName: string;
  fromEmail: string;
  toEmails: string[];
  subject: string;
  body: string;
  sentAt: Date;
  isFromMe: boolean;
}

export async function listRecentMessageIds(
  accessToken: string,
  options: { query?: string; maxResults?: number } = {},
): Promise<string[]> {
  const query = options.query ?? "newer_than:30d category:primary";
  const maxResults = options.maxResults ?? 50;
  const url = `${GMAIL_API}/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Gmail list failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { messages?: { id: string }[] };
  return (data.messages ?? []).map((m) => m.id);
}

export async function fetchMessage(
  accessToken: string,
  messageId: string,
): Promise<GmailMessage> {
  const url = `${GMAIL_API}/messages/${messageId}?format=full`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Gmail get failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as GmailMessage;
}

export async function getOwnEmail(accessToken: string): Promise<string> {
  const res = await fetch(`${GMAIL_API}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return "";
  const data = (await res.json()) as { emailAddress?: string };
  return data.emailAddress ?? "";
}

export function parseMessage(
  msg: GmailMessage,
  ownEmail: string,
): ParsedEmail | null {
  const headers = msg.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ??
    "";

  const fromRaw = getHeader("from");
  const toRaw = getHeader("to");
  const subject = getHeader("subject");
  const dateStr = getHeader("date");

  const fromParsed = parseAddress(fromRaw);
  if (!fromParsed.email) return null;

  const sentAt = msg.internalDate
    ? new Date(parseInt(msg.internalDate, 10))
    : dateStr
      ? new Date(dateStr)
      : new Date();

  const body = extractBody(msg.payload);
  if (!body.trim()) return null;

  const ownLower = ownEmail.toLowerCase();
  const isFromMe = fromParsed.email.toLowerCase() === ownLower;

  return {
    messageId: msg.id,
    threadId: msg.threadId,
    fromName: fromParsed.name,
    fromEmail: fromParsed.email,
    toEmails: toRaw
      .split(",")
      .map((s) => parseAddress(s.trim()).email)
      .filter(Boolean),
    subject,
    body,
    sentAt,
    isFromMe,
  };
}

function parseAddress(raw: string): { name: string; email: string } {
  if (!raw) return { name: "", email: "" };
  const match = raw.match(/^(.*?)<([^>]+)>\s*$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, ""),
      email: match[2].trim(),
    };
  }
  return { name: "", email: raw.trim() };
}

function extractBody(payload?: GmailPayload): string {
  if (!payload) return "";
  if (payload.body?.data) {
    return decodeBody(payload.body.data, payload.mimeType);
  }
  if (payload.parts) {
    const plain = findPartByMime(payload.parts, "text/plain");
    if (plain?.body?.data) return decodeBody(plain.body.data, "text/plain");
    const html = findPartByMime(payload.parts, "text/html");
    if (html?.body?.data) return decodeBody(html.body.data, "text/html");
  }
  return "";
}

function findPartByMime(
  parts: GmailPayload[],
  mime: string,
): GmailPayload | null {
  for (const part of parts) {
    if (part.mimeType === mime && part.body?.data) return part;
    if (part.parts) {
      const nested = findPartByMime(part.parts, mime);
      if (nested) return nested;
    }
  }
  return null;
}

function decodeBody(data: string, mime?: string): string {
  const decoded = base64UrlDecode(data);
  if (mime === "text/html") return stripHtml(decoded);
  return decoded;
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "==".slice(0, (4 - (normalized.length % 4)) % 4);
  try {
    return Buffer.from(padded, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
