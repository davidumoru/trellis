"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TextShimmer } from "@/components/agent/text-shimmer";
import { MarkdownProse } from "@/components/markdown-prose";
import {
  CheckIcon,
  XCircleIcon,
  ArrowUpIcon,
  FileSearchIcon,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { IntakeEvent, PlanStep } from "@/lib/agent/intake";

type StepStatus = "pending" | "running" | "done" | "error";

type PlanStepWithStatus = PlanStep & {
  status: StepStatus;
  error?: string;
};

interface ParsedJd {
  company: string;
  role: string;
  comp_band?: string;
  stack: string[];
  requirements: string[];
  location: string;
  remote_policy?: string;
}

interface IntakeData {
  jdRaw: string;
  jdStructured: ParsedJd;
  resumeDiff: string;
  coverLetter: string;
}

type Phase = "input" | "running" | "review" | "saving" | "error" | "not_a_job";

export function IntakeScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");
  const [url, setUrl] = useState("");
  const [plan, setPlan] = useState<PlanStepWithStatus[]>([]);
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [intakeData, setIntakeData] = useState<IntakeData | null>(null);
  const [globalError, setGlobalError] = useState<string>("");
  const [notAJob, setNotAJob] = useState<{
    reason: string;
    detected: string;
  } | null>(null);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setPhase("running");
    setPlan([]);
    setResults({});
    setIntakeData(null);
    setGlobalError("");
    setNotAJob(null);

    const res = await fetch("/api/agent/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!res.ok || !res.body) {
      setPhase("error");
      setGlobalError(await res.text().catch(() => "Request failed"));
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          handleEvent(JSON.parse(trimmed) as IntakeEvent);
        } catch {
          /* ignore malformed */
        }
      }
    }
  }

  function handleEvent(event: IntakeEvent) {
    if (event.type === "plan") {
      setPlan(event.steps.map((s) => ({ ...s, status: "pending" })));
    } else if (event.type === "step:start") {
      setPlan((prev) =>
        prev.map((s) => (s.id === event.id ? { ...s, status: "running" } : s)),
      );
    } else if (event.type === "step:done") {
      setPlan((prev) =>
        prev.map((s) => (s.id === event.id ? { ...s, status: "done" } : s)),
      );
      setResults((prev) => ({ ...prev, [event.id]: event.result }));
    } else if (event.type === "step:error") {
      setPlan((prev) =>
        prev.map((s) =>
          s.id === event.id
            ? { ...s, status: "error", error: event.message }
            : s,
        ),
      );
      setPhase("error");
      setGlobalError(event.message);
    } else if (event.type === "error") {
      setPhase("error");
      setGlobalError(event.message);
    } else if (event.type === "not_a_job") {
      setNotAJob({ reason: event.reason, detected: event.detected });
      setPhase("not_a_job");
    } else if (event.type === "complete") {
      setIntakeData(event.data);
      setPhase("review");
    }
  }

  async function handleApprove() {
    if (!intakeData) return;
    setPhase("saving");
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(intakeData),
    });
    if (!res.ok) {
      setPhase("error");
      setGlobalError("Failed to save application");
      return;
    }
    const { id } = (await res.json()) as { id: string };
    router.push(`/dashboard/${id}`);
    router.refresh();
  }

  function handleReset() {
    setPhase("input");
    setUrl("");
    setPlan([]);
    setResults({});
    setIntakeData(null);
    setGlobalError("");
    setNotAJob(null);
  }

  if (phase === "input") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="flex w-full max-w-2xl flex-col gap-8">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-center font-heading text-2xl font-medium tracking-tight">
              What job are you applying for?
            </h1>
            <p className="text-center text-sm text-muted-foreground">
              Paste a posting URL. Trellis reads it, tailors your resume, and
              drafts the cover letter for your review.
            </p>
          </div>

          <form onSubmit={handleStart}>
            <div className="rounded-2xl border bg-card p-3 shadow-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
              <Textarea
                placeholder="Paste a job URL…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && url) {
                    e.preventDefault();
                    handleStart(e);
                  }
                }}
                required
                autoFocus
                rows={3}
                className="min-h-20 resize-none border-0 bg-transparent p-2 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              <div className="flex items-center justify-end pt-2">
                <Button
                  type="submit"
                  size="icon-sm"
                  disabled={!url}
                  className="rounded-full"
                  aria-label="Run intake"
                >
                  <ArrowUpIcon />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const jd = (results.parse_jd as ParsedJd | undefined) ?? null;
  const metaParts = jd
    ? [jd.company, jd.location, jd.remote_policy, jd.comp_band].filter(Boolean)
    : [];

  return (
    <div className="flex h-full min-w-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-2xl flex-col px-6 py-10">
          <header className="flex flex-col gap-1.5 pb-10">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Intake · {hostLabel(url)}
            </p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              {phase === "not_a_job" ? (
                "Not a job posting"
              ) : jd ? (
                jd.role
              ) : phase === "running" ? (
                <TextShimmer>Reading the posting</TextShimmer>
              ) : (
                "New application"
              )}
            </h1>
            {metaParts.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {metaParts.join(" · ")}
              </p>
            )}
          </header>

          <Timeline plan={plan} results={results} />

          {phase === "not_a_job" && notAJob && (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileSearchIcon className="size-5" />
              </div>
              <h2 className="font-heading text-base font-medium tracking-tight">
                This page isn&apos;t a job description
              </h2>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                {notAJob.reason}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="mt-2"
              >
                Try a different URL
              </Button>
            </div>
          )}

          {phase === "error" && globalError && (
            <div className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="min-w-0 text-sm text-destructive">{globalError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="shrink-0"
              >
                Try again
              </Button>
            </div>
          )}

          {(phase === "review" || phase === "saving") && intakeData && (
            <div className="sticky bottom-6 mt-12 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/80 px-4 py-3 shadow-lg backdrop-blur">
              {phase === "saving" ? (
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-3.5" />
                  Saving application…
                </span>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Save this application to your pipeline?
                </p>
              )}
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleReset}
                  disabled={phase === "saving"}
                >
                  Start over
                </Button>
                <Button onClick={handleApprove} disabled={phase === "saving"}>
                  Approve &amp; save
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function Timeline({
  plan,
  results,
}: {
  plan: PlanStepWithStatus[];
  results: Record<string, unknown>;
}) {
  if (plan.length === 0) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="flex w-5 justify-center">
          <Spinner className="size-3.5" />
        </span>
        <TextShimmer>Planning the run</TextShimmer>
      </div>
    );
  }

  return (
    <ol className="flex flex-col">
      {plan.map((step, i) => {
        const last = i === plan.length - 1;
        const artifact = stepArtifact(step.id, results);
        return (
          <li key={step.id} className="flex gap-3.5">
            <div className="flex w-5 shrink-0 flex-col items-center">
              <span className="flex h-6 items-center">
                <StepGlyph status={step.status} />
              </span>
              {!last && <span className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col",
                last ? "pb-0" : "pb-8",
              )}
            >
              <span
                className={cn(
                  "flex h-6 items-center text-sm",
                  step.status === "pending" && "text-muted-foreground/50",
                  step.status === "done" && "text-muted-foreground",
                  step.status === "error" && "text-destructive",
                )}
              >
                {step.status === "running" ? (
                  <TextShimmer>{step.label}</TextShimmer>
                ) : (
                  step.label
                )}
              </span>
              {step.status === "error" && step.error && (
                <p className="mt-1 text-xs text-destructive/80">{step.error}</p>
              )}
              {artifact && (
                <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
                  {artifact}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function stepArtifact(
  stepId: string,
  results: Record<string, unknown>,
): React.ReactNode {
  if (stepId === "parse_jd" && results.parse_jd) {
    return <JdDetails jd={results.parse_jd as ParsedJd} />;
  }
  if (stepId === "tailor_resume" && results.tailor_resume) {
    return (
      <Artifact
        title="Proposed resume changes"
        content={(results.tailor_resume as { content: string }).content}
      />
    );
  }
  if (stepId === "draft_cover_letter" && results.draft_cover_letter) {
    return (
      <Artifact
        title="Cover letter draft"
        content={(results.draft_cover_letter as { content: string }).content}
      />
    );
  }
  return null;
}

function JdDetails({ jd }: { jd: ParsedJd }) {
  if (jd.stack.length === 0 && jd.requirements.length === 0) return null;
  return (
    <div className="flex flex-col gap-6">
      {jd.stack.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Stack
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {jd.stack.map((s) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
          </div>
        </section>
      )}
      {jd.requirements.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Requirements
          </h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {jd.requirements.map((r, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                <span className="text-foreground/90">{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Artifact({ title, content }: { title: string; content: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {title}
      </h3>
      <MarkdownProse content={content} />
    </section>
  );
}

function StepGlyph({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <span className="flex size-4 items-center justify-center rounded-full bg-foreground">
        <CheckIcon className="size-2.5 text-background" weight="bold" />
      </span>
    );
  }
  if (status === "running") {
    return <Spinner className="size-3.5 text-foreground" />;
  }
  if (status === "error") {
    return <XCircleIcon className="size-4 text-destructive" />;
  }
  return <span className="size-1.25 rounded-full bg-muted-foreground/40" />;
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.length > 48 ? `${url.slice(0, 48)}…` : url;
  }
}
