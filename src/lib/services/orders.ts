// src/lib/services/orders.ts

import { request } from "@/lib/api-client";
import type {
  CreateOrderInput,
  Order,
  OrderListItem,
  OrderListResponse,
  Invoice,
} from "@/types/api";
import { mockCreateOrder, mockListOrders, mockGetOrder, mockCancelOrder } from "@/lib/mock-data";

const delay = <T,>(v: T, ms = 220) => new Promise<T>((r) => setTimeout(() => r(v), ms));

export interface ListOrdersParams {
  status?: string;
  payment_status?: string;
  page?: number;
  page_size?: number;
}

export const ordersService = {
  async create(input: CreateOrderInput): Promise<Order> {
    return request<Order>("/orders/", { method: "POST", body: input });
  },

  async list(params: ListOrdersParams = {}): Promise<OrderListResponse> {
    // Backend returns `data: [...]` with `pagination` alongside; normalize.
    const raw = await request<{ data?: OrderListItem[] } | OrderListItem[]>("/orders/", {
      query: params as Record<string, string | number | boolean | undefined | null>,
      raw: true,
    });
    const env = raw as unknown as { data?: OrderListItem[]; pagination?: OrderListResponse["pagination"] };
    return {
      items: env.data ?? [],
      pagination: env.pagination ?? {
        page: 1,
        page_size: env.data?.length ?? 0,
        total: env.data?.length ?? 0,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
    };
  },

  async get(id: string): Promise<Order> {
    return request<Order>(`/orders/${id}/`);
  },

  async cancel(id: string, reason: string): Promise<Order> {
    return request<Order>(`/orders/${id}/cancel/`, { method: "POST", body: { reason } });
  },

  async getInvoice(id: string): Promise<{ invoice_url: string; invoice_number: string }> {
    return request<{ invoice_url: string; invoice_number: string }>(`/orders/${id}/invoice/`);
  },
};