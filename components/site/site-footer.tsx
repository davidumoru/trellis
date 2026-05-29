import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-8 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex w-full items-center justify-between gap-4 sm:w-auto">
          <span>
            Built for the{" "}
            <Link
              href="https://rapid-agent.devpost.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              2026 Google Cloud Rapid Agent Hackathon
            </Link>
            .
          </span>
          <div className="sm:hidden">
            <ThemeSwitcher />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="transition-colors hover:text-foreground"
          >
            Terms
          </Link>
          <div className="hidden sm:block">
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
