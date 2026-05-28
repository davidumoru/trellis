import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCollections } from "@/lib/db";
import { ObjectId } from "mongodb";
import {
  generateEmbeddings,
  applicationEmbeddingText,
  artifactEmbeddingText,
} from "@/lib/agent/embeddings";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = (await request.json()) as {
    jdRaw: string;
    jdStructured: {
      company: string;
      role: string;
      comp_band?: string;
      stack: string[];
      requirements: string[];
      location: string;
      remote_policy?: string;
    };
    resumeDiff: string;
    coverLetter: string;
  };

  const { applications, artifacts, companies } = await getCollections();

  let company = await companies.findOne({
    user_id: userId,
    name: body.jdStructured.company,
  });

  if (!company) {
    const insertResult = await companies.insertOne({
      _id: new ObjectId(),
      user_id: userId,
      name: body.jdStructured.company,
      created_at: new Date(),
    });
    company = await companies.findOne({ _id: insertResult.insertedId });
  }

  const applicationId = new ObjectId();
  const now = new Date();

  const resumeArtifactId = new ObjectId();
  const coverLetterArtifactId = new ObjectId();

  const resumeArtifactDoc = {
    _id: resumeArtifactId,
    type: "resume_diff" as const,
    user_id: userId,
    application_id: applicationId,
    content_md: body.resumeDiff,
    version: 1,
    created_at: now,
  };
  const coverArtifactDoc = {
    _id: coverLetterArtifactId,
    type: "cover_letter" as const,
    user_id: userId,
    application_id: applicationId,
    content_md: body.coverLetter,
    version: 1,
    created_at: now,
  };
  const applicationDoc = {
    _id: applicationId,
    user_id: userId,
    company_id: company!._id,
    role_title: body.jdStructured.role,
    status: "bookmarked" as const,
    jd_raw: body.jdRaw,
    jd_structured: body.jdStructured,
    timeline: [{ stage: "bookmarked" as const, entered_at: now }],
    tailored_resume_artifact_id: resumeArtifactId,
    cover_letter_artifact_id: coverLetterArtifactId,
    created_at: now,
    updated_at: now,
  };

  // Embeddings for the three vector-indexed collections
  const [appEmbedding, resumeEmbedding, coverEmbedding] =
    await generateEmbeddings([
      applicationEmbeddingText(applicationDoc),
      artifactEmbeddingText(resumeArtifactDoc),
      artifactEmbeddingText(coverArtifactDoc),
    ]);

  await artifacts.insertMany([
    { ...resumeArtifactDoc, embedding: resumeEmbedding },
    { ...coverArtifactDoc, embedding: coverEmbedding },
  ]);

  await applications.insertOne({
    ...applicationDoc,
    embedding: appEmbedding,
  });

  return NextResponse.json({ id: applicationId.toString() });
}
