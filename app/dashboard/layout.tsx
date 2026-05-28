import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCollections } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;
  const { artifacts, applications } = await getCollections();

  const hasResume = await artifacts.findOne({
    user_id: userId,
    "meta.kind": "base_resume",
  });

  if (!hasResume) {
    redirect("/onboarding");
  }

  const apps = await applications
    .find({ user_id: userId })
    .project({ role_title: 1, status: 1, jd_structured: 1 })
    .sort({ created_at: -1 })
    .toArray();

  return (
    <DashboardShell
      user={{
        name: session.user.name,
        email: session.user.email,
      }}
      applications={apps.map((a) => ({
        id: a._id.toString(),
        role_title: a.role_title,
        status: a.status,
        jd_structured: a.jd_structured,
      }))}
    >
      {children}
    </DashboardShell>
  );
}
