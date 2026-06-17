// src/features/auth/AuthSheet.tsx

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Send, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/store/auth";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

export function AuthSheet() {
  const open = useAuth((s) => s.sheetOpen);
  const close = useAuth((s) => s.closeSheet);
  const setSession = useAuth((s) => s.setSession);

  const [phase, setPhase] = useState<"request" | "verify">("request");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resending, setResending] = useState(false);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = () => {
    setPhase("request");
    setUsername("");
    setCode("");
    setOtpError(null);
    setResendCountdown(0);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const startCountdown = (seconds: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setResendCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const sendCode = async (isResend = false) => {
    const u = username.trim().replace(/^@/, "");
    if (u.length < 3) return toast.error("Enter your Telegram username");

    if (isResend) setResending(true);
    else setSending(true);

    try {
      const res = await api.auth.requestOtp(u);
      setUsername(u);
      setOtpError(null);
      setCode("");
      setPhase("verify");
      startCountdown(60);
      // startCountdown(res?.expires_in ?? 60);
      toast(isResend ? "Code resent" : "Code sent", {
        description: "Check your Telegram for a 6-digit code.",
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not send code";
      toast.error(msg);
    } finally {
      setSending(false);
      setResending(false);
    }
  };

  const verify = async (value: string) => {
    setCode(value);
    setOtpError(null);
    if (value.length !== 6 || verifying) return;
    setVerifying(true);
    try {
      const res = await api.auth.verifyOtp(username, value);
      setSession(res.token, res.user);
      toast.success(`Welcome${res.user.first_name ? `, ${res.user.first_name}` : ""}`);
      close();
      setTimeout(reset, 300);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Invalid code";
      setOtpError(msg);
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => (o ? null : close())}>
      <DrawerContent className="border-border bg-background">
        <DrawerHeader className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <DrawerTitle className="text-lg tracking-tight">
              {phase === "request" ? "Sign in to Zonnic" : "Enter your code"}
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              {phase === "request"
                ? "We'll send a one-time code to your Telegram."
                : `Sent to @${username}`}
            </DrawerDescription>
          </div>
          <button onClick={close} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </DrawerHeader>

        <div className="px-4 py-8 md:px-8">
          {phase === "request" ? (
            <div className="mx-auto max-w-sm space-y-5">
              <div className="space-y-2">
                <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Telegram username
                </Label>
                <Input
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_username"
                  className="h-12 rounded-xl border-border bg-surface focus-visible:ring-gold"
                />
              </div>
              <button
                onClick={() => sendCode(false)}
                disabled={sending}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gold font-semibold text-gold-foreground transition-transform active:scale-[0.99] disabled:opacity-60"
              >
                {sending ? "Sending…" : (<>Send code <ArrowRight className="h-4 w-4" /></>)}
              </button>
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              
              <a 
                href={`https://t.me/${process.env.VIT_MINIAPP_HANDLE}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-medium hover:border-gold"
              >
                <Send className="h-4 w-4" /> Open in Telegram
              </a>
            </div>
          ) : (
            <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
              {otpError && (
                <p className="text-center text-xs font-medium text-destructive">{otpError}</p>
              )}
              <InputOTP maxLength={6} value={code} onChange={verify} disabled={verifying}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className={`h-12 w-12 rounded-xl text-base transition-colors ${
                        otpError
                          ? "border-destructive ring-destructive focus-visible:ring-destructive"
                          : "border-border"
                      }`}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              {verifying && (
                <p className="text-xs text-muted-foreground">Verifying…</p>
              )}

              <div className="flex flex-col items-center gap-2">
                {resendCountdown > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Resend code in <span className="font-medium text-foreground tabular-nums">{resendCountdown}s</span>
                  </p>
                ) : (
                  <button
                    onClick={() => sendCode(true)}
                    disabled={resending}
                    className="text-xs font-medium text-gold hover:underline disabled:opacity-60"
                  >
                    {resending ? "Resending…" : "Resend code"}
                  </button>
                )}

                <button
                  onClick={() => {
                    setPhase("request");
                    setOtpError(null);
                    setCode("");
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    setResendCountdown(0);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Use a different username
                </button>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}