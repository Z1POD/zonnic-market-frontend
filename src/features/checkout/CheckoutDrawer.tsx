// src/features/checkout/CheckoutDrawer.tsx

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Loader2,
  MapPin,
  RefreshCw,
  Shield,
  Tag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/store/cart";
import { useAuth } from "@/store/auth";
import { useOrdersUi } from "@/store/orders";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type {
  DeliveryOption,
  Order,
  PaymentMethodOption,
  PickupLocation,
  ShippingAddressInput,
  ShippingCity,
  ShippingOptionsResponse,
  SubmittedReceipt,
  VerifyResponse,
} from "@/types/api";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type Step = "shipping" | "review" | "payment" | "verifying" | "success" | "failed";
type ShippingType = "delivery" | "pickup";

const STEPS: { id: Step; label: string }[] = [
  { id: "shipping", label: "Shipping" },
  { id: "review", label: "Review" },
  { id: "payment", label: "Pay" },
];

const emptyAddr: ShippingAddressInput = {
  full_name: "",
  phone: "",
  street: "",
  state: "",
  postal_code: "",
};

// ── Validation helpers ──

const ETH_PHONE_RE = /^\+251[79]\d{8}$/;

const normalizePhone = (phone: string) => {
  let p = phone.trim().replace(/[\s-]/g, "");

  // 09XXXXXXXX or 07XXXXXXXX → 9XXXXXXXX or 7XXXXXXXX
  if (p.startsWith("09") || p.startsWith("07")) {
    p = p.substring(1);
  }

  // 9XXXXXXXX or 7XXXXXXXX → convert to +251
  if (/^[79]\d{8}$/.test(p)) {
    p = "+251" + p;
  }

  // 00251... → +251...
  if (p.startsWith("00251")) {
    p = "+251" + p.slice(5);
  }

  return p;
};

function validatePhone(phone: string): { valid: boolean; message?: string } {
  const trimmed = phone.trim();
  if (!trimmed) return { valid: false, message: "Phone number is required" };

  const normalized = normalizePhone(trimmed);

  if (!ETH_PHONE_RE.test(normalized)) {
    return {
      valid: false,
      message: "Enter a valid Ethiopian phone (09..., 07..., or +251...)",
    };
  }

  return { valid: true };
}

function validateName(name: string): { valid: boolean; message?: string } {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, message: "Full name is required" };
  if (trimmed.length < 2) return { valid: false, message: "Name must be at least 2 characters" };
  if (trimmed.length > 200) return { valid: false, message: "Name must be under 200 characters" };
  return { valid: true };
}

function validateStreet(street: string): { valid: boolean; message?: string } {
  const trimmed = street.trim();
  if (!trimmed) return { valid: false, message: "Street address is required" };
  if (trimmed.length < 3) return { valid: false, message: "Street address too short" };
  if (trimmed.length > 500) return { valid: false, message: "Street address too long" };
  return { valid: true };
}

// ── Field error type ──
interface FieldErrors {
  full_name?: string;
  phone?: string;
  street?: string;
  city?: string;
  shipping_option?: string;
  coupon_code?: string;
  pickup_location_id?: string;
  [key: string]: string | undefined;
}

// ── Component ──

export function CheckoutDrawer() {
  const open = useCart((s) => s.checkoutOpen);
  const close = useCart((s) => s.closeCheckout);
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);
  const user = useAuth((s) => s.user);
  const setLastOrderId = useOrdersUi((s) => s.setLastOrderId);
  const navigate = useNavigate();

  const currency = items[0]?.currency;

  // ── Step & order state ──
  const [step, setStep] = useState<Step>("shipping");
  const [addr, setAddr] = useState<ShippingAddressInput>(emptyAddr);
  const [order, setOrder] = useState<Order | null>(null);
  const [creating, setCreating] = useState(false);
  const [providerCode, setProviderCode] = useState<string>("");
  const [receipt, setReceipt] = useState("");
  const [payerAccount, setPayerAccount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tx, setTx] = useState<SubmittedReceipt | null>(null);
  const [verifyState, setVerifyState] = useState<VerifyResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Shipping state ──
  const [cities, setCities] = useState<ShippingCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOptionsResponse | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState<string>("");
  const [shippingType, setShippingType] = useState<ShippingType>("delivery");
  const [selectedVendorCode, setSelectedVendorCode] = useState<string>("");
  const [selectedPickupId, setSelectedPickupId] = useState<string>("");

  // ── Coupon & field error state ──
  const [couponCode, setCouponCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // ── UI state ──
  const [showVerifyInputs, setShowVerifyInputs] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // ── Refs for scrolling to errors ──
  const fullNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);
  const citySelectRef = useRef<HTMLButtonElement>(null);
  const couponRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Reset on open ──
  useEffect(() => {
    if (!open) return;
    setStep("shipping");
    setOrder(null);
    setTx(null);
    setVerifyState(null);
    setReceipt("");
    setPayerAccount("");
    setProviderCode("");
    setSelectedCityId("");
    setShippingOptions(null);
    setSelectedVendorCode("");
    setSelectedPickupId("");
    setShippingType("delivery");
    setShowVerifyInputs(false);
    setCouponCode("");
    setFieldErrors({});
    setAddr((a) =>
      a.full_name
        ? a
        : {
            ...emptyAddr,
            full_name: user ? `${user.first_name} ${user.last_name ?? ""}`.trim() : "",
            phone: user?.phone ?? "",
          },
    );

    setCitiesLoading(true);
    api.shipping
      .cities()
      .then(setCities)
      .catch(() => toast.error("Failed to load cities"))
      .finally(() => setCitiesLoading(false));
  }, [open, user]);

  // ── Fetch shipping options when city changes ──
  useEffect(() => {
    if (!selectedCityId) {
      setShippingOptions(null);
      setSelectedVendorCode("");
      setSelectedPickupId("");
      return;
    }
    setShippingLoading(true);
    api.shipping
      .options(selectedCityId, items.length, subtotal)
      .then((opts) => {
        setShippingOptions(opts);
        if (opts.delivery.length > 0) {
          setShippingType("delivery");
          setSelectedVendorCode(opts.delivery[0].vendor_code);
        } else if (opts.pickup.length > 0) {
          setShippingType("pickup");
          setSelectedPickupId(opts.pickup[0].location_id);
        }
      })
      .catch(() => toast.error("Failed to load shipping options"))
      .finally(() => setShippingLoading(false));
  }, [selectedCityId, subtotal, items.length]);

  // ── Update city in addr when city changes ──
  useEffect(() => {
    const city = cities.find((c) => c.id === selectedCityId);
    if (city) {
      setAddr((a) => ({ ...a, city_id: city.id, state: city.state }));
    }
  }, [selectedCityId, cities]);

  // ── Polling cleanup ──
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Scroll to first error field ──
  const scrollToFirstError = (errors: FieldErrors) => {
    // Priority order for field focus
    const priority = ["full_name", "city", "shipping_option", "phone", "street", "coupon_code", "pickup_location_id"];
    const firstErrorField = priority.find((f) => errors[f]);
    
    if (!firstErrorField) return;

    let targetRef: React.RefObject<HTMLElement | null> | null = null;
    switch (firstErrorField) {
      case "full_name": targetRef = fullNameRef; break;
      case "phone": targetRef = phoneRef; break;
      case "street": targetRef = streetRef; break;
      case "city": targetRef = citySelectRef; break;
      case "coupon_code": targetRef = couponRef; break;
    }

    setTimeout(() => {
      if (targetRef?.current) {
        targetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        targetRef.current.focus();
      } else if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  // ── Validation for shipping step ──
  const nameValidation = validateName(addr.full_name);
  const phoneValidation = validatePhone(addr.phone);
  const streetValidation = validateStreet(addr.street);

  const hasSelectedShipping =
    shippingType === "delivery"
      ? !!selectedVendorCode
      : !!selectedPickupId;

  const canContinueShipping =
    nameValidation.valid &&
    !!selectedCityId &&
    hasSelectedShipping &&
    (shippingType === "pickup" ||
      (phoneValidation.valid && streetValidation.valid));

  // ── Parse backend field errors ──
  const parseBackendErrors = (details: Record<string, unknown>): FieldErrors => {
    const errors: FieldErrors = {};
    
    // Map backend field names to frontend field names
    const fieldMap: Record<string, keyof FieldErrors> = {
      "coupon_code": "coupon_code",
      "shipping_address.full_name": "full_name",
      "shipping_address.phone": "phone",
      "shipping_address.street": "street",
      "shipping_address.city_id": "city",
      "city_id": "city",
      "shipping_vendor": "shipping_option",
      "pickup_location_id": "pickup_location_id",
      "items": "shipping_option",
      "delivery_type": "shipping_option",
    };

    for (const [backendField, frontendField] of Object.entries(fieldMap)) {
      const errorArr = details[backendField] as string[] | undefined;
      if (errorArr && errorArr.length > 0 && !errors[frontendField]) {
        errors[frontendField] = errorArr[0];
      }
    }

    // Also check for any unmapped fields
    for (const [key, value] of Object.entries(details)) {
      if (Array.isArray(value) && value.length > 0 && !errors[key]) {
        errors[key] = value[0];
      }
    }

    return errors;
  };

  // ── Place order with field error handling ──
  const placeOrder = async () => {
    if (!currency) return;
    setCreating(true);
    setFieldErrors({});
    try {
      const isDelivery = shippingType === "delivery";
      const created = await api.orders.create({
        items: items.map((i) => ({
          product_id: i.product_id,
          size: i.size,
          color_name: i.color_name,
          quantity: i.quantity,
        })),
        delivery_type: shippingType,
        shipping_address: isDelivery ? addr : undefined,
        shipping_vendor: isDelivery ? selectedVendorCode : undefined,
        shipping_service_level: isDelivery
          ? shippingOptions?.delivery.find((d) => d.vendor_code === selectedVendorCode)?.service_name
              .toLowerCase()
              .includes("express")
            ? "express"
            : "standard"
          : undefined,
        pickup_location_id: !isDelivery ? selectedPickupId : undefined,
        coupon_code: couponCode.trim() || undefined,
        customer_note: addr.delivery_instructions,
        currency: currency.code,
      });
      setOrder(created);
      const firstProvider = created.invoice?.payment.methods[0]?.provider_code ?? "";
      setProviderCode(firstProvider);
      setStep("payment");
    } catch (e) {
      if (e instanceof ApiError) {
        const details = e.details as Record<string, unknown> | undefined;
        if (details && typeof details === "object") {
          const parsedErrors = parseBackendErrors(details);
          
          if (Object.keys(parsedErrors).length > 0) {
            setFieldErrors(parsedErrors);
            
            // Show toast with first error
            const firstError = Object.values(parsedErrors)[0];
            if (firstError) toast.error(firstError);
            
            // Determine which step to show based on errors
            const shippingFields = ["full_name", "phone", "street", "city", "shipping_option", "pickup_location_id"];
            const hasShippingErrors = Object.keys(parsedErrors).some(f => shippingFields.includes(f));
            
            if (hasShippingErrors) {
              setStep("shipping");
            }
            
            // Scroll to first error
            scrollToFirstError(parsedErrors);
            setCreating(false);
            return;
          }
        }
        toast.error(e.message);
      } else {
        toast.error("Could not create order");
      }
    } finally {
      setCreating(false);
    }
  };

  // ── Polling (user\\'s exact implementation) ──
  const startPolling = (transaction_id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    const POLL_INTERVAL_MS = 2000;
    const MAX_POLL_DURATION_MS = 10000;
    let timeElapsed = 0;

    const poll = async () => {
      if (timeElapsed >= MAX_POLL_DURATION_MS) {
        console.warn("Polling timed out after 10 seconds.");
        if (pollRef.current) clearInterval(pollRef.current);
        setStep("failed");
        return;
      }

      try {
        const v = await api.payment.verify(transaction_id);
        setVerifyState(v);

        if (v.is_verified || v.status === "verified") {
          if (pollRef.current) clearInterval(pollRef.current);
          if (order) setLastOrderId(order.id);
          setStep("success");
          setTimeout(() => clear(), 400);
          return;
        }

        if (v.is_terminal === true) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("failed");
          return;
        }
      } catch (error) {
        console.error(`⚠️ Network/Server error while verifying ${transaction_id}:`, error);
      }

      timeElapsed += POLL_INTERVAL_MS;
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
  };

  // ── Submit receipt ──
  const submitReceipt = async () => {
    if (!order) return;
    if (!providerCode) return toast.error("Pick a payment method");
    if (!receipt.trim()) return toast.error("Paste your transaction ID or receipt URL");
    const method = order.invoice?.payment.methods.find((m) => m.provider_code === providerCode);
    if (method?.requires_payer_account && !payerAccount.trim()) {
      return toast.error(method.payer_account_label ?? "Enter your payer account");
    }
    setSubmitting(true);
    try {
      const submitted = await api.payment.submitReceipt({
        order_id: order.id,
        provider: providerCode,
        receipt_identifier: receipt.trim(),
        payer_account: payerAccount.trim() || undefined,
      });
      setTx(submitted);
      setStep("verifying");
      startPolling(submitted.transaction_id);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not submit receipt";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cancel order ──
  const cancelOrder = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      await api.orders.cancel(order.id, "User cancelled from payment step");
      toast.success("Order cancelled");
      close();
      clear();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not cancel order";
      toast.error(msg);
    } finally {
      setCancelling(false);
    }
  };

  // ── Copy to clipboard ──
  const copy = async (s: string) => {
    try {
      await navigator.clipboard.writeText(s);
      toast.success("Copied");
    } catch {
      /* clipboard unavailable */
    }
  };

  // ── Derived values ──
  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const selectedMethod: PaymentMethodOption | undefined = order?.invoice?.payment.methods.find(
    (m) => m.provider_code === providerCode,
  );
  const selectedDelivery = shippingOptions?.delivery.find((d) => d.vendor_code === selectedVendorCode);
  const selectedPickup = shippingOptions?.pickup.find((p) => p.location_id === selectedPickupId);

  // Whether drawer can be dismissed
  const canDismiss = step === "shipping" || step === "review";
  const canGoback = step === "shipping" || step === "review" || creating;

  // Receipt verification completeness
  const receiptComplete =
    !!receipt.trim() &&
    (!selectedMethod?.requires_payer_account || !!payerAccount.trim());

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o && canDismiss) close();
      }}
      dismissible={canDismiss}
    >
      <DrawerContent className="border-border bg-background">
        <DrawerHeader className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex-1">
            <DrawerTitle className="text-lg tracking-tight">Checkout</DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              Pay by bank transfer · auto-verified within a few minutes
            </DrawerDescription>
            {(step === "shipping" || step === "review" || step === "payment") && (
              <div className="mt-4 flex items-center gap-2">
                {STEPS.map((s, i) => (
                  <div key={s.id} className="flex flex-1 items-center gap-2">
                    <div
                      className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold transition-colors ${
                        i <= stepIdx
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span
                      className={`text-xs ${
                        i === stepIdx ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                    {i < STEPS.length - 1 && <div className="ml-1 h-px flex-1 bg-border" />}
                  </div>
                ))}
              </div>
            )}
          </div>
          {canDismiss && (
            <button
              onClick={close}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </DrawerHeader>

        <div ref={scrollContainerRef} className="max-h-[62vh] overflow-y-auto px-4 py-5 md:px-6">
          {/* ═══════════════════════════════════════════════════════════
              SHIPPING STEP
             ═══════════════════════════════════════════════════════════ */}
          {step === "shipping" && (
            <div className="grid gap-4">
              {/* 1. Full name */}
              <Field
                ref={fullNameRef}
                label="Full name"
                value={addr.full_name}
                onChange={(v) => {
                  setAddr({ ...addr, full_name: v });
                  setFieldErrors((e) => ({ ...e, full_name: undefined }));
                }}
                error={fieldErrors.full_name ?? (addr.full_name ? (nameValidation.valid ? undefined : nameValidation.message) : undefined)}
              />

              {/* 2. City dropdown */}
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  City
                </Label>
                <Select
                  value={selectedCityId}
                  onValueChange={(v) => {
                    setSelectedCityId(v);
                    setFieldErrors((e) => ({ ...e, city: undefined }));
                  }}
                  disabled={citiesLoading}
                >
                  <SelectTrigger 
                    ref={citySelectRef as React.RefObject<HTMLButtonElement>}
                    className={`h-11 rounded-xl border-border bg-surface ${fieldErrors.city ? "border-destructive" : ""}`}
                  >
                    <SelectValue
                      placeholder={citiesLoading ? "Loading cities…" : "Select a city"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}, {city.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.city && <p className="text-[11px] text-destructive">{fieldErrors.city}</p>}
              </div>

              {/* 3. Shipping options (shown after city selected) */}
              {selectedCityId && shippingOptions && (
                <>
                  {/* Delivery / Pickup toggle */}
                  <div className="grid grid-cols-2 gap-2">
                    {shippingOptions.delivery.length > 0 && (
                      <button
                        onClick={() => {
                          setShippingType("delivery");
                          setFieldErrors((e) => ({ ...e, shipping_option: undefined, pickup_location_id: undefined }));
                        }}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all ${
                          shippingType === "delivery"
                            ? "border-gold bg-gold/10 text-foreground"
                            : "border-border bg-surface text-muted-foreground hover:border-foreground/30"
                        }`}
                      >
                        <Truck className="h-4 w-4" />
                        Delivery
                      </button>
                    )}
                    {shippingOptions.pickup.length > 0 && (
                      <button
                        onClick={() => {
                          setShippingType("pickup");
                          setFieldErrors((e) => ({ ...e, shipping_option: undefined, pickup_location_id: undefined }));
                        }}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all ${
                          shippingType === "pickup"
                            ? "border-gold bg-gold/10 text-foreground"
                            : "border-border bg-surface text-muted-foreground hover:border-foreground/30"
                        }`}
                      >
                        <MapPin className="h-4 w-4" />
                        Pickup
                      </button>
                    )}
                  </div>

                  {/* Delivery options list */}
                  {shippingType === "delivery" && shippingOptions.delivery.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Delivery options
                      </p>
                      {shippingLoading ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading options…
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          {shippingOptions.delivery.map((opt) => (
                            <button
                              key={opt.vendor_code}
                              onClick={() => {
                                setSelectedVendorCode(opt.vendor_code);
                                setFieldErrors((e) => ({ ...e, shipping_option: undefined }));
                              }}
                              className={`flex items-center justify-between rounded-2xl border p-3 text-left transition-all ${
                                selectedVendorCode === opt.vendor_code
                                  ? "border-gold gold-glow bg-surface"
                                  : "border-border bg-surface hover:border-foreground/40"
                              } ${fieldErrors.shipping_option ? "border-destructive" : ""}`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Truck className="h-4 w-4 text-muted-foreground" />
                                  <p className="truncate text-sm font-medium">
                                    {opt.vendor_name}
                                  </p>
                                </div>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {opt.service_name} · {opt.estimated_days}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">
                                  {opt.is_free
                                    ? "Free"
                                    : formatPrice(opt.cost, {
                                        code: opt.currency,
                                        symbol: "Br",
                                      })}
                                </p>
                                {selectedVendorCode === opt.vendor_code && (
                                  <div className="ml-auto mt-1 grid h-4 w-4 place-items-center rounded-full bg-gold">
                                    <Check className="h-2.5 w-2.5 text-gold-foreground" />
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {fieldErrors.shipping_option && (
                        <p className="text-[11px] text-destructive">{fieldErrors.shipping_option}</p>
                      )}
                    </div>
                  )}

                  {/* Pickup options list */}
                  {shippingType === "pickup" && shippingOptions.pickup.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Pickup locations
                      </p>
                      {shippingLoading ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading options…
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          {shippingOptions.pickup.map((loc) => (
                            <button
                              key={loc.location_id}
                              onClick={() => {
                                setSelectedPickupId(loc.location_id);
                                setFieldErrors((e) => ({ ...e, pickup_location_id: undefined }));
                              }}
                              className={`flex items-start justify-between rounded-2xl border p-3 text-left transition-all ${
                                selectedPickupId === loc.location_id
                                  ? "border-gold gold-glow bg-surface"
                                  : "border-border bg-surface hover:border-foreground/40"
                              } ${fieldErrors.pickup_location_id ? "border-destructive" : ""}`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <p className="truncate text-sm font-medium">{loc.name}</p>
                                </div>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {loc.address}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {loc.estimated_days}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">
                                  {loc.is_free
                                    ? "Free"
                                    : formatPrice(loc.cost, { code: "ETB", symbol: "Br" })}
                                </p>
                                {selectedPickupId === loc.location_id && (
                                  <div className="ml-auto mt-1 grid h-4 w-4 place-items-center rounded-full bg-gold">
                                    <Check className="h-2.5 w-2.5 text-gold-foreground" />
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {fieldErrors.pickup_location_id && (
                        <p className="text-[11px] text-destructive">{fieldErrors.pickup_location_id}</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* 4. Conditional fields for delivery */}
              {selectedCityId && hasSelectedShipping && shippingType === "delivery" && (
                <div className="grid gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
                  <Field
                    ref={phoneRef}
                    label="Phone"
                    value={addr.phone}
                    onChange={(v) => {
                      setAddr({ ...addr, phone: v });
                      setFieldErrors((e) => ({ ...e, phone: undefined }));
                    }}
                    error={fieldErrors.phone ?? (addr.phone ? (phoneValidation.valid ? undefined : phoneValidation.message) : undefined)}
                    placeholder="+251911234567"
                  />
                  <Field
                    ref={streetRef}
                    label="Street address"
                    value={addr.street}
                    onChange={(v) => {
                      setAddr({ ...addr, street: v });
                      setFieldErrors((e) => ({ ...e, street: undefined }));
                    }}
                    error={fieldErrors.street ?? (addr.street ? (streetValidation.valid ? undefined : streetValidation.message) : undefined)}
                  />
                  {/* <Field
                    label="Postal code (optional)"
                    value={addr.postal_code ?? ""}
                    onChange={(v) => setAddr({ ...addr, postal_code: v })}
                  /> */}
                  <Field
                    label="Delivery note (optional)"
                    value={addr.delivery_instructions ?? ""}
                    onChange={(v) => setAddr({ ...addr, delivery_instructions: v })}
                  />
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              REVIEW STEP
             ═══════════════════════════════════════════════════════════ */}
          {step === "review" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Ship to
                </p>
                <p className="mt-1 text-sm font-medium">{addr.full_name}</p>
                {shippingType === "delivery" ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {addr.street}, {addr.state} {addr.postal_code}
                    </p>
                    <p className="text-xs text-muted-foreground">{addr.phone}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Pickup at {selectedPickup?.name}
                  </p>
                )}
                {shippingType === "delivery" && selectedDelivery && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted/50 p-2">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {selectedDelivery.vendor_name} · {selectedDelivery.service_name} ·{" "}
                      {selectedDelivery.is_free
                        ? "Free"
                        : `${selectedDelivery.currency} ${selectedDelivery.cost}`}
                    </span>
                  </div>
                )}
                {shippingType === "pickup" && selectedPickup && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted/50 p-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Pickup at {selectedPickup.name} · {selectedPickup.address}
                    </span>
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Items
                </p>
                <ul className="mt-2 space-y-2 text-sm">
                  {items.map((i) => (
                    <li key={i.cart_id} className="flex justify-between gap-3">
                      <span className="truncate">
                        {i.title}{" "}
                        <span className="text-muted-foreground">
                          · {i.color_name} · {i.size} × {i.quantity}
                        </span>
                      </span>
                      <span className="tabular-nums">
                        {formatPrice(i.unit_price * i.quantity, i.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* ── Coupon code (moved from shipping step) ── */}
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-3 w-3" />
                    Coupon code (optional)
                  </span>
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      ref={couponRef}
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        setFieldErrors((err) => ({ ...err, coupon_code: undefined }));
                      }}
                      placeholder="Enter coupon code"
                      disabled={!!fieldErrors.coupon_code}
                      className={`h-11 rounded-xl border-border bg-surface pr-10 focus-visible:ring-gold ${
                        fieldErrors.coupon_code ? "border-destructive focus-visible:ring-destructive" : ""
                      }`}
                    />
                    {couponCode && !fieldErrors.coupon_code && (
                      <button
                        onClick={() => {
                          setCouponCode("");
                          setFieldErrors((err) => ({ ...err, coupon_code: undefined }));
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {fieldErrors.coupon_code && (
                      <button
                        onClick={() => {
                          setCouponCode("");
                          setFieldErrors((err) => ({ ...err, coupon_code: undefined }));
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Coupon error with actions */}
                {fieldErrors.coupon_code && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 space-y-2">
                    <p className="text-sm text-destructive font-medium">{fieldErrors.coupon_code}</p>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setCouponCode("");
                          setFieldErrors((err) => ({ ...err, coupon_code: undefined }));
                        }}
                        className="text-xs font-medium text-destructive hover:underline"
                      >
                        Remove coupon
                      </button>
                      <span className="text-xs text-muted-foreground">·</span>
                      <button
                        onClick={() => {
                          // Keep the coupon code but clear error to let user edit
                          setFieldErrors((err) => ({ ...err, coupon_code: undefined }));
                        }}
                        className="text-xs font-medium text-foreground hover:underline"
                      >
                        Edit coupon
                      </button>
                      <span className="text-xs text-muted-foreground">·</span>
                      <button
                        onClick={() => {
                          setCouponCode("");
                          setFieldErrors((err) => ({ ...err, coupon_code: undefined }));
                          // Retry order creation without coupon
                          placeOrder();
                        }}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                      >
                        Continue without coupon
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Applied coupon badge */}
              {couponCode && !fieldErrors.coupon_code && (
                <div className="flex items-center justify-between rounded-xl bg-green-50 p-3 text-sm text-green-700">
                  <span className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5" />
                    Coupon: {couponCode}
                  </span>
                  <span>Will be applied</span>
                </div>
              )}

              <div className="space-y-1.5 px-1 text-sm">
                <Row label="Subtotal" value={formatPrice(subtotal, currency)} />
                <Row
                  label="Shipping"
                  value={
                    shippingType === "delivery" && selectedDelivery
                      ? selectedDelivery.is_free
                        ? "Free"
                        : formatPrice(selectedDelivery.cost, {
                            code: selectedDelivery.currency,
                            symbol: "Br",
                          })
                      : shippingType === "pickup"
                        ? "Free"
                        : "Calculated by store"
                  }
                />
                {couponCode && !fieldErrors.coupon_code && <Row label="Discount" value="Applied at checkout" />}
                <div className="my-2 h-px bg-border" />
                <Row
                  label="Total"
                  value={formatPrice(
                    subtotal +
                      (shippingType === "delivery" && selectedDelivery && !selectedDelivery.is_free
                        ? parseFloat(selectedDelivery.cost)
                        : 0),
                    currency,
                  )}
                  bold
                />
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              PAYMENT STEP
             ═══════════════════════════════════════════════════════════ */}
          {step === "payment" && order?.invoice && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-900/40 via-emerald-800/20 to-emerald-950/60 backdrop-blur-md p-4 text-sm">
                <p className="font-medium">{order.invoice.payment.instructions}</p>
                {order.invoice.payment.warning && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {order.invoice.payment.warning}
                  </p>
                )}
              </div>

              {/* Collapsible Payment Methods */}
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Choose your bank
                </p>
                <div className="grid gap-2">
                  {/* Selected method - expanded */}
                  {selectedMethod && (
                    <Collapsible defaultOpen>
                      <div
                        className={`rounded-2xl border p-3 transition-all ${
                          providerCode === selectedMethod.provider_code
                            ? "border-gold gold-glow bg-surface"
                            : "border-border bg-surface"
                        }`}
                      >
                        <CollapsibleTrigger className="flex w-full items-center justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            {selectedMethod.provider_logo && (
                              <img
                                src={selectedMethod.provider_logo}
                                alt=""
                                className="h-8 w-8 rounded-lg object-contain"
                              />
                            )}
                            <div className="text-left">
                              <p className="text-sm font-medium">
                                {selectedMethod.provider_name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {selectedMethod.account_type}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="grid h-5 w-5 place-items-center rounded-full bg-gold">
                              <Check className="h-3 w-3 text-gold-foreground" />
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                          <div className="mt-3 space-y-3 rounded-xl border border-border bg-background/50 p-3">
                            <KV
                              label="Recipient"
                              value={selectedMethod.recipient ?? selectedMethod.account_name}
                            />
                            <KV
                              label="Account number"
                              value={selectedMethod.account_number}
                              onCopy={() => copy(selectedMethod.account_number)}
                            />
                            <KV
                              label="Amount"
                              value={`${order.pricing.currency.symbol}${order.pricing.total}`}
                              onCopy={() => copy(order.pricing.total)}
                            />
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )}

                  {/* Other methods - collapsed */}
                  <div className="grid grid-cols-5 gap-2">
                    {/* Other methods - collapsed */}
                    {order.invoice.payment.methods
                      .filter((m) => m.provider_code !== providerCode)
                      .map((m) => (
                        <button
                          key={m.provider_code}
                          onClick={() => {
                            setProviderCode(m.provider_code);
                            setReceipt("");
                            setPayerAccount("");
                            setShowVerifyInputs(false);
                          }}
                          className="flex min-w-0 items-center justify-between rounded-2xl border border-border bg-surface p-3 text-left transition-all hover:border-foreground/40"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {m.provider_logo && (
                              <img
                                src={m.provider_logo}
                                alt=""
                                className="h-8 w-8 rounded-lg object-contain"
                              />
                            )}

                            <p
                              className={`text-sm font-medium ${
                                m.provider_logo ? "hidden lg:block" : ""
                              }`}
                            >
                              {m.provider_code}
                            </p>
                          </div>
                        </button>
                      ))}
                  </div>

                </div>
              </div>

              {/* Verify Payment Toggle */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowVerifyInputs((s) => !s)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/5 p-3 text-sm font-medium text-foreground transition-all hover:bg-gold/10"
                >
                  <Shield className="h-4 w-4" />
                  {showVerifyInputs ? "Hide verification" : "Verify payment"}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      showVerifyInputs ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showVerifyInputs && (
                  <div className="animate-in slide-in-from-top-2 fade-in space-y-3 rounded-2xl border border-border bg-surface p-4 duration-200">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {selectedMethod?.reference.label ?? "Receipt identifier"}
                      </Label>
                      <Input
                        value={receipt}
                        onChange={(e) => setReceipt(e.target.value)}
                        placeholder={selectedMethod?.reference.placeholder ?? "Enter transaction ID"}
                        className="h-11 rounded-xl border-border bg-surface focus-visible:ring-gold"
                      />
                      {selectedMethod?.reference.help_text && (
                        <p className="text-[11px] text-muted-foreground">
                          {selectedMethod.reference.help_text}
                        </p>
                      )}
                    </div>
                    {selectedMethod?.requires_payer_account && (
                      <div className="space-y-1.5">
                        <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {selectedMethod.payer_account_label ?? "Payer account"}
                        </Label>
                        <Input
                          value={payerAccount}
                          onChange={(e) => setPayerAccount(e.target.value)}
                          placeholder="Last 8 digits"
                          className="h-11 rounded-xl border-border bg-surface focus-visible:ring-gold"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              VERIFYING STEP
             ═══════════════════════════════════════════════════════════ */}
          {step === "verifying" && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">Verifying your payment</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                {verifyState?.status_display ?? "We\\'re confirming the transfer with your bank…"}
              </p>
              {tx && (
                <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  TX · {tx.transaction_id}
                </p>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              FAILED STEP
             ═══════════════════════════════════════════════════════════ */}
          {step === "failed" && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-destructive/15 text-destructive">
                <X className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">Could not verify</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                {verifyState?.error_message ?? "The receipt didn\\'t match. Please try again."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setStep("payment")}
                  className="flex h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background"
                >
                  <RefreshCw className="h-4 w-4" />
                  Submit a different receipt
                </button>
                <button
                  onClick={cancelOrder}
                  disabled={cancelling}
                  className="flex h-11 items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-6 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-60"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cancelling…
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      Cancel order
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SUCCESS STEP
             ═══════════════════════════════════════════════════════════ */}
          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-gold animate-float-up">
                <Check className="h-8 w-8 text-gold-foreground" strokeWidth={3} />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">Payment verified</h3>
              <p className="mt-1 text-sm text-muted-foreground">Your order is confirmed.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => {
                    if (order) {
                      close();
                      navigate({ to: "/orders/$id", params: { id: order.id } });
                    }
                  }}
                  className="h-11 rounded-full bg-foreground px-6 text-sm font-semibold text-background"
                >
                  Track order
                </button>
                <button
                  onClick={close}
                  className="h-11 rounded-full border border-border bg-surface px-6 text-sm font-medium"
                >
                  Continue shopping
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            FOOTER ACTIONS
           ═══════════════════════════════════════════════════════════ */}
        {(step === "shipping" || step === "review" || step === "payment") && (
          <div className="flex items-center justify-between gap-2 border-t border-border bg-surface/60 px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-4 md:px-6">
            {(canGoback) && (
              <button
                onClick={() => {
                  if (step === "shipping") return close();
                  if (step === "review") return setStep("shipping");
                  if (step === "payment") return setStep("review");
                }}
                className="flex h-11 items-center gap-1.5 rounded-full px-4 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {step === "shipping" && (
              <button
                onClick={() => {
                  if (!canContinueShipping) {
                    if (!nameValidation.valid) return toast.error(nameValidation.message);
                    if (!selectedCityId) return toast.error("Please select a city");
                    if (!hasSelectedShipping) return toast.error("Please select a shipping option");
                    if (shippingType === "delivery") {
                      if (!phoneValidation.valid) return toast.error(phoneValidation.message);
                      if (!streetValidation.valid) return toast.error(streetValidation.message);
                    }
                    return;
                  }
                  setStep("review");
                }}
                className="flex h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {step === "review" && (
              <button
                onClick={placeOrder}
                disabled={creating}
                className="flex h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background disabled:opacity-60"
              >
                {creating ? "Creating…" : "Confirm order"}
              </button>
            )}
            {step === "payment" && (
              <button
                onClick={submitReceipt}
                disabled={submitting || !showVerifyInputs || !receiptComplete}
                className="flex h-11 w-full items-center gap-2 rounded-full bg-gold px-6 text-sm font-semibold text-gold-foreground disabled:opacity-60"
              >
                {submitting
                  ? "Submitting…"
                  : `Submit receipt · ${formatPrice(
                      order?.pricing.total ?? "0",
                      order?.pricing.currency,
                    )}`}
              </button>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

// ── Sub-components ──

import { forwardRef } from "react";

const Field = forwardRef<HTMLInputElement, {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}>(({ label, value, onChange, error, placeholder }, ref) => {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </Label>
      <Input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-11 rounded-xl border-border bg-surface focus-visible:ring-gold ${
          error ? "border-destructive focus-visible:ring-destructive" : ""
        }`}
      />
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
});
Field.displayName = "Field";

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex justify-between ${
        bold ? "text-base font-semibold" : "text-muted-foreground"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function KV({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium tabular-nums">{value}</p>
      </div>
      {onCopy && (
        <button
          onClick={onCopy}
          className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
          aria-label="Copy"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
