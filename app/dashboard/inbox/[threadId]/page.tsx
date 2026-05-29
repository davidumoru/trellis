import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThreadMoreMenu } from "@/components/thread-more-menu";
import { MessageBody } from "@/components/message-body";
import { auth } from "@/lib/auth";
import { fetchThread } from "@/lib/inbox";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { threadId } = await params;
  const thread = await fetchThread(session.user.id, threadId);
  if (!thread) notFound();

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 pl-5 md:pl-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
            {thread.initials}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{thread.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {thread.email}
            </span>
          </div>
        </div>
        <ThreadMoreMenu email={thread.email} />
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
          <h1 className="font-heading text-xl font-medium tracking-tight">
            {thread.subject}
          </h1>

          {thread.state === "waiting" && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <span className="size-1.5 rounded-full bg-amber-500" />
              You haven&rsquo;t replied to this thread yet.
            </div>
          )}

          <ol className="flex flex-col gap-6">
            {thread.messages.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-2 border-t border-border pt-6 first:border-t-0 first:pt-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">
                    {m.from === "them" ? thread.name : "You"}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {m.date}
                  </span>
                </div>
                <MessageBody text={m.body} />
              </li>
            ))}
          </ol>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <textarea
              placeholder={`Reply to ${thread.name}…`}
              className="min-h-24 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                className="rounded-full bg-foreground px-3.5 py-1.5 text-xs font-medium text-background opacity-50"
                disabled
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
