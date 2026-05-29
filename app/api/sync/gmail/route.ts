import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { syncGmail } from "@/lib/agent/sync";
import { getFreshGoogleAccessToken } from "@/lib/google-auth";

export const maxDuration = 300;

export async function POST() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const accessToken = await getFreshGoogleAccessToken(userId);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Google connection expired. Please reconnect." },
      { status: 401 },
    );
  }

  try {
    const result = await syncGmail({ accessToken, userId });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
