"use client";

import { useState } from "react";
import { CircleIcon } from "@/lib/icons";
import { GoogleConnectModal } from "@/components/google/google-connect-modal";

export function GoogleConnectBanner() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="shrink-0 px-2 pt-1 pb-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <CircleIcon className="size-2.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
          <span className="flex-1 truncate">Connect Google</span>
        </button>
      </div>
      <GoogleConnectModal open={open} onOpenChange={setOpen} />
    </>
  );
}
