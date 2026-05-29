"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowUp as ArrowUpIcon,
  Sparkle as SparklesIcon,
  Stop as StopIcon,
  Copy as CopyIcon,
  ArrowsClockwise as RegenerateIcon,
  NotePencil as NewChatIcon,
  Check as CheckIcon,
  Chat as ChatBubbleIcon,
  Buildings as BuildingsIcon,
  MagnifyingGlass as MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Thread, ThreadContent } from "@/components/agent/thread";
import {
  Message,
  MessageBody,
  MessageMarkdown,
  MessageActions,
} from "@/components/agent/message";
import { ChainOfThought } from "@/components/agent/chain-of-thought";
import { CitationSourceList } from "@/components/agent/citation";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputActionGroup,
} from "@/components/agent/prompt-input";
import type { Citation, MemoryEvent } from "@/lib/agent/memory";

type TurnStatus =
  | "classifying"
  | "thinking"
  | "searching"
  | "answering"
  | "done"
  | "empty"
  | "error";

type Turn = {
  id: string;
  query: string;
  status: TurnStatus;
  citations: Citation[];
  answer: string;
  trail: string[];
  error?: string;
  chainStartedAt: number;
  chainEndedAt?: number;
};

export function AgentThread() {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function onAskFromCommand(e: Event) {
      const detail = (e as CustomEvent<{ query: string }>).detail;
      if (detail?.query) submit(detail.query);
    }
    window.addEventListener("trellis:ask-agent", onAskFromCommand);
    return () =>
      window.removeEventListener("trellis:ask-agent", onAskFromCommand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  async function submit(query: string, regenerateTurnId?: string) {
    if (!query.trim() || busy) return;
    const turnId = regenerateTurnId ?? crypto.randomUUID();

    if (regenerateTurnId) {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === regenerateTurnId
            ? {
                ...t,
                status: "classifying",
                citations: [],
                answer: "",
                trail: [],
                error: undefined,
                chainStartedAt: Date.now(),
                chainEndedAt: undefined,
              }
            : t,
        ),
      );
    } else {
      setTurns((prev) => [
        ...prev,
        {
          id: turnId,
          query,
          status: "classifying",
          citations: [],
          answer: "",
          trail: [],
          chainStartedAt: Date.now(),
        },
      ]);
      setInput("");
    }
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/agent/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === turnId
              ? { ...t, status: "error", error: "Request failed" }
              : t,
          ),
        );
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
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === turnId && t.status !== "done"
              ? { ...t, status: "done" }
              : t,
          ),
        );
      } else {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === turnId
              ? { ...t, status: "error", error: (e as Error).message }
              : t,
          ),
        );
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function newChat() {
    abortRef.current?.abort();
    setTurns([]);
    setInput("");
  }

  return (
    <div className="flex h-full flex-col border-l">
      <TooltipProvider delayDuration={200}>
        <header className="flex items-center justify-between gap-2 border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-3.5 text-muted-foreground" />
            <h2 className="text-sm font-medium">Agent</h2>
          </div>
          {turns.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={newChat}
                  aria-label="New chat"
                >
                  <NewChatIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">New chat</TooltipContent>
            </Tooltip>
          )}
        </header>

        <Thread latestId={turns[turns.length - 1]?.id}>
          <ThreadContent>
            {turns.map((turn) => (
              <TurnView
                key={turn.id}
                turn={turn}
                onRegenerate={() => submit(turn.query, turn.id)}
              />
            ))}
          </ThreadContent>
        </Thread>

        {turns.length === 0 && (
          <SuggestionList onSelect={(p) => setInput(p)} />
        )}

        <div className="p-4">
          <PromptInput
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <PromptInputTextarea
              value={input}
              onValueChange={setInput}
              onSubmit={() => !busy && submit(input)}
              placeholder="Ask about your pipeline…"
            />
            <PromptInputActions>
              <PromptInputActionGroup />
              <PromptInputActionGroup>
                {busy ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="secondary"
                        onClick={stop}
                        className="rounded-full"
                        aria-label="Stop"
                      >
                        <StopIcon weight="fill" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Stop</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="submit"
                        size="icon-sm"
                        disabled={!input.trim()}
                        className="rounded-full"
                        aria-label="Send"
                      >
                        <ArrowUpIcon weight="bold" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Send <span className="opacity-60">↵</span>
                    </TooltipContent>
                  </Tooltip>
                )}
              </PromptInputActionGroup>
            </PromptInputActions>
          </PromptInput>
        </div>
      </TooltipProvider>
    </div>
  );
}

function applyEvent(turn: Turn, event: MemoryEvent): Turn {
  switch (event.type) {
    case "plan":
      return { ...turn, status: "thinking" };
    case "hyde":
      return { ...turn, status: "searching" };
    case "thought":
      return { ...turn, trail: [...turn.trail, event.text] };
    case "search:done":
      return { ...turn, status: "answering", citations: event.citations };
    case "answer:chunk":
      return {
        ...turn,
        status: turn.status === "done" ? "done" : "answering",
        answer: turn.answer + event.text,
      };
    case "answer:done":
      return { ...turn, status: "done", chainEndedAt: Date.now() };
    case "no_results":
      return { ...turn, status: "empty", chainEndedAt: Date.now() };
    case "error":
      return { ...turn, status: "error", error: event.message };
    default:
      return turn;
  }
}

const SUGGESTIONS: {
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { prompt: "Have I talked to anyone at Linear?", icon: ChatBubbleIcon },
  {
    prompt: "What companies in my pipeline focus on AI?",
    icon: BuildingsIcon,
  },
  {
    prompt: "Which applications mention React?",
    icon: MagnifyingGlassIcon,
  },
];

function SuggestionList({ onSelect }: { onSelect: (s: string) => void }) {
  return (
    <div className="flex shrink-0 flex-col gap-1 px-4 pb-2">
      {SUGGESTIONS.map(({ prompt, icon: Icon }) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{prompt}</span>
        </button>
      ))}
    </div>
  );
}

function TurnView({
  turn,
  onRegenerate,
}: {
  turn: Turn;
  onRegenerate: () => void;
}) {
  const hadRetrieval = turn.citations.length > 0 || isRetrievalStatus(turn.status);
  const showChain = hadRetrieval && (turn.trail.length > 0 || isActiveStatus(turn.status));
  const isChainComplete =
    turn.status === "done" || turn.status === "empty" || turn.status === "error";
  const thoughtSeconds =
    turn.chainEndedAt && turn.chainStartedAt
      ? Math.max(1, Math.round((turn.chainEndedAt - turn.chainStartedAt) / 1000))
      : undefined;
  const referenced = extractReferencedCitations(turn.answer, turn.citations);
  const isSettled = turn.status === "done" || turn.status === "empty";

  return (
    <div data-turn-id={turn.id} className="flex scroll-mt-4 flex-col gap-4">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-muted px-3.5 py-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap wrap-break-word">
          {turn.query}
        </div>
      </div>

      <Message role="assistant" className="ml-3 mr-6">
        <MessageBody className="flex flex-col gap-3">
          {showChain && (
            <ChainOfThought
              trail={turn.trail}
              isComplete={isChainComplete}
              thoughtSeconds={thoughtSeconds}
            />
          )}

          {turn.answer && (
            <MessageMarkdown text={turn.answer} citations={turn.citations} />
          )}

          {turn.status === "empty" && (
            <p className="text-sm text-muted-foreground">
              I don&apos;t have anything relevant on file for that.
            </p>
          )}

          {turn.status === "error" && (
            <p className="text-sm text-destructive">{turn.error}</p>
          )}

          {turn.status === "done" && referenced.length > 0 && (
            <CitationSourceList
              citations={turn.citations}
              referenced={referenced}
            />
          )}
        </MessageBody>

        {isSettled && turn.answer && (
          <MessageActions>
            <CopyButton text={turn.answer} />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onRegenerate}
                  aria-label="Regenerate"
                  className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  <RegenerateIcon className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Regenerate</TooltipContent>
            </Tooltip>
          </MessageActions>
        )}
      </Message>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy answer"
          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          {copied ? (
            <CheckIcon className="size-3.5 text-foreground" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {copied ? "Copied" : "Copy"}
      </TooltipContent>
    </Tooltip>
  );
}

function isRetrievalStatus(status: TurnStatus): boolean {
  return (
    status === "thinking" ||
    status === "searching" ||
    status === "answering"
  );
}

function isActiveStatus(status: TurnStatus): boolean {
  return (
    status === "classifying" ||
    status === "thinking" ||
    status === "searching" ||
    status === "answering"
  );
}

function extractReferencedCitations(
  answer: string,
  citations: Citation[],
): number[] {
  if (!answer || citations.length === 0) return [];
  const referenced = new Set<number>();
  const re = /\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= citations.length) referenced.add(n);
  }
  return Array.from(referenced).sort((a, b) => a - b);
}
