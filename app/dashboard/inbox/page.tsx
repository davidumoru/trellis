import type { Metadata } from "next";
import { EnvelopeOpen as EnvelopeOpenIcon } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxIndex() {
  return (
    <div className="flex h-full items-center justify-center px-8">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <EnvelopeOpenIcon className="size-5" weight="fill" />
        </div>
        <h2 className="font-heading text-lg font-medium tracking-tight">
          Pick a thread
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a conversation from the list to read it here. Replies and
          actions live in the same pane.
        </p>
      </div>
    </div>
  );
}
