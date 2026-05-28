"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ArrowUpIcon, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation, MemoryEvent } from "@/lib/agent/memory";

type Turn = {
  id: string;
  query: string;
  status: "thinking" | "searching" | "answering" | "done" | "empty" | "error";
  citations: Citation[];
  answer: string;
  error?: string;
};

export function AgentThread() {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = input.trim();
    if (!query || busy) return;

    const turnId = crypto.randomUUID();
    setTurns((prev) => [
      ...prev,
      {
        id: turnId,
        query,
        status: "thinking",
        citations: [],
        answer: "",
      },
    ]);
    setInput("");
    setBusy(true);

    const res = await fetch("/api/agent/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok || !res.body) {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? { ...t, status: "error", error: "Request failed" }
            : t,
        ),
      );
      setBusy(false);
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
          const event = JSON.parse(trimmed) as MemoryEvent;
          setTurns((prev) =>
            prev.map((t) => (t.id === turnId ? applyEvent(t, event) : t)),
          );
        } catch {
          /* ignore */
        }
      }
    }

    setBusy(false);
  }

  return (
    <div className="flex h-full flex-col border-l">
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <SparklesIcon className="size-3.5 text-muted-foreground" />
        <h2 className="text-sm font-medium">Agent</h2>
      </div>

      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="flex flex-col gap-6 px-3 py-4">
          {turns.length === 0 ? (
            <EmptyAgent />
          ) : (
            turns.map((turn) => <TurnView key={turn.id} turn={turn} />)
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask anything about your pipeline…"
            className="min-h-9 resize-none"
            rows={1}
            disabled={busy}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || busy}
            className="rounded-full"
          >
            {busy ? <Spinner /> : <ArrowUpIcon />}
          </Button>
        </div>
      </form>
    </div>
  );
}

function applyEvent(turn: Turn, event: MemoryEvent): Turn {
  switch (event.type) {
    case "plan":
      return { ...turn, status: "thinking" };
    case "hyde":
      return { ...turn, status: "searching" };
    case "search:done":
      return {
        ...turn,
        status: "answering",
        citations: event.citations,
      };
    case "answer:chunk":
      return { ...turn, answer: turn.answer + event.text };
    case "answer:done":
      return { ...turn, status: "done" };
    case "no_results":
      return { ...turn, status: "empty" };
    case "error":
      return { ...turn, status: "error", error: event.message };
    default:
      return turn;
  }
}

function EmptyAgent() {
  return (
    <div className="flex flex-col gap-3 px-1 py-6">
      <p className="text-sm font-medium">Ask about your pipeline</p>
      <p className="text-xs text-muted-foreground">
        The agent searches across applications, conversations, and documents.
      </p>
      <div className="mt-2 flex flex-col gap-1.5 text-xs">
        <ExamplePrompt prompt="Have I talked to anyone at Linear?" />
        <ExamplePrompt prompt="What companies in my pipeline focus on AI?" />
        <ExamplePrompt prompt="Which applications mention React?" />
      </div>
    </div>
  );
}

function ExamplePrompt({ prompt }: { prompt: string }) {
  return (
    <span className="text-muted-foreground italic">&ldquo;{prompt}&rdquo;</span>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-medium leading-snug">{turn.query}</div>

      {turn.status === "thinking" && <Status label="Thinking…" />}
      {turn.status === "searching" && <Status label="Searching pipeline…" />}

      {turn.citations.length > 0 && (
        <CitationList citations={turn.citations} answer={turn.answer} />
      )}

      {(turn.status === "answering" ||
        turn.status === "done" ||
        turn.answer) && (
        <AnswerText text={turn.answer} citations={turn.citations} />
      )}

      {turn.status === "empty" && (
        <p className="text-xs text-muted-foreground">
          I don&apos;t have anything relevant on file for that.
        </p>
      )}

      {turn.status === "error" && (
        <p className="text-xs text-destructive">{turn.error}</p>
      )}
    </div>
  );
}

function Status({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Spinner className="size-3" />
      {label}
    </div>
  );
}

function CitationList({
  citations,
  answer,
}: {
  citations: Citation[];
  answer: string;
}) {
  // Only show citations that are actually referenced in the answer (or all if no answer yet)
  const referenced = citations.filter((_, i) => {
    if (!answer) return true;
    return answer.includes(`[${i + 1}]`);
  });

  if (referenced.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        Sources
      </p>
      <div className="flex flex-col gap-0.5">
        {referenced.map((c) => {
          const num = citations.indexOf(c) + 1;
          const href = c.application_id
            ? `/dashboard/${c.application_id}`
            : null;
          const content = (
            <>
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/60">
                [{num}]
              </span>
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
              {c.subtitle && (
                <span className="truncate text-xs text-muted-foreground">
                  {c.subtitle}
                </span>
              )}
            </>
          );
          return href ? (
            <Link
              key={c.id}
              href={href}
              className={cn(
                "flex items-baseline gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted/60",
              )}
            >
              {content}
            </Link>
          ) : (
            <div
              key={c.id}
              className="flex items-baseline gap-2 px-2 py-1 text-xs"
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnswerText({
  text,
  citations,
}: {
  text: string;
  citations: Citation[];
}) {
  if (!text) return null;
  // Render citations as small superscript-style chips
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="text-sm leading-relaxed text-foreground/90">
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (!match) return <span key={i}>{part}</span>;
        const num = parseInt(match[1], 10);
        const cite = citations[num - 1];
        const href = cite?.application_id
          ? `/dashboard/${cite.application_id}`
          : null;
        const chip = (
          <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-sm bg-muted px-1 align-text-top text-[10px] font-medium tabular-nums">
            {num}
          </span>
        );
        return href ? (
          <Link
            key={i}
            href={href}
            className="transition-colors hover:[&>span]:bg-foreground hover:[&>span]:text-background"
          >
            {chip}
          </Link>
        ) : (
          <span key={i}>{chip}</span>
        );
      })}
    </p>
  );
}
