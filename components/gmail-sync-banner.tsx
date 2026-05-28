"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCwIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "idle" | "syncing" | "done" | "error";

interface SyncResult {
  scanned: number;
  jobRelated: number;
  newConversations: number;
  updatedConversations: number;
  newContacts: number;
}

export function GmailSyncBanner() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string>("");

  async function handleSync() {
    setStatus("syncing");
    setError("");
    const res = await fetch("/api/sync/gmail", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setStatus("error");
      setError(data.error ?? "Sync failed");
      return;
    }
    setResult(data);
    setStatus("done");
    router.refresh();
    window.setTimeout(() => setStatus("idle"), 4000);
  }

  return (
    <div className="shrink-0 px-2 pt-1 pb-1">
      <button
        type="button"
        onClick={handleSync}
        disabled={status === "syncing"}
        className={cn(
          "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
          "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          "disabled:cursor-wait disabled:hover:bg-transparent",
        )}
      >
        {status === "syncing" ? (
          <RefreshCwIcon className="size-3 shrink-0 animate-spin text-muted-foreground" />
        ) : status === "done" ? (
          <CheckIcon className="size-3 shrink-0 text-foreground" />
        ) : (
          <RefreshCwIcon className="size-3 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
        )}
        <span className="flex-1 truncate">
          {status === "syncing"
            ? "Syncing inbox…"
            : status === "done" && result
              ? syncSummary(result)
              : status === "error"
                ? error || "Sync failed"
                : "Sync inbox"}
        </span>
      </button>
    </div>
  );
}

function syncSummary(r: SyncResult): string {
  const newCount = r.newConversations;
  const updatedCount = r.updatedConversations;
  if (newCount === 0 && updatedCount === 0) return "All caught up";
  if (newCount > 0 && updatedCount === 0) {
    return `${newCount} new conversation${newCount === 1 ? "" : "s"}`;
  }
  if (newCount === 0 && updatedCount > 0) {
    return `${updatedCount} updated`;
  }
  return `${newCount} new · ${updatedCount} updated`;
}
