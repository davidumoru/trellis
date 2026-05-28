import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCollections } from "@/lib/db";

export default async function OnboardingLayout({
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

  const { artifacts } = await getCollections();
  const hasResume = await artifacts.findOne({
    user_id: session.user.id,
    "meta.kind": "base_resume",
  });

  if (hasResume) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
