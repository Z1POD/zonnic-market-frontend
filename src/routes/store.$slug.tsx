// src/routes/store.$slug.tsx

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Star } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { ProductCard } from "@/features/catalog/ProductCard";

const storeQuery = (slug: string) => ({
  queryKey: ["store", slug],
  queryFn: async () => {
    try {
      return await api.market.getStore(slug);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.code === "STORE_NOT_FOUND")) {
        throw notFound();
      }
      throw e;
    }
  },
});

export const Route = createFileRoute("/store/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(storeQuery(params.slug)),
  head: ({ loaderData }) => {
    const d = loaderData as { store?: { name?: string; description?: string } } | undefined;
    return {
      meta: [
        { title: `${d?.store?.name ?? "Studio"} — Zonnic` },
        {
          name: "description",
          content: d?.store?.description ?? "A featured Zonnic studio and the pieces they craft.",
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Studio not found</h2>
        <Link to="/" className="mt-4 inline-block text-sm text-gold">
          Back home
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  component: StorePage,
});

function StorePage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(storeQuery(slug));

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 md:px-8 md:pt-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Studios
      </Link>

      <header className="relative mt-5 overflow-hidden rounded-3xl border border-border bg-surface p-6 md:p-10">

        {/* Banner background (hero atmosphere) */}
        {data.store.banner_url && (
          <div className="absolute inset-0">
            <img
              src={data.store.banner_url}
              alt=""
              className="h-full w-full object-cover opacity-25 md:opacity-30 scale-105"
            />
          </div>
        )}

        {/* Soft gradient for readability (critical) */}
        <div className="absolute inset-0 bg-gradient-to-br from-surface/90 via-surface/70 to-surface/95" />

        {/* Floating logo (premium badge) */}
        {data.store.logo_url && (
          <div className="absolute right-6 top-6 md:right-10 md:top-10 z-10">
            <div className="h-14 w-14 overflow-hidden rounded-2xl border border-border/60 bg-background/40 backdrop-blur-md shadow-sm">
              <img
                src={data.store.logo_url}
                alt={data.store.name}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="relative z-10">

          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-gold">
            <Sparkles className="h-3 w-3" /> Featured studio
          </span>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
            {data.store.name}
          </h1>

          {data.store.description && (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {data.store.description}
            </p>
          )}

          <dl className="mt-6 flex flex-wrap gap-6 text-sm">
            <Stat label="Pieces" value={String(data.total_products)} />

            {data.store.rating !== undefined && (
              <Stat
                label="Avg. rating"
                value={
                  <span className="inline-flex items-center gap-1 text-gold">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {data.store.rating.toFixed(1)}
                  </span>
                }
              />
            )}

            {data.store.review_count !== undefined && (
              <Stat
                label="Reviews"
                value={data.store.review_count.toLocaleString()}
              />
            )}
          </dl>
        </div>
      </header>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">The collection</h2>
        <div className="mt-5 grid auto-rows-[280px] grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {data.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
