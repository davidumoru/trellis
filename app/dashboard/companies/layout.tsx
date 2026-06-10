import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fetchCompanies } from "@/lib/companies";
import { CompaniesShell } from "@/components/companies/companies-shell";

export default async function CompaniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const companies = await fetchCompanies(session.user.id);
  return <CompaniesShell companies={companies}>{children}</CompaniesShell>;
}
