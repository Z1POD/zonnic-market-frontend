// src/routes/p.$slug.tsx
//
// Short-URL alias: /p/:slug  →  same product detail page as /product/:slug
// The route is a thin shell; all data-fetching and rendering live in
// _product-shared.tsx so there is exactly one copy of that logic.

import { createFileRoute } from "@tanstack/react-router";
import { productQuery, productHead, ProductPageInner } from "./_product-shared";

export const Route = createFileRoute("/p/$slug")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQuery(params.slug)),

  head: ({ loaderData }) => productHead(loaderData as any),

  notFoundComponent: () => (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Piece not found</h2>
        <a href="/catalog" className="mt-4 inline-block text-sm text-gold">
          Back to catalog
        </a>
      </div>
    </div>
  ),

  errorComponent: ({ error }) => (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center text-sm text-muted-foreground">
      {(error as Error).message}
    </div>
  ),

  component: function PSlugPage() {
    const { slug } = Route.useParams();
    return <ProductPageInner slug={slug} />;
  },
});