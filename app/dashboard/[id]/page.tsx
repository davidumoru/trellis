import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { ApplicationDetail } from "@/components/application-detail";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    notFound();
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/login");
  }

  const { applications, artifacts } = await getCollections();
  const application = await applications.findOne({
    _id: new ObjectId(id),
    user_id: session.user.id,
  });

  if (!application) {
    notFound();
  }

  const linkedArtifacts = await artifacts
    .find({
      _id: {
        $in: [
          application.tailored_resume_artifact_id,
          application.cover_letter_artifact_id,
          application.research_note_artifact_id,
        ].filter(Boolean) as ObjectId[],
      },
    })
    .toArray();

  const resumeDiff = linkedArtifacts.find((a) => a.type === "resume_diff");
  const coverLetter = linkedArtifacts.find((a) => a.type === "cover_letter");
  const researchNote = linkedArtifacts.find((a) => a.type === "research_note");

  return (
    <ApplicationDetail
      application={{
        _id: application._id.toString(),
        role_title: application.role_title,
        status: application.status,
        jd_structured: application.jd_structured,
        applied_at: application.applied_at?.toISOString() ?? null,
        created_at: application.created_at.toISOString(),
      }}
      resumeDiff={resumeDiff?.content_md ?? null}
      coverLetter={coverLetter?.content_md ?? null}
      researchNote={researchNote?.content_md ?? null}
    />
  );
}
