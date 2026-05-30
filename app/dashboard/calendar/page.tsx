import type { Metadata } from "next";
import { CalendarBlank as CalendarIcon } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarIndex() {
  return (
    <div className="flex h-full items-center justify-center px-8">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CalendarIcon className="size-5" weight="fill" />
        </div>
        <h2 className="font-heading text-lg font-medium tracking-tight">
          Pick an event
        </h2>
        <p className="text-sm text-muted-foreground">
          Select an event from the list to see attendees, the meeting link,
          and the linked application.
        </p>
      </div>
    </div>
  );
}
