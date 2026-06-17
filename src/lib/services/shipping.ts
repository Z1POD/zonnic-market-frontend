// src/lib/services/shipping.ts

import { request, USE_MOCKS } from "@/lib/api-client";
import type { ShippingCity, ShippingOptionsResponse } from "@/types/api";

const delay = <T,>(v: T, ms = 220) => new Promise<T>((r) => setTimeout(() => r(v), ms));

const MOCK_CITIES: ShippingCity[] = [
  {
    id: "city_addis",
    name: "Addis Ababa",
    state: "Addis Ababa",
    country: { code: "ET", name: "Ethiopia" },
    has_pickup: true,
  },
  {
    id: "city_dire",
    name: "Dire Dawa",
    state: "Dire Dawa",
    country: { code: "ET", name: "Ethiopia" },
    has_pickup: true,
  },
  {
    id: "city_adama",
    name: "Adama",
    state: "Oromia",
    country: { code: "ET", name: "Ethiopia" },
    has_pickup: false,
  },
  {
    id: "city_bahir",
    name: "Bahir Dar",
    state: "Amhara",
    country: { code: "ET", name: "Ethiopia" },
    has_pickup: true,
  },
  {
    id: "city_hawassa",
    name: "Hawassa",
    state: "Sidama",
    country: { code: "ET", name: "Ethiopia" },
    has_pickup: false,
  },
];

const MOCK_SHIPPING_OPTIONS: Record<string, ShippingOptionsResponse> = {
  city_addis: {
    city: { id: "city_addis", name: "Addis Ababa", country: { code: "ET", name: "Ethiopia" } },
    delivery: [
      {
        vendor_name: "Ethiopian Postal Service",
        vendor_code: "ethiopost",
        vendor_logo: "https://cdn.example.com/shipping/ethiopost.png",
        service_name: "Standard Delivery",
        cost: "5.00",
        currency: "ETB",
        is_free: false,
        estimated_days: "3-7 days",
        type: "delivery",
      },
      {
        vendor_name: "DHL Express",
        vendor_code: "dhl",
        vendor_logo: "https://cdn.example.com/shipping/dhl.png",
        service_name: "Express Worldwide",
        cost: "0.00",
        currency: "ETB",
        is_free: true,
        estimated_days: "1-3 days",
        type: "delivery",
      },
    ],
    pickup: [
      {
        location_id: "pl_bole",
        name: "Bole Atlas Mall",
        address: "Atlas Mall, Ground Floor, Bole Road",
        landmark: "Next to Atlas Hotel",
        phone: "+251911234567",
        opening_hours: {
          monday: { open: "09:00", close: "18:00" },
          tuesday: { open: "09:00", close: "18:00" },
          wednesday: { open: "09:00", close: "18:00" },
          thursday: { open: "09:00", close: "18:00" },
          friday: { open: "09:00", close: "17:00" },
          saturday: { open: "10:00", close: "16:00" },
          sunday: null,
        },
        is_open_now: true,
        instructions: "Bring your order confirmation and ID.",
        type: "pickup",
        cost: "0.00",
        is_free: true,
        estimated_days: "Ready in 2-3 days",
      },
      {
        location_id: "pl_merkato",
        name: "Merkato Square",
        address: "Merkato Shopping Center, 2nd Floor, Room 204",
        landmark: "Near the main entrance",
        phone: "+251922345678",
        opening_hours: {
          monday: { open: "08:00", close: "17:00" },
          tuesday: { open: "08:00", close: "17:00" },
          wednesday: { open: "08:00", close: "17:00" },
          thursday: { open: "08:00", close: "17:00" },
          friday: { open: "08:00", close: "16:00" },
          saturday: { open: "09:00", close: "14:00" },
          sunday: null,
        },
        is_open_now: false,
        instructions: "Enter through main gate, take elevator to 2nd floor.",
        type: "pickup",
        cost: "0.00",
        is_free: true,
        estimated_days: "Ready in 2-3 days",
      },
    ],
  },
  city_dire: {
    city: { id: "city_dire", name: "Dire Dawa", country: { code: "ET", name: "Ethiopia" } },
    delivery: [
      {
        vendor_name: "Ethiopian Postal Service",
        vendor_code: "ethiopost",
        service_name: "Standard Delivery",
        cost: "7.00",
        currency: "ETB",
        is_free: false,
        estimated_days: "5-10 days",
        type: "delivery",
      },
    ],
    pickup: [
      {
        location_id: "pl_dire",
        name: "Dire Dawa Mall",
        address: "Dire Dawa Mall, Main Street",
        phone: "+251911111111",
        type: "pickup",
        cost: "0.00",
        is_free: true,
        estimated_days: "Ready in 3-4 days",
      },
    ],
  },
  city_adama: {
    city: { id: "city_adama", name: "Adama", country: { code: "ET", name: "Ethiopia" } },
    delivery: [
      {
        vendor_name: "Ethiopian Postal Service",
        vendor_code: "ethiopost",
        service_name: "Standard Delivery",
        cost: "6.00",
        currency: "ETB",
        is_free: false,
        estimated_days: "4-8 days",
        type: "delivery",
      },
    ],
    pickup: [],
  },
  city_bahir: {
    city: { id: "city_bahir", name: "Bahir Dar", country: { code: "ET", name: "Ethiopia" } },
    delivery: [
      {
        vendor_name: "Ethiopian Postal Service",
        vendor_code: "ethiopost",
        service_name: "Standard Delivery",
        cost: "6.50",
        currency: "ETB",
        is_free: false,
        estimated_days: "4-9 days",
        type: "delivery",
      },
    ],
    pickup: [
      {
        location_id: "pl_bahir",
        name: "Bahir Dar Market",
        address: "Bahir Dar Market, Lake Tana Road",
        phone: "+251922222222",
        type: "pickup",
        cost: "0.00",
        is_free: true,
        estimated_days: "Ready in 3-4 days",
      },
    ],
  },
  city_hawassa: {
    city: { id: "city_hawassa", name: "Hawassa", country: { code: "ET", name: "Ethiopia" } },
    delivery: [
      {
        vendor_name: "Ethiopian Postal Service",
        vendor_code: "ethiopost",
        service_name: "Standard Delivery",
        cost: "6.00",
        currency: "ETB",
        is_free: false,
        estimated_days: "4-8 days",
        type: "delivery",
      },
    ],
    pickup: [],
  },
};

export const shippingService = {
  async cities(): Promise<ShippingCity[]> {
    if (USE_MOCKS) return delay(MOCK_CITIES);
    return request<ShippingCity[]>("/shipping/cities/");
  },

  async options(cityId: string, itemCount?: number, subtotal?: number): Promise<ShippingOptionsResponse> {
    if (USE_MOCKS) {
      const mock = MOCK_SHIPPING_OPTIONS[cityId];
      return delay(mock ?? MOCK_SHIPPING_OPTIONS.city_addis);
    }
    return request<ShippingOptionsResponse>("/shipping/options/", {
      query: {
        city_id: cityId,
        item_count: itemCount,
        subtotal: subtotal,
      },
    });
  },
};