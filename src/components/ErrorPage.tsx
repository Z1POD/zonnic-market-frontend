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
      className="select-none font-mono text-[clamp(4rem,15vw,7rem)] font-black leading-none tracking-tighter mt-4"
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

// ── Animated Apparel Printing Vector Illustration ──────────────────────────


// ── Animated Swapping Apparel Printing Vector Illustration ─────────────────

function AnimatedErrorIllustration() {
  return (
    <div className="relative flex items-center justify-center w-56 h-56 text-primary" aria-hidden>
      <svg width="100%" height="100%" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background registration systems */}
        <circle 
          className="react-anim-pulse opacity-20" 
          cx="100" 
          cy="80" 
          r="75" 
          stroke="currentColor" 
          strokeWidth="1" 
          fill="currentColor" 
          fillOpacity="0.005"
        />
        <circle 
          className="react-anim-dash opacity-30" 
          cx="100" 
          cy="80" 
          r="65" 
          stroke="currentColor" 
          strokeWidth="1" 
          strokeDasharray="4 4"
        />

        {/* Tilted Apparel Carousel Container */}
        <g className="react-anim-apparel-tilt">
          
          {/* 1. THE CAP (Positioned at Center for Swapping) */}
          <g className="react-swap-cap">
            {/* Crown */}
            <path d="M 78,73 C 78,54 118,54 122,73 Z" fill="hsl(var(--background))" stroke="currentColor" strokeWidth="2.5" />
            {/* Visor/Brim */}
            <path d="M 70,73 C 75,80 121,80 126,73 C 118,70 80,70 70,73 Z" fill="hsl(var(--background))" stroke="currentColor" strokeWidth="2.5" />
            {/* Button */}
            <circle cx="100" cy="55" r="2.5" fill="currentColor" />
            
            {/* Cap Ink Reveal Layer */}
            <g clipPath="url(#apparel-print-window)">
              <path d="M 100,63 L 100,68" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            </g>
          </g>

          {/* 2. THE T-SHIRT */}
          <g className="react-swap-shirt">
            <path 
              d="M 75,45 L 87,45 C 91,52 97,52 100,52 C 103,52 109,52 113,45 L 125,45 L 143,56 L 133,70 L 123,65 L 123,120 L 77,120 L 77,65 L 67,70 L 57,56 Z" 
              fill="hsl(var(--background))" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinejoin="round"
            />
            <path d="M 87,45 C 90,50 110,50 113,45" stroke="currentColor" strokeWidth="1.5" />
            
            {/* Shirt Ink Reveal Layer */}
            <g clipPath="url(#apparel-print-window)">
              <path d="M 100,65 L 100,85" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="100" cy="95" r="2.5" fill="currentColor" />
            </g>
          </g>

          {/* 3. THE TOTE BAG */}
          <g className="react-swap-tote">
            {/* Straps */}
            <path d="M 90,65 C 90,40 110,40 110,65" stroke="currentColor" strokeWidth="2.5" fill="none" />
            {/* Bag Body */}
            <path d="M 78,65 L 122,65 L 118,120 L 82,120 Z" fill="hsl(var(--background))" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
            
            {/* Tote Ink Reveal Layer */}
            <g clipPath="url(#apparel-print-window)">
              <path d="M 100,75 L 100,90" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="100" cy="99" r="2" fill="currentColor" />
            </g>
          </g>
          
        </g>

        {/* Horizontal Printing Press Squeegee Assembly */}
        <g className="react-anim-print-mechanics">
          <g className="react-anim-squeegee">
            {/* Mechanical Sled Handle */}
            <path d="M 20,65 L 180,65 L 174,55 L 26,55 Z" fill="hsl(var(--muted))" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            {/* Rubber Blade Edge */}
            <path d="M 24,65 L 176,65 L 176,69 L 24,69 Z" fill="currentColor" />
            {/* Liquid Ink Churn Crest */}
            <path 
              className="react-anim-ink-wave"
              d="M 24,69 C 50,66 70,74 100,69 C 130,66 150,73 176,69 L 170,72 L 30,72 Z" 
              fill="currentColor"
              opacity="0.85"
            />
          </g>
        </g>
        
        {/* Print Windows Mask Bounds */}
        <defs>
          <clipPath id="apparel-print-window">
            <rect className="react-anim-screen-mask" x="20" y="30" width="160" height="40" />
          </clipPath>
        </defs>
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

      {/* Embedded Apparel Production Keyframe Engines */}
      <style>{`
        /* Update the global <style> block inside your ErrorPage component to include these looping rules: */
        @keyframes err-slide-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .err-animate { animation: err-slide-up 0.5s cubic-bezier(0.22,1,0.36,1) both; }

        @keyframes react-svg-pulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.02); opacity: 0.4; }
        }
        @keyframes react-svg-dash {
          to { transform: rotate(-360deg); }
        }
        @keyframes apparel-tilt-wobble {
          0%, 100% { transform: rotate(-6deg) translateY(0px); }
          50% { transform: rotate(-4deg) translateY(3px); }
        }

        /* 12-Second Loop: Cycles through 3 items (4 seconds per item) */
        @keyframes swap-item-1 {
          0%, 33.33% { opacity: 1; transform: scale(1) translateY(0); pointer-events: auto; }
          33.34%, 100% { opacity: 0; transform: scale(0.9) translateY(5px); pointer-events: none; }
        }
        @keyframes swap-item-2 {
          0%, 33.33% { opacity: 0; transform: scale(0.9) translateY(5px); pointer-events: none; }
          33.34%, 66.66% { opacity: 1; transform: scale(1) translateY(0); pointer-events: auto; }
          66.67%, 100% { opacity: 0; transform: scale(0.9) translateY(5px); pointer-events: none; }
        }
        @keyframes swap-item-3 {
          0%, 66.66% { opacity: 0; transform: scale(0.9) translateY(5px); pointer-events: none; }
          66.67%, 100% { opacity: 1; transform: scale(1) translateY(0); pointer-events: auto; }
        }

        /* Squeegee runs a double stroke loop every 4 seconds, synced to item swaps */
        @keyframes printing-press-sweep {
          0%, 100% { transform: translateY(-25px); }
          45%, 55% { transform: translateY(48px); }
        }
        @keyframes mask-reveal-grow {
          0%, 100% { height: 0px; }
          45%, 55% { height: 80px; }
        }
        @keyframes ink-fluid-churn {
          0%, 100% { d: path("M 24,69 C 50,66 70,74 100,69 C 130,66 150,73 176,69 L 170,72 L 30,72 Z"); }
          50% { d: path("M 24,69 C 40,72 65,65 100,71 C 135,66 160,72 176,69 L 170,72 L 30,72 Z"); }
        }

        .react-anim-pulse { transform-origin: center; animation: react-svg-pulse 3s ease-in-out infinite; }
        .react-anim-dash { transform-origin: center; animation: react-svg-dash 40s linear infinite; }
        .react-anim-apparel-tilt { transform-origin: center; animation: apparel-tilt-wobble 4s ease-in-out infinite; }

        /* Carousel Assignments */
        .react-swap-cap { transform-origin: center; animation: swap-item-1 12s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .react-swap-shirt { transform-origin: center; animation: swap-item-2 12s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .react-swap-tote { transform-origin: center; animation: swap-item-3 12s cubic-bezier(0.4, 0, 0.2, 1) infinite; }

        /* Mechanical Printing Actions */
        .react-anim-squeegee { animation: printing-press-sweep 4s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
        .react-anim-screen-mask { animation: mask-reveal-grow 4s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
        .react-anim-ink-wave { animation: ink-fluid-churn 1.33s ease-in-out infinite; }
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