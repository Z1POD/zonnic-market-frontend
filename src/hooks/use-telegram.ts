// src/hooks/use-telegram.ts

/**
 * Telegram Mini App integration. Returns the WebApp interface if available
 * and exposes `initData` for backend auth handoff.
 *
 * Safe on SSR — all access is gated behind `useEffect`.
 */
import { useEffect, useState } from "react";

interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: Record<string, unknown>;
  colorScheme?: "light" | "dark";
  ready: () => void;
  expand: () => void;
  close: () => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy") => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    const wa = window.Telegram?.WebApp;
    if (!wa) return;
    try {
      wa.ready();
      wa.expand();
    } catch {
      /* ignore */
    }
    setWebApp(wa);
  }, []);

  return {
    webApp,
    isTelegram: !!webApp && !!webApp.initData,
    initData: webApp?.initData ?? "",
  };
}
