import { ObjectId } from "mongodb";
import { generateText } from "ai";
import { getCollections } from "@/lib/db";
import { agentModel } from "@/lib/ai";
import {
  artifactEmbeddingText,
  generateEmbedding,
} from "@/lib/agent/embeddings";

export type FinalizeResult =
  | { ok: true; id: string }
  | { ok: false; status: number; error: string };

export async function finalizeResume(
  userId: string,
  diffId: string,
): Promise<FinalizeResult> {
  if (!ObjectId.isValid(diffId)) {
    return { ok: false, status: 404, error: "Not found" };
  }

  const { artifacts, applications } = await getCollections();

  const diff = await artifacts.findOne({
    _id: new ObjectId(diffId),
    user_id: userId,
    type: "resume_diff",
  });
  if (!diff) {
    return { ok: false, status: 404, error: "Not found" };
  }

  const existing = await artifacts.findOne(
    {
      user_id: userId,
      type: "tailored_resume",
      "meta.source_diff_id": diff._id.toString(),
    },
    { projection: { _id: 1 } },
  );
  if (existing) {
    return { ok: true, id: existing._id.toString() };
  }

  const [baseResume, app] = await Promise.all([
    artifacts.findOne({ user_id: userId, "meta.kind": "base_resume" }),
    diff.application_id
      ? applications.findOne({ _id: diff.application_id, user_id: userId })
      : null,
  ]);
  if (!baseResume) {
    return { ok: false, status: 422, error: "No base resume on file" };
  }

  let resumeMd: string;
  try {
    const { text } = await generateText({
      model: agentModel,
      prompt: mergePrompt(
        baseResume.content_md,
        diff.content_md,
        app?.role_title,
        app?.jd_structured?.company,
      ),
    });
    resumeMd = text.trim();
  } catch {
    return {
      ok: false,
      status: 502,
      error: "Failed to generate the final resume",
    };
  }
  if (!resumeMd) {
    return {
      ok: false,
      status: 502,
      error: "Failed to generate the final resume",
    };
  }

  const artifactId = new ObjectId();
  const artifactDoc = {
    _id: artifactId,
    type: "tailored_resume" as const,
    user_id: userId,
    application_id: diff.application_id,
    content_md: resumeMd,
    version: 1,
    meta: { source_diff_id: diff._id.toString() },
    created_at: new Date(),
  };

  let embedding: number[] | undefined;
  try {
    embedding = await generateEmbedding(artifactEmbeddingText(artifactDoc));
  } catch {
    // best-effort, ignore
  }

  await artifacts.insertOne(
    embedding ? { ...artifactDoc, embedding } : artifactDoc,
  );

  return { ok: true, id: artifactId.toString() };
}

function mergePrompt(
  base: string,
  changes: string,
  role?: string,
  company?: string,
): string {
  return `You are a careful resume editor. Apply the proposed changes to the base resume and output the complete, final resume.

Rules:
- Apply ONLY the proposed changes. Keep everything else from the base resume exactly as it is.
- Never invent employers, dates, titles, degrees, skills, or metrics that are not in the base resume or the proposed changes.
- Output clean Markdown: "#" for the candidate's name on the first line, contact details on the next line, "##" for section headings, "**bold**" for role and company lines, "-" bullets for accomplishments.
- Output ONLY the resume Markdown. No preamble, no explanations, no code fences.
${role || company ? `\nTarget role: ${[role, company].filter(Boolean).join(" at ")}\n` : ""}
BASE RESUME:
${base}

PROPOSED CHANGES:
${changes}`;
}
