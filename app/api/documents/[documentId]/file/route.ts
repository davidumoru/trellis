import { headers } from "next/headers";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { getCollections } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { documentId } = await params;
  if (!ObjectId.isValid(documentId)) {
    return new Response("Not found", { status: 404 });
  }

  const { files } = await getCollections();
  const file = await files.findOne({
    artifact_id: new ObjectId(documentId),
    user_id: session.user.id,
  });
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  const download = new URL(request.url).searchParams.has("download");
  const bytes = file.data.buffer as Uint8Array<ArrayBuffer>;

  return new Response(bytes, {
    headers: {
      "Content-Type": file.content_type,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${sanitizeFilename(file.filename)}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w. -]+/g, "_");
}
