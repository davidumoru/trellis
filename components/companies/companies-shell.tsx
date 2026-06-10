"use client";

import { usePathname } from "next/navigation";
import { CompaniesList } from "@/components/companies/companies-list";
import { cn } from "@/lib/utils";
import type { CompanyListItem } from "@/lib/companies";

export function CompaniesShell({
  companies,
  children,
}: {
  companies: CompanyListItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const onDetail = /^\/dashboard\/companies\/[^/]+/.test(pathname);

  return (
    <div className="flex h-full min-w-0">
      <aside
        className={cn(
          "h-full w-full shrink-0 border-r border-border md:w-90",
          onDetail ? "hidden md:flex md:flex-col" : "flex flex-col",
        )}
      >
        <CompaniesList companies={companies} />
      </aside>

      <section
        className={cn(
          "h-full min-w-0 flex-1",
          onDetail ? "block" : "hidden md:block",
        )}
      >
        {children}
      </section>
    </div>
  );
}
