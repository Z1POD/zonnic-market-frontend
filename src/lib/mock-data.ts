// src/lib/mock-data.ts

// Mock data layer mirroring the real API shapes. Used only when
// VITE_API_BASE_URL is unset (offline / preview-without-backend).

import type {
  Collection,
  ColorVariant,
  CreateOrderInput,
  HomepageData,
  Order,
  OrderListItem,
  PaymentProvider,
  ProductDetail,
  ProductListItem,
  StoreDetail,
  StoreRef,
  SubmitReceiptInput,
  SubmittedReceipt,
  VerifyResponse,
} from "@/types/api";

const usd = { code: "USD", symbol: "$", name: "US Dollar" };

const store = (
  name: string,
  slug: string,
  extra: Partial<StoreRef> = {},
): StoreRef => ({ name, slug, ...extra });

const STORES = {
  henok: store("Henok Atelier", "henok-atelier", {
    description: "Heritage Ethiopian streetwear with modern tailoring.",
    rating: 4.9,
    review_count: 184,
    product_count: 4,
    is_verified: true,
  }),
  zen: store("Zen Studios", "zen-studios", {
    description: "Kyoto-quiet, garment-dyed essentials.",
    rating: 4.8,
    review_count: 162,
    product_count: 2,
    is_verified: true,
  }),
  mono: store("Mono Lab", "mono-lab", {
    description: "Architectural cuts in monochrome.",
    rating: 4.7,
    review_count: 92,
    product_count: 3,
    is_verified: false,
  }),
};

function mkColors(palette: { name: string; hex: string }[], sizes: string[], priceMap: Record<string, string>): ColorVariant[] {
  return palette.map((p) => ({ name: p.name, hex: p.hex, sizes, prices: priceMap }));
}

function mkDetail(opts: {
  id: string;
  slug: string;
  title: string;
  price: string;
  store: StoreRef;
  description: string;
  rating: number;
  sold: number;
  limited?: boolean;
  colors: { name: string; hex: string }[];
  sizes: string[];
}): ProductDetail {
  const prices = Object.fromEntries(opts.sizes.map((s) => [s, opts.price]));
  return {
    id: opts.id,
    slug: opts.slug,
    title: opts.title,
    description: opts.description,
    store: opts.store,
    pricing: { retail_price: opts.price, currency: usd },
    variants: { colors: mkColors(opts.colors, opts.sizes, prices), sizes: opts.sizes },
    mockups: [],
    thumbnail_url: "",
    viewer_3d: {
      background: "linear-gradient(135deg, #0b0b15, #1a1a2e)",
      environment: "studio",
      lighting: { intensity: 1.2, ambient: 0.5 },
      camera: { position: [0, 0.2, 6], fov: 35, orbit: { min_distance: 4, max_distance: 9, enable_pan: false, enable_zoom: true } },
      material: { roughness: 0.85, metalness: 0.05 },
      contact_shadows: { enabled: true, opacity: 0.45, scale: 8, blur: 2.4, far: 3 },
    },
    apparel_info: { fit: "regular", brand: "Zonnic Atelier" },
    reviews_summary: { average_rating: opts.rating, total_reviews: Math.round(opts.sold / 8), distribution: { "5": 70, "4": 22, "3": 6, "2": 1, "1": 1 } },
    stats: { view_count: opts.sold * 12, sold_quantity: opts.sold, wishlist_count: Math.round(opts.sold / 4) },
    is_limited_edition: Boolean(opts.limited),
    max_quantity: null,
    available_quantity: 80,
    tags: [],
    created_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    user_context: { is_in_wishlist: false, has_purchased: false, can_review: false },
    related_products: [],
  };
}

const PRODUCTS: ProductDetail[] = [
  mkDetail({
    id: "prod_tee_onyx",
    slug: "onyx-essentials-tee",
    title: "Onyx Essentials Tee",
    price: "49.00",
    store: STORES.henok,
    description: "Heavyweight 280gsm cotton tee, tailored silhouette. Individually numbered.",
    rating: 4.9,
    sold: 412,
    limited: true,
    colors: [
      { name: "Onyx Black", hex: "#111111" },
      { name: "Bone White", hex: "#F4F1EA" },
      { name: "Champagne Gold", hex: "#C5A059" },
      { name: "Forest Olive", hex: "#2F3A2A" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
  }),
  mkDetail({
    id: "prod_hoodie_aurora",
    slug: "aurora-cloud-hoodie",
    title: "Aurora Cloud Hoodie",
    price: "129.00",
    store: STORES.zen,
    description: "Brushed fleece, sculpted hood, gold-stitched eyelets.",
    rating: 4.8,
    sold: 286,
    colors: [
      { name: "Charcoal", hex: "#1A1A1A" },
      { name: "Cream", hex: "#EDE6D6" },
      { name: "Desert Sand", hex: "#C9B79A" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
  }),
  mkDetail({
    id: "prod_cap_meridian",
    slug: "meridian-low-cap",
    title: "Meridian Low Cap",
    price: "39.00",
    store: STORES.mono,
    description: "Unstructured 6-panel cap, brass eyelets, leather strap.",
    rating: 4.7,
    sold: 540,
    colors: [
      { name: "Jet Black", hex: "#0A0A0A" },
      { name: "Stone", hex: "#9C988F" },
      { name: "Olive", hex: "#3D4632" },
      { name: "Optic White", hex: "#F4F4F0" },
    ],
    sizes: ["One Size"],
  }),
  mkDetail({
    id: "prod_bag_field",
    slug: "field-tote",
    title: "Field Tote",
    price: "89.00",
    store: STORES.henok,
    description: "16oz waxed canvas tote with brass hardware.",
    rating: 4.9,
    sold: 198,
    colors: [
      { name: "Natural Wax", hex: "#C8B898" },
      { name: "Charcoal", hex: "#2A2A2A" },
      { name: "Forest", hex: "#2D3A2A" },
    ],
    sizes: ["One Size"],
  }),
  mkDetail({
    id: "prod_long_eclipse",
    slug: "eclipse-long-sleeve",
    title: "Eclipse Long Sleeve",
    price: "69.00",
    store: STORES.mono,
    description: "Mid-weight cotton long sleeve with ribbed crew collar.",
    rating: 4.6,
    sold: 142,
    limited: true,
    colors: [
      { name: "Eclipse", hex: "#0E0E0E" },
      { name: "Bone", hex: "#EFE9DD" },
      { name: "Midnight", hex: "#10172A" },
    ],
    sizes: ["S", "M", "L", "XL"],
  }),
  mkDetail({
    id: "prod_tee_solstice",
    slug: "solstice-tee",
    title: "Solstice Tee",
    price: "55.00",
    store: STORES.zen,
    description: "Garment-dyed tee, relaxed drape, hand-finished hem.",
    rating: 4.8,
    sold: 320,
    colors: [
      { name: "Sand", hex: "#D8C8A8" },
      { name: "Clay", hex: "#9C5B3A" },
      { name: "Ink", hex: "#15161A" },
      { name: "Moss", hex: "#4A5A38" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
  }),
  mkDetail({
    id: "prod_hoodie_atrium",
    slug: "atrium-zip-hoodie",
    title: "Atrium Zip Hoodie",
    price: "149.00",
    store: STORES.mono,
    description: "Full-zip with YKK gold-tone hardware, lined hood.",
    rating: 4.9,
    sold: 178,
    limited: true,
    colors: [
      { name: "Onyx", hex: "#0A0A0A" },
      { name: "Ash", hex: "#8A8A88" },
    ],
    sizes: ["S", "M", "L", "XL"],
  }),
  mkDetail({
    id: "prod_cap_archive",
    slug: "archive-trucker",
    title: "Archive Trucker Cap",
    price: "45.00",
    store: STORES.henok,
    description: "Heritage trucker with structured crown, rope detail.",
    rating: 4.7,
    sold: 260,
    colors: [
      { name: "Black / Gold", hex: "#0A0A0A" },
      { name: "Cream / Black", hex: "#EDE6D6" },
    ],
    sizes: ["One Size"],
  }),
];

const toListItem = (p: ProductDetail): ProductListItem => ({
  id: p.id,
  title: p.title,
  slug: p.slug,
  thumbnail_url: p.thumbnail_url,
  mockup_url: p.mockups[0]?.url,
  retail_price: p.pricing.retail_price,
  currency: p.pricing.currency,
  store: { name: p.store.name, slug: p.store.slug, logo_url: p.store.logo_url },
  rating: p.reviews_summary.average_rating,
  review_count: p.reviews_summary.total_reviews,
  sold_quantity: p.stats.sold_quantity,
  is_limited_edition: p.is_limited_edition,
  created_at: p.created_at,
});

export const MOCK_PRODUCTS = PRODUCTS;
export const MOCK_PRODUCT_LIST: ProductListItem[] = PRODUCTS.map(toListItem);

const heroCollection: Collection = {
  id: "col_capsule_no1",
  name: "Capsule No. 01",
  slug: "capsule-01",
  description: "Eight pieces. Quiet materials, considered details.",
  product_count: MOCK_PRODUCT_LIST.length,
  products: MOCK_PRODUCT_LIST,
};

export const MOCK_HOMEPAGE: HomepageData = {
  hero: [heroCollection],
  trending: { title: "Trending Now", products: MOCK_PRODUCT_LIST.slice(0, 6) },
  new_arrivals: { title: "New Arrivals", products: [...MOCK_PRODUCT_LIST].reverse().slice(0, 6) },
  top_stores: [STORES.henok, STORES.zen, STORES.mono],
  categories: [
    { id: "cat_tees", name: "Tees", slug: "tees", product_count: 2 },
    { id: "cat_hoodies", name: "Hoodies", slug: "hoodies", product_count: 2 },
    { id: "cat_caps", name: "Caps", slug: "caps", product_count: 2 },
  ],
};

export function mockStoreDetail(slug: string): StoreDetail | null {
  const products = MOCK_PRODUCT_LIST.filter((p) => p.store.slug === slug);
  if (products.length === 0) return null;
  const ref = Object.values(STORES).find((s) => s.slug === slug) ?? {
    name: products[0].store.name,
    slug,
  };
  return { store: ref, products, total_products: products.length };
}

// -------- Orders / payment mocks --------

const ORDERS: Order[] = [];
const TX: Record<string, { order_id: string; submitted_at: string; provider: string; amount: string; currency: string; receipt: string; readyAt: number; verdict: "verified" | "mismatch" }> = {};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? (crypto as Crypto).randomUUID()
    : Math.random().toString(36).slice(2);

const num = (s: string) => Math.floor(100000 + Math.random() * 900000).toString();

export function mockCreateOrder(input: CreateOrderInput): Order {
  const items = input.items.map((it) => {
    const product = MOCK_PRODUCTS.find((p) => p.id === it.product_id);
    const color = product?.variants.colors.find((c) => c.name === it.color_name);
    const unit = parseFloat(color?.prices?.[it.size] ?? product?.pricing.retail_price ?? "0");
    return {
      id: `oi_${newId().slice(0, 8)}`,
      product_name: product?.title ?? "Item",
      product_slug: product?.slug,
      size: it.size,
      color_name: it.color_name,
      color_hex: color?.hex ?? "#999999",
      quantity: it.quantity,
      unit_price: unit.toFixed(2),
      subtotal: (unit * it.quantity).toFixed(2),
      mockup_url: product?.mockups[0]?.url,
    };
  });
  const subtotal = items.reduce((s, i) => s + parseFloat(i.subtotal), 0);
  const total = subtotal;
  const order_number = `MA-${num(String(subtotal))}`;
  const now = new Date().toISOString();
  const currency = MOCK_PRODUCTS[0].pricing.currency;
  const id = `ord_${newId().slice(0, 12)}`;

  const methods = mockPaymentProviders().map((p) => ({
    provider_code: p.code,
    provider_name: p.name,
    provider_logo: p.logo_url,
    account_name: p.accounts[0]?.account_name ?? "Zonnic",
    account_number: p.accounts[0]?.account_number ?? "",
    account_type: p.accounts[0]?.account_type,
    recipient: p.accounts[0]?.account_name,
    reference: {
      label: p.receipt_label,
      placeholder: p.receipt_placeholder,
      help_text: p.receipt_help_text,
    },
    requires_payer_account: p.requires_account_number,
    payer_account_label: p.requires_account_number ? "Your account (last 8 digits)" : null,
  }));

  const order: Order = {
    id,
    order_number,
    status: "pending",
    payment_status: "pending",
    delivery_type: input.delivery_type ?? "delivery",
    invoice: {
      number: `INV-${order_number}`,
      order_number,
      order_id: id,
      created_at: now,
      expires_at: new Date(Date.now() + 1000 * 60 * 20).toISOString(),
      expires_in_seconds: 1200,
      status: "awaiting_payment",
      store: { name: "Zonnic Atelier" },
      amount: {
        subtotal: subtotal.toFixed(2),
        shipping: "0.00",
        tax: "0.00",
        discount: "0.00",
        total: total.toFixed(2),
        currency,
      },
      items: items.map((i) => ({
        product_name: i.product_name,
        size: i.size,
        color: i.color_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
        mockup_url: i.mockup_url,
      })),
      discounts: [],
      payment: {
        instructions: `Transfer exactly ${currency.symbol}${total.toFixed(2)} to ONE of our accounts below.`,
        warning: "Send the EXACT amount. Partial payments will not be verified automatically.",
        note: "After payment, paste your transaction ID / receipt URL below.",
        methods,
      },
      verification: {
        action: "submit_receipt",
        endpoint: "/api/v1/payment/submit-receipt/",
        method: "POST",
        body: { order_id: id, provider: "cbe", receipt_identifier: "FT..." },
      },
    },
    pricing: { subtotal: subtotal.toFixed(2), shipping_cost: "0.00", discount: "0.00", total: total.toFixed(2), currency },
    shipping: {
      delivery_type: input.delivery_type ?? "delivery",
      address: input.shipping_address
        ? {
            full_name: input.shipping_address.full_name,
            phone: input.shipping_address.phone,
            street: input.shipping_address.street,
            city_name: input.shipping_address.state,
            country_name: "—",
            state: input.shipping_address.state,
            postal_code: input.shipping_address.postal_code,
          }
        : undefined,
      pickup_location: input.pickup_location,
    },
    payment: { status: "pending", provider: null, receipt_id: "", verified_at: null },
    items,
    item_count: items.length,
    discounts: [],
    can_cancel: true,
    timeline: { created: now, paid: null, shipped: null, delivered: null },
    created_at: now,
    updated_at: now,
  };
  ORDERS.unshift(order);
  return order;
}

export function mockListOrders(): OrderListItem[] {
  return ORDERS.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    payment_status: o.payment_status,
    delivery_type: o.delivery_type,
    total: o.pricing.total,
    currency_code: o.pricing.currency.code,
    currency_symbol: o.pricing.currency.symbol,
    item_count: o.item_count,
    first_item: {
      product_name: o.items[0]?.product_name ?? "",
      size: o.items[0]?.size ?? "",
      color: o.items[0]?.color_name ?? "",
      color_hex: o.items[0]?.color_hex,
      quantity: o.items[0]?.quantity ?? 1,
      mockup_url: o.items[0]?.mockup_url,
    },
    payment_provider_name: o.payment.provider ?? undefined,
    created_at: o.created_at,
  }));
}

export function mockGetOrder(id: string): Order | null {
  return ORDERS.find((o) => o.id === id) ?? null;
}

export function mockCancelOrder(id: string, reason: string): Order {
  const o = ORDERS.find((x) => x.id === id);
  if (!o) throw new Error("NOT_FOUND");
  o.status = "cancelled";
  o.can_cancel = false;
  o.cancellation_reason = reason;
  return o;
}

export function mockPaymentProviders(): PaymentProvider[] {
  return [
    {
      id: "pp_cbe",
      name: "Commercial Bank of Ethiopia",
      code: "cbe",
      provider_type: "cbe",
      receipt_label: "FT Number or Transaction ID",
      receipt_placeholder: "e.g., FT25211G11JQ",
      receipt_help_text: "Enter the FT Number printed on your CBE receipt.",
      requires_account_number: true,
      accounts: [{ account_name: "Zonnic Atelier Main", account_number: "1000012345678", account_type: "checking" }],
    },
    {
      id: "pp_telebirr",
      name: "TeleBirr",
      code: "telebirr",
      provider_type: "telebirr",
      receipt_label: "Receipt URL or Transaction ID",
      receipt_placeholder: "https://transactioninfo.ethiotelecom.et/receipt/...",
      receipt_help_text: "Open TeleBirr → History → Copy receipt URL.",
      requires_account_number: false,
      accounts: [{ account_name: "Zonnic Atelier TeleBirr", account_number: "0923456789", account_type: "mobile_money" }],
    },
    {
      id: "pp_awash",
      name: "Awash Bank",
      code: "awash",
      provider_type: "awash",
      receipt_label: "Receipt URL",
      receipt_placeholder: "https://awashbank.com/receipt/...",
      requires_account_number: false,
      accounts: [{ account_name: "Zonnic Atelier Awash", account_number: "0123456789", account_type: "checking" }],
    },
  ];
}

export function mockSubmitReceipt(input: SubmitReceiptInput): SubmittedReceipt {
  const order = ORDERS.find((o) => o.id === input.order_id);
  if (!order) throw new Error("NOT_FOUND");
  const tx = `MC-${order.order_number}-${newId().slice(0, 8).toUpperCase()}`;
  const provider = mockPaymentProviders().find((p) => p.code === input.provider);
  TX[tx] = {
    order_id: order.id,
    submitted_at: new Date().toISOString(),
    provider: provider?.name ?? input.provider,
    amount: order.pricing.total,
    currency: order.pricing.currency.code,
    receipt: input.receipt_identifier,
    readyAt: Date.now() + 4500,
    verdict: input.receipt_identifier.toLowerCase().includes("fail") ? "mismatch" : "verified",
  };
  order.payment_status = "pending_verification";
  return {
    transaction_id: tx,
    status: "submitted",
    status_display: "Submitted — Awaiting verification",
    message: "Receipt submitted. We'll verify your payment shortly.",
    amount: order.pricing.total,
    currency: order.pricing.currency.code,
    provider: provider?.name ?? input.provider,
    submitted_at: TX[tx].submitted_at,
  };
}

export function mockVerify(tx_ref: string): VerifyResponse {
  const t = TX[tx_ref];
  if (!t) {
    return {
      transaction_id: tx_ref,
      status: "failed",
      is_verified: false,
      amount: "0",
      currency: "USD",
      provider: "",
      error_message: "Transaction not found.",
      submitted_at: new Date().toISOString(),
      verified_at: null,
    };
  }
  if (Date.now() < t.readyAt) {
    return {
      transaction_id: tx_ref,
      status: "verifying",
      status_display: "Verification in progress",
      is_verified: false,
      amount: t.amount,
      currency: t.currency,
      provider: t.provider,
      receipt_identifier: t.receipt,
      submitted_at: t.submitted_at,
      verified_at: null,
    };
  }
  if (t.verdict === "mismatch") {
    return {
      transaction_id: tx_ref,
      status: "mismatch",
      status_display: "Mismatch — data doesn't match",
      is_verified: false,
      amount: t.amount,
      currency: t.currency,
      provider: t.provider,
      receipt_identifier: t.receipt,
      error_message: "Amount or recipient mismatch.",
      submitted_at: t.submitted_at,
      verified_at: null,
    };
  }
  // verified — flip the order to paid + confirmed
  const order = ORDERS.find((o) => o.id === t.order_id);
  if (order) {
    order.payment_status = "paid";
    order.status = "confirmed";
    order.payment = {
      status: "paid",
      provider: t.provider,
      receipt_id: t.receipt,
      verified_at: new Date().toISOString(),
    };
    order.timeline = { ...order.timeline, paid: order.payment.verified_at ?? null };
  }
  return {
    transaction_id: tx_ref,
    status: "verified",
    status_display: "Verified — Payment confirmed",
    is_verified: true,
    amount: t.amount,
    currency: t.currency,
    provider: t.provider,
    receipt_identifier: t.receipt,
    submitted_at: t.submitted_at,
    verified_at: new Date().toISOString(),
  };
}
