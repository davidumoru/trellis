import { ObjectId } from "mongodb";
import { generateObject } from "ai";
import { z } from "zod";
import { agentModel } from "@/lib/ai";
import { getCollections } from "@/lib/db";
import {
  fetchMessage,
  getOwnEmail,
  listRecentMessageIds,
  parseMessage,
  type ParsedEmail,
} from "@/lib/agent/gmail";
import {
  conversationEmbeddingText,
  generateEmbedding,
} from "@/lib/agent/embeddings";

const GMAIL_QUERY = "newer_than:30d category:primary";

const MAX_MESSAGES_PER_SYNC = 200;

const SYNC_CONCURRENCY = 5;

const classificationSchema = z.object({
  is_job_related: z
    .boolean()
    .describe(
      "True if this email is about a job application, recruiting, or interview",
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
  const messageIds = await listRecentMessageIds(accessToken, {
    query: GMAIL_QUERY,
    maxResults: MAX_MESSAGES_PER_SYNC,
  });

  const { applications, conversations, contacts, companies, gmailRejections } =
    await getCollections();

  const rejectedDocs = await gmailRejections
    .find({ user_id: userId }, { projection: { gmail_message_id: 1 } })
    .toArray();
  const rejectedIds = new Set(rejectedDocs.map((r) => r.gmail_message_id));

  const userApps = (await applications
    .find({ user_id: userId })
    .project({ role_title: 1, "jd_structured.company": 1, company_id: 1 })
    .toArray()) as unknown as {
    _id: ObjectId;
    jd_structured?: { company?: string };
    company_id?: ObjectId;
  }[];

  const userCompanies = await companies.find({ user_id: userId }).toArray();

  const threadLocks = new Map<string, Promise<unknown>>();

  async function withThreadLock<T>(
    threadId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const prev = threadLocks.get(threadId) ?? Promise.resolve();
    const task = prev.then(fn);
    threadLocks.set(
      threadId,
      task.catch(() => undefined),
    );
    try {
      return await task;
    } finally {
      if (threadLocks.get(threadId)?.then) {
        const cur = threadLocks.get(threadId);
        await cur;
        if (threadLocks.get(threadId) === cur) {
          threadLocks.delete(threadId);
        }
      }
    }
  }

  async function processMessage(messageId: string): Promise<void> {
    result.scanned++;

    if (rejectedIds.has(messageId)) return;

    let parsed: ParsedEmail | null = null;
    try {
      const msg = await fetchMessage(accessToken, messageId);
      parsed = parseMessage(msg, ownEmail);
    } catch {
      return;
    }
    if (!parsed) return;
    const p = parsed;

    await withThreadLock(p.threadId, async () => {
      const existingConv = await conversations.findOne({
        user_id: userId,
        gmail_thread_id: p.threadId,
      });

      if (
        existingConv?.messages.some(
          (m) => m.gmail_message_id === p.messageId,
        )
      ) {
        await conversations.updateOne(
          {
            _id: existingConv._id,
            "messages.gmail_message_id": p.messageId,
          },
          { $set: { "messages.$.gmail_labels": p.labelIds } },
        );
        return;
      }

      let classification: z.infer<typeof classificationSchema>;
      try {
        const { object } = await generateObject({
          model: agentModel,
          schema: classificationSchema,
          prompt: `Classify this email.

From: ${p.fromName} <${p.fromEmail}>
Subject: ${p.subject}

Body (first 2000 chars):
${p.body.slice(0, 2000)}`,
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
            gmail_message_id: p.messageId,
            rejected_at: new Date(),
          });
          rejectedIds.add(p.messageId);
        } catch {
          // ignore duplicate-key on race
        }
        return;
      }
      result.jobRelated++;

      const matchedApp = matchApplication(
        classification.company,
        userApps,
        userCompanies,
        p.fromEmail,
      );

      const contactName = p.fromName || extractNameFromEmail(p.fromEmail);
      const contactKey = p.isFromMe ? null : p.fromEmail.toLowerCase();

      let contactId: ObjectId | null = null;
      if (contactKey) {
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
                last_contact_at: p.sentAt,
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
            last_contact_at: p.sentAt,
            created_at: new Date(),
          });
          result.newContacts++;
        }
      }

      const newMessage = {
        from: (p.isFromMe ? "me" : "them") as "me" | "them",
        body: p.body.slice(0, 8000),
        sent_at: p.sentAt,
        gmail_message_id: p.messageId,
        gmail_labels: p.labelIds,
      };

      const cleanSubject = p.subject.replace(/^(re|fwd|fw):\s*/i, "").trim();

      if (existingConv) {
        const updatedMessages = [...existingConv.messages, newMessage].sort(
          (a, b) => a.sent_at.getTime() - b.sent_at.getTime(),
        );
        const lastMessage = updatedMessages[updatedMessages.length - 1];
        const embedding = await safeEmbedding(
          conversationEmbeddingText(
            { ...existingConv, messages: updatedMessages },
            contactName,
          ),
        );
        await conversations.updateOne(
          { _id: existingConv._id },
          {
            $set: {
              messages: updatedMessages,
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
        result.updatedConversations++;
      } else {
        if (!contactId) return;
        const convDoc = {
          _id: new ObjectId(),
          user_id: userId,
          contact_id: contactId,
          application_id: matchedApp?._id,
          channel: "email" as const,
          source: "gmail" as const,
          gmail_thread_id: p.threadId,
          subject: cleanSubject || undefined,
          messages: [newMessage],
          last_message_at: p.sentAt,
          last_message_from: newMessage.from,
          created_at: new Date(),
        };
        const embedding = await safeEmbedding(
          conversationEmbeddingText(convDoc, contactName),
        );
        await conversations.insertOne({ ...convDoc, embedding });
        result.newConversations++;
      }
    });
  }

  const queue = [...messageIds];
  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) return;
      try {
        await processMessage(id);
      } catch {
        // swallow; next message
      }
    }
  }

  await Promise.all(
    Array.from({ length: SYNC_CONCURRENCY }, () => worker()),
  );

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
