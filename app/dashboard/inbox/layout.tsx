import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fetchThreads } from "@/lib/inbox";
import { InboxShell } from "@/components/inbox-shell";

export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const threads = await fetchThreads(session.user.id);
  return <InboxShell threads={threads}>{children}</InboxShell>;
}
