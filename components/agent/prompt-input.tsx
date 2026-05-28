"use client";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface PromptInputProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}

export function PromptInput({
  children,
  onSubmit,
  className,
}: PromptInputProps) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-card p-2 shadow-sm transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
        className,
      )}
    >
      {children}
    </form>
  );
}

interface PromptInputTextareaProps {
  value: string;
  onValueChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxRows?: number;
}

export function PromptInputTextarea({
  value,
  onValueChange,
  onSubmit,
  placeholder = "Ask anything…",
  disabled,
  maxRows = 8,
}: PromptInputTextareaProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (!disabled && value.trim()) onSubmit();
        }
      }}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      style={{ maxHeight: `${maxRows * 1.5}rem` }}
      className="min-h-9 resize-none border-0 bg-transparent p-1.5 text-sm shadow-none focus-visible:ring-0 disabled:bg-transparent dark:bg-transparent"
    />
  );
}

export function PromptInputActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-1", className)}>
      {children}
    </div>
  );
}

export function PromptInputActionGroup({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>{children}</div>
  );
}
