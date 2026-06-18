// src/routes/orders.$id.tsx

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { VerifyResponse } from "@/types/api";

import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Truck,
  Shield,
  XCircle,
  ExternalLink,
  Package,
  Copy,
  ChevronDown,
  Loader2,
  Check,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { ORDER_FLOW, ORDER_STATUS_LABEL } from "@/store/orders";
import { formatDate, formatPrice } from "@/lib/format";
import type { Order } from "@/types/api";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/orders/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Order ${params.id.slice(0, 8).toUpperCase()} — Zonnic` }],
  }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.orders.get(id),
    refetchInterval: (q) => {
      const o = q.state.data as Order | undefined;
      if (!o) return false;
      return o.status === "delivered" || o.status === "cancelled" ? false : 10_000;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ reason }: { reason: string }) => api.orders.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders", "mine"] });
      setShowCancelDialog(false);
      toast.success("Order cancelled");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to cancel order");
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-10 md:px-8">
        <div className="h-72 animate-pulse rounded-3xl border border-border bg-surface" />
      </div>
    );
  }

  if (isError || !order) {
    const msg =
      error instanceof ApiError && (error.status === 404 || error.code === "NOT_FOUND")
        ? "We couldn't find that order."
        : ((error as Error)?.message ?? "Failed to load order.");
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <div className="max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Order unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              onClick={() => refetch()}
              className="h-10 rounded-full bg-foreground px-5 text-xs font-semibold text-background"
            >
              Try again
            </button>
            <Link
              to="/orders"
              className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-5 text-xs font-medium"
            >
              Back to orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const flowIdx = Math.max(0, (ORDER_FLOW as readonly string[]).indexOf(order.status));
  const eta = order.timeline.delivered
    ? formatDate(order.timeline.delivered)
    : "TBD";

  // Show "Verify Payment" only when both status and payment_status are pending
  const needsPaymentVerification = order.status === "pending" && order.payment_status === "pending";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:px-8 md:pt-10">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All orders
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Order</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
            {order.order_number}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Placed {formatDate(order.created_at)} · Payment {order.payment_status.replace("_", " ")}
          </p>
        </div>
        <span className="rounded-full bg-gold px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-foreground">
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </span>
      </header>
      

      {/* Tracking section - show if tracking available or order is shipped/delivered */}
      {(order.tracking_number || order.tracking_url || order.status === "shipped" || order.status === "delivered") && (
        <section className="mt-6 rounded-3xl border border-border bg-surface p-5 md:p-7">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gold/15 text-gold">
              <Truck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {order.tracking_number ? `Tracking · ${order.tracking_number}` : "Tracking pending"}
              </p>
              <p className="text-xs text-muted-foreground">Estimated delivery · {eta}</p>
            </div>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-background px-3 text-[11px] font-medium hover:border-gold"
              >
                Track <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="mt-6">
            <div className="relative h-1.5 w-full rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gold transition-[width] duration-700"
                style={{
                  width: `${Math.max(8, ((flowIdx + 1) / ORDER_FLOW.length) * 100)}%`,
                }}
              />
            </div>
            <ol className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-6">
              {ORDER_FLOW.map((s, i) => {
                const done = i <= flowIdx;
                return (
                  <li key={s} className="flex items-start gap-2">
                    {done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className={`text-[11px] leading-snug ${
                        done ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {ORDER_STATUS_LABEL[s] ?? s}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="mt-7 border-t border-border pt-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Activity</p>
            <ul className="mt-3 space-y-3">
              <ActivityRow label="Order placed" at={order.timeline.created} />
              {order.timeline.paid && <ActivityRow label="Payment verified" at={order.timeline.paid} />}
              {order.timeline.shipped && <ActivityRow label="Shipped" at={order.timeline.shipped} />}
              {order.timeline.delivered && (
                <ActivityRow label="Delivered" at={order.timeline.delivered} />
              )}
            </ul>
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        {/* Items list */}
        <section className="rounded-3xl border border-border bg-surface p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Items</p>
          <ul className="mt-3 space-y-3">
            {order.items.map((i) => (
              <li
                key={i.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-background p-3"
              >
                {i.mockup_url ? (
                  <img
                    src={i.mockup_url}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover"
                  />
                ) : (
                  <div
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-border"
                    style={{ background: i.color_hex }}
                  >
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {i.product_slug ? (
                    <Link
                      to="/product/$slug"
                      params={{ slug: i.product_slug }}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {i.product_name}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-medium">{i.product_name}</p>
                  )}
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {i.color_name} · {i.size} · ×{i.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums">
                  {formatPrice(i.subtotal, order.pricing.currency)}
                </p>
              </li>
            ))}
          </ul>

          {/* Pricing summary within items section */}
          <div className="mt-4 border-t border-border pt-4">
            <dl className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatPrice(order.pricing.subtotal, order.pricing.currency)} />
              <Row
                label="Shipping"
                value={
                  parseFloat(order.pricing.shipping_cost) === 0
                    ? "Free"
                    : formatPrice(order.pricing.shipping_cost, order.pricing.currency)
                }
              />
              {parseFloat(order.pricing.discount) > 0 && (
                <Row label="Discount" value={`− ${formatPrice(order.pricing.discount, order.pricing.currency)}`} />
              )}
              {order.pricing.tax && (
                <Row
                    label="Tax"
                    value={
                      parseFloat(order.pricing.tax) === 0
                        ? "0"
                        : formatPrice(order.pricing.tax, order.pricing.currency)
                    }
                  />
              )}
              <div className="my-2 h-px bg-border" />
              <Row label="Total" value={formatPrice(order.pricing.total, order.pricing.currency)} bold />
            </dl>
          </div>
          <div className="mt-4">
            {needsPaymentVerification && order.invoice && (
              <PaymentVerificationInline order={order} onVerified={() => refetch()} />
            )}
          </div>
        </section>

        <aside className="space-y-4">
          {/* Payment info */}
          <div className="rounded-3xl border border-border bg-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Payment</p>
            <div className="mt-3">
              <p className="text-sm font-medium">
                Status:{" "}
                <span
                  className={
                    order.payment_status === "paid"
                      ? "text-green-600"
                      : order.payment_status === "failed"
                        ? "text-destructive"
                        : "text-amber-600"
                  }
                >
                  {order.payment_status
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (char) => char.toUpperCase())}
                </span>
              </p>
              {order.payment.provider && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Paid via {order.payment.provider}
                  {order.payment.receipt_id ? ` · ${order.payment.receipt_id}` : ""}
                </p>
              )}
              {order.payment.verified_at && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Verified {formatDate(order.payment.verified_at)}
                </p>
              )}
            </div>
          </div>

          {/* Shipping info */}
          {order.shipping?.delivery_type === "delivery" &&
            order.shipping?.address && (
              <div className="rounded-3xl border border-border bg-surface p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Ship to</p>
                <p className="mt-2 text-sm font-medium">{order.shipping.address.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {order.shipping.address.street}
                  <br />
                  {[order.shipping.address.city_name, order.shipping.address.country_name]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">{order.shipping.address.phone}</p>
              </div>
          )}

          {/* Pickup info */}
          {order.shipping?.delivery_type === "pickup" &&
            order.shipping?.pickup_location && (
              <div className="rounded-3xl border border-border bg-surface p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Pickup Location
                </p>

                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium">
                    {order.shipping.pickup_location.name}
                  </p>

                  <p className="text-sm text-muted-foreground font-medium">
                    {order.shipping.pickup_location.address}
                  </p>

                  {order.shipping.pickup_location.landmark && (
                    <p className="text-sm text-muted-foreground">
                      Landmark: {order.shipping.pickup_location.landmark}
                    </p>
                  )}

                  {order.shipping.pickup_location.phone && (
                    <p className="text-sm text-muted-foreground">
                      Phone: {order.shipping.pickup_location.phone}
                    </p>
                  )}

                  {order.shipping.pickup_location.instructions && (
                    <p className="text-sm font-medium">
                      "{order.shipping.pickup_location.instructions?.replace(/^['"]|['"]$/g, "")}"
                    </p>
                  )}
                  {order.shipping.pickup_location?.opening_hours && (
                    <Accordion type="single" collapsible className="mt-4">
                      <AccordionItem value="hours" className="border-none">
                        <AccordionTrigger className="py-0 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:no-underline">
                          Opening Hours
                        </AccordionTrigger>

                        <AccordionContent>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {Object.entries(order.shipping.pickup_location.opening_hours).map(([day, hours]) => {
                              // Cast hours to our explicit OpeningHourSlot type safely inline
                              const slot = hours as { open: string; close: string } | null;
                              
                              // Skip rendering if this day is marked null/closed
                              if (!slot) return null;

                              return (
                                <div
                                  key={day}
                                  className="flex items-center justify-between"
                                >
                                  <span className="capitalize">
                                    {day.replace("-", " - ")}
                                  </span>
                                  <span>
                                    {slot.open} – {slot.close}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              </div>
          )}

          {/* Cancellation info */}
          {order.cancellation_reason && (
            <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-destructive">Cancelled</p>
              <p className="mt-2 text-sm text-destructive">{order.cancellation_reason}</p>
            </div>
          )}

          {/* Action buttons - only on detail page */}
          <div className="mt-4 flex flex-wrap gap-2">
            {order.can_cancel && (
              <button
                onClick={() => setShowCancelDialog(true)}
                disabled={cancelMutation.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-destructive/30 px-4 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                {cancelMutation.isPending ? "Cancelling..." : "Cancel order"}
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <CancelDialog
          onCancel={() => setShowCancelDialog(false)}
          onConfirm={(reason) => cancelMutation.mutate({ reason })}
          isPending={cancelMutation.isPending}
          error={cancelMutation.error instanceof ApiError ? cancelMutation.error.message : undefined}
        />
      )}
    </div>
  );
}

// ── Inline Payment Verification (reuses CheckoutDrawer patterns) ──

function PaymentVerificationInline({
  order,
  onVerified,
}: {
  order: Order;
  onVerified: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [providerCode, setProviderCode] = useState<string>(
    order.invoice?.payment.methods[0]?.provider_code ?? ""
  );
  const [receipt, setReceipt] = useState("");
  const [payerAccount, setPayerAccount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  const [verifyState, setVerifyState] = useState<VerifyResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const selectedMethod = order.invoice?.payment.methods.find(
    (m) => m.provider_code === providerCode
  );

  const copy = async (s: string) => {
    try {
      await navigator.clipboard.writeText(s);
      toast.success("Copied");
    } catch {
      /* clipboard unavailable */
    }
  };

  const startPolling = (transaction_id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    // Pass VerifyResponse inside the generic useState diamond notation
    const [verifyState, setVerifyState] = useState<VerifyResponse | null>(null);
    const POLL_INTERVAL_MS = 3000;
    const MAX_DURATION_MS = 120000;
    let elapsed = 0;

    const poll = async () => {
      if (elapsed >= MAX_DURATION_MS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setVerifying(false);
        setVerifyState({
          status: "timeout",
          status_display: "Verification timed out. Please check again later.",
        });
        return;
      }

      try {
        // Explicitly type the API response variable as VerifyResponse
        const v: VerifyResponse = await api.payment.verify(transaction_id);
        setVerifyState(v);

        if (v.is_verified || v.status === "verified") {
          if (pollRef.current) clearInterval(pollRef.current);
          setVerifying(false);
          toast.success("Payment verified!");
          onVerified();
          return;
        }

        if (v.is_terminal || v.status === "mismatch" || v.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          toast.error("Payment Failed");
          setVerifying(false);
          return;
        }
      } catch (err) {
        console.error("Verify poll error:", err);
      }

      elapsed += POLL_INTERVAL_MS;
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
  };

  const submitReceipt = async () => {
    if (!providerCode) return toast.error("Pick a payment method");
    if (!receipt.trim()) return toast.error("Paste your transaction ID or receipt URL");
    if (selectedMethod?.requires_payer_account && !payerAccount.trim()) {
      return toast.error(selectedMethod.payer_account_label ?? "Enter your payer account");
    }

    setSubmitting(true);
    try {
      const submitted = await api.payment.submitReceipt({
        order_id: order.id,
        provider: providerCode,
        receipt_identifier: receipt.trim(),
        payer_account: payerAccount.trim() || undefined,
      });
      setIsOpen(false);
      setVerifying(true);
      startPolling(submitted.transaction_id);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not submit receipt";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const receiptComplete =
    !!receipt.trim() &&
    (!selectedMethod?.requires_payer_account || !!payerAccount.trim());

  if (verifying) {
    return (
      <div className="w-full rounded-3xl border border-border bg-surface p-5 md:p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Verifying your payment</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {verifyState?.status_display ?? "We're confirming the transfer with your bank…"}
          </p>
          {/* Cast verifyState to any safely to read properties that might be missing from the current narrowed interface */}
          {(verifyState as any)?.is_terminal && !verifyState?.is_verified && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">
                {verifyState?.error_message ?? "Verification failed. Please try again."}
              </p>
              <button
                onClick={() => {
                  setVerifying(false);
                  setVerifyState(null);
                  setIsOpen(true);
                }}
                className="mt-2 text-xs font-medium text-foreground hover:underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gold px-4 text-xs font-semibold text-gold-foreground hover:bg-gold/90"
        >
          <Shield className="h-4 w-4" /> Verify Payment
        </button>
      ) : (
        <div className="w-full rounded-3xl border border-border bg-surface p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Payment Verification</p>
                <p className="text-xs text-muted-foreground">
                  Transfer exactly {formatPrice(order.pricing.total, order.pricing.currency)} to one of our accounts
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Hide
            </button>
          </div>

          {order.invoice?.payment.warning && (
            <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-50/50 p-3 text-xs text-amber-800">
              {order.invoice.payment.warning}
            </div>
          )}

          {/* Payment Methods */}
          <div className="mt-4">
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
                          <p className="text-sm font-medium">{selectedMethod.provider_name}</p>
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
                    <CollapsibleContent>
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
                {order.invoice?.payment.methods
                  .filter((m) => m.provider_code !== providerCode)
                  .map((m) => (
                    <button
                      key={m.provider_code}
                      onClick={() => {
                        setProviderCode(m.provider_code);
                        setReceipt("");
                        setPayerAccount("");
                      }}
                      className="flex min-w-0 items-center justify-center rounded-2xl border border-border bg-surface p-3 text-left transition-all hover:border-foreground/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {m.provider_logo && (
                          <img
                            src={m.provider_logo}
                            alt=""
                            className="h-8 w-8 rounded-lg object-contain"
                          />
                        )}
                        <p className={`text-sm font-medium ${m.provider_logo ? "hidden lg:block" : ""}`}>
                          {m.provider_code}
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Receipt submission */}
          <div className="mt-4 space-y-3">
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
            <button
              onClick={submitReceipt}
              disabled={submitting || !receiptComplete}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gold px-6 text-sm font-semibold text-gold-foreground disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                `Submit receipt · ${formatPrice(order.pricing.total, order.pricing.currency)}`
              )}
            </button>
          </div>
        </div>
      )}
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

function CancelDialog({
  onCancel,
  onConfirm,
  isPending,
  error,
}: {
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
  error?: string;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6">
        <h3 className="text-lg font-semibold">Cancel Order</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Are you sure you want to cancel this order? This action cannot be undone.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for cancellation (optional)"
          className="mt-3 min-h-[80px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
        />
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="h-10 flex-1 rounded-full border border-border bg-surface text-xs font-medium"
          >
            Keep order
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isPending}
            className="h-10 flex-1 rounded-full bg-destructive text-xs font-semibold text-destructive-foreground disabled:opacity-50"
          >
            {isPending ? "Cancelling..." : "Cancel order"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ label, at }: { label: string; at: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{new Date(at).toLocaleString()}</p>
      </div>
    </li>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-semibold" : "text-muted-foreground"}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums text-foreground">{value}</dd>
    </div>
  );
}