"use client";

import Link from "next/link";
import {
  UserIcon,
  SunIcon,
  Code2Icon,
  ShieldCheckIcon,
  ChevronRightIcon,
} from "@/lib/icons";

const SECTIONS = [
  { icon: UserIcon, label: "Profile", href: "/dashboard/settings#profile" },
  {
    icon: SunIcon,
    label: "Appearance",
    href: "/dashboard/settings#appearance",
  },
  {
    icon: Code2Icon,
    label: "Integrations",
    href: "/dashboard/settings#integrations",
  },
  {
    icon: ShieldCheckIcon,
    label: "Account",
    href: "/dashboard/settings#account",
  },
];

export function SettingsSidebar() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-1 px-2 pt-3 pb-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <ChevronRightIcon className="size-3.5 rotate-180" />
          <span>Back</span>
        </Link>
        <div className="flex flex-col px-1 pt-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <Icon className="size-3.5" />
                <span className="flex-1">{s.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1" />
    </div>
  );
}
