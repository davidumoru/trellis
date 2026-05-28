"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { UploadIcon, FileTextIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "profile" | "resume";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("profile");
  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setStep("resume");
  }

  function handleFile(f: File) {
    const valid = ["application/pdf"];
    if (!valid.includes(f.type)) {
      setError("Please upload a PDF file");
      return;
    }
    setError("");
    setFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  async function handleSubmit() {
    if (!file) return;
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("targetRole", targetRole);
    formData.append("resume", file);

    const res = await fetch("/api/onboarding", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="flex w-full max-w-xs flex-col items-center gap-8">
        {step === "profile" ? (
          <>
            <div className="flex flex-col items-center gap-1.5">
              <h2 className="text-base font-medium">Tell us about yourself</h2>
            </div>

            <form
              onSubmit={handleContinue}
              className="flex w-full flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm text-muted-foreground">
                  What should we call you?
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="h-10"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="role" className="text-sm text-muted-foreground">
                  What role are you targeting?
                </label>
                <Input
                  id="role"
                  type="text"
                  placeholder="Senior Frontend Engineer"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
              <Button
                type="submit"
                disabled={!name || !targetRole}
                className="h-10 w-full"
              >
                Continue
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-1.5">
              <h2 className="text-base font-medium">Upload your resume</h2>
              <p className="text-center text-sm text-muted-foreground">
                This is your base resume. The agent will tailor it for each
                application.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3">
              {!file ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 transition-colors",
                    dragging
                      ? "border-ring bg-ring/5"
                      : "border-input hover:border-ring/50 dark:bg-input/30",
                  )}
                >
                  <UploadIcon className="size-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drop your PDF here, or{" "}
                    <span className="font-medium text-foreground">browse</span>
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-input px-3 py-2.5 dark:bg-input/30">
                  <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              )}

              {error && (
                <p className="text-center text-sm text-destructive">{error}</p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading || !file}
                className="h-10 w-full"
              >
                {loading ? <Spinner /> : null}
                Get started
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
