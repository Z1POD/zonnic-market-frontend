// src/store/auth.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/api";
import { api } from "@/lib/api";
import { getStoredToken, setStoredToken } from "@/lib/api-client";

interface AuthState {
  user: User | null;
  token: string | null;
  isTelegram: boolean;
  hydrated: boolean;
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  setSession: (token: string, user: User) => void;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  bootstrap: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isTelegram: false,
      hydrated: false,
      sheetOpen: false,
      openSheet: () => set({ sheetOpen: true }),
      closeSheet: () => set({ sheetOpen: false }),

      setSession: (token, user) => {
        setStoredToken(token);
        set({ token, user });
      },

      signOut: async () => {
        if (get().isTelegram) return; // can't sign out of the host
        try {
          await api.auth.logout();
        } catch {
          /* network errors swallowed — local state is the source of truth */
        }
        setStoredToken(null);
        set({ user: null, token: null });
      },

      refreshMe: async () => {
        try {
          const me = await api.auth.me();
          set({ user: me });
        } catch {
          // invalid/expired token
          setStoredToken(null);
          set({ user: null, token: null });
        }
      },

      bootstrap: async () => {
        if (typeof window === "undefined") {
          set({ hydrated: true });
          return;
        }

        // 1) Telegram WebApp — auto sign-in
        const tg = (window as unknown as {
          Telegram?: {
            WebApp?: {
              initData?: string;
              initDataUnsafe?: { user?: unknown };
              ready?: () => void;
              expand?: () => void;
            };
          };
        }).Telegram?.WebApp;
        if (tg?.initDataUnsafe?.user) {
          try {
            tg.ready?.();
            tg.expand?.();
          } catch {
            /* noop */
          }
          set({ isTelegram: true });
          try {
            const res = await api.auth.loginWithTelegram();
            setStoredToken(res.token);
            set({ token: res.token, user: res.user, hydrated: true });
            return;
          } catch {
            /* fall through to stored token / unauthenticated */
          }
        }

        // 2) Stored token — rehydrate /users/me/
        const stored = getStoredToken();
        if (stored) {
          set({ token: stored });
          await get().refreshMe();
        }
        set({ hydrated: true });
      },
    }),
    {
      name: "ml-auth",
      partialize: (s) => ({ user: s.user, token: s.token }),
    },
  ),
);
