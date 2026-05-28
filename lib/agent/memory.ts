import { generateObject, generateText, streamText } from "ai";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { agentModel } from "@/lib/ai";
import { getCollections } from "@/lib/db";
import { generateEmbedding } from "@/lib/agent/embeddings";

const SEARCH_INDEX = "vector_index";
const NUM_CANDIDATES = 50;
const TOP_K_PER_COLLECTION = 4;

export type Citation = {
  kind: "application" | "conversation" | "artifact";
  id: string;
  application_id?: string;
  title: string;
  subtitle?: string;
  score: number;
};

export type MemoryEvent =
  | { type: "plan"; query: string }
  | { type: "hyde"; preview: string }
  | { type: "search:done"; citations: Citation[] }
  | { type: "answer:chunk"; text: string }
  | { type: "answer:done" }
  | { type: "no_results" }
  | { type: "error"; message: string };

type Emit = (event: MemoryEvent) => void;

export async function runMemoryQuery({
  query,
  userId,
  emit,
}: {
  query: string;
  userId: string;
  emit: Emit;
}) {
  emit({ type: "plan", query });

  // Step 0: Classify — does this actually need retrieval?
  let needsRetrieval = true;
  try {
    const { object } = await generateObject({
      model: agentModel,
      schema: z.object({
        needs_retrieval: z
          .boolean()
          .describe(
            "True if answering requires searching the user's specific pipeline data. False for greetings, small talk, and generic job-search advice.",
          ),
      }),
      prompt: `You're an assistant inside a job tracking app. Decide if the user's message requires searching their stored pipeline (their applications, recruiter conversations, tailored documents).

TRUE when the message is a specific question about THEIR data:
- "have I talked to anyone at Linear?"
- "what role pays the most in my pipeline?"
- "which applications mention React?"
- "remind me what I said in my cover letter for Stripe"

FALSE when it's:
- Greeting / pleasantry: "hey", "hi", "thanks", "cool"
- Small talk: "how are you", "what can you do"
- Generic advice: "what should I look for in a job", "tips for interviews"
- Ambiguous / unclear input

User message: "${query}"`,
    });
    needsRetrieval = object.needs_retrieval;
  } catch {
    // If classification fails, default to retrieval (safe fallback)
    needsRetrieval = true;
  }

  if (!needsRetrieval) {
    try {
      const { textStream } = streamText({
        model: agentModel,
        prompt: `You are Trellis, a concise assistant inside a job tracking app. The user just said:

"${query}"

Respond in 1-2 short sentences. If they're greeting you, greet back and offer to help with their pipeline. If they're asking what you can do, mention you can search across their applications, conversations, and documents. If they're asking for generic advice, give one helpful sentence. Do not invent any details about their specific pipeline.`,
      });
      for await (const chunk of textStream) {
        emit({ type: "answer:chunk", text: chunk });
      }
      emit({ type: "answer:done" });
    } catch (e) {
      emit({ type: "error", message: (e as Error).message });
    }
    return;
  }

  // Step 1: HyDE — generate a hypothetical answer to embed
  let hyde: string;
  try {
    const { text } = await generateText({
      model: agentModel,
      prompt: `You are an assistant rewriting a user's question into a hypothetical answer that would, if it existed, satisfy the question. This will be embedded and used to search the user's job pipeline (applications, conversations, documents).

Write a plausible, specific 2-4 sentence answer. Don't say "I don't know" — invent a confident-sounding answer. We use it for retrieval, not to show the user.

Question: ${query}

Hypothetical answer:`,
    });
    hyde = text.trim();
  } catch {
    hyde = query; // fall back to raw query
  }
  emit({ type: "hyde", preview: hyde.slice(0, 200) });

  // Step 2: Embed HyDE
  let queryVector: number[];
  try {
    queryVector = await generateEmbedding(hyde);
  } catch (e) {
    emit({ type: "error", message: `Embedding failed: ${(e as Error).message}` });
    return;
  }

  // Step 3: Vector search across three indexed collections, in parallel
  const { applications, conversations, artifacts, contacts } =
    await getCollections();

  const [appResults, convResults, artifactResults] = await Promise.all([
    applications
      .aggregate([
        {
          $vectorSearch: {
            index: SEARCH_INDEX,
            path: "embedding",
            queryVector,
            numCandidates: NUM_CANDIDATES,
            limit: TOP_K_PER_COLLECTION,
            filter: { user_id: userId },
          },
        },
        {
          $project: {
            role_title: 1,
            "jd_structured.company": 1,
            status: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ])
      .toArray(),
    conversations
      .aggregate([
        {
          $vectorSearch: {
            index: SEARCH_INDEX,
            path: "embedding",
            queryVector,
            numCandidates: NUM_CANDIDATES,
            limit: TOP_K_PER_COLLECTION,
            filter: { user_id: userId },
          },
        },
        {
          $project: {
            channel: 1,
            contact_id: 1,
            application_id: 1,
            messages: 1,
            last_message_at: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ])
      .toArray(),
    artifacts
      .aggregate([
        {
          $vectorSearch: {
            index: SEARCH_INDEX,
            path: "embedding",
            queryVector,
            numCandidates: NUM_CANDIDATES,
            limit: TOP_K_PER_COLLECTION * 3,
            filter: { user_id: userId },
          },
        },
        {
          $match: { "meta.kind": { $ne: "base_resume" } },
        },
        { $limit: TOP_K_PER_COLLECTION },
        {
          $project: {
            type: 1,
            content_md: 1,
            application_id: 1,
            meta: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ])
      .toArray(),
  ]);

  // Resolve contact names for conversations
  const contactIds = Array.from(
    new Set(convResults.map((c) => c.contact_id?.toString()).filter(Boolean)),
  ).map((id) => new ObjectId(id as string));

  const convContacts = contactIds.length
    ? await contacts
        .find({ _id: { $in: contactIds }, user_id: userId })
        .toArray()
    : [];
  const contactById = new Map(
    convContacts.map((c) => [c._id.toString(), c]),
  );

  // Resolve application titles for context
  const appIds = new Set<string>();
  convResults.forEach((c) => c.application_id && appIds.add(c.application_id.toString()));
  artifactResults.forEach((a) => a.application_id && appIds.add(a.application_id.toString()));
  const relatedApps = appIds.size
    ? await applications
        .find({
          _id: { $in: Array.from(appIds).map((id) => new ObjectId(id)) },
          user_id: userId,
        })
        .project({ role_title: 1, "jd_structured.company": 1 })
        .toArray()
    : [];
  const appById = new Map(relatedApps.map((a) => [a._id.toString(), a]));

  // Build citations, sorted by score
  const citations: Citation[] = [
    ...appResults.map((a): Citation => ({
      kind: "application",
      id: a._id.toString(),
      application_id: a._id.toString(),
      title: a.role_title,
      subtitle: a.jd_structured?.company,
      score: a.score ?? 0,
    })),
    ...convResults.map((c): Citation => {
      const contact = contactById.get(c.contact_id?.toString() ?? "");
      const app = c.application_id ? appById.get(c.application_id.toString()) : null;
      return {
        kind: "conversation",
        id: c._id.toString(),
        application_id: c.application_id?.toString(),
        title: contact?.name ?? "Conversation",
        subtitle: app
          ? `${c.channel} · ${app.role_title} at ${app.jd_structured?.company}`
          : c.channel,
        score: c.score ?? 0,
      };
    }),
    ...artifactResults.map((a): Citation => {
      const app = a.application_id ? appById.get(a.application_id.toString()) : null;
      const typeLabel =
        a.type === "resume_diff"
          ? "Tailored resume"
          : a.type === "cover_letter"
            ? "Cover letter"
            : a.type === "research_note"
              ? "Company research"
              : a.type;
      return {
        kind: "artifact",
        id: a._id.toString(),
        application_id: a.application_id?.toString(),
        title: typeLabel,
        subtitle: app
          ? `${app.role_title} at ${app.jd_structured?.company}`
          : undefined,
        score: a.score ?? 0,
      };
    }),
  ].sort((a, b) => b.score - a.score);

  if (citations.length === 0) {
    emit({ type: "no_results" });
    return;
  }

  emit({ type: "search:done", citations });

  // Step 4: Synthesize answer with citations
  const contextBlocks = await Promise.all([
    ...appResults.map(async (a) => {
      const full = await applications.findOne(
        { _id: a._id, user_id: userId },
        { projection: { jd_structured: 1, role_title: 1, status: 1 } },
      );
      const cite = citations.findIndex(
        (c) => c.kind === "application" && c.id === a._id.toString(),
      );
      return `[${cite + 1}] Application — ${full?.role_title} at ${full?.jd_structured?.company} (${full?.status}). Stack: ${full?.jd_structured?.stack?.join(", ") ?? "—"}. Requirements: ${full?.jd_structured?.requirements?.slice(0, 3).join("; ") ?? "—"}.`;
    }),
    ...convResults.map(async (c) => {
      const contact = contactById.get(c.contact_id?.toString() ?? "");
      const app = c.application_id ? appById.get(c.application_id.toString()) : null;
      const cite = citations.findIndex(
        (cc) => cc.kind === "conversation" && cc.id === c._id.toString(),
      );
      const thread = c.messages
        .map((m: { from: string; body: string }) =>
          `${m.from === "me" ? "You" : contact?.name ?? "Them"}: ${m.body}`,
        )
        .join("\n");
      return `[${cite + 1}] Conversation — ${contact?.name ?? "Unknown"} (${c.channel})${app ? `, re: ${app.role_title} at ${app.jd_structured?.company}` : ""}.\n${thread}`;
    }),
    ...artifactResults.map(async (a) => {
      const app = a.application_id ? appById.get(a.application_id.toString()) : null;
      const cite = citations.findIndex(
        (c) => c.kind === "artifact" && c.id === a._id.toString(),
      );
      const typeLabel =
        a.type === "resume_diff"
          ? "Tailored resume"
          : a.type === "cover_letter"
            ? "Cover letter"
            : a.type === "research_note"
              ? "Company research"
              : a.type;
      return `[${cite + 1}] ${typeLabel}${app ? ` for ${app.role_title} at ${app.jd_structured?.company}` : ""}.\n${a.content_md.slice(0, 1200)}`;
    }),
  ]);

  const synthesisPrompt = `You are answering a question about the user's job pipeline using ONLY the context below. Cite every claim by referencing the bracketed number (e.g. "Yes, you spoke with Karri at Linear [2]").

If the context doesn't contain enough information to answer the question, say so honestly. Do not invent or guess.

QUESTION:
${query}

CONTEXT:
${contextBlocks.join("\n\n")}

Answer in 2-4 sentences. Use [1], [2] style citations inline. Don't list citations at the end.`;

  try {
    const { textStream } = streamText({
      model: agentModel,
      prompt: synthesisPrompt,
    });
    for await (const chunk of textStream) {
      emit({ type: "answer:chunk", text: chunk });
    }
    emit({ type: "answer:done" });
  } catch (e) {
    emit({ type: "error", message: (e as Error).message });
  }
}
