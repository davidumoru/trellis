"use client";

import {
  Envelope as EnvelopeIcon,
  ArrowSquareOut as ArrowSquareOutIcon,
  DotsThree as MoreIcon,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThreadMoreMenu({ email }: { email: string }) {
  const gmailUrl = `https://mail.google.com/mail/u/0/#search/from%3A${encodeURIComponent(email)}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="More"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <MoreIcon className="size-4" weight="fill" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem className="gap-2">
          <EnvelopeIcon className="size-3.5" />
          <span className="flex-1">Mark as unread</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a
            href={gmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="gap-2"
          >
            <ArrowSquareOutIcon className="size-3.5" />
            <span className="flex-1">View in Gmail</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
