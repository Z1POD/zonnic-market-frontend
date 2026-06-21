// src/routes/_product-shared.tsx
//
// Shared product-detail logic consumed by:
//   • /product/$slug   (canonical public URL)
//   • /p/$slug         (short-link alias)
//
// Nothing here creates a route — TanStack Router ignores files prefixed with `_`.

import { Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2, ShoppingBag, Eye, Star } from "lucide-react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ErrorBoundary } from "@/components/ErrorPage";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useCart } from "@/store/cart";
import { ApparelCanvas } from "@/features/configurator/ApparelCanvas";
import { formatPrice } from "@/lib/format";
import { inferApparelType } from "@/lib/apparel";
import type { ProductDetail, ProductListItem } from "@/types/api";


export const productQuery = (slug: string) => ({
  queryKey: ["product", slug],
  queryFn: async () => {
    try {
      return await api.market.getProduct(slug);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.code === "PRODUCT_NOT_FOUND")) {
        throw notFound();
      }
      throw e;
    }
  },
});


export function productHead(loaderData: ProductDetail | undefined) {
  const p = loaderData;
  const title = p ? `${p.title} — Zonnic` : "Product — Zonnic";
  return {
    meta: [
      { title },
      { name: "description", content: p?.description ?? "Configure this piece in 3D." },
      { property: "og:title", content: title },
      { property: "og:description", content: p?.description ?? "" },
      ...(p?.thumbnail_url ? [{ property: "og:image", content: p.thumbnail_url }] : []),
    ],
  };
}


interface ProductPageProps {
  slug: string;
  /** Optional back-link override (defaults to /catalog). */
  backTo?: { to: string; label: string };
  /**
   * Override the query used to fetch the product.
   * The preview route passes its UUID-based query here so the shared
   * component doesn't need to know about preview endpoints.
   */
  queryOverride?: ReturnType<typeof productQuery>;
}

export function ProductPageInner({ slug, backTo, queryOverride }: ProductPageProps) {
  const { data: product } = useSuspenseQuery(queryOverride ?? productQuery(slug));
  const addToCart = useCart((s) => s.add);
  const openCart = useCart((s) => s.openDrawer);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [canvasError, setCanvasError] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelProgress, setModelProgress] = useState(0);

  const handleLoadingChange = useCallback((loading: boolean, progress: number) => {
    setModelLoading((prev) => (prev === loading ? prev : loading));
    setModelProgress((prev) => (Math.round(prev) === Math.round(progress) ? prev : progress));
  }, []);

  const apparelType = useMemo(() => inferApparelType(product.title), [product.title]);
  const [colorName, setColorName] = useState(product.variants.colors[0]?.name ?? "");
  const color = useMemo(
    () => product.variants.colors.find((c) => c.name === colorName) ?? product.variants.colors[0],
    [product.variants.colors, colorName],
  );
  const [size, setSize] = useState(color?.sizes[0] ?? product.variants.sizes[0] ?? "M");

  const unitPrice = color?.prices?.[size] ?? product.pricing.retail_price;

  const [isAdded, setIsAdded] = useState(false);

  const onAdd = () => {
    if (!color) return;
    addToCart(product, color, size, 1);
    toast.success("Added to bag", {
      description: `${product.title} · ${color.name} · ${size}`,
      action: { label: "View", onClick: () => openCart() },
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const onPickColor = (name: string) => {
    setColorName(name);
    const v = product.variants.colors.find((c) => c.name === name);
    if (v && !v.sizes.includes(size)) setSize(v.sizes[0] ?? size);
    toast(name, { duration: 1100 });
  };

  const back = backTo ?? { to: "/catalog", label: "Back to catalog" };

  return (
    <div className="relative">
      <div className="mx-auto max-w-7xl px-4 pt-2 md:px-8">
        <Link
          to={back.to as any}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {back.label}
        </Link>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-1 md:px-4 pb:4 md:pb-32 pt-4 md:grid-cols-[1.2fr_1fr] md:gap-12 md:px-8 md:pb-16 md:pt-4">
        {/* ── 3-D Viewer ───────────────────────────────────────────────── */}
        <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-border bg-surface apple-shadow md:aspect-auto h-[80vh] w-[100%] md:h-[calc(100vh-8rem)] md:sticky md:top-20">
          {color && mounted && !canvasError ? (
            <ErrorBoundary
              fallback={(error) => {
                console.warn("3D Engine Context Failed, dropping back to static mockup asset:", error);
                setCanvasError(true);
                return null;
              }}
            >
              <ApparelCanvas
                type={apparelType}
                color={color}
                viewer={product.viewer_3d}
                onLoadingChange={handleLoadingChange}
                onError={() => setCanvasError(true)}
              />
            </ErrorBoundary>
          ) : (
            mounted && canvasError && product.mockups.length > 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-6 animate-in fade-in duration-500">
                <img
                  src={product.mockups[0].url}
                  alt={`${product.title} product fallback presentation`}
                  className="h-full w-full object-contain object-center rounded-2xl"
                />
              </div>
            )
          )}

          {(!mounted || (modelLoading && !canvasError)) && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-surface/90 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-gold" />
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {mounted ? `Loading model · ${Math.round(modelProgress)}%` : "Preparing viewer"}
                </p>
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 z-10">
            {product.is_limited_edition && (
              <span className="rounded-full bg-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-foreground">
                Limited
              </span>
            )}
            <span className="rounded-full z-10 border border-border bg-background/70 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground backdrop-blur">
              {canvasError ? "Preview Mode" : "Drag to rotate"}
            </span>
          </div>

          {/* Floating color picker — mobile only */}
          {product.variants.colors.length > 1 && (
            <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center md:hidden">
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-2 backdrop-blur-md apple-shadow">
                {product.variants.colors.map((v) => (
                  <button
                    key={v.name}
                    title={v.name}
                    onClick={() => onPickColor(v.name)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      colorName === v.name ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ background: v.hex }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Info Panel ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 px-2 md:px-0">
          {/* Title + store */}
            <div>
                <Link
                to="/store/$slug"
                params={{ slug: product.store.slug }}
                className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-gold"
                >
                {product.store.name}
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{product.title}</h1>
                <div className="mt-3 flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-gold">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="font-medium">
                        {product.reviews_summary.average_rating.toFixed(1)}
                        </span>
                    </div>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">
                        {product.reviews_summary.total_reviews} reviews
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="h-3.5 w-3.5"/>
                        <span className="text-muted-foreground">{product.stats.view_count}</span>
                    </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            </div>

          {/* Color swatches — desktop */}
          {product.variants.colors.length > 1 && (
            <section className="hidden md:block">
              <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Color — <span className="text-foreground">{colorName}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.colors.map((v) => (
                  <button
                    key={v.name}
                    title={v.name}
                    onClick={() => onPickColor(v.name)}
                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      colorName === v.name ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ background: v.hex }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Size picker */}
          {(color?.sizes ?? product.variants.sizes).length > 0 && (
            <section>
              <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Size — <span className="text-foreground">{size}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {(color?.sizes ?? product.variants.sizes).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`h-10 min-w-[2.5rem] rounded-xl border px-3 text-sm font-medium transition-colors ${
                      size === s
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-surface text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Mockup thumbnails */}
          {product.mockups.length > 0 && (
            <section>
              <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Mockups
              </p>
              <div className="grid grid-cols-3 gap-2">
                {product.mockups.slice(0, 3).map((m) => (
                  <img
                    key={m.id}
                    src={m.url}
                    alt={m.type}
                    loading="lazy"
                    className="aspect-square w-full rounded-xl border border-border object-cover"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Add-to-bag CTA */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border border-border rounded-t-2xl px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 bg-surface backdrop-blur md:static md:rounded-2xl md:border md:bg-surface md:p-5">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 md:max-w-none">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatPrice(unitPrice, product.pricing.currency)}
                </p>
              </div>
              <button
                onClick={onAdd}
                disabled={!color || isAdded}
                className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-300 active:scale-[0.98] disabled:opacity-50 md:flex-none md:px-8 ${
                  isAdded ? "bg-green-600 text-white" : "bg-gold text-gold-foreground"
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="h-4 w-4 animate-in zoom-in-50 duration-200" /> Added!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" /> Add to bag
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ProductDetailsSection product={product} />

      {product.related_products.length > 0 && (
        <RelatedProducts products={product.related_products} />
      )}
    </div>
  );
}

// ProductPage wrapper (used by both /product/$slug and /p/$slug)
// Each route passes its own slug from useParams; we accept it as a prop
// so the shared component is decoupled from any specific route context.

export function ProductPage({ slug }: { slug: string }) {
  return <ProductPageInner slug={slug} />;
}


export function ProductDetailsSection({ product }: { product: ProductDetail }) {
  const info = product.apparel_info;
  const rows: { label: string; value: string }[] = [];

  if (info?.name) rows.push({ label: "Style", value: info.name });
  if (info?.brand) rows.push({ label: "Brand", value: info.brand });
  if (info?.fit) rows.push({ label: "Fit", value: capitalize(info.fit) });
  if (info?.weight_grams) rows.push({ label: "Fabric weight", value: `${info.weight_grams} g` });
  if (product.is_limited_edition && product.available_quantity != null) {
    rows.push({ label: "Available", value: `${product.available_quantity} in stock` });
  }
  if (product.max_quantity != null) {
    rows.push({ label: "Max per order", value: String(product.max_quantity) });
  }
  if (info?.care_instructions) {
    rows.push({
      label: "Care Instructions",
      value: info.care_instructions || "—",
    });
  }

  if (rows.length === 0 && product.tags.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 pt-8 md:px-8 md:pb-8">
      <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Details</p>

      {rows.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-sm">
          <Table>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label} className="hover:bg-muted/30">
                  <TableCell className="w-[40%] text-muted-foreground">{row.label}</TableCell>
                  <TableCell className="font-medium text-foreground">{row.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {product.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {product.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-background/40 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export function RelatedProducts({ products }: { products: ProductListItem[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 pt-1 md:pt-8 md:px-8 md:pb-16">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">You might also like</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4">
        {products.map((p) => (
          <Link
            key={p.id}
            to="/product/$slug"
            params={{ slug: p.slug }}
            className="group flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2 transition-colors hover:border-gold/60"
          >
            <div className="relative aspect-square overflow-hidden rounded-xl bg-background">
              <img
                src={p.mockup_url ?? p.thumbnail_url}
                alt={p.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {p.is_limited_edition && (
                <div className="absolute left-2 top-2">
                  <span className="rounded-full bg-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-foreground">
                    Limited
                  </span>
                </div>
              )}
            </div>
            <div className="px-1 pb-1">
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatPrice(p.retail_price, p.currency)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}