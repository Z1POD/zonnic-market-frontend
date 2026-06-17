// src/lib/services/market.ts

import { request, USE_MOCKS } from "@/lib/api-client";
import type {
  HomepageData,
  ProductDetail,
  ProductListItem,
  StoreDetail,
} from "@/types/api";
import { MOCK_HOMEPAGE, MOCK_PRODUCTS, MOCK_PRODUCT_LIST, mockStoreDetail } from "@/lib/mock-data";

const delay = <T,>(value: T, ms = 220) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

export interface ListProductsParams {
  q?: string;
  category?: string;
  store?: string;
  min_price?: number;
  max_price?: number;
  size?: string;
  color?: string;
  sort?: "popular" | "newest" | "price_low" | "price_high" | "rating";
  page?: number;
  page_size?: number;
}

export interface ListProductsResponse {
  products: ProductListItem[];
  total_results: number;
  page: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export const marketService = {
  async getHomepage(): Promise<HomepageData> {
    if (USE_MOCKS) return delay(MOCK_HOMEPAGE);
    return request<HomepageData>("/market/");
  },

  async listProducts(params: ListProductsParams = {}): Promise<ListProductsResponse> {
    if (USE_MOCKS) {
      let products = MOCK_PRODUCT_LIST.slice();
      if (params.store) products = products.filter((p) => p.store.slug === params.store);
      if (params.q) {
        const q = params.q.toLowerCase();
        products = products.filter(
          (p) => p.title.toLowerCase().includes(q) || p.store.name.toLowerCase().includes(q),
        );
      }
      return delay({
        products,
        total_results: products.length,
        page: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      });
    }
    return request<ListProductsResponse>("/market/products/", {
      query: params as Record<string, string | number | boolean | undefined | null>,
    });
  },

  async getProduct(slug: string): Promise<ProductDetail> {
    if (USE_MOCKS) {
      const p = MOCK_PRODUCTS.find((x) => x.slug === slug);
      if (!p) throw new Error("PRODUCT_NOT_FOUND");
      return delay(p);
    }
    return request<ProductDetail>(`/market/products/${slug}/`);
  },

  async getStore(slug: string): Promise<StoreDetail> {
    if (USE_MOCKS) {
      const d = mockStoreDetail(slug);
      if (!d) throw new Error("STORE_NOT_FOUND");
      return delay(d);
    }
    return request<StoreDetail>(`/market/stores/${slug}/`);
  },

  async searchSuggestions(q: string): Promise<string[]> {
    if (USE_MOCKS) {
      const ql = q.toLowerCase();
      return delay(
        MOCK_PRODUCT_LIST.filter((p) => p.title.toLowerCase().includes(ql))
          .slice(0, 6)
          .map((p) => p.title),
      );
    }
    return request<string[]>("/market/search/suggestions/", { query: { q } });
  },
};
