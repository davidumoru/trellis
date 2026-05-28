"use client";

import { useEffect, useState } from "react";
import { GoogleConnectModal } from "@/components/google-connect-modal";

const DISMISSED_KEY = "trellis-google-popup-dismissed";

interface GoogleConnectPopupProps {
  googleConnected: boolean;
}

export function GoogleConnectPopup({
  googleConnected,
}: GoogleConnectPopupProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (googleConnected) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISSED_KEY) === "true") return;

    // Small delay so the dashboard renders first
    const t = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [googleConnected]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && typeof window !== "undefined") {
      localStorage.setItem(DISMISSED_KEY, "true");
    }
  }

  return <GoogleConnectModal open={open} onOpenChange={handleOpenChange} />;
}
