// src/routes/orders.tsx

import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { ORDER_STATUS_LABEL } from "@/store/orders";
import { formatDate, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Zonnic" },
      { name: "description", content: "Your Zonnic orders and live tracking." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const user = useAuth((s) => s.user);
  const openAuth = useAuth((s) => s.openSheet);
  const hydrated = useAuth((s) => s.hydrated);
  const childMatches = useChildMatches();

  // ALL hooks must be called before any conditional return
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["orders", "mine"],
    queryFn: () => api.orders.list(),
    enabled: Boolean(user) && childMatches.length === 0,
  });

  // If a child route is active (e.g. /orders/$id), render the child via Outlet
  // This check happens AFTER all hooks
  if (childMatches.length > 0) {
    return <Outlet />;
  }

  if (!user) {
    return (
      <EmptyState
        title="Sign in to see your orders"
        description="Once you're signed in, every order you place appears here with live tracking."
        actionLabel="Sign in"
        onAction={openAuth}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 md:px-8 md:pt-16">
      {/* Back to catalog/home link */}
      <Link
        to="/catalog"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to catalog
      </Link>

      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Account</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight md:text-5xl">Orders</h1>
      </header>

      {!hydrated || isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
          <p className="font-medium text-destructive">Couldn't load your orders.</p>
          <p className="mt-1 text-muted-foreground">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 inline-flex h-9 items-center rounded-full bg-foreground px-4 text-xs font-semibold text-background"
          >
            Try again
          </button>
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Browse the capsule and your first order will show up here."
          actionLabel="Browse the capsule"
          actionTo="/catalog"
        />
      ) : (
        <ul className="space-y-3">
          {data!.items.map((o) => (
            <li key={o.id}>
              <Link
                to="/orders/$id"
                params={{ id: o.id }}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-gold md:p-5"
              >
                <div className="flex min-w-0 items-center gap-4">
                  {o.first_item.mockup_url ? (
                    <img
                      src={o.first_item.mockup_url}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover"
                    />
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{o.order_number}</p>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {formatDate(o.created_at)} · {o.item_count} {o.item_count === 1 ? "item" : "items"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatPrice(o.total, { code: o.currency_code, symbol: o.currency_symbol })}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: "/catalog";
  onAction?: () => void;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-16 md:px-8 md:pt-24">
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-surface p-16 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        {actionLabel && actionTo && (
          <Link
            to={actionTo}
            className="mt-2 inline-flex h-10 items-center rounded-full bg-foreground px-5 text-xs font-semibold text-background"
          >
            {actionLabel}
          </Link>
        )}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="mt-2 inline-flex h-10 items-center rounded-full bg-foreground px-5 text-xs font-semibold text-background"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}