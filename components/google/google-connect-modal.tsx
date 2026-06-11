"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MailIcon, CalendarIcon, SparklesIcon } from "@/lib/icons";
import { authClient } from "@/lib/auth-client";

interface GoogleConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoogleConnectModal({
  open,
  onOpenChange,
}: GoogleConnectModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    setError("");
    setLoading(true);
    const { error } = await authClient.linkSocial({
      provider: "google",
      callbackURL: "/dashboard",
      scopes: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/calendar.readonly",
      ],
    });
    if (error) {
      setError(error.message ?? "Couldn't start the Google flow.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0" showCloseButton={false}>
        <div className="flex flex-col gap-5 px-6 pt-6 pb-5">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-semibold leading-tight">
              Want Trellis to catch the recruiter emails for you?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Connect Google once. Stay heads-down the rest of the time.
            </DialogDescription>
          </div>

          <ul className="flex flex-col gap-3">
            <Benefit
              icon={MailIcon}
              title="Capture recruiter emails"
              description="New messages arrive as conversation threads on the right application — no copy-paste."
            />
            <Benefit
              icon={SparklesIcon}
              title="Move roles forward automatically"
              description="When the next interview gets scheduled, Trellis updates the status."
            />
            <Benefit
              icon={CalendarIcon}
              title="Surface interview invites"
              description="Calendar events for your pipeline are linked to the right role."
            />
          </ul>
        </div>

        <div className="flex flex-col gap-2 border-t bg-muted/30 px-6 py-3">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="sm" disabled={loading}>
                Skip for now
              </Button>
            </DialogClose>
            <Button size="sm" onClick={handleConnect} disabled={loading}>
              {loading ? <Spinner /> : null}
              Connect Google
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Benefit({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 leading-snug">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
    </li>
  );
}
