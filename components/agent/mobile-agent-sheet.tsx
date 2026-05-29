"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AgentThread } from "@/components/agent/agent-thread";
import { MessageSquareIcon } from "@/lib/icons";

export function MobileAgentSheet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon-lg"
        className="fixed right-4 bottom-4 z-30 rounded-full shadow-lg"
        aria-label="Open agent"
      >
        <MessageSquareIcon />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-md p-0 sm:max-w-md"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Agent</SheetTitle>
          <SheetDescription className="sr-only">
            Chat with the agent about your job pipeline
          </SheetDescription>
          <AgentThread />
        </SheetContent>
      </Sheet>
    </>
  );
}
