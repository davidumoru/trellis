import type { Metadata } from "next";
import { FileText as FileTextIcon } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Documents" };

export default function DocumentsIndex() {
  return (
    <div className="flex h-full items-center justify-center px-8">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileTextIcon className="size-5" weight="fill" />
        </div>
        <h2 className="font-heading text-lg font-medium tracking-tight">
          Pick a document
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a document from the list to read it — resume diffs, cover
          letters, and the agent&apos;s research notes.
        </p>
      </div>
    </div>
  );
}
