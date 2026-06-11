import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCollections } from "@/lib/db";
import { Binary, ObjectId } from "mongodb";
import { extractText, getDocumentProxy } from "unpdf";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const name = formData.get("name") as string;
  const targetRole = formData.get("targetRole") as string;
  const file = formData.get("resume") as File | null;

  if (!name || !targetRole || !file) {
    return NextResponse.json(
      { error: "Name, target role, and resume are required" },
      { status: 400 },
    );
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  let resumeText: string;

  try {
    const pdf = await getDocumentProxy(buffer.slice());
    const { text } = await extractText(pdf, { mergePages: true });
    resumeText = (text as string).trim();
  } catch (e) {
    console.error("PDF parse error:", e);
    return NextResponse.json(
      { error: "Could not parse the uploaded file" },
      { status: 422 },
    );
  }

  if (!resumeText) {
    return NextResponse.json(
      { error: "No text could be extracted from the file" },
      { status: 422 },
    );
  }

  const { artifacts, files } = await getCollections();
  const userId = session.user.id;

  const artifactId = new ObjectId();
  await artifacts.insertOne({
    _id: artifactId,
    type: "note",
    user_id: userId,
    content_md: resumeText,
    version: 1,
    meta: { kind: "base_resume", name, target_role: targetRole },
    created_at: new Date(),
  });

  await files.insertOne({
    _id: new ObjectId(),
    user_id: userId,
    artifact_id: artifactId,
    filename: file.name || "resume.pdf",
    content_type: file.type || "application/pdf",
    data: new Binary(buffer),
    created_at: new Date(),
  });

  await auth.api.updateUser({
    headers: await headers(),
    body: { name },
  });

  return NextResponse.json({ success: true });
}
