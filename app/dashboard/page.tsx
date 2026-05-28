import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-muted-foreground">
        Signed in as {session.user.email}
      </p>
    </div>
  );
}
