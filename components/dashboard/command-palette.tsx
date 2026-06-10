"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  Command,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import {
  SearchIcon,
  HomeIcon,
  InboxIcon,
  CalendarIcon,
  Building2Icon,
  UserIcon,
  FileTextIcon,
  BriefcaseIcon,
  CornerDownLeftIcon,
  SparklesIcon,
} from "@/lib/icons";
import type { Application } from "@/lib/types";

type AppListItem = {
  id: string;
} & Pick<Application, "role_title" | "status" | "jd_structured">;

type ContactListItem = {
  id: string;
  name: string;
  role_title: string | null;
  email: string | null;
  company_id: string | null;
};

type CompanyListItem = {
  id: string;
  name: string;
  domain: string | null;
};

const STATUS_LABELS: Record<Application["status"], string> = {
  bookmarked: "Bookmarked",
  applying: "Applying",
  applied: "Applied",
  interviewing: "Interviewing",
  offered: "Offered",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

interface CommandPaletteProps {
  applications: AppListItem[];
  contacts: ContactListItem[];
  companies: CompanyListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({
  applications,
  contacts,
  companies,
  open,
  onOpenChange,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function go(href: string) {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  }

  function askAgent() {
    if (!query.trim()) return;
    onOpenChange(false);
    window.dispatchEvent(
      new CustomEvent("trellis:ask-agent", { detail: { query } }),
    );
    setQuery("");
  }

  const sortedApps = useMemo(
    () =>
      [...applications].sort((a, b) =>
        a.role_title.localeCompare(b.role_title),
      ),
    [applications],
  );

  const sortedContacts = useMemo(
    () => [...contacts].sort((a, b) => a.name.localeCompare(b.name)),
    [contacts],
  );

  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies],
  );

  function handleOpenChange(next: boolean) {
    if (!next) setQuery("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Command Palette</DialogTitle>
        <DialogDescription>Search or ask a question.</DialogDescription>
      </DialogHeader>
      <DialogContent
        className="max-w-170! top-[18%] translate-y-0 gap-0 overflow-hidden rounded-xl border-border/60 bg-popover p-0 shadow-2xl"
        showCloseButton={false}
      >
        <Command
          shouldFilter
          className="rounded-none border-0 bg-transparent p-0"
          onKeyDown={(e) => {
            if (e.key === "Tab" && query.trim()) {
              e.preventDefault();
              askAgent();
            }
          }}
        >
          {/* Input row */}
          <div className="flex h-12 items-center gap-3 border-b border-border/60 px-4">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search or ask a question…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
            <button
              type="button"
              onClick={askAgent}
              disabled={!query.trim()}
              className={
                "inline-flex items-center gap-1.5 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground"
              }
            >
              <SparklesIcon className="size-3" />
              Ask Trellis
              <Kbd>Tab</Kbd>
            </button>
          </div>

          {/* Results */}
          <CommandList className="max-h-110 scroll-py-2 px-2 py-2">
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <p className="text-sm text-muted-foreground">No results</p>
                {query.trim() && (
                  <button
                    type="button"
                    onClick={askAgent}
                    className="inline-flex items-center gap-1.5 text-xs text-foreground/80 hover:text-foreground"
                  >
                    <SparklesIcon className="size-3" />
                    Ask Trellis:{" "}
                    <span className="italic">&ldquo;{query}&rdquo;</span>
                  </button>
                )}
              </div>
            </CommandEmpty>

            <CommandGroup heading="Navigation">
              <NavItem
                icon={HomeIcon}
                label="Home"
                meta="Compose"
                onSelect={() => go("/dashboard")}
              />
              <NavItem
                icon={InboxIcon}
                label="Inbox"
                meta="Conversations"
                onSelect={() => go("/dashboard/inbox")}
              />
              <NavItem
                icon={CalendarIcon}
                label="Calendar"
                meta="Events"
                onSelect={() => go("/dashboard/calendar")}
              />
              <NavItem
                icon={Building2Icon}
                label="Companies"
                meta="All companies"
                onSelect={() => go("/dashboard/companies")}
              />
              <NavItem
                icon={UserIcon}
                label="Contacts"
                meta="All contacts"
                onSelect={() => go("/dashboard/contacts")}
              />
              <NavItem
                icon={FileTextIcon}
                label="Documents"
                meta="Artifacts"
                onSelect={() => go("/dashboard/documents")}
              />
            </CommandGroup>

            {sortedApps.length > 0 && (
              <CommandGroup heading="Applications">
                {sortedApps.map((app) => {
                  const company = app.jd_structured?.company ?? "";
                  const value = `app ${app.role_title} ${company} ${STATUS_LABELS[app.status]}`;
                  return (
                    <CommandItem
                      key={app.id}
                      value={value}
                      onSelect={() => go(`/dashboard/${app.id}`)}
                      className="h-9 gap-3 px-2"
                    >
                      <BriefcaseIcon className="size-4 text-muted-foreground" />
                      <span className="flex-1 truncate text-foreground">
                        {app.role_title}
                      </span>
                      <CommandShortcut className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {company}
                        </span>
                        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {STATUS_LABELS[app.status]}
                        </span>
                      </CommandShortcut>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {sortedContacts.length > 0 && (
              <CommandGroup heading="People">
                {sortedContacts.map((c) => {
                  const value = `person ${c.name} ${c.email ?? ""} ${c.role_title ?? ""}`;
                  const initial = (c.name[0] ?? "?").toUpperCase();
                  return (
                    <CommandItem
                      key={c.id}
                      value={value}
                      onSelect={() => go(`/dashboard/contacts/${c.id}`)}
                      className="h-9 gap-3 px-2"
                    >
                      <Avatar size="sm">
                        <AvatarFallback>{initial}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate text-foreground">
                        {c.name}
                      </span>
                      {c.email && (
                        <CommandShortcut className="truncate text-xs text-muted-foreground">
                          {c.email}
                        </CommandShortcut>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {sortedCompanies.length > 0 && (
              <CommandGroup heading="Companies">
                {sortedCompanies.map((c) => {
                  const value = `company ${c.name} ${c.domain ?? ""}`;
                  const initial = (c.name[0] ?? "?").toUpperCase();
                  return (
                    <CommandItem
                      key={c.id}
                      value={value}
                      onSelect={() => go(`/dashboard/companies/${c.id}`)}
                      className="h-9 gap-3 px-2"
                    >
                      <span
                        aria-hidden
                        className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold tabular-nums"
                      >
                        {initial}
                      </span>
                      <span className="flex-1 truncate text-foreground">
                        {c.name}
                      </span>
                      {c.domain && (
                        <CommandShortcut className="truncate text-xs text-muted-foreground">
                          {c.domain}
                        </CommandShortcut>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>

          {/* Footer */}
          <div className="flex items-center justify-end gap-4 border-t border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <FooterAction
              label="Open"
              shortcut={<CornerDownLeftIcon className="size-3" />}
            />
            <div className="h-3 w-px bg-border/60" />
            <FooterAction label="Ask agent" shortcut="Tab" />
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function NavItem({
  icon: Icon,
  label,
  meta,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  meta?: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={label.toLowerCase()}
      onSelect={onSelect}
      className="h-9 gap-3 px-2"
    >
      <Icon className="size-4 text-muted-foreground" />
      <span className="flex-1 text-foreground">{label}</span>
      {meta && <CommandShortcut className="text-xs">{meta}</CommandShortcut>}
    </CommandItem>
  );
}

function FooterAction({
  label,
  shortcut,
}: {
  label: string;
  shortcut: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span>{label}</span>
      <Kbd>{shortcut}</Kbd>
    </div>
  );
}

export function useCommandPaletteShortcut(setOpen: (open: boolean) => void) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);
}
