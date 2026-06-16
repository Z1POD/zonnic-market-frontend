# Sonny Studio

A luxury custom-apparel marketplace. Browse curated pieces from independent creators, configure them live in a 3D viewer, and order — all from a single seamless interface built for Telegram Mini App and mobile web.

---

## What it does

| Surface | Details |
|---------|---------|
| **Catalog** | Grid of creator products with filtering, ratings, and live sold counts |
| **3D Product Viewer** | GLTF model rendered with per-product lighting, camera, and environment — decals placed exactly as the creator designed them |
| **Color & Size Picker** | Floating swatch picker on mobile, inline on desktop; per-color size availability and pricing |
| **Cart & Checkout** | Persistent cart with multi-store support, manual payment receipt submission, and real-time verification polling |
| **Order Tracking** | Full order timeline — pending → confirmed → printing → shipped → delivered |
| **Store Pages** | Per-creator storefronts with product grids and store metadata |
| **Auth** | Telegram Mini App auto sign-in + OTP fallback (6-digit code via Telegram bot) with countdown and resend |

---

## Stack

```
Framework     TanStack Start (SSR, file-based routing)
UI            React 18 + Tailwind CSS + shadcn/ui
3D            React Three Fiber · drei · Three.js
State         Zustand (auth, cart, orders)
Data          TanStack Query (server state, caching)
Animation     Framer Motion
Auth          Telegram WebApp · OTP via bot
Deployment    Cloudflare Pages + Workers (WinterCG fetch handler)
```

## Getting started

```bash
# Install
npm install

# Set environment
cp .env.example .env.local
# VITE_API_BASE_URL=https://api.example.com

# Dev server (SSR)
npm run dev

# Production build
npm run build

# Deploy to Cloudflare Pages
npm run deploy
```

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend API base URL. Omit to run in mock mode. |

When `VITE_API_BASE_URL` is unset the app runs entirely on local mock data — useful for UI development without a backend.

---

## API contract

All endpoints follow a consistent envelope:

```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

Auth uses `Authorization: Token <token>` headers, automatically injected by `api-client.ts`. Telegram Mini App sessions attach `X-Telegram-Init-Data` instead.

---

## Error handling

Four layers, outermost to innermost:

1. **`server.ts`** — catches anything that escapes h3; serves branded static HTML
2. **`start.ts` middleware** — catches loader/action throws; re-throws routing signals
3. **`__root.tsx` errorComponent** — React-level boundary for all route errors
4. **`<ErrorBoundary>`** — wraps isolated subtrees (e.g. the 3D canvas)

All layers surface the same branded animated error page with per-error-type copy and a collapsible detail panel.

---

## Deployment

The `server.ts` export matches the **Cloudflare Workers WinterCG** interface (`fetch(request, env, ctx)`). No adapter required.

```bash
npm run build
npx wrangler pages deploy dist/
```

For Vercel, a thin `@vercel/node` adapter is needed — see `DEPLOYMENT_AND_FILE_GUIDE.md`.

---

## License

Private — all rights reserved.