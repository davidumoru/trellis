import { cn } from "@/lib/utils";

interface TextShimmerProps {
  children: React.ReactNode;
  className?: string;
}

export function TextShimmer({ children, className }: TextShimmerProps) {
  return (
    <span
      className={cn(
        "inline-block bg-clip-text text-transparent",
        "bg-linear-to-r from-muted-foreground/40 via-foreground to-muted-foreground/40",
        "bg-size-[200%_100%]",
        "animate-[text-shimmer_2.4s_linear_infinite]",
        className,
      )}
    >
      {children}
    </span>
  );
}
