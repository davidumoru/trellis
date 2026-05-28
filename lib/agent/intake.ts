import { generateObject, generateText } from "ai";
import { z } from "zod";
import { agentModel } from "@/lib/ai";
import { getCollections } from "@/lib/db";

export type IntakeEvent =
  | { type: "plan"; steps: PlanStep[] }
  | { type: "step:start"; id: string }
  | { type: "step:done"; id: string; result: unknown }
  | { type: "step:error"; id: string; message: string }
  | { type: "not_a_job"; reason: string; detected: string }
  | { type: "complete"; data: IntakeResult }
  | { type: "error"; message: string };

export interface PlanStep {
  id: string;
  label: string;
}

export interface IntakeResult {
  jdRaw: string;
  jdStructured: z.infer<typeof jdSchema>;
  resumeDiff: string;
  coverLetter: string;
}

const PLAN_STEPS: PlanStep[] = [
  { id: "fetch_jd", label: "Fetching page content" },
  { id: "validate_jd", label: "Verifying this is a job description" },
  { id: "parse_jd", label: "Extracting job details" },
  { id: "tailor_resume", label: "Proposing resume tailoring" },
  { id: "draft_cover_letter", label: "Drafting cover letter" },
];

const validationSchema = z.object({
  is_job_description: z
    .boolean()
    .describe("True if this content is a job posting / job description"),
  confidence: z.number().min(0).max(1).describe("Confidence between 0 and 1"),
  reason: z
    .string()
    .describe(
      "Short reason — if not a JD, describe what the content actually is (e.g. 'blog post', 'landing page', 'login wall')",
    ),
});

const jdSchema = z.object({
  company: z.string().describe("Company name"),
  role: z.string().describe("Job title / role"),
  comp_band: z
    .string()
    .optional()
    .describe("Compensation range if mentioned, otherwise omit"),
  stack: z.array(z.string()).describe("Technologies, languages, tools"),
  requirements: z
    .array(z.string())
    .describe("Key requirements and qualifications, max 8"),
  location: z.string().describe("Location, or 'Remote' if fully remote"),
  remote_policy: z
    .string()
    .optional()
    .describe("Remote / hybrid / on-site policy detail"),
});

type Emit = (event: IntakeEvent) => void;

export async function runIntake({
  url,
  userId,
  emit,
}: {
  url: string;
  userId: string;
  emit: Emit;
}) {
  emit({ type: "plan", steps: PLAN_STEPS });

  // Step 1: Fetch JD
  emit({ type: "step:start", id: "fetch_jd" });
  let jdText: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const html = await res.text();
    jdText = stripHtml(html);
    if (jdText.length < 100) {
      throw new Error("Job description appears to be empty or blocked");
    }
  } catch (e) {
    emit({
      type: "step:error",
      id: "fetch_jd",
      message: (e as Error).message,
    });
    return;
  }
  emit({
    type: "step:done",
    id: "fetch_jd",
    result: { preview: jdText.slice(0, 300), length: jdText.length },
  });

  // Step 2: Validate
  emit({ type: "step:start", id: "validate_jd" });
  try {
    const { object: validation } = await generateObject({
      model: agentModel,
      schema: validationSchema,
      prompt: `Determine if the following page content is a job description / job posting.

A job description typically has: a role title, a company, responsibilities or requirements, often a location and "apply" call to action. A blog post, news article, landing page, login wall, error page, or generic company page is NOT a job description.

PAGE CONTENT (first 4000 chars):
${jdText.slice(0, 4000)}`,
    });

    emit({ type: "step:done", id: "validate_jd", result: validation });

    if (!validation.is_job_description || validation.confidence < 0.6) {
      emit({
        type: "not_a_job",
        reason: "This URL doesn't point to a job posting.",
        detected: validation.reason,
      });
      return;
    }
  } catch (e) {
    emit({
      type: "step:error",
      id: "validate_jd",
      message: (e as Error).message,
    });
    return;
  }

  // Step 3: Parse JD
  emit({ type: "step:start", id: "parse_jd" });
  let jdStructured: z.infer<typeof jdSchema>;
  try {
    const { object } = await generateObject({
      model: agentModel,
      schema: jdSchema,
      prompt: `Extract structured job details from this job description. If a field is not mentioned, use a reasonable default or omit optional fields.

JOB DESCRIPTION:
${jdText.slice(0, 8000)}`,
    });
    jdStructured = object;
  } catch (e) {
    emit({
      type: "step:error",
      id: "parse_jd",
      message: (e as Error).message,
    });
    return;
  }
  emit({ type: "step:done", id: "parse_jd", result: jdStructured });

  // Load base resume
  const { artifacts } = await getCollections();
  const baseResume = await artifacts.findOne({
    user_id: userId,
    "meta.kind": "base_resume",
  });
  if (!baseResume) {
    emit({
      type: "error",
      message: "No base resume found. Complete onboarding first.",
    });
    return;
  }
  const targetRole = (baseResume.meta?.target_role as string) ?? "";

  // Step 3: Tailor resume
  emit({ type: "step:start", id: "tailor_resume" });
  let resumeDiff: string;
  try {
    const { text } = await generateText({
      model: agentModel,
      prompt: buildResumePrompt({
        jdStructured,
        baseResume: baseResume.content_md,
        targetRole,
      }),
    });
    resumeDiff = text;
  } catch (e) {
    emit({
      type: "step:error",
      id: "tailor_resume",
      message: (e as Error).message,
    });
    return;
  }
  emit({
    type: "step:done",
    id: "tailor_resume",
    result: { content: resumeDiff },
  });

  // Step 4: Cover letter
  emit({ type: "step:start", id: "draft_cover_letter" });
  let coverLetter: string;
  try {
    const { text } = await generateText({
      model: agentModel,
      prompt: buildCoverLetterPrompt({
        jdStructured,
        baseResume: baseResume.content_md,
      }),
    });
    coverLetter = text;
  } catch (e) {
    emit({
      type: "step:error",
      id: "draft_cover_letter",
      message: (e as Error).message,
    });
    return;
  }
  emit({
    type: "step:done",
    id: "draft_cover_letter",
    result: { content: coverLetter },
  });

  emit({
    type: "complete",
    data: { jdRaw: jdText, jdStructured, resumeDiff, coverLetter },
  });
}

function buildResumePrompt({
  jdStructured,
  baseResume,
  targetRole,
}: {
  jdStructured: z.infer<typeof jdSchema>;
  baseResume: string;
  targetRole: string;
}): string {
  return `You are a careful resume editor. Your job is to propose SPECIFIC, CONSERVATIVE changes to tailor a base resume for a specific role.

TARGET ROLE (general goal): ${targetRole}

THIS JOB:
- Company: ${jdStructured.company}
- Role: ${jdStructured.role}
- Stack: ${jdStructured.stack.join(", ")}
- Requirements:
${jdStructured.requirements.map((r) => `  - ${r}`).join("\n")}

BASE RESUME:
${baseResume}

INSTRUCTIONS:
- Output a markdown document with a numbered list of proposed changes
- Each change should have: WHAT (the specific edit), WHERE (which section / which bullet), WHY (which JD requirement or keyword it addresses)
- Be conservative — do not fabricate experience, technologies, or metrics
- Focus on: emphasis, reordering, keyword alignment, surfacing relevant work, tightening language
- Suggest 4-7 changes, no more
- If the resume is already well-matched, say so and only suggest minor edits

Output format:

## Proposed changes

1. **WHAT**: ...
   - **WHERE**: ...
   - **WHY**: ...

2. ...`;
}

function buildCoverLetterPrompt({
  jdStructured,
  baseResume,
}: {
  jdStructured: z.infer<typeof jdSchema>;
  baseResume: string;
}): string {
  return `Draft a cover letter for this role. Be specific, avoid clichés, and reference real things from the resume.

Company: ${jdStructured.company}
Role: ${jdStructured.role}
Requirements:
${jdStructured.requirements.map((r) => `  - ${r}`).join("\n")}

Resume:
${baseResume}

Constraints:
- Under 250 words
- No "I am writing to apply for..." or other template openers
- Open with a specific hook tied to the company or role
- One paragraph on why you're a fit, citing specific resume experience
- One paragraph on what excites you about this specific role/company
- Close in one sentence

Output only the letter body. No subject line, no salutation header, no "Sincerely" — just the prose paragraphs.`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
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
