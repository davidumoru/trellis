import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    _id: string;
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
  resumeDiff: string | null;
  coverLetter: string | null;
  researchNote: string | null;
}

export function ApplicationDetail({
  application,
  resumeDiff,
  coverLetter,
  researchNote,
}: ApplicationDetailProps) {
  const jd = application.jd_structured;

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {STATUS_LABELS[application.status] ?? application.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Added {new Date(application.created_at).toLocaleDateString()}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {application.role_title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {jd.company} · {jd.location}
            {jd.remote_policy ? ` · ${jd.remote_policy}` : ""}
            {jd.comp_band ? ` · ${jd.comp_band}` : ""}
          </p>
        </header>

        {jd.stack.length > 0 && (
          <Section title="Stack">
            <div className="flex flex-wrap gap-1">
              {jd.stack.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          </Section>
        )}

        {jd.requirements.length > 0 && (
          <Section title="Requirements">
            <ul className="flex flex-col gap-1 text-sm">
              {jd.requirements.map((r, i) => (
                <li key={i}>· {r}</li>
              ))}
            </ul>
          </Section>
        )}

        {resumeDiff && (
          <Section title="Tailored resume">
            <pre className="font-sans text-sm whitespace-pre-wrap">
              {resumeDiff}
            </pre>
          </Section>
        )}

        {coverLetter && (
          <Section title="Cover letter">
            <pre className="font-sans text-sm whitespace-pre-wrap">
              {coverLetter}
            </pre>
          </Section>
        )}

        {researchNote && (
          <Section title="Company research">
            <pre className="font-sans text-sm whitespace-pre-wrap">
              {researchNote}
            </pre>
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
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}
