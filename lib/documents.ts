import { cache } from "react";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import type { Application, Artifact } from "@/lib/types";
import { GROUP_LABEL, type DocumentGroup } from "@/lib/documents-meta";

const TYPE_TITLE: Record<Artifact["type"], string> = {
  resume_diff: "Tailored resume",
  cover_letter: "Cover letter",
  research_note: "Company research",
  note: "Note",
};

export interface DocumentListItem {
  id: string;
  group: DocumentGroup;
  title: string;
  subtitle?: string;
  whenLabel: string;
}

export interface DocumentDetail {
  id: string;
  group: DocumentGroup;
  title: string;
  typeLabel: string;
  version: number;
  createdLabel: string;
  content_md: string;
  hasFile: boolean;
  application?: { id: string; role_title: string; company: string };
}

export const fetchDocuments = cache(
  async (userId: string): Promise<DocumentListItem[]> => {
    const { artifacts } = await getCollections();

    const docs = await artifacts
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray();
    if (docs.length === 0) return [];

    const appById = await fetchLinkedApps(userId, docs);

    return docs.map((d) => {
      const app = d.application_id
        ? appById.get(d.application_id.toString())
        : undefined;
      return {
        id: d._id.toString(),
        group: groupOf(d),
        title: titleOf(d, app?.jd_structured?.company),
        subtitle: subtitleOf(d, app),
        whenLabel: formatDate(d.created_at),
      };
    });
  },
);

export const fetchDocument = cache(
  async (userId: string, documentId: string): Promise<DocumentDetail | null> => {
    if (!ObjectId.isValid(documentId)) return null;
    const { artifacts, applications, files } = await getCollections();

    const doc = await artifacts.findOne({
      _id: new ObjectId(documentId),
      user_id: userId,
    });
    if (!doc) return null;

    const [app, file] = await Promise.all([
      doc.application_id
        ? applications.findOne({ _id: doc.application_id, user_id: userId })
        : null,
      files.findOne(
        { artifact_id: doc._id, user_id: userId },
        { projection: { _id: 1 } },
      ),
    ]);

    return {
      id: doc._id.toString(),
      group: groupOf(doc),
      title: titleOf(doc, app?.jd_structured?.company),
      typeLabel: typeLabelOf(doc),
      version: doc.version,
      createdLabel: formatDate(doc.created_at),
      content_md: doc.content_md,
      hasFile: Boolean(file),
      application: app
        ? {
            id: app._id.toString(),
            role_title: app.role_title,
            company: app.jd_structured?.company ?? "",
          }
        : undefined,
    };
  },
);

type AppSummary = Pick<Application, "_id" | "role_title" | "jd_structured">;

async function fetchLinkedApps(
  userId: string,
  docs: Artifact[],
): Promise<Map<string, AppSummary>> {
  const { applications } = await getCollections();
  const seen = new Set<string>();
  const ids: ObjectId[] = [];
  for (const d of docs) {
    const key = d.application_id?.toString();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ids.push(d.application_id!);
  }
  if (ids.length === 0) return new Map();

  const appDocs = await applications
    .find({ _id: { $in: ids }, user_id: userId })
    .project<AppSummary>({ role_title: 1, "jd_structured.company": 1 })
    .toArray();
  return new Map(appDocs.map((a) => [a._id.toString(), a]));
}

function isBaseResume(d: Artifact): boolean {
  return d.meta?.kind === "base_resume";
}

function groupOf(d: Artifact): DocumentGroup {
  return isBaseResume(d) ? "base_resume" : d.type;
}

function titleOf(d: Artifact, company?: string): string {
  if (isBaseResume(d)) return "Base resume";
  if (!company) return TYPE_TITLE[d.type];
  if (d.type === "resume_diff") return `${company} resume`;
  if (d.type === "cover_letter") return `${company} cover letter`;
  if (d.type === "research_note") return `${company} research`;
  return TYPE_TITLE[d.type];
}

function subtitleOf(d: Artifact, app?: AppSummary): string | undefined {
  if (isBaseResume(d)) {
    const role = d.meta?.target_role;
    return typeof role === "string" && role ? role : undefined;
  }
  return app?.role_title;
}

function typeLabelOf(d: Artifact): string {
  return isBaseResume(d) ? GROUP_LABEL.base_resume : TYPE_TITLE[d.type];
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
