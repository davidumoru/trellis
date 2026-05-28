"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { OtpInput } from "@/components/otp-input";
import { MailIcon } from "lucide-react";

type Step = "email" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpStatus, setOtpStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });

    setLoading(false);

    if (error) {
      setError(error.message ?? "Failed to send code");
      return;
    }

    setStep("otp");
  }

  async function handleVerifyOtp(code: string) {
    setOtpStatus("idle");
    setLoading(true);

    const { error } = await authClient.signIn.emailOtp({
      email,
      otp: code,
    });

    setLoading(false);

    if (error) {
      setOtpStatus("error");
      setTimeout(() => {
        setOtpStatus("idle");
        setOtp("");
      }, 600);
      return;
    }

    setOtpStatus("success");
    setTimeout(() => router.push("/dashboard"), 500);
  }

  async function handleResend() {
    setLoading(true);

    await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });

    setLoading(false);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="flex w-full max-w-xs flex-col items-center gap-8">
        {step === "email" ? (
          <>
            <h1 className="text-lg font-semibold tracking-tight">Trellis</h1>

            <div className="flex flex-col items-center gap-1.5">
              <h2 className="text-base font-medium">What&apos;s your email address?</h2>
            </div>

            <form
              onSubmit={handleSendOtp}
              className="flex w-full flex-col gap-3"
            >
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="h-10"
              />
              {error && (
                <p className="text-center text-sm text-destructive">{error}</p>
              )}
              <Button
                type="submit"
                disabled={loading || !email}
                className="h-10 w-full"
              >
                {loading ? <Spinner /> : null}
                Continue with email
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-1.5">
              <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted">
                <MailIcon className="size-5 text-muted-foreground" />
              </div>
              <h2 className="text-base font-medium">Check your email</h2>
              <p className="text-center text-sm text-muted-foreground">
                Enter the code sent to {email}
              </p>
            </div>

            <div className="flex w-full flex-col items-center gap-3">
              <OtpInput
                value={otp}
                status={otpStatus}
                onChange={setOtp}
                onComplete={handleVerifyOtp}
              />
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="mt-1 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
