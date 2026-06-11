import { headers } from "next/headers";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { getCollections } from "@/lib/db";
import { renderDocumentPdf } from "@/lib/pdf";

const PDF_TYPES = new Set(["tailored_resume", "cover_letter"]);

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

  const { artifacts, applications } = await getCollections();
  const doc = await artifacts.findOne({
    _id: new ObjectId(documentId),
    user_id: session.user.id,
  });
  if (!doc || !PDF_TYPES.has(doc.type)) {
    return new Response("Not found", { status: 404 });
  }

  const app = doc.application_id
    ? await applications.findOne(
        { _id: doc.application_id, user_id: session.user.id },
        { projection: { "jd_structured.company": 1 } },
      )
    : null;

  const company = app?.jd_structured?.company;
  const kind = doc.type === "cover_letter" ? "cover letter" : "resume";
  const filename = sanitizeFilename(
    company ? `${company} ${kind}.pdf` : `${kind}.pdf`,
  );

  const bytes = (await renderDocumentPdf(
    doc.content_md,
  )) as Uint8Array<ArrayBuffer>;

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w. -]+/g, "_");
}
