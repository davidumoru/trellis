import type { Metadata } from "next";
import { Buildings as BuildingsIcon } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Companies" };

export default function CompaniesIndex() {
  return (
    <div className="flex h-full items-center justify-center px-8">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <BuildingsIcon className="size-5" weight="fill" />
        </div>
        <h2 className="font-heading text-lg font-medium tracking-tight">
          Pick a company
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a company from the list to see research notes, open
          applications, and the people you know there.
        </p>
      </div>
    </div>
  );
}
