import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import {
  Envelope as MailIcon,
  LinkedinLogo as LinkedinIcon,
  Buildings as BuildingsIcon,
  Clock as ClockIcon,
  Chat as ChatIcon,
  ArrowUpRight as ArrowUpRightIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { auth } from "@/lib/auth";
import { fetchContact } from "@/lib/contacts";

const STATUS_LABELS: Record<string, string> = {
  bookmarked: "Bookmarked",
  applying: "Applying",
  applied: "Applied",
  interviewing: "Interviewing",
  offered: "Offered",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ contactId: string }>;
}): Promise<Metadata> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { title: "Contacts" };
  const { contactId } = await params;
  const contact = await fetchContact(session.user.id, contactId);
  return { title: contact?.name || "Contacts" };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { contactId } = await params;
  const contact = await fetchContact(session.user.id, contactId);
  if (!contact) notFound();

  const subtitle = [contact.role_title, contact.companyName]
    .filter(Boolean)
    .join(" · ");

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-8">
        <header className="flex items-center gap-4">
          <Avatar className="size-12 text-base">
            <AvatarFallback>{contact.initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="truncate font-heading text-2xl font-medium tracking-tight">
              {contact.name}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {subtitle || `Added ${contact.addedLabel}`}
            </p>
          </div>
        </header>

        <section className="flex flex-col gap-3">
          {contact.email && (
            <Row icon={MailIcon}>
              <a
                href={`mailto:${contact.email}`}
                className="text-foreground underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground"
              >
                {contact.email}
              </a>
            </Row>
          )}
          {contact.linkedin_url && (
            <Row icon={LinkedinIcon}>
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-foreground underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground"
              >
                LinkedIn profile
                <ArrowUpRightIcon className="size-3" weight="bold" />
              </a>
            </Row>
          )}
          {contact.companyName && (
            <Row icon={BuildingsIcon}>
              {contact.companyId ? (
                <Link
                  href={`/dashboard/companies/${contact.companyId}`}
                  className="text-foreground underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground"
                >
                  {contact.companyName}
                </Link>
              ) : (
                <span className="text-foreground">{contact.companyName}</span>
              )}
            </Row>
          )}
          {contact.lastContactLabel && (
            <Row icon={ClockIcon}>
              <span className="text-muted-foreground">
                Last contact {contact.lastContactLabel}
              </span>
            </Row>
          )}
        </section>

        {contact.applications.length > 0 && (
          <Section title={`Applications · ${contact.applications.length}`}>
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {contact.applications.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/dashboard/${a.id}`}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {a.role_title}
                      </span>
                      {a.company && (
                        <span className="truncate text-xs text-muted-foreground">
                          {a.company}
                        </span>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {STATUS_LABELS[a.status] ?? a.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title={`Conversations · ${contact.conversations.length}`}>
          {contact.conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No conversations on file. Emails with this contact will show up
              here once your inbox syncs.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {contact.conversations.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/inbox/${c.id}`}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <ChatIcon className="size-3.5" weight="fill" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {c.subject}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {c.messageCount} message
                        {c.messageCount === 1 ? "" : "s"} · last{" "}
                        {c.lastFrom === "me" ? "from you" : "from them"}{" "}
                        {c.lastLabel}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {contact.notes && (
          <Section title="Notes">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {contact.notes}
            </p>
          </Section>
        )}
      </div>
    </ScrollArea>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string; weight?: "fill" | "bold" }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="size-4 shrink-0 text-muted-foreground" weight="fill" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
