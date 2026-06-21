// src/routes/index.tsx

import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { ProductCard } from "@/features/catalog/ProductCard";
import { formatPrice } from "@/lib/format";

const homepageQuery = {
  queryKey: ["homepage"],
  queryFn: () => api.market.getHomepage(),
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zonnic — Customized Apparel, Quietly Premium" },
      {
        name: "description",
        content: "An Apple-clean marketplace for hand-crafted apparel. Configure in 3D, ship anywhere.",
      },
      { property: "og:title", content: "Zonnic — Customized Apparel" },
      { property: "og:description", content: "Configure premium apparel in 3D. Quietly luxurious." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homepageQuery),
  component: Index,
});

function Index() {
  const { data } = useSuspenseQuery(homepageQuery);
  const heroCollection = data.hero[0];
  const featured = heroCollection?.products[0] ?? data.trending.products[0];

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-16 pt-10 md:grid-cols-2 md:gap-16 md:px-8 md:pb-24 md:pt-20">
          <div className="animate-float-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-gold">
              <Sparkles className="h-3 w-3" /> {heroCollection?.name ?? "Capsule"}
            </span>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-7xl">
              Apparel,<br />
              <span className="text-gold">considered.</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">
              {heroCollection?.description ??
                "Each piece is studio-built, then handed to you in 3D. Spin it, choose your colorway, and we ship it within days."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {featured && (
                <Link
                  to="/product/$slug"
                  params={{ slug: featured.slug }}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-transform active:scale-[0.98]"
                >
                  Explor in 3D
                </Link>
              )}
              <Link
                to="/catalog"
                className="inline-flex h-12 items-center rounded-full border border-border bg-surface px-6 text-sm font-medium hover:border-gold"
              >
                View catalog
              </Link>
            </div>
          </div>

          {featured && (
            <div className="relative aspect-square w-full overflow-hidden rounded-[2rem] border border-border bg-surface apple-shadow md:aspect-[4/5]">
              {featured.thumbnail_url || featured.mockup_url ? (
                <img
                  src={featured.thumbnail_url || featured.mockup_url}
                  alt={featured.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">
                  {featured.title}
                </div>
              )}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between rounded-2xl border border-border bg-background/70 px-4 py-3 backdrop-blur">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{featured.store.name}</p>
                  <p className="text-sm font-semibold">{featured.title}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums">
                  {formatPrice(featured.retail_price, featured.currency)}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TRENDING — bento */}
      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{data.trending.title}</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">In rotation now</h2>
          </div>
          <Link to="/catalog" className="hidden text-sm text-muted-foreground hover:text-foreground md:inline">
            See all →
          </Link>
        </div>
        <div className="grid auto-rows-[300px] grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {data.trending.products.slice(0, 6).map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              size={i === 0 ? "tall" : i === 3 ? "wide" : "default"}
              page="landing"
            />
          ))}
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{data.new_arrivals.title}</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Fresh from the studio</h2>
        </div>
        <div className="grid auto-rows-[260px] grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {data.new_arrivals.products.slice(0, 6).map((p) => (
            <ProductCard key={p.id} product={p} page="landing" />
          ))}
        </div>
      </section>

      {/* STORES */}
      <section id="stores" className="mx-auto max-w-7xl border-t border-border px-4 py-16 md:px-8">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Featured studios</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {data.top_stores.map((s) => (
            <Link
              key={s.slug}
              to="/store/$slug"
              params={{ slug: s.slug }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-all hover:border-gold hover:shadow-[0_0_0_1px_rgba(212,175,55,0.15)]"
            >
              {/* Banner (visible but refined) */}
              {s.banner_url && (
                <div className="absolute inset-0">
                  <img
                    src={s.banner_url}
                    alt=""
                    className="h-full w-full object-cover opacity-25 transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              )}

              {/* Soft readability gradient ONLY (not full wash) */}
              <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/40 to-transparent" />

              {/* Logo */}
              {s.logo_url && (
                <div className="absolute right-4 top-4 z-10">
                  <div className="h-10 w-10 overflow-hidden rounded-xl border border-border/60 bg-background/40 backdrop-blur-md">
                    <img
                      src={s.logo_url}
                      alt={s.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="relative z-10">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Studio
                </p>

                <p className="mt-2 text-lg font-semibold tracking-tight">
                  {s.name}
                </p>

                {s.product_count !== undefined && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.product_count} pieces
                  </p>
                )}

                <p className="mt-6 text-xs text-muted-foreground transition-colors group-hover:text-gold">
                  Explore →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 md:flex-row md:px-8">
          <p className="text-xs text-muted-foreground">© Zonnic Atelier · Crafted in 3D</p>
          <p className="text-xs text-muted-foreground">Receipt-verified payments · Ships from the studio</p>
        </div>
      </footer>
    </div>
  );
}
