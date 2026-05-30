import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Documents" };

export default function DocumentsPage() {
  return (
    <ComingSoon
      title="Documents"
      description="Resume diffs, cover letters, and company research — every artifact in one place."
    />
  );
}
