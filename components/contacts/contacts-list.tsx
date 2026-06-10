"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { ContactListItem } from "@/lib/contacts";

export function ContactsList({ contacts }: { contacts: ContactListItem[] }) {
  const pathname = usePathname();
  const activeId = pathname.match(/^\/dashboard\/contacts\/([^/]+)/)?.[1];

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="flex items-baseline gap-2 px-6 pt-14 pb-4 md:pt-8">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Contacts
        </h1>
        {contacts.length > 0 && (
          <span className="text-sm tabular-nums text-muted-foreground">
            {contacts.length}
          </span>
        )}
      </header>

      <ScrollArea className="min-h-0 flex-1">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserIcon className="size-5" />
            </div>
            <h2 className="font-heading text-base font-medium tracking-tight">
              No contacts yet
            </h2>
            <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
              Recruiters and hiring managers land here as the agent finds them —
              and as conversations sync from your inbox.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {contacts.map((c) => {
              const active = activeId === c.id;
              const meta = [c.role_title, c.companyName]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={c.id} className="border-t border-border first:border-t-0">
                  <Link
                    href={`/dashboard/contacts/${c.id}`}
                    className={cn(
                      "flex w-full items-center gap-3 px-6 py-3 text-left transition-colors",
                      active ? "bg-muted/60" : "hover:bg-muted/30",
                    )}
                  >
                    <Avatar>
                      <AvatarFallback>{c.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {c.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {meta || c.email || "—"}
                      </span>
                    </div>
                    {c.lastContactLabel && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {c.lastContactLabel}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
