import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoVariant = "mark" | "wordmark" | "full";

interface LogoProps {
  variant?: LogoVariant;
  href?: string | false;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  "aria-label"?: string;
}

export function Logo({
  variant = "full",
  href = "/",
  className,
  markClassName,
  wordmarkClassName,
  "aria-label": ariaLabel = "Trellis home",
}: LogoProps) {
  const content = (
    <>
      {variant !== "wordmark" && <LogoMark className={markClassName} />}
      {variant !== "mark" && <LogoWordmark className={wordmarkClassName} />}
    </>
  );

  const baseClasses =
    "inline-flex select-none items-center gap-2 [-webkit-user-drag:none]";

  if (href === false) {
    return <span className={cn(baseClasses, className)}>{content}</span>;
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        baseClasses,
        "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
      draggable={false}
    >
      {content}
    </Link>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      aria-hidden
      className={cn("size-4 select-none text-primary", className)}
    >
      <rect width="6.5" height="6.5" rx="1" fill="currentColor" />
      <rect
        x="7.5"
        width="6.5"
        height="6.5"
        rx="1"
        fill="currentColor"
        fillOpacity="0.4"
      />
      <rect
        y="7.5"
        width="6.5"
        height="6.5"
        rx="1"
        fill="currentColor"
        fillOpacity="0.4"
      />
      <rect
        x="7.5"
        y="7.5"
        width="6.5"
        height="6.5"
        rx="1"
        fill="currentColor"
      />
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-heading select-none text-lg font-semibold tracking-tight text-primary",
        className,
      )}
    >
      Trellis
    </span>
  );
}
