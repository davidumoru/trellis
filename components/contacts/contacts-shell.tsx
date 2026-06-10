"use client";

import { usePathname } from "next/navigation";
import { ContactsList } from "@/components/contacts/contacts-list";
import { cn } from "@/lib/utils";
import type { ContactListItem } from "@/lib/contacts";

export function ContactsShell({
  contacts,
  children,
}: {
  contacts: ContactListItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const onDetail = /^\/dashboard\/contacts\/[^/]+/.test(pathname);

  return (
    <div className="flex h-full min-w-0">
      <aside
        className={cn(
          "h-full w-full shrink-0 border-r border-border md:w-90",
          onDetail ? "hidden md:flex md:flex-col" : "flex flex-col",
        )}
      >
        <ContactsList contacts={contacts} />
      </aside>

      <section
        className={cn(
          "h-full min-w-0 flex-1",
          onDetail ? "block" : "hidden md:block",
        )}
      >
        {children}
      </section>
    </div>
  );
}
