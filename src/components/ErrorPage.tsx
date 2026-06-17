// src/components/ErrorPage.tsx
//
// Universal animated error page. Used by:
//  – React error boundaries (client crashes)
//  – TanStack Router errorComponent / notFoundComponent (route errors)
//  – 404 not-found routes
//  – SSR fallback (static HTML version in error-page.ts handles pre-hydration)

import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Home, RefreshCw } from "lucide-react";

// ── Error type classifier ──────────────────────────────────────────────────

type ErrorKind = "not_found" | "network" | "auth" | "server" | "unknown";

function classifyError(error?: unknown): ErrorKind {
  if (!error) return "unknown";
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    const name = (error as any).name?.toLowerCase() ?? "";
    const code = (error as any).code ?? (error as any).status ?? 0;
    if (code === 404 || msg.includes("not found") || msg.includes("notfound")) return "not_found";
    if (code === 401 || code === 403 || msg.includes("auth") || msg.includes("unauthorized")) return "auth";
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection")) return "network";
    if (code >= 500 || msg.includes("server") || name.includes("httperror")) return "server";
  }
  return "unknown";
}

const ERROR_COPY: Record<
  ErrorKind,
  { code: string; headline: string; body: string; cta: string }
> = {
  not_found: {
    code: "404",
    headline: "Page not found",
    body: "This page doesn't exist or was moved. Check the URL or head back.",
    cta: "Go home",
  },
  network: {
    code: "ERR",
    headline: "Connection lost",
    body: "We couldn't reach the server. Check your internet and try again.",
    cta: "Try again",
  },
  auth: {
    code: "401",
    headline: "Access denied",
    body: "You don't have permission to view this page. Sign in and try again.",
    cta: "Go home",
  },
  server: {
    code: "500",
    headline: "Something went wrong",
    body: "An unexpected error occurred on our end. We've been notified.",
    cta: "Go home",
  },
  unknown: {
    code: "ERR",
    headline: "Something went wrong",
    body: "An unexpected error occurred. You can try refreshing or head back.",
    cta: "Go home",
  },
};

// ── Animated grid background ───────────────────────────────────────────────

function GridBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        backgroundImage: `
          linear-gradient(to right, hsl(var(--border) / 0.3) 1px, transparent 1px),
          linear-gradient(to bottom, hsl(var(--border) / 0.3) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)",
      }}
    />
  );
}

// ── Floating code digit ────────────────────────────────────────────────────

function ErrorCode({ code }: { code: string }) {
  return (
    <div
      className="select-none font-mono text-[clamp(4rem,15vw,7rem)] font-black leading-none tracking-tighter mt-2"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--foreground) / 0.08) 0%, hsl(var(--foreground) / 0.18) 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "text-foreground",
        backgroundClip: "text",
        filter: "drop-shadow(0 0 40px hsl(var(--primary) / 0.05))",
      }}
    >
      {code}
    </div>
  );
}

// ── Animated Vector Illustration ──────────────────────────────────────────

function AnimatedErrorIllustration() {
  return (
    <div className="relative flex items-center justify-center w-32 h-32 text-primary" aria-hidden>
      <svg width="100%" height="100%" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle 
          className="react-anim-pulse opacity-20" 
          cx="60" 
          cy="60" 
          r="52" 
          stroke="currentColor" 
          strokeWidth="1" 
          fill="currentColor" 
          fillOpacity="0.02"
        />

        <circle 
          className="react-anim-dash opacity-40" 
          cx="60" 
          cy="60" 
          r="42" 
          stroke="currentColor" 
          strokeWidth="1.5"
        />
        
        <g className="react-anim-tangle">
          {/* Backing shield using CSS theme design system tokens */}
          <path 
            d="M 32,68 C 32,55 42,48 60,48 C 78,48 88,55 88,68 C 88,72 82,74 60,74 C 38,74 32,72 32,68 Z" 
            fill="hsl(var(--background))" 
            opacity="0.95" 
          />
          
          {/* Hanger hook mutated into an abstract questioning loop */}
          <path 
            d="M 60,48 C 60,38 72,36 68,26 C 64,16 52,18 52,26" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
                
          {/* Main hanger body frame structural paths */}
          <path 
            d="M 60,48 L 86,66 C 92,70 86,75 80,74 L 40,71 C 32,70 28,66 34,62 Z" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </g>

        {/* Floating Playful Apparel Elements (Thread Loops / Seams) */}
        <g className="react-anim-floating">
          {/* Apparel themed Exclamation Point accent */}
          <path d="M 60,56 L 60,63" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="60" cy="68" r="2" fill="currentColor"/>
          
          
        </g>
      </svg>
    </div>
  );
}

// ── Main ErrorPage ─────────────────────────────────────────────────────────

interface ErrorPageProps {
  error?: unknown;
  reset?: () => void;
  /** Override the kind classification (e.g. for explicit 404 routes) */
  kind?: ErrorKind;
  /** Show/hide the back button */
  showBack?: boolean;
}

export function ErrorPage({ error, reset, kind: kindOverride, showBack = true }: ErrorPageProps) {
  const router = useRouter();
  const kind = kindOverride ?? classifyError(error);
  const copy = ERROR_COPY[kind];
  const isNetwork = kind === "network";

  const [visible, setVisible] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    // Stagger in after one frame so CSS transitions fire
    const t = setTimeout(() => setVisible(true), 16);
    return () => clearTimeout(t);
  }, []);

  const errorMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : null;

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-5 py-20">
      <GridBackground />

      {/* Playful Apparel SVG Animations injected globally */}
      <style>{`
        @keyframes err-slide-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .err-animate { animation: err-slide-up 0.5s cubic-bezier(0.22,1,0.36,1) both; }

        @keyframes react-svg-pulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.04); opacity: 0.35; }
        }
        @keyframes react-svg-dash {
          to { transform: rotate(360deg); }
        }
        @keyframes react-svg-tangle {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          30% { transform: translateY(-3px) rotate(-4deg); }
          70% { transform: translateY(2px) rotate(3deg); }
        }
        @keyframes react-svg-floating {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-5px) scale(1.05); }
        }

        .react-anim-pulse { transform-origin: center; animation: react-svg-pulse 2.5s ease-in-out infinite; }
        .react-anim-dash { transform-origin: center; stroke-dasharray: 6 4; animation: react-svg-dash 20s linear infinite; }
        .react-anim-tangle { transform-origin: center; animation: react-svg-tangle 3s ease-in-out infinite; }
        .react-anim-floating { transform-origin: center; animation: react-svg-floating 4s ease-in-out infinite; }
      `}</style>

      <div
        className="relative z-10 flex max-w-md flex-col items-center gap-4 text-center"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s ease" }}
      >
        {/* Animated Vector Illustration + Error Code wrapper */}
        <div className="relative flex flex-col items-center justify-center">
          <AnimatedErrorIllustration />
          <ErrorCode code={copy.code} />
        </div>

        {/* Text block */}
        <div
          className="err-animate space-y-2"
          style={{ animationDelay: "0.1s" }}
        >
          <h1 className="text-2xl font-semibold tracking-tight">{copy.headline}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
        </div>

        {/* Error detail (dev / power users) */}
        {errorMessage && (
          <div
            className="err-animate w-full"
            style={{ animationDelay: "0.18s" }}
          >
            <button
              onClick={() => setDetailOpen((o) => !o)}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition"
            >
              {detailOpen ? "Hide" : "Show"} error detail
            </button>
            {detailOpen && (
              <pre className="mt-2 max-h-32 overflow-auto rounded-xl border border-border bg-surface px-4 py-3 text-left text-[11px] text-muted-foreground">
                {errorMessage}
              </pre>
            )}
          </div>
        )}

        {/* CTAs */}
        <div
          className="err-animate flex flex-wrap items-center justify-center gap-2"
          style={{ animationDelay: "0.22s" }}
        >
          {isNetwork && reset ? (
            <button
              onClick={reset}
              className="flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-90 active:scale-[0.98]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
          ) : (
            <Link
              to="/"
              className="flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-90 active:scale-[0.98]"
            >
              <Home className="h-3.5 w-3.5" />
              {copy.cta}
            </Link>
          )}

          {showBack && (
            <button
              onClick={() => router.history.back()}
              className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-medium text-foreground transition hover:border-foreground/30 active:scale-[0.98]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Go back
            </button>
          )}

          {reset && !isNetwork && (
            <button
              onClick={reset}
              className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-medium text-foreground transition hover:border-foreground/30 active:scale-[0.98]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── React Error Boundary ───────────────────────────────────────────────────

import { Component, type ErrorInfo, type ReactNode } from "react";

interface BoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface BoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <ErrorPage error={error} reset={this.reset} />;
  }
}

// ── Not-found page (explicit 404 routes) ──────────────────────────────────

export function NotFoundPage() {
  return <ErrorPage kind="not_found" showBack />;
}