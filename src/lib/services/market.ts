// src/lib/services/market.ts

import { request } from "@/lib/api-client";
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
    return request<HomepageData>("/market/");
  },

  async listProducts(params: ListProductsParams = {}): Promise<ListProductsResponse> {

    return request<ListProductsResponse>("/market/products/", {
      query: params as Record<string, string | number | boolean | undefined | null>,
    });
  },

  async getProduct(slug: string): Promise<ProductDetail> {
   
    return request<ProductDetail>(`/market/products/${slug}/`);
  },

  async getStore(slug: string): Promise<StoreDetail> {
    return request<StoreDetail>(`/market/stores/${slug}/`);
  },

  async searchSuggestions(q: string): Promise<string[]> {

    return request<string[]>("/market/search/suggestions/", { query: { q } });
  },
};
