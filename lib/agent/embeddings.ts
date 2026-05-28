import { embed, embedMany } from "ai";
import { embeddingModel } from "@/lib/ai";
import type {
  Application,
  Artifact,
  Conversation,
} from "@/lib/types";

const MAX_INPUT_CHARS = 8000;

function clip(text: string): string {
  return text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: clip(text),
  });
  return embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts.map(clip),
  });
  return embeddings;
}

/* ───── Document → embedding-input text ───── */

export function applicationEmbeddingText(
  app: Pick<Application, "role_title" | "status" | "jd_structured" | "jd_raw">,
): string {
  const jd = app.jd_structured;
  return [
    `Role: ${app.role_title}`,
    `Company: ${jd.company}`,
    `Status: ${app.status}`,
    jd.stack.length ? `Stack: ${jd.stack.join(", ")}` : "",
    jd.requirements.length
      ? `Requirements:\n${jd.requirements.map((r) => `- ${r}`).join("\n")}`
      : "",
    jd.location ? `Location: ${jd.location}` : "",
    jd.remote_policy ? `Remote: ${jd.remote_policy}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function conversationEmbeddingText(
  conv: Pick<Conversation, "messages" | "channel">,
  contactName?: string,
): string {
  // Embed the full thread (Unikowski's lesson #5 — fragment retrieval misses context)
  const header = `Channel: ${conv.channel}${contactName ? ` with ${contactName}` : ""}`;
  const body = conv.messages
    .map((m) => `${m.from === "me" ? "You" : contactName ?? "Them"}: ${m.body}`)
    .join("\n\n");
  return `${header}\n\n${body}`;
}

export function artifactEmbeddingText(
  art: Pick<Artifact, "type" | "content_md" | "meta">,
): string {
  const kind = (art.meta?.kind as string) ?? art.type;
  return `Type: ${kind}\n\n${art.content_md}`;
}
