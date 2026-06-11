import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { finalizeResume } from "@/lib/agent/finalize";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;
  const result = await finalizeResume(session.user.id, documentId);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ id: result.id });
}
