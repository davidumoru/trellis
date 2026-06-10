export type DocumentGroup =
  | "base_resume"
  | "resume_diff"
  | "cover_letter"
  | "research_note"
  | "note";

export const GROUP_LABEL: Record<DocumentGroup, string> = {
  base_resume: "Resume",
  resume_diff: "Tailored resumes",
  cover_letter: "Cover letters",
  research_note: "Research notes",
  note: "Notes",
};

export const GROUP_ORDER: DocumentGroup[] = [
  "base_resume",
  "resume_diff",
  "cover_letter",
  "research_note",
  "note",
];
