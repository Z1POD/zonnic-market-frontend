// src/types/api.ts

// Type definitions mirroring the Marketplace / Orders / Payment / Auth API contracts.
// These are the single source of truth for the frontend service layer.

export interface Currency {
  code: string;
  symbol: string;
  name?: string;
}

// ---------- Envelope & errors ----------

export interface ApiEnvelopeSuccess<T> {
  success: true;
  data: T;
}
export interface ApiEnvelopeFailure {
  success: false;
  data?: unknown;
  error?: { code: string; message: string; details?: unknown };
}
export type ApiEnvelope<T> = ApiEnvelopeSuccess<T> | ApiEnvelopeFailure;

// ---------- Auth / User ----------

export interface User {
  id: string;
  username?: string;
  first_name: string;
  last_name?: string;
  display_name?: string;
  email?: string;
  email_verified?: boolean;
  phone?: string;
  phone_verified?: boolean;
  role?: "customer" | "creator" | "staff" | "admin";
  is_creator?: boolean;
  is_verified?: boolean;
  photo_url?: string;
  language_code?: string;
  date_joined?: string;
  source?: "telegram" | "otp";
  avatar_url?: string; // legacy alias for photo_url
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ---------- Catalog ----------

export interface StoreRef {
  id?: string;
  name: string;
  slug: string;
  logo_url?: string;
  banner_url?: string;
  rating?: number;
  review_count?: number;
  product_count?: number;
  is_verified?: boolean;
  description?: string;
}

// Apparel category used only for local rendering of the procedural 3D mesh
// and the fallback 2D silhouette. Derived heuristically from product title.
export type ApparelType = "tshirt" | "hoodie" | "cap" | "bag" | "longsleeve";

export interface ProductListItem {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string;
  mockup_url?: string;
  retail_price: string;
  currency: Currency;
  store: StoreRef;
  rating: number;
  review_count: number;
  sold_quantity: number;
  is_limited_edition: boolean;
  created_at: string;
}

export interface ColorVariant {
  name: string;
  hex: string;
  sizes: string[];
  prices: Record<string, string>;
}

export interface Mockup {
  id: string;
  type: string; // "front" | "back" | "angle" | ...
  url: string;
  is_primary: boolean;
  sort_order: number;
}
export interface PrintAreaUvConfig {
  world_bounds?: {
    center: [number, number, number];
    half_extents: [number, number, number];
    rotation?: [number, number, number];
  };
  transform_limits?: {
    min_scale: number;
    max_scale: number;
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
  };
  uv_bounds?: { min_u: number; min_v: number; max_u: number; max_v: number };
}

export interface PrintAreaDecal {
  url: string;
  aspect_ratio: number;
  scale: number;
  rotation: number;
  offset_x: number;
  offset_y: number;
  size_tier?: string;
}

export interface PrintAreaDesignLayer {
  type: string;
  url: string;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
}

export interface ViewerPrintArea {
  area_key: string;
  name: string;
  placement: string;
  width_cm: string;
  height_cm: string;
  mesh_name?: string;
  uv_config?: PrintAreaUvConfig;
  canvas_width_px?: number;
  canvas_height_px?: number;
  transform?: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  allow_scaling?: boolean;
  allow_rotation?: boolean;
  design?: { layers: PrintAreaDesignLayer[] };
  decal?: PrintAreaDecal;
}

export interface Viewer3D {
  colorable_meshes?: string[];
  default_view?: string;
  print_areas?: ViewerPrintArea[];
  model_url?: string;
  usdz_url?: string;
  preview_url?: string;
  background?: string;
  environment?: string;
  model_position?: [number, number, number];
  material?: {
    roughness?: number;
    metalness?: number;
    texture_url?: string | null;
  };
  lighting?: {
    intensity?: number;
    ambient?: number;
    key?: { position: [number, number, number]; intensity: number };
    fill?: { position: [number, number, number]; intensity: number };
    rim?: { position: [number, number, number]; intensity: number };
  };
  camera?: {
    position?: [number, number, number];
    fov?: number;
    orbit?: {
      min_distance?: number;
      max_distance?: number;
      min_polar_angle?: number;
      max_polar_angle?: number;
      enable_pan?: boolean;
      enable_zoom?: boolean;
    };
  };
  contact_shadows?: {
    enabled?: boolean;
    position?: [number, number, number];
    opacity?: number;
    scale?: number;
    blur?: number;
    far?: number;
  };
}

export interface ProductDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  share_link?: string;
  store: StoreRef;
  pricing: { retail_price: string; currency: Currency };
  variants: { colors: ColorVariant[]; sizes: string[] };
  mockups: Mockup[];
  thumbnail_url: string;
  viewer_3d?: Viewer3D;
  apparel_info?: { 
    name?: string; 
    fit?: string; 
    brand?: string; 
    weight_grams?: number;
    care_instructions?: string;
  };
  reviews_summary: {
    average_rating: number;
    total_reviews: number;
    distribution: Record<string, number>;
  };
  stats: { view_count: number; sold_quantity: number; wishlist_count: number };
  is_limited_edition: boolean;
  max_quantity: number | null;
  available_quantity: number;
  tags: string[];
  created_at: string;
  user_context?: { is_in_wishlist: boolean; has_purchased: boolean; can_review: boolean };
  related_products: ProductListItem[];
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  banner_url?: string;
  mobile_banner_url?: string;
  product_count: number;
  products: ProductListItem[];
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
  product_count?: number;
}

export interface HomepageData {
  hero: Collection[];
  trending: { title: string; products: ProductListItem[] };
  new_arrivals: { title: string; products: ProductListItem[] };
  top_stores: StoreRef[];
  categories?: CategoryRef[];
}

export interface StoreDetail {
  store: StoreRef;
  products: ProductListItem[];
  total_products: number;
}

// ---------- Cart ----------

export interface CartItem {
  cart_id: string;
  product_id: string;
  slug: string;
  title: string;
  thumbnail_url: string;
  mockup_url?: string;
  color_name: string;
  color_hex: string;
  size: string;
  quantity: number;
  unit_price: number;
  currency: Currency;
  store: StoreRef;
  apparel_type: ApparelType;
}

// ---------- Orders & Payment ----------

export type DeliveryType = "delivery" | "pickup";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "printing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "pending_verification" | "paid" | "failed";

export interface ShippingAddressInput {
  full_name: string;
  phone: string;
  street: string;
  city_id?: string;
  country_id?: string;
  state?: string;
  postal_code?: string;
  delivery_instructions?: string;
}

export interface ShippingAddressView {
  full_name: string;
  phone: string;
  street: string;
  city_name?: string;
  country_name?: string;
  state?: string;
  postal_code?: string;
}

export interface PaymentMethodOption {
  provider_code: string;
  provider_name: string;
  provider_logo?: string;
  account_name: string;
  account_number: string;
  account_type?: string;
  recipient?: string;
  reference: {
    label: string;
    placeholder: string;
    help_text?: string;
  };
  requires_payer_account: boolean;
  payer_account_label?: string | null;
}

export interface InvoiceAmount {
  subtotal: string;
  shipping: string;
  tax: string;
  discount: string;
  total: string;
  currency: Currency;
}

export interface Invoice {
  number: string;
  order_number: string;
  order_id: string;
  created_at: string;
  expires_at?: string;
  expires_in_seconds?: number;
  status: string;
  store: { name: string; logo_url?: string };
  amount: InvoiceAmount;
  items: {
    product_name: string;
    size: string;
    color: string;
    quantity: number;
    unit_price: string;
    subtotal: string;
    mockup_url?: string;
  }[];
  discounts: { description: string; amount: string; is_automatic: boolean }[];
  payment: {
    instructions: string;
    warning?: string;
    note?: string;
    methods: PaymentMethodOption[];
  };
  verification?: {
    action: string;
    endpoint: string;
    method: string;
    body: Record<string, unknown>;
  };
}

export interface OrderListItem {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  delivery_type: DeliveryType;
  total: string;
  currency_code: string;
  currency_symbol: string;
  item_count: number;
  first_item: {
    product_name: string;
    size: string;
    color: string;
    color_hex?: string;
    quantity: number;
    mockup_url?: string;
  };
  payment_provider_name?: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  delivery_type: DeliveryType;
  invoice?: Invoice;
  pricing: {
    subtotal: string;
    shipping_cost: string;
    discount: string;
    tax: string; // FIXED: Added missing tax property here
    total: string;
    currency: Currency;
  };
  shipping: {
    delivery_type: DeliveryType;
    address?: ShippingAddressView;
    pickup_location?: PickupLocation;
  };
  payment: {
    status: PaymentStatus;
    provider?: string | null;
    receipt_id?: string;
    verified_at?: string | null;
    is_terminal?: boolean; // FIXED: Handles route's checking optimization logic
  };
  items: {
    id: string;
    product_name: string;
    product_slug?: string;
    size: string;
    color_name: string;
    color_hex: string;
    quantity: number;
    unit_price: string;
    subtotal: string;
    mockup_url?: string;
  }[];
  item_count: number;
  discounts: { type?: string; description: string; amount: string; is_automatic: boolean }[];
  tracking_number?: string;
  tracking_url?: string;
  customer_note?: string;
  cancellation_reason?: string;
  can_cancel: boolean;
  timeline: {
    created: string;
    paid?: string | null;
    shipped?: string | null;
    delivered?: string | null;
  };
  created_at: string;
  updated_at?: string;
}

export interface OrderListResponse {
  items: OrderListItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface CreateOrderItemInput {
  product_id: string;
  size: string;
  color_name: string;
  quantity: number;
}

export interface CreateOrderInput {
  items: CreateOrderItemInput[];
  delivery_type: DeliveryType;
  shipping_address?: ShippingAddressInput;
  shipping_address_id?: string;
  pickup_location?: string;
  shipping_vendor?: string; 
  shipping_service_level?: string;
  coupon_code?: string;
  customer_note?: string;
  currency?: string;
}

export interface PaymentProvider {
  id: string;
  name: string;
  code: string;
  provider_type: string;
  logo_url?: string;
  receipt_label: string;
  receipt_placeholder: string;
  receipt_help_text?: string;
  requires_account_number: boolean;
  accounts: { account_name: string; account_number: string; account_type?: string }[];
}

export interface SubmitReceiptInput {
  order_id: string;
  provider: string;
  receipt_identifier: string;
  payer_account?: string;
}

export interface SubmittedReceipt {
  transaction_id: string;
  status: "submitted" | "verifying" | "verified" | "mismatch" | "failed" | "timeout";
  status_display?: string;
  message?: string;
  amount: string;
  currency: string;
  provider: string;
  submitted_at: string;
}

export interface VerifyResponse {
  transaction_id: string;
  status: "submitted" | "verifying" | "verified" | "mismatch" | "failed" | "timeout";
  status_display?: string;
  is_verified: boolean;
  is_terminal: boolean;
  amount: string;
  currency: string;
  provider: string;
  receipt_identifier?: string;
  error_message?: string | null;
  submitted_at: string;
  verified_at?: string | null;
  order_status: string;
  order_payment_status: string;
}

// ---------- Shipping ----------

export interface ShippingCity {
  id: string;
  name: string;
  state: string;
  country: {
    code: string;
    name: string;
  };
  has_pickup: boolean;
}

export interface DeliveryOption {
  vendor_name: string;
  vendor_code: string;
  vendor_logo?: string;
  service_name: string;
  cost: string;
  currency: string;
  is_free: boolean;
  estimated_days: string;
  type: "delivery";
}

export interface OpeningHourSlot {
  open: string;
  close: string;
}

export interface PickupLocation {
  location_id: string;
  name: string;
  address: string;
  landmark?: string;
  phone?: string;
  // FIXED: Explicit structural layout over generic key maps helps compiler type extraction
  opening_hours?: Record<string, OpeningHourSlot | any>; 
  is_open_now?: boolean;
  instructions?: string;
  type: "pickup";
  cost: string;
  is_free: boolean;
  estimated_days: string;
}

export interface ShippingOptionsResponse {
  city: {
    id: string;
    name: string;
    country: {
      code: string;
      name: string;
    };
  };
  delivery: DeliveryOption[];
  pickup: PickupLocation[];
}