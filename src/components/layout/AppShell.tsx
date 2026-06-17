// src/components/layout/AppShell.tsx

import { useEffect, type ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { CartDrawer } from "@/features/cart/CartDrawer";
import { CheckoutDrawer } from "@/features/checkout/CheckoutDrawer";
import { AuthSheet } from "@/features/auth/AuthSheet";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/store/auth";
import { applyThemeClass, useTheme } from "@/store/theme";

export function AppShell({ children }: { children: ReactNode }) {
  const bootstrap = useAuth((s) => s.bootstrap);
  const mode = useTheme((s) => s.mode);

  useEffect(() => {
    applyThemeClass(mode);
  }, [mode]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>{children}</main>
      <CartDrawer />
      <CheckoutDrawer />
      <AuthSheet />
      <Toaster position="top-center" theme="system" />
    </div>
  );
}
