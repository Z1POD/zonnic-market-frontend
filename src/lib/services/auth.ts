// src/lib/services/auth.ts

import { request, setStoredToken } from "@/lib/api-client";
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
    const res = await request<AuthResponse>("/auth/telegram/", { method: "POST", token: null });
    setStoredToken(res.token);
    return res;
  },

  async requestOtp(username: string): Promise<{ message: string; expires_in: number }> {
    return request("/auth/otp/request/", { method: "POST", body: { username }, token: null });
  },

  async verifyOtp(username: string, code: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>("/auth/otp/verify/", {
      method: "POST",
      body: { username, code },
      token: null,
    });
    setStoredToken(res.token);
    return res;
  },

  async me(): Promise<User> {
    return request<User>("/users/me/");
  },

  async updateProfile(patch: Partial<User>): Promise<User> {
    return request<User>("/users/me/", { method: "PUT", body: patch });
  },

  async logout(): Promise<void> {
    try {
      await request<null>("/auth/logout/", { method: "POST" });
    } finally {
      setStoredToken(null);
    }
  },
};
