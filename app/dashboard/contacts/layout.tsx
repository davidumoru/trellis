import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fetchContacts } from "@/lib/contacts";
import { ContactsShell } from "@/components/contacts/contacts-shell";

export default async function ContactsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const contacts = await fetchContacts(session.user.id);
  return <ContactsShell contacts={contacts}>{children}</ContactsShell>;
}
