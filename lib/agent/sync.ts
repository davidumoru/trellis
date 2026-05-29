import { ObjectId } from "mongodb";
import { generateObject } from "ai";
import { z } from "zod";
import { agentModel } from "@/lib/ai";
import { getCollections } from "@/lib/db";
import {
  fetchThread,
  getOwnEmail,
  listRecentThreadIds,
  parseMessage,
  type GmailThread,
  type ParsedEmail,
} from "@/lib/agent/gmail";
import {
  conversationEmbeddingText,
  generateEmbedding,
} from "@/lib/agent/embeddings";
import type { Conversation, Message } from "@/lib/types";

const GMAIL_QUERY = "newer_than:30d category:primary";

const MAX_THREADS_PER_SYNC = 200;

const SYNC_CONCURRENCY = 5;

const classificationSchema = z.object({
  is_job_related: z
    .boolean()
    .describe(
      "True ONLY if this is direct, personal communication with the user about a specific job opportunity, application, interview, or hiring decision. Examples of TRUE: a recruiter reaching out about a specific role, an application confirmation, an interview invitation, an offer or rejection, a hiring manager scheduling a call. Examples of FALSE: newsletters or product updates (even if they mention jobs/hiring), digests, job alert summaries, mass marketing, co-founder matching platforms, networking platform notifications, generic industry news, any automated mass email even if from a job-adjacent domain.",
    ),
  company: z
    .string()
    .nullable()
    .describe("Company the sender represents, or null if unclear"),
  sender_role: z
    .string()
    .nullable()
    .describe(
      "The sender's role / title if mentioned (e.g. Recruiter, Hiring Manager), else null",
    ),
});

export interface SyncResult {
  scanned: number;
  jobRelated: number;
  newConversations: number;
  updatedConversations: number;
  newContacts: number;
}

export async function syncGmail({
  accessToken,
  userId,
}: {
  accessToken: string;
  userId: string;
}): Promise<SyncResult> {
  const result: SyncResult = {
    scanned: 0,
    jobRelated: 0,
    newConversations: 0,
    updatedConversations: 0,
    newContacts: 0,
  };

  const ownEmail = await getOwnEmail(accessToken);
  const threadIds = await listRecentThreadIds(accessToken, {
    query: GMAIL_QUERY,
    maxResults: MAX_THREADS_PER_SYNC,
  });

  const { applications, conversations, contacts, companies, gmailRejections } =
    await getCollections();

  const rejectedDocs = await gmailRejections
    .find({ user_id: userId }, { projection: { gmail_thread_id: 1 } })
    .toArray();
  const rejectedThreadIds = new Set(
    rejectedDocs.map((r) => r.gmail_thread_id).filter(Boolean),
  );

  const userApps = (await applications
    .find({ user_id: userId })
    .project({ role_title: 1, "jd_structured.company": 1, company_id: 1 })
    .toArray()) as unknown as {
    _id: ObjectId;
    jd_structured?: { company?: string };
    company_id?: ObjectId;
  }[];

  const userCompanies = await companies.find({ user_id: userId }).toArray();

  async function processThread(threadId: string): Promise<void> {
    result.scanned++;

    const existingConv = await conversations.findOne({
      user_id: userId,
      gmail_thread_id: threadId,
    });

    if (!existingConv && rejectedThreadIds.has(threadId)) return;

    let thread: GmailThread;
    try {
      thread = await fetchThread(accessToken, threadId);
    } catch {
      return;
    }
    if (!thread.messages || thread.messages.length === 0) return;

    const parsedMessages = thread.messages
      .map((m) => parseMessage(m, ownEmail))
      .filter((p): p is ParsedEmail => p !== null);
    if (parsedMessages.length === 0) return;
    parsedMessages.sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());

    const representative = parsedMessages.find((p) => !p.isFromMe);

    if (existingConv) {
      const ref = representative ?? parsedMessages[0];
      await ingestIntoExisting(existingConv, parsedMessages, ref);
      return;
    }

    if (!representative) return;

    let classification: z.infer<typeof classificationSchema>;
    try {
      const { object } = await generateObject({
        model: agentModel,
        schema: classificationSchema,
        prompt: `Classify this email.

From: ${representative.fromName} <${representative.fromEmail}>
Subject: ${representative.subject}

Body (first 2000 chars):
${representative.body.slice(0, 2000)}`,
      });
      classification = object;
    } catch {
      return;
    }

    if (!classification.is_job_related) {
      try {
        await gmailRejections.insertOne({
          _id: new ObjectId(),
          user_id: userId,
          gmail_thread_id: threadId,
          rejected_at: new Date(),
        });
        rejectedThreadIds.add(threadId);
      } catch {
        // ignore duplicate-key on race
      }
      return;
    }
    result.jobRelated++;

    await createNewConversation(
      threadId,
      parsedMessages,
      representative,
      classification,
    );
  }

  async function ingestIntoExisting(
    existingConv: Conversation,
    parsedMessages: ParsedEmail[],
    representative: ParsedEmail,
  ): Promise<void> {
    const existingMessageIds = new Set(
      existingConv.messages.map((m) => m.gmail_message_id),
    );

    const newMessageDocs: Message[] = [];
    for (const p of parsedMessages) {
      if (existingMessageIds.has(p.messageId)) continue;
      newMessageDocs.push({
        from: p.isFromMe ? "me" : "them",
        body: p.body.slice(0, 8000),
        sent_at: p.sentAt,
        gmail_message_id: p.messageId,
        gmail_labels: p.labelIds,
      });
    }

    const updatedExisting = existingConv.messages.map((m) => {
      const fresh = parsedMessages.find(
        (p) => p.messageId === m.gmail_message_id,
      );
      return fresh ? { ...m, gmail_labels: fresh.labelIds } : m;
    });

    const allMessages = [...updatedExisting, ...newMessageDocs].sort(
      (a, b) => a.sent_at.getTime() - b.sent_at.getTime(),
    );
    const lastMessage = allMessages[allMessages.length - 1];

    const contactName =
      representative.fromName || extractNameFromEmail(representative.fromEmail);

    const embedding = await safeEmbedding(
      conversationEmbeddingText(
        { ...existingConv, messages: allMessages },
        contactName,
      ),
    );

    const cleanSubject = representative.subject
      .replace(/^(re|fwd|fw):\s*/i, "")
      .trim();

    await conversations.updateOne(
      { _id: existingConv._id },
      {
        $set: {
          messages: allMessages,
          last_message_at: lastMessage.sent_at,
          last_message_from: lastMessage.from,
          embedding,
          updated_at: new Date(),
          ...(cleanSubject && !existingConv.subject
            ? { subject: cleanSubject }
            : {}),
        },
      },
    );

    if (newMessageDocs.length > 0) {
      result.updatedConversations++;
    }

    if (existingConv.gmail_thread_id) {
      await gmailRejections
        .deleteOne({
          user_id: userId,
          gmail_thread_id: existingConv.gmail_thread_id,
        })
        .catch(() => undefined);
      rejectedThreadIds.delete(existingConv.gmail_thread_id);
    }
  }

  async function createNewConversation(
    threadId: string,
    parsedMessages: ParsedEmail[],
    representative: ParsedEmail,
    classification: z.infer<typeof classificationSchema>,
  ): Promise<void> {
    const matchedApp = matchApplication(
      classification.company,
      userApps,
      userCompanies,
      representative.fromEmail,
    );

    const contactName =
      representative.fromName || extractNameFromEmail(representative.fromEmail);
    const contactKey = representative.fromEmail.toLowerCase();

    let contactId: ObjectId;
    const existingContact = await contacts.findOne({
      user_id: userId,
      email: contactKey,
    });
    if (existingContact) {
      contactId = existingContact._id;
      await contacts.updateOne(
        { _id: contactId },
        {
          $set: {
            last_contact_at: representative.sentAt,
            ...(classification.sender_role && !existingContact.role_title
              ? { role_title: classification.sender_role }
              : {}),
          },
        },
      );
    } else {
      contactId = new ObjectId();
      const matchedCompanyId = await ensureCompanyId(
        userId,
        classification.company,
        companies,
      );
      await contacts.insertOne({
        _id: contactId,
        user_id: userId,
        name: contactName,
        email: contactKey,
        source: "gmail",
        role_title: classification.sender_role ?? undefined,
        company_id: matchedCompanyId ?? undefined,
        last_contact_at: representative.sentAt,
        created_at: new Date(),
      });
      result.newContacts++;
    }

    const messageDocs: Message[] = parsedMessages.map((p) => ({
      from: p.isFromMe ? "me" : "them",
      body: p.body.slice(0, 8000),
      sent_at: p.sentAt,
      gmail_message_id: p.messageId,
      gmail_labels: p.labelIds,
    }));
    const lastMessage = messageDocs[messageDocs.length - 1];

    const cleanSubject = representative.subject
      .replace(/^(re|fwd|fw):\s*/i, "")
      .trim();

    const convDoc = {
      _id: new ObjectId(),
      user_id: userId,
      contact_id: contactId,
      application_id: matchedApp?._id,
      channel: "email" as const,
      source: "gmail" as const,
      gmail_thread_id: threadId,
      subject: cleanSubject || undefined,
      messages: messageDocs,
      last_message_at: lastMessage.sent_at,
      last_message_from: lastMessage.from,
      created_at: new Date(),
    };
    const embedding = await safeEmbedding(
      conversationEmbeddingText(convDoc, contactName),
    );
    await conversations.insertOne({ ...convDoc, embedding });
    result.newConversations++;
  }

  const queue = [...threadIds];
  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) return;
      try {
        await processThread(id);
      } catch {
        // swallow; next thread
      }
    }
  }

  await Promise.all(Array.from({ length: SYNC_CONCURRENCY }, () => worker()));

  return result;
}

function matchApplication(
  classifiedCompany: string | null,
  userApps: {
    _id: ObjectId;
    jd_structured?: { company?: string };
    company_id?: ObjectId;
  }[],
  userCompanies: { _id: ObjectId; name: string; domain?: string }[],
  senderEmail: string,
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

  const senderDomain = senderEmail.split("@")[1]?.toLowerCase();
  if (senderDomain) {
    const matchedCompany = userCompanies.find(
      (c) => c.domain?.toLowerCase() === senderDomain,
    );
    if (matchedCompany) {
      const matchedApp = userApps.find(
        (a) => a.company_id?.toString() === matchedCompany._id.toString(),
      );
      if (matchedApp) return matchedApp;
    }
  }

  return null;
}

async function ensureCompanyId(
  userId: string,
  companyName: string | null,
  companies: Awaited<ReturnType<typeof getCollections>>["companies"],
): Promise<ObjectId | null> {
  if (!companyName) return null;
  const trimmed = companyName.trim();
  if (!trimmed) return null;

  const existing = await companies.findOne({
    user_id: userId,
    name: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" },
  });
  if (existing) return existing._id;

  const id = new ObjectId();
  await companies.insertOne({
    _id: id,
    user_id: userId,
    name: trimmed,
    created_at: new Date(),
  });
  return id;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

async function safeEmbedding(text: string): Promise<number[] | undefined> {
  try {
    return await generateEmbedding(text);
  } catch {
    return undefined;
  }
}
