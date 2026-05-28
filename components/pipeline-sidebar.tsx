"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Kbd } from "@/components/ui/kbd";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import {
  SearchIcon,
  LogOutIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  BookmarkIcon,
  PencilLineIcon,
  SendIcon,
  UsersIcon,
  TrophyIcon,
  XIcon,
  UndoIcon,
  SunIcon,
  Code2Icon,
  ArrowUpRightIcon,
  HomeIcon,
  InboxIcon,
  CalendarIcon,
  MoreHorizontalIcon,
  Building2Icon,
  UserIcon,
  FileTextIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { GoogleConnectBanner } from "@/components/google-connect-banner";
import { GmailSyncBanner } from "@/components/gmail-sync-banner";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

type Status = Application["status"];

const STATUS_META: Record<
  Status,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  bookmarked: { label: "Bookmarked", icon: BookmarkIcon },
  applying: { label: "Applying", icon: PencilLineIcon },
  applied: { label: "Applied", icon: SendIcon },
  interviewing: { label: "Interviewing", icon: UsersIcon },
  offered: { label: "Offered", icon: TrophyIcon },
  rejected: { label: "Rejected", icon: XIcon },
  withdrawn: { label: "Withdrawn", icon: UndoIcon },
};

const STATUS_ORDER: Status[] = [
  "bookmarked",
  "applying",
  "applied",
  "interviewing",
  "offered",
  "rejected",
  "withdrawn",
];

const ACTIVE_STATUSES = new Set<Status>([
  "bookmarked",
  "applying",
  "applied",
  "interviewing",
  "offered",
]);

type ApplicationListItem = {
  id: string;
} & Pick<Application, "role_title" | "status" | "jd_structured">;

interface PipelineSidebarProps {
  applications: ApplicationListItem[];
  user: { name?: string | null; email: string; image?: string | null };
  googleConnected: boolean;
  onOpenSearch: () => void;
}

type Filter = "active" | "all";

export function PipelineSidebar({
  applications,
  user,
  googleConnected,
  onOpenSearch,
}: PipelineSidebarProps) {
  const pathname = usePathname();
  const [filter, setFilter] = useState<Filter>("active");

  const visible =
    filter === "active"
      ? applications.filter((a) => ACTIVE_STATUSES.has(a.status))
      : applications;

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: visible.filter((a) => a.status === status),
  })).filter((g) => g.items.length > 0);

  const totalCount = applications.length;
  const activeCount = applications.filter((a) =>
    ACTIVE_STATUSES.has(a.status),
  ).length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col gap-1 px-2 pt-3 pb-2">
        <SidebarBrand onOpenSearch={onOpenSearch} />

        <div className="flex flex-col px-1 pt-2">
          <NavLink icon={HomeIcon} label="Home" href="/dashboard" pathname={pathname} />
          <NavLink icon={InboxIcon} label="Inbox" href="/dashboard/inbox" pathname={pathname} />
          <NavLink icon={CalendarIcon} label="Calendar" href="/dashboard/calendar" pathname={pathname} />
          <MoreNav pathname={pathname} />
        </div>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="flex w-full min-w-0 flex-col gap-3 overflow-hidden px-2 pb-3">
          <div className="flex items-center justify-between px-2 pt-3">
            <span className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Pipeline
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-sm px-1 -mx-1 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {filter === "active" ? "Active" : "All"}
                  <ChevronDownIcon className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuRadioGroup
                  value={filter}
                  onValueChange={(v) => setFilter(v as Filter)}
                >
                  <DropdownMenuRadioItem value="active">
                    Active
                    <span className="ml-auto text-xs text-muted-foreground">
                      {activeCount}
                    </span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="all">
                    All
                    <span className="ml-auto text-xs text-muted-foreground">
                      {totalCount}
                    </span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {grouped.length === 0 ? (
            <p className="px-2 py-8 text-center text-xs text-muted-foreground">
              {totalCount === 0
                ? "No applications yet."
                : "No active applications."}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {grouped.map((group) => {
                const meta = STATUS_META[group.status];
                const Icon = meta.icon;
                const defaultOpen = !(
                  group.status === "rejected" || group.status === "withdrawn"
                );
                return (
                  <Collapsible
                    key={group.status}
                    defaultOpen={defaultOpen}
                    className="group/collapsible flex w-full min-w-0 flex-col gap-0.5"
                  >
                    <CollapsibleTrigger className="flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/40">
                      <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-data-[state=open]/collapsible:rotate-90" />
                      <Icon className="size-3 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate text-[11px] font-medium text-muted-foreground">
                        {meta.label}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground/60">
                        {group.items.length}
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="flex flex-col gap-0.5 overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
                      {group.items.map((app) => {
                        const href = `/dashboard/${app.id}`;
                        const isActive = pathname === href;
                        return (
                          <Link
                            key={app.id}
                            href={href}
                            className={cn(
                              "flex min-w-0 items-center overflow-hidden rounded-md py-1.5 pr-2 pl-11 transition-colors",
                              isActive ? "bg-muted" : "hover:bg-muted/60",
                            )}
                          >
                            <span className="truncate text-[13px]">
                              {app.role_title}
                            </span>
                          </Link>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {googleConnected ? <GmailSyncBanner /> : <GoogleConnectBanner />}

      <SidebarUser user={user} />
    </div>
  );
}

function SidebarBrand({ onOpenSearch }: { onOpenSearch: () => void }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <div aria-hidden className="grid size-3.5 grid-cols-2 gap-px">
        <div className="rounded-[1px] bg-primary" />
        <div className="rounded-[1px] bg-primary/40" />
        <div className="rounded-[1px] bg-primary/40" />
        <div className="rounded-[1px] bg-primary" />
      </div>
      <span className="font-heading flex-1 text-sm font-semibold tracking-tight">
        Trellis
      </span>
      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Search"
        className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <SearchIcon className="size-3.5" />
      </button>
    </div>
  );
}

function NavButton({
  icon: Icon,
  label,
  shortcut,
  disabled,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex h-8 w-full items-center gap-2 rounded-md px-2 text-[13px] transition-colors",
        "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        "disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <Kbd>{shortcut}</Kbd>}
    </button>
  );
}

function NavLink({
  icon: Icon,
  label,
  href,
  pathname,
  shortcut,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  pathname: string;
  shortcut?: string;
}) {
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        "group flex h-8 w-full items-center gap-2 rounded-md px-2 text-[13px] transition-colors",
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <Kbd>{shortcut}</Kbd>}
    </Link>
  );
}

function MoreNav({ pathname }: { pathname: string }) {
  const items = [
    { icon: Building2Icon, label: "Companies", href: "/dashboard/companies" },
    { icon: UserIcon, label: "Contacts", href: "/dashboard/contacts" },
    { icon: FileTextIcon, label: "Documents", href: "/dashboard/documents" },
  ];
  const isActive = items.some((i) => pathname === i.href);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex h-8 w-full items-center gap-2 rounded-md px-2 text-[13px] transition-colors",
            isActive
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <MoreHorizontalIcon className="size-3.5" />
          <span className="flex-1 text-left">More</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="min-w-44">
        {items.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href} className="gap-2">
              <item.icon className="size-3.5 text-muted-foreground" />
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarUser({
  user,
}: {
  user: { name?: string | null; email: string; image?: string | null };
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = (user.name?.[0] ?? user.email[0] ?? "?").toUpperCase();
  const displayName = user.name?.trim() || user.email;
  const showEmail = Boolean(user.name?.trim()) && user.name !== user.email;
  const themeLabel =
    theme === "light" ? "Light" : theme === "system" ? "System" : "Dark";

  return (
    <div className="shrink-0 px-2 pt-2 pb-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2 rounded-md p-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none">
            <Avatar size="sm">
              {user.image && <AvatarImage src={user.image} alt={displayName} />}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-[12px] font-medium">
                {displayName}
              </span>
              {showEmail && (
                <span className="truncate text-[11px] text-muted-foreground">
                  {user.email}
                </span>
              )}
            </div>
            <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          sideOffset={8}
          className="w-72! p-0"
        >
          {/* Section: theme */}
          <div className="p-1">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <SunIcon className="size-3.5 text-muted-foreground" />
                <span className="flex-1">Theme</span>
                <span className="text-xs text-muted-foreground">
                  {themeLabel}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-40">
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light">
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </div>

          <DropdownMenuSeparator className="my-0" />

          {/* Section: external links */}
          <div className="p-1">
            <DropdownMenuItem asChild>
              <a
                href="https://github.com/davidumoru/trellis"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <Code2Icon className="size-3.5 text-muted-foreground" />
                <span className="flex-1">Source on GitHub</span>
                <ArrowUpRightIcon className="size-3 text-muted-foreground" />
              </a>
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator className="my-0" />

          {/* Section: sign out */}
          <div className="p-1">
            <DropdownMenuItem
              onClick={handleSignOut}
              className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOutIcon className="size-3.5" />
              Sign out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
