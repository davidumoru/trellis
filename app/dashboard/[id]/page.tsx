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

  const userId = session.user.id;
  const { applications, artifacts, contacts, conversations } =
    await getCollections();

  const application = await applications.findOne({
    _id: new ObjectId(id),
    user_id: userId,
  });

  if (!application) {
    notFound();
  }

  const artifactIds = [
    application.tailored_resume_artifact_id,
    application.cover_letter_artifact_id,
    application.research_note_artifact_id,
  ].filter(Boolean) as ObjectId[];

  const [linkedArtifacts, hiringManager, applicationConversations] =
    await Promise.all([
      artifacts.find({ _id: { $in: artifactIds } }).toArray(),
      application.hiring_manager_contact_id
        ? contacts.findOne({
            _id: application.hiring_manager_contact_id,
            user_id: userId,
          })
        : null,
      conversations
        .find({ application_id: application._id, user_id: userId })
        .sort({ last_message_at: -1 })
        .toArray(),
    ]);

  const conversationContactIds = Array.from(
    new Set(applicationConversations.map((c) => c.contact_id.toString())),
  ).map((id) => new ObjectId(id));

  const conversationContacts = conversationContactIds.length
    ? await contacts
        .find({ _id: { $in: conversationContactIds }, user_id: userId })
        .toArray()
    : [];

  const contactById = new Map(
    conversationContacts.map((c) => [c._id.toString(), c]),
  );

  const resumeDiff = linkedArtifacts.find((a) => a.type === "resume_diff");
  const coverLetter = linkedArtifacts.find((a) => a.type === "cover_letter");
  const researchNote = linkedArtifacts.find((a) => a.type === "research_note");

  return (
    <ApplicationDetail
      application={{
        id: application._id.toString(),
        role_title: application.role_title,
        status: application.status,
        jd_structured: application.jd_structured,
        applied_at: application.applied_at?.toISOString() ?? null,
        created_at: application.created_at.toISOString(),
      }}
      hiringManager={
        hiringManager
          ? {
              id: hiringManager._id.toString(),
              name: hiringManager.name,
              role_title: hiringManager.role_title,
              source: hiringManager.source,
              linkedin_url: hiringManager.linkedin_url,
              last_contact_at:
                hiringManager.last_contact_at?.toISOString() ?? null,
            }
          : null
      }
      conversations={applicationConversations.map((c) => {
        const contact = contactById.get(c.contact_id.toString());
        return {
          id: c._id.toString(),
          channel: c.channel,
          last_message_at: c.last_message_at.toISOString(),
          last_message_from: c.last_message_from,
          contact: contact
            ? {
                name: contact.name,
                role_title: contact.role_title,
              }
            : null,
          messages: c.messages.map((m) => ({
            from: m.from,
            body: m.body,
            sent_at: m.sent_at.toISOString(),
          })),
        };
      })}
      resumeDiff={resumeDiff?.content_md ?? null}
      coverLetter={coverLetter?.content_md ?? null}
      researchNote={researchNote?.content_md ?? null}
    />
  );
}
