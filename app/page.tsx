import Link from "next/link";
import Image from "next/image";
import { ArrowRight as ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export default async function Home() {
  const [session, cookieStore] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    cookies(),
  ]);
  const loggedIn = !!session;
  const ctaHref = loggedIn ? "/dashboard" : "/login";
  const isLight = cookieStore.get("theme")?.value === "light";

  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader />

      <main>
        <section className="mx-auto w-full max-w-7xl px-8 pt-24 pb-12 lg:pt-32">
          <h1 className="font-heading max-w-3xl text-[clamp(1.5rem,3.25vw,2.5rem)] leading-[1.15] font-medium tracking-[-0.02em]">
            Built to remember every thread, every resume, every recruiter —{" "}
            <span className="text-muted-foreground">
              Trellis is the agent that runs your job hunt.
            </span>
          </h1>

          <div className="mt-12 flex items-center gap-3">
            <Link
              href={ctaHref}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:px-5 sm:py-2.5"
            >
              {loggedIn ? "Open dashboard" : "Get started"}
              <ArrowRightIcon className="size-3.5 opacity-60" weight="bold" />
            </Link>
            <a
              href="#loops"
              className="inline-flex shrink-0 items-center rounded-full border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 sm:px-5 sm:py-2.5"
            >
              See how it works
            </a>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-8 pb-32">
          <HeroScreenshot isLight={isLight} />
        </section>

        <section id="loops" className="border-t border-border bg-background">
          <div className="mx-auto w-full max-w-7xl px-8 py-32">
            <h2 className="font-heading mb-20 max-w-xl text-4xl font-medium leading-[1.1] tracking-[-0.02em] sm:text-5xl">
              The whole pipeline,
              <br />
              <span className="text-muted-foreground">on autopilot.</span>
            </h2>

            <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
              {LOOPS.map((loop, i) => (
                <div
                  key={loop.title}
                  className="flex flex-col gap-4 bg-background p-8"
                >
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="tabular-nums">0{i + 1}</span>
                    <span>·</span>
                    <span className="tracking-wider uppercase">
                      {loop.kicker}
                    </span>
                  </div>
                  <h3 className="font-heading text-xl font-medium tracking-tight">
                    {loop.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {loop.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="stack" className="border-t border-border">
          <div className="mx-auto w-full max-w-7xl px-8 py-24">
            <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
              <h2 className="font-heading text-3xl font-medium leading-tight tracking-tight">
                Built on production-grade tools.
              </h2>
              <ul className="flex flex-col divide-y divide-border">
                {STACK.map((s) => (
                  <li
                    key={s.k}
                    className="flex items-center justify-between gap-6 py-3 text-sm"
                  >
                    <span className="font-medium">{s.k}</span>
                    <span className="text-muted-foreground">{s.v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

const LOOPS = [
  {
    kicker: "Intake",
    title: "Paste a URL, get a tailored resume.",
    body: "Drop a JD link. Trellis reads it, finds the matches in your archive, drafts a tailored resume and cover letter — ready for your review.",
  },
  {
    kicker: "Memory",
    title: "Ask anything across your pipeline.",
    body: "Vector search over every application, conversation, and document. Cited answers, not vibes. Powered by MongoDB Atlas Vector Search.",
  },
  {
    kicker: "Maintenance",
    title: "Stale threads surface themselves.",
    body: "Auto-detects threads waiting on you for too long. Drafts the follow-up. Keeps the pipeline warm before it goes cold.",
  },
];

const STACK = [
  { k: "Model", v: "google/gemini-3-flash" },
  { k: "Embeddings", v: "text-embedding-005 @ 768d" },
  { k: "Vector search", v: "MongoDB Atlas $vectorSearch" },
  { k: "Runtime", v: "Next.js 16 · React 19 · Turbopack" },
  { k: "Auth", v: "better-auth · email OTP + Google OAuth" },
];

function HeroScreenshot({ isLight }: { isLight: boolean }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute inset-x-[-2%] inset-y-[-4%] -z-10 rounded-[2rem] bg-linear-to-br from-amber-100/8 via-rose-100/5 to-sky-100/6"
      />
      <div
        aria-hidden
        className="absolute inset-x-[-2%] inset-y-[-4%] -z-10 rounded-[2rem] opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="relative aspect-3/4 w-full overflow-hidden rounded-md border border-border shadow-2xl shadow-black/40 sm:aspect-5088/3354">
        <Image
          src="/landing/hero-light.jpeg"
          alt="Trellis dashboard"
          fill
          priority={isLight}
          sizes="(min-width: 1280px) 1152px, 100vw"
          className="object-cover object-top-left dark:hidden"
        />
        <Image
          src="/landing/hero-dark.jpeg"
          alt="Trellis dashboard"
          fill
          priority={!isLight}
          sizes="(min-width: 1280px) 1152px, 100vw"
          className="hidden object-cover object-top-left dark:block"
        />
      </div>
    </div>
  );
}
