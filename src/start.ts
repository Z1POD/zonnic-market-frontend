// src/start.ts
//
// TanStack Start instance with server-side error middleware.
// Catches loader/action throws before h3 swallows them,
// so we can log the real stack and return a branded HTML error page.

import { createStart, createMiddleware } from "@tanstack/react-start";
import { renderErrorPage } from "./lib/error-page";

/**
 * Server middleware that catches all unhandled errors from loaders,
 * actions, and SSR render — except TanStack's own routing signals
 * (redirect, notFound) which carry a `statusCode` property and must
 * be re-thrown so the router handles them correctly.
 */
const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // TanStack routing signals: redirect (statusCode 3xx) and notFound (statusCode 404)
    if (isRoutingSignal(error)) {
      throw error;
    }

    console.error("[start] Unhandled server error:", error);

    return new Response(renderErrorPage({ status: 500 }), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

function isRoutingSignal(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  if ("statusCode" in error) return true;
  // TanStack notFound throws an object with isNotFound
  if ("isNotFound" in error) return true;
  return false;
}

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));