// src/store/orders.ts

// Lightweight client-state store: only tracks drawer / receipt-flow UI state.
// Order data itself lives on the backend (queried via TanStack Query).

import { create } from "zustand";

interface OrdersUiState {
  /** ID of the most recently placed order — used to deep-link from the checkout success screen. */
  lastOrderId: string | null;
  setLastOrderId: (id: string | null) => void;
}

export const useOrdersUi = create<OrdersUiState>((set) => ({
  lastOrderId: null,
  setLastOrderId: (id) => set({ lastOrderId: id }),
}));

export const ORDER_FLOW = [
  "pending",
  "confirmed",
  "processing",
  "printing",
  "shipped",
  "delivered",
] as const;

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Order received",
  confirmed: "Payment confirmed",
  processing: "Preparing your order",
  printing: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
