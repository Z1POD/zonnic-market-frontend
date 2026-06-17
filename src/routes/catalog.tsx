// src/routes/catalog.tsx

import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { ProductCard } from "@/features/catalog/ProductCard";
import { inferApparelType } from "@/lib/apparel";
import type { ApparelType } from "@/types/api";

const productsQuery = {
  queryKey: ["products", "all"],
  queryFn: () => api.market.listProducts(),
};

const FILTERS: { id: ApparelType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tshirt", label: "Tees" },
  { id: "longsleeve", label: "Long sleeve" },
  { id: "hoodie", label: "Hoodies" },
  { id: "cap", label: "Caps" },
  { id: "bag", label: "Bags" },
];

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Catalog — Zonnic" },
      { name: "description", content: "Browse the full Zonnic capsule. Configure each piece in 3D." },
      { property: "og:title", content: "Catalog — Zonnic" },
      { property: "og:description", content: "Browse the full Zonnic capsule." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: CatalogPage,
});

function CatalogPage() {
  const { data } = useSuspenseQuery(productsQuery);
  const [filter, setFilter] = useState<ApparelType | "all">("all");
  const filtered =
    filter === "all"
      ? data.products
      : data.products.filter((p) => inferApparelType(p.title) === filter);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 md:px-8 md:pt-16">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Catalog</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight md:text-5xl">The full capsule</h1>
        <p className="mt-2 text-sm text-muted-foreground">{data.total_results} pieces</p>
      </header>

      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
              filter === f.id
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-surface text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid auto-rows-[280px] grid-cols-2 overflow-hidden rounded-t-3xl md:rounded-0 gap-0 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} page="catalog" />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          Nothing in this category yet.
        </div>
      )}
    </div>
  );
}
