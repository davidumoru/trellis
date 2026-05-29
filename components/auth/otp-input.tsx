"use client";

import { useRef, useCallback } from "react";
import { motion, useAnimation } from "motion/react";
import { cn } from "@/lib/utils";

type OtpStatus = "idle" | "success" | "error";

interface OtpInputProps {
  value: string;
  length?: number;
  status?: OtpStatus;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
}

export function OtpInput({
  value,
  length = 6,
  status = "idle",
  onChange,
  onComplete,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const controls = useAnimation();

  const focusInput = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, length - 1));
      inputsRef.current[clamped]?.focus();
    },
    [length],
  );

  function handleChange(index: number, char: string) {
    if (status !== "idle") return;
    if (!/^\d?$/.test(char)) return;

    const chars = value.split("");
    chars[index] = char;
    const next = chars.join("").slice(0, length);
    onChange(next);

    if (char && index < length - 1) {
      focusInput(index + 1);
    }

    if (next.length === length && char) {
      onComplete?.(next);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (status !== "idle") return;
    if (e.key === "Backspace" && !value[index] && index > 0) {
      focusInput(index - 1);
    }
    if (e.key === "ArrowLeft") focusInput(index - 1);
    if (e.key === "ArrowRight") focusInput(index + 1);
  }

  function handlePaste(e: React.ClipboardEvent) {
    if (status !== "idle") return;
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    onChange(pasted);
    focusInput(Math.min(pasted.length, length - 1));
    if (pasted.length === length) {
      onComplete?.(pasted);
    }
  }

  if (status === "error") {
    controls.start({
      x: [0, -6, 6, -4, 4, -2, 2, 0],
      transition: { duration: 0.4, ease: "easeOut" },
    });
  }

  return (
    <motion.div
      className="flex items-center justify-center gap-2"
      animate={controls}
    >
      {Array.from({ length }).map((_, i) => (
        <motion.input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          autoFocus={i === 0}
          disabled={status !== "idle"}
          animate={
            status === "success"
              ? {
                  borderColor: "oklch(0.65 0.2 145)",
                  boxShadow: "0 0 0 3px oklch(0.65 0.2 145 / 0.25)",
                }
              : status === "error"
                ? {
                    borderColor: "oklch(0.65 0.2 25)",
                    boxShadow: "0 0 0 3px oklch(0.65 0.2 25 / 0.25)",
                  }
                : {}
          }
          transition={{
            duration: 0.2,
            delay: status !== "idle" ? i * 0.04 : 0,
          }}
          className={cn(
            "size-11 rounded-lg border border-input bg-transparent text-center text-lg font-medium tabular-nums outline-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:opacity-70",
            "dark:bg-input/30",
          )}
        />
      ))}
    </motion.div>
  );
}
