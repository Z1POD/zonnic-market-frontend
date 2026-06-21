// src/routes/$storeSlug.p.$uuid.tsx
//
// Private preview page: /:storeSlug/p/:uuid
//
// • Accessible only via direct link — not listed in catalog, not indexed.
// • Hits /market/:storeSlug/p/:uuid/ on the backend (unlisted endpoint).
// • Shows a "Private preview" banner and links back to the creator's store.

import { createFileRoute, notFound } from "@tanstack/react-router";
import { api, ApiError } from "@/lib/api";
import { ProductPageInner } from "./_product-shared";
import type { ProductDetail } from "@/types/api";

// ── Query ─────────────────────────────────────────────────────────────────────

const previewQuery = (storeSlug: string, uuid: string) => ({
  queryKey: ["product-preview", storeSlug, uuid],
  queryFn: async (): Promise<ProductDetail> => {
    try {
      return await api.market.getProductPreview(storeSlug, uuid);
    } catch (e) {
      if (
        e instanceof ApiError &&
        (e.status === 404 || e.status === 403 || e.code === "PRODUCT_NOT_FOUND")
      ) {
        throw notFound();
      }
      throw e;
    }
  },
});

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/$storeSlug/p/$uuid")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(previewQuery(params.storeSlug, params.uuid)),

  head: ({ loaderData }) => {
    const p = loaderData as ProductDetail | undefined;
    return {
      meta: [
        { title: p ? `Preview — ${p.title}` : "Preview — Zonnic" },
        { name: "robots", content: "noindex, nofollow" },
        { name: "description", content: "Private product preview." },
      ],
    };
  },

  notFoundComponent: () => (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Preview not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This link may have expired or been revoked.
        </p>
      </div>
    </div>
  ),

  errorComponent: ({ error }) => (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center text-sm text-muted-foreground">
      {(error as Error).message}
    </div>
  ),

  component: PreviewPage,
});

// ── Component ─────────────────────────────────────────────────────────────────

function PreviewPage() {
  const { storeSlug, uuid } = Route.useParams();

  return (
    <div className="relative">
      <div className="sticky top-0 z-40 flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-600 backdrop-blur dark:text-amber-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        Private preview — not publicly listed
      </div>

      <ProductPageInner
        slug={uuid}
        backTo={{ to: "/store/$slug" as any, label: "Back to store" }}
        queryOverride={previewQuery(storeSlug, uuid)}
      />
    </div>
  );
}