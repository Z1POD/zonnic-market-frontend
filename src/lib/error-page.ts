// src/lib/error-page.ts
//
// Static HTML error page served by server.ts before React hydrates.
// Matches the app's dark aesthetic so there's no visual flash between
// the SSR fallback and the React ErrorPage component.

export function renderErrorPage(opts?: {
  status?: number;
  title?: string;
  message?: string;
}): string {
  const code = opts?.status ?? 500;
  const title = opts?.title ?? (code === 404 ? "Page not found" : "Something went wrong");
  const message =
    opts?.message ??
    (code === 404
      ? "This page doesn't exist or was moved."
      : "An unexpected error occurred on our end. Try refreshing.");

  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      :root {
        --bg:         #0b0b0f;
        --surface:    #111118;
        --border:     rgba(255,255,255,0.08);
        --fg:         #f0f0f2;
        --muted:      rgba(240,240,242,0.45);
        --primary:    #C5A059;
        --radius:     1rem;
        font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      }

      body {
        background: var(--bg);
        color: var(--fg);
        display: grid;
        place-items: center;
        min-height: 100dvh;
        padding: 1.5rem;
        overflow: hidden;
      }

      /* Subtle grid */
      body::before {
        content: '';
        position: fixed;
        inset: 0;
        background-image:
          linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
        background-size: 40px 40px;
        mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%);
        pointer-events: none;
        z-index: 0;
      }

      .card {
        position: relative;
        z-index: 1;
        max-width: 26rem;
        width: 100%;
        text-align: center;
        padding: 2.5rem 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.25rem;
      }

      .illustration-container {
        position: relative;
        width: 140px;
        height: 140px;
        margin-bottom: -1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both;
      }

      .code {
        font-family: ui-monospace, 'Fira Code', monospace;
        font-size: clamp(4rem, 18vw, 6rem);
        font-weight: 900;
        line-height: 1;
        letter-spacing: -0.04em;
        background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.16) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both 0.05s;
      }

      .text { animation: fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both 0.1s; }

      h1 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 0.375rem; }
      p  { font-size: 0.875rem; color: var(--muted); line-height: 1.6; }

      .actions {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
        flex-wrap: wrap;
        animation: fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both 0.18s;
      }

      a, button {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0 1.25rem;
        height: 2.5rem;
        border-radius: 999px;
        font-size: 0.875rem;
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
        text-decoration: none;
        border: none;
        transition: opacity 0.15s, transform 0.1s;
      }
      a:hover, button:hover { opacity: 0.85; }
      a:active, button:active { transform: scale(0.97); }

      .primary   { background: var(--fg); color: var(--bg); }
      .secondary { background: transparent; color: var(--fg); border: 1px solid var(--border); }

      @keyframes fade-up {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* Playful Apparel SVG Specific Keyframe Animations */
      @keyframes svg-pulse {
        0%, 100% { transform: scale(1); opacity: 0.15; }
        50% { transform: scale(1.04); opacity: 0.35; }
      }
      @keyframes svg-dash {
        to { transform: rotate(360deg); }
      }
      @keyframes svg-tangle {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        30% { transform: translateY(-3px) rotate(-4deg); }
        70% { transform: translateY(2px) rotate(3deg); }
      }
      @keyframes svg-floating {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-5px) scale(1.05); }
      }

      .anim-pulse { transform-origin: center; animation: svg-pulse 2.5s ease-in-out infinite; }
      .anim-dash { transform-origin: center; stroke-dasharray: 6 4; animation: svg-dash 20s linear infinite; }
      .anim-tangle { transform-origin: center; animation: svg-tangle 3s ease-in-out infinite; }
      .anim-floating { transform-origin: center; animation: svg-floating 4s ease-in-out infinite; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="illustration-container">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle class="anim-pulse" cx="60" cy="60" r="52" stroke="var(--primary)" stroke-width="1" stroke-opacity="0.2" fill="var(--primary)" fill-opacity="0.02"/>
          
          <circle class="anim-dash" cx="60" cy="60" r="42" stroke="var(--primary)" stroke-width="1.5" stroke-opacity="0.4"/>
          
          <g class="anim-tangle">
            <path d="M 32,68 C 32,55 42,48 60,48 C 78,48 88,55 88,68 C 88,72 82,74 60,74 C 38,74 32,72 32,68 Z" fill="var(--bg)" opacity="0.95" />
            
            <path d="M 60,48 C 60,38 72,36 68,26 C 64,16 52,18 52,26" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  
            <path d="M 60,48 L 86,66 C 92,70 86,75 80,74 L 40,71 C 32,70 28,66 34,62 Z" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </g>

          <g class="anim-floating">
            <path d="M 60,56 L 60,63" stroke="var(--primary)" stroke-width="3" stroke-linecap="round"/>
            <circle cx="60" cy="68" r="2" fill="var(--primary)"/>
            
            <path d="M 24,40 M 28,38 L 22,44 M 94,48 L 88,52" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
            <path d="M 85,32 C 88,28 92,32 90,36" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 2" opacity="0.5"/>
          </g>
        </svg>
      </div>
      <div class="code">${code}</div>
      <div class="text">
        <h1>${title}</h1>
        <p>${message}</p>
      </div>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}

/** Convenience wrappers */
export const render404Page = () =>
  renderErrorPage({ status: 404, title: "Page not found", message: "This page doesn't exist or was moved." });

export const render500Page = () =>
  renderErrorPage({ status: 500 });