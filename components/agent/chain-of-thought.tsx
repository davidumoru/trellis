"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Lightbulb as LightbulbIcon,
  CaretRight as ChevronRightIcon,
} from "@phosphor-icons/react";
import { TextShimmer } from "@/components/agent/text-shimmer";
import { cn } from "@/lib/utils";

interface ChainOfThoughtProps {
  trail: string[];
  isComplete?: boolean;
  thoughtSeconds?: number;
  className?: string;
}

const MASK_GRADIENT =
  "linear-gradient(180deg, transparent 0%, black 25%, black 75%, transparent 100%)";
const EASE_OUT_QUART = [0.33, 1, 0.68, 1] as const;

export function ChainOfThought({
  trail,
  isComplete,
  thoughtSeconds,
  className,
}: ChainOfThoughtProps) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isComplete || !scrollRef.current) return;
    const el = scrollRef.current;
    const target = el.scrollHeight;
    const start = el.scrollTop;
    if (Math.abs(target - start) < 1) return;
    const startTime = performance.now();
    const duration = 1000;
    if (scrollRafRef.current != null)
      cancelAnimationFrame(scrollRafRef.current);
    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      el.scrollTop = start + (target - start) * t;
      if (t < 1) scrollRafRef.current = requestAnimationFrame(step);
      else scrollRafRef.current = null;
    };
    scrollRafRef.current = requestAnimationFrame(step);
    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [trail, isComplete]);

  const showLine =
    (!isComplete && trail.length > 0) ||
    (isComplete && expanded && trail.length > 0);

  return (
    <div className={cn("relative flex flex-col", className)}>
      {showLine && (
        <motion.span
          aria-hidden
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
          style={{ transformOrigin: "top" }}
          className="absolute left-[7.5px] top-7 bottom-1 w-px bg-border"
        />
      )}

      <div className="flex h-7 items-center gap-2">
        <LightbulbIcon className="size-4 shrink-0 text-muted-foreground" />
        <AnimatePresence mode="wait" initial={false}>
          {isComplete ? (
            <motion.button
              key="done"
              type="button"
              onClick={() => setExpanded((e) => !e)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>
                Thought
                {thoughtSeconds != null && thoughtSeconds > 0
                  ? ` for ${thoughtSeconds}s`
                  : ""}
              </span>
              <motion.span
                animate={{ rotate: expanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="flex size-4 items-center justify-center"
              >
                <ChevronRightIcon className="size-3.5" />
              </motion.span>
            </motion.button>
          ) : (
            <motion.span
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <TextShimmer className="text-xs">Thinking…</TextShimmer>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {!isComplete && trail.length > 0 && (
          <motion.div
            key="viewport"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "6rem", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT_QUART }}
            className="relative overflow-hidden"
          >
            <div
              className="h-full"
              style={{
                maskImage: MASK_GRADIENT,
                WebkitMaskImage: MASK_GRADIENT,
              }}
            >
              <div
                ref={scrollRef}
                className="h-full overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
              >
                <div className="flex flex-col gap-2 py-4 pl-6">
                  {trail.map((text, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6, ease: "linear" }}
                      className="text-xs leading-5 text-muted-foreground/60"
                    >
                      {text}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isComplete && expanded && trail.length > 0 && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT_QUART }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1 pt-2 pl-6">
              {trail.map((text, i) => (
                <div key={i} className="text-xs leading-5 text-foreground/80">
                  {text}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
