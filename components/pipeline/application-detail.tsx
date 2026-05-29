import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ArrowUpRightIcon } from "@/lib/icons";

const STATUS_LABELS: Record<string, string> = {
  bookmarked: "Bookmarked",
  applying: "Applying",
  applied: "Applied",
  interviewing: "Interviewing",
  offered: "Offered",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

interface ApplicationDetailProps {
  application: {
    id: string;
    role_title: string;
    status: string;
    jd_structured: {
      company: string;
      role: string;
      comp_band?: string;
      stack: string[];
      requirements: string[];
      location: string;
      remote_policy?: string;
    };
    applied_at: string | null;
    created_at: string;
  };
  hiringManager: {
    id: string;
    name: string;
    role_title?: string;
    source: string;
    linkedin_url?: string;
    last_contact_at: string | null;
  } | null;
  conversations: {
    id: string;
    channel: "email" | "linkedin" | "phone" | "other";
    last_message_at: string;
    last_message_from: "me" | "them";
    contact: { name: string; role_title?: string } | null;
    messages: { from: "me" | "them"; body: string; sent_at: string }[];
  }[];
  resumeDiff: string | null;
  coverLetter: string | null;
  researchNote: string | null;
}

export function ApplicationDetail({
  application,
  hiringManager,
  conversations,
  resumeDiff,
  coverLetter,
  researchNote,
}: ApplicationDetailProps) {
  const jd = application.jd_structured;
  const metaParts = [jd.location, jd.remote_policy, jd.comp_band].filter(
    Boolean,
  );

  const hasDocuments = Boolean(resumeDiff || coverLetter || researchNote);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-[10px]">
              {STATUS_LABELS[application.status] ?? application.status}
            </Badge>
            <span>·</span>
            <span>
              Added {new Date(application.created_at).toLocaleDateString()}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {application.role_title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {jd.company}
            {metaParts.length > 0 && ` · ${metaParts.join(" · ")}`}
          </p>
        </header>

        <Tabs defaultValue="overview" className="gap-6">
          <TabsList variant="line" className="border-b">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="conversations" className="gap-1.5">
              Conversations
              {conversations.length > 0 && (
                <span className="text-xs tabular-nums text-muted-foreground/70">
                  {conversations.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex flex-col gap-10">
            {jd.stack.length > 0 && (
              <Section title="Stack">
                <div className="flex flex-wrap gap-1.5">
                  {jd.stack.map((s) => (
                    <Badge key={s} variant="outline">
                      {s}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}

            {jd.requirements.length > 0 && (
              <Section title="Requirements">
                <ul className="flex flex-col gap-1.5 text-sm">
                  {jd.requirements.map((r, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {hiringManager && (
              <Section title="Hiring manager">
                <div className="flex items-center gap-3">
                  <Avatar size="default">
                    <AvatarFallback>
                      {hiringManager.name[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-sm font-medium">
                      {hiringManager.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {hiringManager.role_title}
                      {hiringManager.last_contact_at && (
                        <>
                          {" · Last contact "}
                          {relativeTime(new Date(hiringManager.last_contact_at))}
                        </>
                      )}
                    </span>
                  </div>
                  {hiringManager.linkedin_url && (
                    <a
                      href={hiringManager.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      LinkedIn
                      <ArrowUpRightIcon className="size-3" />
                    </a>
                  )}
                </div>
              </Section>
            )}
          </TabsContent>

          <TabsContent value="conversations">
            {conversations.length === 0 ? (
              <EmptyState
                title="No conversations yet"
                description="Recruiter emails and messages about this role will appear here."
              />
            ) : (
              <div className="flex flex-col gap-10">
                {conversations.map((conv) => (
                  <div key={conv.id} className="flex flex-col gap-4">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-medium text-foreground">
                        {conv.contact?.name ?? "Unknown contact"}
                      </span>
                      <span className="text-muted-foreground capitalize">
                        {conv.channel} · {conv.messages.length} message
                        {conv.messages.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-4">
                      {conv.messages.map((m, i) => (
                        <Message
                          key={i}
                          from={m.from}
                          body={m.body}
                          sent_at={m.sent_at}
                          contactName={conv.contact?.name ?? "Them"}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents">
            {!hasDocuments ? (
              <EmptyState
                title="No documents yet"
                description="Tailored resume, cover letter, and company research will appear here once generated."
              />
            ) : (
              <div className="flex flex-col gap-10">
                {resumeDiff && (
                  <Section title="Tailored resume">
                    <Prose content={resumeDiff} />
                  </Section>
                )}
                {coverLetter && (
                  <Section title="Cover letter">
                    <Prose content={coverLetter} />
                  </Section>
                )}
                {researchNote && (
                  <Section title="Company research">
                    <Prose content={researchNote} />
                  </Section>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
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

function Message({
  from,
  body,
  sent_at,
  contactName,
}: {
  from: "me" | "them";
  body: string;
  sent_at: string;
  contactName: string;
}) {
  const senderName = from === "me" ? "You" : contactName;
  const initial = senderName[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex gap-3">
      <Avatar size="sm" className="mt-0.5">
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-2 text-xs">
          <span className="font-medium">{senderName}</span>
          <span className="text-muted-foreground">
            {relativeTime(new Date(sent_at))}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap text-foreground/90">
          {body}
        </p>
      </div>
    </div>
  );
}

function Prose({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
      {content}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  const months = Math.floor(diffDays / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}
