"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCwIcon, CheckIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Status = "idle" | "syncing" | "done" | "error";

interface SyncResponse {
  ok: true;
  gmail:
    | { error: string }
    | {
        scanned: number;
        jobRelated: number;
        newConversations: number;
        updatedConversations: number;
        newContacts: number;
      };
  calendar:
    | { error: string }
    | {
        scanned: number;
        filtered: number;
        classified: number;
        jobRelated: number;
        newEvents: number;
        updatedEvents: number;
      };
}

export function SyncBanner() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SyncResponse | null>(null);
  const [error, setError] = useState("");

  async function handleSync() {
    setStatus("syncing");
    setError("");
    const res = await fetch("/api/sync", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setStatus("error");
      setError(data.error ?? "Sync failed");
      return;
    }
    const gmailErr = "error" in data.gmail ? data.gmail.error : null;
    const calErr = "error" in data.calendar ? data.calendar.error : null;
    if (gmailErr || calErr) {
      setStatus("error");
      const isAuth = /401|UNAUTHENTICATED|invalid_grant|expired/i.test(
        `${gmailErr ?? ""} ${calErr ?? ""}`,
      );
      setError(
        isAuth
          ? "Google connection expired. Sign out and back in."
          : "Sync failed",
      );
      return;
    }
    setResult(data);
    setStatus("done");
    router.refresh();
    window.setTimeout(() => setStatus("idle"), 4000);
  }

  const label =
    status === "syncing"
      ? "Syncing…"
      : status === "done" && result
        ? syncSummary(result)
        : status === "error"
          ? error || "Sync failed"
          : "Sync inbox & calendar";

  return (
    <div className="shrink-0 px-2 pt-1 pb-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={status === "syncing"}
        className={cn(
          "group/sync flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-[11px] transition-colors",
          status === "error"
            ? "text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
            : "text-muted-foreground/70 hover:bg-muted/60 hover:text-foreground",
          "disabled:cursor-wait",
        )}
      >
        {status === "syncing" ? (
          <RefreshCwIcon className="size-2.5 shrink-0 animate-spin" />
        ) : status === "done" ? (
          <CheckIcon className="size-2.5 shrink-0" />
        ) : (
          <RefreshCwIcon className="size-2.5 shrink-0 transition-transform duration-300 group-hover/sync:rotate-180" />
        )}
        <span className="truncate">{label}</span>
      </button>
    </div>
  );
}

function syncSummary(r: SyncResponse): string {
  let newConv = 0;
  let updatedConv = 0;
  let newEvents = 0;
  let updatedEvents = 0;

  if (!("error" in r.gmail)) {
    newConv = r.gmail.newConversations;
    updatedConv = r.gmail.updatedConversations;
  }
  if (!("error" in r.calendar)) {
    newEvents = r.calendar.newEvents;
    updatedEvents = r.calendar.updatedEvents;
  }

  const parts: string[] = [];
  if (newConv > 0) parts.push(`${newConv} message${newConv === 1 ? "" : "s"}`);
  if (newEvents > 0) parts.push(`${newEvents} event${newEvents === 1 ? "" : "s"}`);
  if (updatedConv > 0 || updatedEvents > 0) {
    parts.push(`${updatedConv + updatedEvents} updated`);
  }

  if (parts.length === 0) return "All caught up";
  return parts.join(" · ");
}
