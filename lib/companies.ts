import { cache } from "react";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import type { Application } from "@/lib/types";

export interface CompanyListItem {
  id: string;
  name: string;
  domain?: string;
  applicationCount: number;
  contactCount: number;
}

export interface CompanyApplication {
  id: string;
  role_title: string;
  status: Application["status"];
  location?: string;
}

export interface CompanyContact {
  id: string;
  name: string;
  role_title?: string;
  email?: string;
}

export interface CompanyDetail {
  id: string;
  name: string;
  domain?: string;
  research_notes_md?: string;
  addedLabel: string;
  applications: CompanyApplication[];
  contacts: CompanyContact[];
}

export const fetchCompanies = cache(
  async (userId: string): Promise<CompanyListItem[]> => {
    const { companies, applications, contacts } = await getCollections();

    const companyDocs = await companies
      .find({ user_id: userId })
      .sort({ name: 1 })
      .toArray();
    if (companyDocs.length === 0) return [];

    const ids = companyDocs.map((c) => c._id);
    const [appDocs, contactDocs] = await Promise.all([
      applications
        .find({ user_id: userId, company_id: { $in: ids } })
        .project<{ company_id: ObjectId }>({ company_id: 1 })
        .toArray(),
      contacts
        .find({ user_id: userId, company_id: { $in: ids } })
        .project<{ company_id?: ObjectId }>({ company_id: 1 })
        .toArray(),
    ]);

    const appCounts = countByCompany(appDocs);
    const contactCounts = countByCompany(contactDocs);

    return companyDocs.map((c) => {
      const id = c._id.toString();
      return {
        id,
        name: c.name,
        domain: c.domain,
        applicationCount: appCounts.get(id) ?? 0,
        contactCount: contactCounts.get(id) ?? 0,
      };
    });
  },
);

export const fetchCompany = cache(
  async (userId: string, companyId: string): Promise<CompanyDetail | null> => {
    if (!ObjectId.isValid(companyId)) return null;
    const { companies, applications, contacts } = await getCollections();

    const company = await companies.findOne({
      _id: new ObjectId(companyId),
      user_id: userId,
    });
    if (!company) return null;

    const [appDocs, contactDocs] = await Promise.all([
      applications
        .find({ user_id: userId, company_id: company._id })
        .sort({ created_at: -1 })
        .toArray(),
      contacts
        .find({ user_id: userId, company_id: company._id })
        .sort({ last_contact_at: -1, created_at: -1 })
        .toArray(),
    ]);

    return {
      id: company._id.toString(),
      name: company.name,
      domain: company.domain,
      research_notes_md: company.research_notes_md,
      addedLabel: formatDate(company.created_at),
      applications: appDocs.map((a) => ({
        id: a._id.toString(),
        role_title: a.role_title,
        status: a.status,
        location: a.jd_structured?.location,
      })),
      contacts: contactDocs.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        role_title: c.role_title,
        email: c.email,
      })),
    };
  },
);

function countByCompany(
  docs: { company_id?: ObjectId }[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const d of docs) {
    const key = d.company_id?.toString();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
