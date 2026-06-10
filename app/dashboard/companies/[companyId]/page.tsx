import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowUpRight as ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MarkdownProse } from "@/components/markdown-prose";
import { auth } from "@/lib/auth";
import { fetchCompany } from "@/lib/companies";

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
  params: Promise<{ companyId: string }>;
}): Promise<Metadata> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { title: "Companies" };
  const { companyId } = await params;
  const company = await fetchCompany(session.user.id, companyId);
  return { title: company?.name || "Companies" };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { companyId } = await params;
  const company = await fetchCompany(session.user.id, companyId);
  if (!company) notFound();

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-8">
        <header className="flex items-center gap-4">
          <span
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-card font-heading text-lg font-semibold"
          >
            {(company.name[0] ?? "?").toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="truncate font-heading text-2xl font-medium tracking-tight">
              {company.name}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {company.domain && (
                <>
                  <a
                    href={`https://${company.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 transition-colors hover:text-foreground"
                  >
                    {company.domain}
                    <ArrowUpRightIcon className="size-3" weight="bold" />
                  </a>
                  <span>·</span>
                </>
              )}
              <span>Added {company.addedLabel}</span>
            </div>
          </div>
        </header>

        {company.applications.length > 0 && (
          <Section title={`Applications · ${company.applications.length}`}>
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {company.applications.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/dashboard/${a.id}`}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {a.role_title}
                      </span>
                      {a.location && (
                        <span className="truncate text-xs text-muted-foreground">
                          {a.location}
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

        {company.contacts.length > 0 && (
          <Section title={`People · ${company.contacts.length}`}>
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {company.contacts.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/contacts/${c.id}`}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <Avatar size="sm">
                      <AvatarFallback>
                        {(c.name[0] ?? "?").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {c.name}
                      </span>
                      {(c.role_title || c.email) && (
                        <span className="truncate text-xs text-muted-foreground">
                          {c.role_title ?? c.email}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Research notes">
          {company.research_notes_md ? (
            <MarkdownProse content={company.research_notes_md} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No research notes yet. The agent writes these when it researches a
              company during intake.
            </p>
          )}
        </Section>
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
