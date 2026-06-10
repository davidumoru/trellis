import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fetchDocuments } from "@/lib/documents";
import { DocumentsShell } from "@/components/documents/documents-shell";

export default async function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const documents = await fetchDocuments(session.user.id);
  return <DocumentsShell documents={documents}>{children}</DocumentsShell>;
}
