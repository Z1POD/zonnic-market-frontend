// src/server.ts
//
// Cloudflare Workers / Node-compatible fetch handler.
// Layers three defences against SSR errors:
//   1. try/catch around the handler (synchronous throws)
//   2. normalizeCatastrophicSsrResponse — handles h3's "unhandled" JSON 500s
//   3. handle404Response — detects genuine 404s and serves a matching HTML page

import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage, render404Page } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

/**
 * Detects h3's swallowed SSR errors: a 5xx JSON body containing
 * `{"unhandled":true,"message":"HTTPError"}`.
 */
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  let body: string;
  try {
    body = await response.clone().text();
  } catch {
    return response;
  }

  if (!body.includes('"unhandled":true') && !body.includes('"message":"HTTPError"')) {
    return response;
  }

  const captured = consumeLastCapturedError();
  console.error("[server] SSR error swallowed by h3:", captured ?? body);

  return new Response(renderErrorPage({ status: 500 }), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/**
 * Turns a 404 SSR response into a branded HTML 404 page.
 * TanStack Start already renders a React not-found component for known
 * routes; this catches unmatched paths that bypass the router entirely.
 */
function handle404Response(response: Response): Response {
  if (response.status !== 404) return response;
  const contentType = response.headers.get("content-type") ?? "";
  // If the router already rendered HTML (its own notFoundComponent), leave it.
  if (contentType.includes("text/html")) return response;

  return new Response(render404Page(), {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return handle404Response(normalized);
    } catch (error) {
      console.error("[server] Unhandled SSR exception:", error);
      return new Response(renderErrorPage({ status: 500 }), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};