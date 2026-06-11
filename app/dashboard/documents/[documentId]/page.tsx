import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import {
  Briefcase as BriefcaseIcon,
  DownloadSimple as DownloadIcon,
} from "@phosphor-icons/react/dist/ssr";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownProse } from "@/components/markdown-prose";
import { GenerateResumeButton } from "@/components/documents/generate-resume-button";
import { auth } from "@/lib/auth";
import { fetchDocument } from "@/lib/documents";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ documentId: string }>;
}): Promise<Metadata> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { title: "Documents" };
  const { documentId } = await params;
  const document = await fetchDocument(session.user.id, documentId);
  return { title: document?.title || "Documents" };
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { documentId } = await params;
  const document = await fetchDocument(session.user.id, documentId);
  if (!document) notFound();

  const fileUrl = `/api/documents/${document.id}/file`;
  const canExportPdf =
    document.type === "tailored_resume" || document.type === "cover_letter";
  const isDiff = document.type === "resume_diff";
  const showActionBar = document.hasFile || canExportPdf || isDiff;

  return (
    <div className="flex h-full min-w-0 flex-col">
      {showActionBar && (
        <header className="flex shrink-0 items-center justify-end gap-3 border-b border-border px-6 py-3">
          {document.hasFile && (
            <a
              href={`${fileUrl}?download`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              <DownloadIcon className="size-3.5" weight="fill" />
              Download PDF
            </a>
          )}
          {canExportPdf && (
            <a
              href={`/api/documents/${document.id}/pdf`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              <DownloadIcon className="size-3.5" weight="fill" />
              Download PDF
            </a>
          )}
          {isDiff &&
            (document.finalResumeId ? (
              <Link
                href={`/dashboard/documents/${document.finalResumeId}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background transition-opacity hover:opacity-90"
              >
                Open final resume
              </Link>
            ) : (
              <GenerateResumeButton documentId={document.id} />
            ))}
        </header>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-8">
          <header className="flex flex-col gap-3">
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              {document.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {document.typeLabel}
              </span>
              {document.version > 1 && (
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  v{document.version}
                </span>
              )}
              <span>Created {document.createdLabel}</span>
            </div>
            {document.application && (
              <div className="flex items-center gap-2.5 text-sm">
                <BriefcaseIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  weight="fill"
                />
                <Link
                  href={`/dashboard/${document.application.id}`}
                  className="text-foreground underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground"
                >
                  {document.application.role_title || "Application"}
                </Link>
              </div>
            )}
          </header>

          {document.hasFile ? (
            <iframe
              src={fileUrl}
              title={document.title}
              className="h-[75vh] w-full rounded-lg border border-border bg-muted"
            />
          ) : (
            <MarkdownProse content={document.content_md} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
