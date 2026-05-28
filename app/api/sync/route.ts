import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { syncGmail } from "@/lib/agent/sync";
import { syncCalendar } from "@/lib/agent/calendar-sync";

export const maxDuration = 300;

export async function POST() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;

  const db = await getDb();
  const account = await db.collection("account").findOne({
    userId: userObjectId as ObjectId,
    providerId: "google",
  });

  if (!account?.accessToken) {
    return NextResponse.json(
      { error: "Google is not connected" },
      { status: 400 },
    );
  }

  const [gmail, calendar] = await Promise.allSettled([
    syncGmail({ accessToken: account.accessToken, userId }),
    syncCalendar({ accessToken: account.accessToken, userId }),
  ]);

  return NextResponse.json({
    ok: true,
    gmail:
      gmail.status === "fulfilled"
        ? gmail.value
        : { error: (gmail.reason as Error).message },
    calendar:
      calendar.status === "fulfilled"
        ? calendar.value
        : { error: (calendar.reason as Error).message },
  });
}
