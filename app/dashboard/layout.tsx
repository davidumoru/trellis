import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getCollections, getDb } from "@/lib/db";
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

  const db = await getDb();
  const userObjectId = ObjectId.isValid(userId)
    ? new ObjectId(userId)
    : userId;
  const googleAccount = await db
    .collection("account")
    .findOne({ userId: userObjectId, providerId: "google" });
  const googleConnected = Boolean(googleAccount);

  let userImage = session.user.image ?? null;
  if (googleConnected && !userImage && googleAccount?.accessToken) {
    try {
      const res = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: { Authorization: `Bearer ${googleAccount.accessToken}` },
        },
      );
      if (res.ok) {
        const profile = (await res.json()) as { picture?: string };
        if (profile.picture) {
          await db
            .collection("user")
            .updateOne(
              { _id: userObjectId } as Record<string, unknown>,
              { $set: { image: profile.picture } },
            );
          userImage = profile.picture;
        }
      }
    } catch {
      // best-effort, ignore
    }
  }

  return (
    <DashboardShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: userImage,
      }}
      applications={apps.map((a) => ({
        id: a._id.toString(),
        role_title: a.role_title,
        status: a.status,
        jd_structured: a.jd_structured,
      }))}
      googleConnected={googleConnected}
    >
      {children}
    </DashboardShell>
  );
}
