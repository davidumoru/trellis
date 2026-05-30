import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Contacts" };

export default function ContactsPage() {
  return (
    <ComingSoon
      title="Contacts"
      description="Recruiters, hiring managers, and anyone you've talked to across the pipeline."
    />
  );
}
