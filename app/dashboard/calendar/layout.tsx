import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fetchEvents } from "@/lib/calendar";
import { CalendarShell } from "@/components/calendar/calendar-shell";

export default async function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const events = await fetchEvents(session.user.id);
  return <CalendarShell events={events}>{children}</CalendarShell>;
}
