// src/routes/product.$slug.tsx

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Eye, Loader2, ShoppingBag, Star } from "lucide-react";
import { Table, TableBody, TableCell, TableRow,} from "@/components/ui/table";
import { ErrorBoundary } from "@/components/ErrorPage";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useCart } from "@/store/cart";
import { ApparelCanvas } from "@/features/configurator/ApparelCanvas";
import { formatPrice } from "@/lib/format";
import { inferApparelType } from "@/lib/apparel";
import type { ProductDetail, ProductListItem } from "@/types/api";

const productQuery = (slug: string) => ({
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

export const Route = createFileRoute("/product/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(productQuery(params.slug)),
  head: ({ loaderData }) => {
    const p = loaderData as ProductDetail | undefined;
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
  },
  notFoundComponent: () => (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Piece not found</h2>
        <Link to="/catalog" className="mt-4 inline-block text-sm text-gold">
          Back to catalog
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQuery(slug));
  const addToCart = useCart((s) => s.add);
  const openCart = useCart((s) => s.openDrawer);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 1. Error state tracker for 3D engine/WebGL context initialization failures
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

  // Added local state tracker for the visual micro-interaction
  const [isAdded, setIsAdded] = useState(false);

  // Updated onAdd handler to execute sequential aesthetic state logic safely
  const onAdd = () => {
    if (!color) return;
    addToCart(product, color, size, 1);
    toast.success("Added to bag", {
      description: `${product.title} · ${color.name} · ${size}`,
      action: { label: "View", onClick: () => openCart() },
    });

    // Flip to visual success state and clear after 2 seconds
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  const onPickColor = (name: string) => {
    setColorName(name);
    const v = product.variants.colors.find((c) => c.name === name);
    if (v && !v.sizes.includes(size)) setSize(v.sizes[0] ?? size);
    toast(name, { duration: 1100 });
  };

  return (
    <div className="relative">
      <div className="mx-auto max-w-7xl px-4 pt-2 md:px-8">
        <Link
          to="/catalog"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to catalog
        </Link>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-1 md:px-4 pb:4 md:pb-32 pt-4 md:grid-cols-[1.2fr_1fr] md:gap-12 md:px-8 md:pb-16 md:pt-4">
        {/* ── 3D Viewer Container / Fallback Viewport ────────────────── */}
        <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-border bg-surface apple-shadow md:aspect-auto h-[80vh] w-[100%] md:h-[calc(100vh-8rem)] md:sticky md:top-20">
          
          {color && mounted && !canvasError ? (
            // Wrap the canvas in your pre-existing ErrorBoundary component!
            <ErrorBoundary 
              fallback={(error) => {
                console.warn("3D Engine Context Failed, dropping back to static mockup asset:", error);
                setCanvasError(true);
                return null; // Returns null because the fallback JSX is rendered right below
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
            /* Fallback Layout Strategy: First image asset alternative */
            mounted && canvasError && product.mockups.length > 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-6 animate-in fade-in duration-500">
                <img
                  src={product.mockups[0].url}
                  alt={`${product.title} product fallback presentation representation`}
                  className="h-full w-full object-contain object-center rounded-2xl"
                />
              </div>
            )
          )}

          {/* Loading overlay — hidden permanently if the core engine yields an error flag */}
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

          {/* Floating color picker — mobile/small screens only */}
          {product.variants.colors.length > 1 && (
            <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center md:hidden">
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-2 backdrop-blur-md apple-shadow">
                {product.variants.colors.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => onPickColor(v.name)}
                    aria-label={v.name}
                    className={`relative h-8 w-8 shrink-0 rounded-full border-2 transition-all ${
                      v.name === color?.name ? "border-gold gold-glow scale-110" : "border-border/80"
                    }`}
                    style={{ background: v.hex }}
                  >
                    {v.name === color?.name && (
                      <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Details column ───────────────────────────────────────── */}
        <div className="flex flex-col gap-6 px-2">
          <div>
            <Link
              to="/store/$slug"
              params={{ slug: product.store.slug }}
              className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-gold"
            >
              {product.store.name}
            </Link>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{product.title}</h1>
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
                  <span className="text-muted-foreground">{product.stats.view_count}</span>
                  <Eye className="h-3.5 w-3.5"/>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          </div>

          {/* Colorway — desktop/tablet inline picker */}
          <section className="hidden md:block">
            <div className="mb-3 flex items-baseline justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Colorway</p>
              <p className="text-xs font-medium">{color?.name}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {product.variants.colors.map((v) => (
                <button
                  key={v.name}
                  onClick={() => onPickColor(v.name)}
                  aria-label={v.name}
                  className={`relative h-12 w-12 rounded-full border-2 transition-all ${
                    v.name === color?.name ? "border-gold gold-glow scale-105" : "border-border hover:scale-105"
                  }`}
                  style={{ background: v.hex }}
                >
                  {v.name === color?.name && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Colorway — mobile label only */}
          {product.variants.colors.length > 1 && (
            <section className="md:hidden">
              <div className="flex items-baseline justify-between">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Colorway</p>
                <p className="text-xs font-medium">{color?.name}</p>
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Size</p>
              <p className="text-xs text-muted-foreground">
                {product.apparel_info?.fit ?? "Regular"} fit
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(color?.sizes ?? product.variants.sizes).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`h-11 min-w-[64px] rounded-xl border px-4 text-sm font-medium transition-colors ${
                    s === size
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-surface text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

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

          {/* Updated Button Area with State Transitions */}
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
                  isAdded
                    ? "bg-green-600 text-white"
                    : "bg-gold text-gold-foreground"
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="h-4 w-4 animate-in zoom-in-50 duration-200" /> 
                    Added!
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

// ── Additional details section ───────────────────────────────────────────


function ProductDetailsSection({ product }: { product: ProductDetail }) {
  const info = product.apparel_info;

  const rows: { label: string; value: string }[] = [];

  if (info?.name) rows.push({ label: "Style", value: info.name });
  if (info?.brand) rows.push({ label: "Brand", value: info.brand });
  if (info?.fit) rows.push({ label: "Fit", value: capitalize(info.fit) });
  if (info?.weight_grams)
    rows.push({ label: "Fabric weight", value: `${info.weight_grams} g` });
  if (product.is_limited_edition && product.available_quantity != null) {
    rows.push({
      label: "Available",
      value: `${product.available_quantity} in stock`,
    });
  }

  if (product.max_quantity != null) {
    rows.push({ label: "Max per order", value: String(product.max_quantity) });
  }
  if (info?.care_instructions)
    rows.push({ label: "Care Instructions", value: `${info.care_instructions}` ? `${info.care_instructions}` : '_' });
  
  if (rows.length === 0 && product.tags.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 pt-8 md:px-8 md:pb-8">
      <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Details
      </p>

      {/* TABLE */}
      {rows.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-sm">
          <Table>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label} className="hover:bg-muted/30">
                  <TableCell className="w-[40%] text-muted-foreground">
                    {row.label}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {row.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* TAGS */}
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

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Related products ───────────────────────────────────────────────────

function RelatedProducts({ products }: { products: ProductListItem[] }) {
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
              <div className="absolute left-2 top-2 flex flex-col gap-2">
                {p.is_limited_edition && (
                  <span className="rounded-full bg-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-foreground">
                    Limited
                  </span>
                )}
              </div>
            </div>
            <div className="px-1 pb-1">
              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm font-semibold tabular-nums">
                  {formatPrice(p.retail_price, p.currency)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
