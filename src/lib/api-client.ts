// src/lib/api-client.ts

// Centralized HTTP client. All service modules go through `request()` so
// auth headers, the `X-App` identifier, Telegram init data, response-envelope
// unwrapping, and error normalization live in exactly one place.

import type { ApiEnvelope } from "@/types/api";

const RAW_BASE = 
  typeof process !== "undefined" && process.env?.VITE_API_BASE_URL
    ? process.env.VITE_API_BASE_URL
    : (import.meta as any).env?.VITE_API_BASE_URL;

/** Base URL for the real backend. `undefined` means "use mocks". */
export const API_BASE_URL: string | undefined = RAW_BASE
  ? RAW_BASE.replace(/\/+$/, "")
  : undefined;


const TOKEN_KEY = "ml-auth-token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage disabled */
  }
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(message: string, opts: { code?: string; status?: number; details?: unknown } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = opts.code ?? "API_ERROR";
    this.status = opts.status ?? 0;
    this.details = opts.details;
  }
}

export type QueryValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryValue>;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  query?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
  /** Pass an explicit token (e.g. one we just received from /auth/). */
  token?: string | null;
  signal?: AbortSignal;
  /** Pass true to return the entire envelope instead of unwrapping `.data`. */
  raw?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = `${API_BASE_URL ?? ""}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function getTelegramInitData(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram
    ?.WebApp;
  return tg?.initData || undefined;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError("Backend disabled (no VITE_API_BASE_URL set).", { code: "NO_BACKEND" });
  }

  const token = opts.token === undefined ? getStoredToken() : opts.token;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-App": "marketplace",
    ...(opts.headers ?? {}),
  };
  if (opts.body !== undefined && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Token ${token}`;
  const initData = getTelegramInitData();
  if (initData) headers["X-Telegram-Init-Data"] = initData;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? "GET",
      headers,
      signal: opts.signal,
      body:
        opts.body === undefined
          ? undefined
          : opts.body instanceof FormData
            ? opts.body
            : JSON.stringify(opts.body),
    });
  } catch (cause) {
    throw new ApiError("Network error. Check your connection and try again.", {
      code: "NETWORK_ERROR",
      details: cause,
    });
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  let payload: ApiEnvelope<T> | T | null = null;
  try {
    payload = (await res.json()) as ApiEnvelope<T> | T;
  } catch {
    payload = null;
  }

  // Envelope `{ success, data, error }` handling.
  if (payload && typeof payload === "object" && "success" in (payload as object)) {
    const env = payload as ApiEnvelope<T>;
    if (env.success) return opts.raw ? (env as unknown as T) : (env.data as T);
    // Verify-poll uses success=false with a meaningful data payload — caller can opt-in via raw.
    if (opts.raw) return env as unknown as T;
    throw new ApiError(env.error?.message ?? `Request failed (${res.status})`, {
      code: env.error?.code ?? `HTTP_${res.status}`,
      status: res.status,
      details: env.error?.details ?? env.data,
    });
  }

  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status})`, {
      code: `HTTP_${res.status}`,
      status: res.status,
      details: payload,
    });
  }
  return payload as T;
}
