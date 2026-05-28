"use client";

import Link from "next/link";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowUpRight as ArrowUpRightIcon,
  CaretRight as ChevronRightIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Citation as CitationData } from "@/lib/agent/memory";

interface CitationChipProps {
  num: number;
  citation: CitationData;
  className?: string;
}

const KIND_LABELS: Record<CitationData["kind"], string> = {
  application: "Application",
  conversation: "Conversation",
  artifact: "Document",
};

export function CitationChip({ num, citation, className }: CitationChipProps) {
  const href = citation.application_id
    ? `/dashboard/${citation.application_id}`
    : null;

  const chip = (
    <span
      className={cn(
        "inline-flex h-4 min-w-4 cursor-pointer items-center justify-center rounded-sm bg-muted px-1 align-text-top text-[10px] font-medium tabular-nums transition-colors hover:bg-foreground hover:text-background",
        className,
      )}
    >
      {num}
    </span>
  );

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        {href ? (
          <Link href={href} className="no-underline">
            {chip}
          </Link>
        ) : (
          chip
        )}
      </HoverCardTrigger>
      <HoverCardContent side="top" sideOffset={6} className="w-72 p-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            <span>{KIND_LABELS[citation.kind]}</span>
            <span className="tabular-nums">
              {Math.round(citation.score * 100)}% match
            </span>
          </div>
          <p className="text-sm font-medium leading-snug">{citation.title}</p>
          {citation.subtitle && (
            <p className="text-xs text-muted-foreground">{citation.subtitle}</p>
          )}
          {href && (
            <Link
              href={href}
              className="mt-1 inline-flex items-center gap-1 text-xs text-foreground/80 hover:text-foreground"
            >
              Open
              <ArrowUpRightIcon className="size-3" />
            </Link>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function CitationSourceList({
  citations,
  referenced,
}: {
  citations: CitationData[];
  referenced: number[];
}) {
  if (referenced.length === 0) return null;
  return (
    <Collapsible className="group/sources flex flex-col gap-1.5 pt-1">
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[10px] font-semibold tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground">
        <ChevronRightIcon className="size-2.5 transition-transform duration-150 group-data-[state=open]/sources:rotate-90" />
        <span>Sources</span>
        <span className="tabular-nums">({referenced.length})</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-[collapsible-up_180ms_cubic-bezier(0.33,1,0.68,1)] data-[state=open]:animate-[collapsible-down_220ms_cubic-bezier(0.33,1,0.68,1)]">
        <div className="flex flex-col gap-0.5 pb-1">
          {referenced.map((num, i) => {
            const c = citations[num - 1];
            if (!c) return null;
            const href = c.application_id
              ? `/dashboard/${c.application_id}`
              : null;
            const inner = (
              <>
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/60">
                  [{num}]
                </span>
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
                {c.subtitle && (
                  <span className="truncate text-xs text-muted-foreground">
                    {c.subtitle}
                  </span>
                )}
              </>
            );
            const animationStyle: React.CSSProperties = {
              animationDelay: `${i * 35}ms`,
              animationFillMode: "both",
            };
            const animationClass =
              "animate-in fade-in-0 slide-in-from-top-1 duration-200";
            return href ? (
              <Link
                key={c.id}
                href={href}
                style={animationStyle}
                className={cn(
                  "flex items-baseline gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted/60",
                  animationClass,
                )}
              >
                {inner}
              </Link>
            ) : (
              <div
                key={c.id}
                style={animationStyle}
                className={cn(
                  "flex items-baseline gap-2 px-2 py-1 text-xs",
                  animationClass,
                )}
              >
                {inner}
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
