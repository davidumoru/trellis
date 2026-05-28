"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckIcon,
  CircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  FileSearchIcon,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { IntakeEvent, PlanStep } from "@/lib/agent/intake";

type PlanStepWithStatus = PlanStep & {
  status: "pending" | "running" | "done" | "error";
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
          <h1 className="text-center text-2xl font-semibold tracking-tight">
            What job are you applying for?
          </h1>

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

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{url}</p>
          <h1 className="text-lg font-semibold">
            {phase === "running"
              ? "Running intake…"
              : phase === "review"
                ? "Review & approve"
                : phase === "saving"
                  ? "Saving…"
                  : phase === "not_a_job"
                    ? "Not a job posting"
                    : "Something went wrong"}
          </h1>
        </header>

        <PlanList plan={plan} />

        {phase === "not_a_job" && notAJob && (
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <FileSearchIcon className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">{notAJob.reason}</p>
            <Button variant="outline" onClick={handleReset}>
              Try a different URL
            </Button>
          </div>
        )}

        {globalError && phase === "error" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {globalError}
          </div>
        )}

        {results.parse_jd ? (
          <JdSummary jd={results.parse_jd as ParsedJd} />
        ) : null}

        {results.tailor_resume ? (
          <ArtifactCard
            title="Resume tailoring"
            content={(results.tailor_resume as { content: string }).content}
          />
        ) : null}

        {results.draft_cover_letter ? (
          <ArtifactCard
            title="Cover letter draft"
            content={
              (results.draft_cover_letter as { content: string }).content
            }
          />
        ) : null}

        {phase === "review" && intakeData && (
          <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-2 border-t bg-background/80 px-6 py-3 backdrop-blur">
            <Button variant="ghost" onClick={handleReset}>
              Start over
            </Button>
            <Button onClick={handleApprove}>Approve & save</Button>
          </div>
        )}

        {phase === "saving" && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
            <Spinner /> Saving application…
          </div>
        )}

        {phase === "error" && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleReset}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function PlanList({ plan }: { plan: PlanStepWithStatus[] }) {
  if (plan.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        Planning…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <p className="px-1 text-xs font-medium text-muted-foreground">
        Agent plan
      </p>
      <ol className="flex flex-col">
        {plan.map((step) => (
          <li
            key={step.id}
            className="flex items-center gap-3 rounded-md px-1 py-1.5 text-sm"
          >
            <StepIcon status={step.status} />
            <span
              className={cn(
                step.status === "done" && "text-muted-foreground",
                step.status === "error" && "text-destructive",
              )}
            >
              {step.label}
            </span>
            {step.status === "error" && step.error && (
              <span className="ml-auto truncate text-xs text-destructive">
                {step.error}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepIcon({ status }: { status: PlanStepWithStatus["status"] }) {
  if (status === "done") {
    return <CheckIcon className="size-4 text-foreground" />;
  }
  if (status === "running") {
    return <Spinner className="size-4" />;
  }
  if (status === "error") {
    return <XCircleIcon className="size-4 text-destructive" />;
  }
  return <CircleIcon className="size-4 text-muted-foreground/60" />;
}

function JdSummary({ jd }: { jd: ParsedJd }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground">Job</p>
        <h3 className="text-base font-semibold">{jd.role}</h3>
        <p className="text-sm text-muted-foreground">
          {jd.company} · {jd.location}
          {jd.remote_policy ? ` · ${jd.remote_policy}` : ""}
          {jd.comp_band ? ` · ${jd.comp_band}` : ""}
        </p>
      </div>
      {jd.stack.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Stack</p>
          <div className="flex flex-wrap gap-1">
            {jd.stack.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {jd.requirements.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Requirements
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {jd.requirements.map((r, i) => (
              <li key={i} className="text-foreground">
                · {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ArtifactCard({ title, content }: { title: string; content: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <pre className="font-sans text-sm whitespace-pre-wrap text-foreground">
        {content}
      </pre>
    </div>
  );
}
