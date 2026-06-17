// src/lib/api.ts

// Aggregate service entrypoint. Components/queries import `api` from here.

import { authService } from "@/lib/services/auth";
import { marketService } from "@/lib/services/market";
import { ordersService } from "@/lib/services/orders";
import { paymentService } from "@/lib/services/payment";
import { shippingService } from "@/lib/services/shipping";

export const api = {
  market: marketService,
  auth: authService,
  orders: ordersService,
  payment: paymentService,
  shipping: shippingService,
};

export type Api = typeof api;
export { ApiError, API_BASE_URL, USE_MOCKS } from "@/lib/api-client";

