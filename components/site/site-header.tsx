import Link from "next/link";
import { ArrowRight as ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Logo } from "@/components/logo";

export async function SiteHeader() {
  const session = await auth.api.getSession({ headers: await headers() });
  const loggedIn = !!session;
  const ctaHref = loggedIn ? "/dashboard" : "/login";
  const primaryLabel = loggedIn ? "Open dashboard" : "Get started";

  return (
    <div className="sticky top-0 z-50 bg-background/70 backdrop-blur-md">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-8 py-6">
        <Logo
          markClassName="size-5 text-foreground"
          wordmarkClassName="text-xl text-foreground"
        />
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          {primaryLabel}
          <ArrowRightIcon className="size-3.5 opacity-60" weight="bold" />
        </Link>
      </header>
    </div>
  );
}
