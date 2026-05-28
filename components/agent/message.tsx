"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CitationChip } from "@/components/agent/citation";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/agent/memory";

type Role = "user" | "assistant";

interface MessageRootProps {
  role: Role;
  children: React.ReactNode;
  className?: string;
}

export function Message({ role, children, className }: MessageRootProps) {
  return (
    <div
      data-role={role}
      className={cn("group/message flex flex-col gap-2", className)}
    >
      {children}
    </div>
  );
}

export function MessageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("text-sm leading-relaxed", className)}>{children}</div>
  );
}

interface MessageMarkdownProps {
  text: string;
  citations?: Citation[];
}

export function MessageMarkdown({
  text,
  citations = [],
}: MessageMarkdownProps) {
  const interpolate = (children: React.ReactNode): React.ReactNode =>
    React.Children.map(children, (child) => {
      if (typeof child !== "string") return child;
      if (!/\[\d+\]/.test(child)) return child;
      const parts = child.split(/(\[\d+\])/g);
      return parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (!match) return part;
        const num = parseInt(match[1], 10);
        const cite = citations[num - 1];
        if (!cite) return <span key={i}>[{num}]</span>;
        return <CitationChip key={i} num={num} citation={cite} />;
      });
    });

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children, ...rest }) => (
          <p {...rest} className="mb-2 text-foreground/90 last:mb-0">
            {interpolate(children)}
          </p>
        ),
        li: ({ children, ...rest }) => (
          <li {...rest}>{interpolate(children)}</li>
        ),
        ul: ({ children, ...rest }) => (
          <ul
            {...rest}
            className="mb-2 ml-5 list-disc text-foreground/90 last:mb-0"
          >
            {children}
          </ul>
        ),
        ol: ({ children, ...rest }) => (
          <ol
            {...rest}
            className="mb-2 ml-5 list-decimal text-foreground/90 last:mb-0"
          >
            {children}
          </ol>
        ),
        a: ({ children, ...rest }) => (
          <a
            {...rest}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2 hover:text-foreground/80"
          >
            {children}
          </a>
        ),
        code: ({ children, ...rest }) => (
          <code
            {...rest}
            className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]"
          >
            {children}
          </code>
        ),
        strong: ({ children, ...rest }) => (
          <strong {...rest} className="font-semibold text-foreground">
            {children}
          </strong>
        ),
        em: ({ children, ...rest }) => (
          <em {...rest} className="italic">
            {children}
          </em>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

export function MessageActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 opacity-0 transition-opacity group-hover/message:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
