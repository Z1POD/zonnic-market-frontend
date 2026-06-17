// src/lib/services/auth.ts

import { request, USE_MOCKS, setStoredToken } from "@/lib/api-client";
import type { AuthResponse, User } from "@/types/api";

const delay = <T,>(v: T, ms = 220) => new Promise<T>((r) => setTimeout(() => r(v), ms));

const mockUser = (username: string): User => ({
  id: `usr_${username}`,
  username,
  first_name: username.charAt(0).toUpperCase() + username.slice(1),
  display_name: username,
  source: "otp",
  role: "customer",
  date_joined: new Date().toISOString(),
});

export const authService = {
  async loginWithTelegram(): Promise<AuthResponse> {
    if (USE_MOCKS) {
      const tg = (window as unknown as {
        Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string } } } };
      }).Telegram?.WebApp;
      const tgu = tg?.initDataUnsafe?.user;
      if (!tgu) throw new Error("NO_TELEGRAM");
      const user: User = {
        id: String(tgu.id),
        first_name: tgu.first_name,
        last_name: tgu.last_name,
        username: tgu.username,
        photo_url: tgu.photo_url,
        avatar_url: tgu.photo_url,
        source: "telegram",
        role: "customer",
      };
      const token = `mock-tg-${tgu.id}`;
      setStoredToken(token);
      return delay({ token, user });
    }
    const res = await request<AuthResponse>("/auth/telegram/", { method: "POST", token: null });
    setStoredToken(res.token);
    return res;
  },

  async requestOtp(username: string): Promise<{ message: string; expires_in: number }> {
    if (USE_MOCKS) return delay({ message: "OTP sent (mock).", expires_in: 600 });
    return request("/auth/otp/request/", { method: "POST", body: { username }, token: null });
  },

  async verifyOtp(username: string, code: string): Promise<AuthResponse> {
    if (USE_MOCKS) {
      if (code.length !== 6) throw new Error("INVALID_OTP");
      const user = mockUser(username);
      const token = `mock-otp-${username}`;
      setStoredToken(token);
      return delay({ token, user });
    }
    const res = await request<AuthResponse>("/auth/otp/verify/", {
      method: "POST",
      body: { username, code },
      token: null,
    });
    setStoredToken(res.token);
    return res;
  },

  async me(): Promise<User> {
    if (USE_MOCKS) {
      const u: User = mockUser("guest");
      return delay(u);
    }
    return request<User>("/users/me/");
  },

  async updateProfile(patch: Partial<User>): Promise<User> {
    if (USE_MOCKS) return delay({ ...mockUser("guest"), ...patch });
    return request<User>("/users/me/", { method: "PUT", body: patch });
  },

  async logout(): Promise<void> {
    try {
      if (!USE_MOCKS) await request<null>("/auth/logout/", { method: "POST" });
    } finally {
      setStoredToken(null);
    }
  },
};
