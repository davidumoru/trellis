"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { CaretDown as ChevronDownIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ThreadContextValue {
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  jumpToLatest: () => void;
}

const ThreadContext = createContext<ThreadContextValue | null>(null);

export function useThread() {
  const ctx = useContext(ThreadContext);
  if (!ctx) throw new Error("useThread must be used inside <Thread>");
  return ctx;
}

const PILL_THRESHOLD = 80;

export function Thread({
  children,
  className,
  latestId,
}: {
  children: React.ReactNode;
  className?: string;
  latestId?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const isProgrammaticRef = useRef(false);
  const lastDockedIdRef = useRef<string | undefined>(undefined);
  const [showLatestPill, setShowLatestPill] = useState(false);

  const findLatest = useCallback((): HTMLElement | null => {
    if (!latestId || !wrapperRef.current) return null;
    return wrapperRef.current.querySelector(
      `[data-turn-id="${latestId}"]`,
    ) as HTMLElement | null;
  }, [latestId]);

  const updateSpacer = useCallback(() => {
    const scroller = scrollerRef.current;
    const spacer = spacerRef.current;
    if (!scroller || !spacer) return;
    const latestEl = findLatest();
    if (!latestEl) {
      spacer.style.height = "0px";
      return;
    }
    const remaining = scroller.clientHeight - latestEl.offsetHeight;
    spacer.style.height = `${Math.max(0, remaining)}px`;
  }, [findLatest]);

  const scrollLatestToTop = useCallback(
    (smooth = true) => {
      const latestEl = findLatest();
      if (!latestEl) return;
      isProgrammaticRef.current = true;
      latestEl.scrollIntoView({
        block: "start",
        behavior: smooth ? "smooth" : "auto",
      });
      window.setTimeout(() => {
        isProgrammaticRef.current = false;
      }, 600);
    },
    [findLatest],
  );

  useLayoutEffect(() => {
    if (!latestId) return;
    if (lastDockedIdRef.current === latestId) return;
    lastDockedIdRef.current = latestId;
    userScrolledRef.current = false;
    updateSpacer();
    requestAnimationFrame(() => scrollLatestToTop(true));
  }, [latestId, updateSpacer, scrollLatestToTop]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(() => updateSpacer());
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [updateSpacer]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    function onScroll() {
      if (isProgrammaticRef.current) return;
      userScrolledRef.current = true;
      const latestEl = findLatest();
      if (!latestEl) {
        setShowLatestPill(false);
        return;
      }
      const diff = Math.abs(scroller!.scrollTop - latestEl.offsetTop);
      setShowLatestPill(diff > PILL_THRESHOLD);
    }
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [findLatest]);

  const jumpToLatest = useCallback(() => {
    userScrolledRef.current = false;
    scrollLatestToTop(true);
    setShowLatestPill(false);
  }, [scrollLatestToTop]);

  return (
    <ThreadContext.Provider value={{ scrollerRef, jumpToLatest }}>
      <div className={cn("relative min-h-0 flex-1 overflow-hidden", className)}>
        <div ref={scrollerRef} className="h-full overflow-y-auto">
          <div ref={wrapperRef}>{children}</div>
          <div ref={spacerRef} aria-hidden style={{ height: 0 }} />
        </div>
        {showLatestPill && (
          <button
            type="button"
            onClick={jumpToLatest}
            className={cn(
              "absolute right-3 bottom-3 z-10 inline-flex items-center gap-1 rounded-full bg-popover px-2.5 py-1 text-xs text-foreground shadow-md ring-1 ring-border/60",
              "transition hover:bg-muted",
            )}
            aria-label="Jump to latest"
          >
            <ChevronDownIcon className="size-3.5" />
            Latest
          </button>
        )}
      </div>
    </ThreadContext.Provider>
  );
}

export function ThreadContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-6 px-4 py-4", className)}>
      {children}
    </div>
  );
}
