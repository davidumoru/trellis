"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { SparklesIcon } from "@/lib/icons";

export function GenerateResumeButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/documents/${documentId}/finalize`, {
      method: "POST",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Something went wrong");
      setLoading(false);
      return;
    }
    const { id } = (await res.json()) as { id: string };
    router.push(`/dashboard/documents/${id}`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Spinner className="size-3.5" />
            Applying changes…
          </>
        ) : (
          <>
            <SparklesIcon className="size-3.5" />
            Generate final resume
          </>
        )}
      </button>
    </div>
  );
}
