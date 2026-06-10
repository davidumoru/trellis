import type { Metadata } from "next";
import { User as UserIcon } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Contacts" };

export default function ContactsIndex() {
  return (
    <div className="flex h-full items-center justify-center px-8">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserIcon className="size-5" weight="fill" />
        </div>
        <h2 className="font-heading text-lg font-medium tracking-tight">
          Pick a contact
        </h2>
        <p className="text-sm text-muted-foreground">
          Select someone from the list to see their details, linked
          applications, and your conversation history.
        </p>
      </div>
    </div>
  );
}
