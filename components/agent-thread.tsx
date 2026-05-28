"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizonalIcon } from "lucide-react";

export function AgentThread() {
  const [input, setInput] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setInput("");
  }

  return (
    <div className="flex h-full flex-col border-l">
      <div className="px-3 py-2">
        <h2 className="text-sm font-semibold">Agent</h2>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="flex h-full items-center justify-center py-16">
          <p className="max-w-[200px] text-center text-sm text-muted-foreground">
            Paste a job URL to start, or ask a question about your pipeline.
          </p>
        </div>
      </ScrollArea>

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
            placeholder="Paste a job URL or ask a question..."
            className="min-h-9 resize-none"
            rows={1}
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <SendHorizonalIcon />
          </Button>
        </div>
      </form>
    </div>
  );
}
