import Link from "next/link";
import { ProductImage } from "./product-image";
import { Badge, ProductTypeBadge } from "./badges";
import { formatBRL } from "@/lib/format";
import type { ProductWithRelations } from "@/lib/types";

export function ProductCard({ product }: { product: ProductWithRelations }) {
  const origin =
    product.product_type === "local"
      ? product.store
        ? `${product.store.name} · ${product.store.city}/${product.store.state}`
        : "Loja local"
      : (product.program?.marketplace_name ?? "Marketplace parceiro");
  return (
    <article className="group flex flex-col">
      <Link href={`/produto/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-md bg-sand">
        <ProductImage src={product.image_url} alt={product.name} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <ProductTypeBadge type={product.product_type} />
          {product.is_featured && <Badge tone="ink">Destaque</Badge>}
          {product.is_demo && <Badge tone="warn">Demonstração</Badge>}
        </div>
      </Link>
      <div className="mt-3 flex flex-1 flex-col gap-1">
        <Link href={`/produto/${product.slug}`} className="line-clamp-2 text-sm font-medium text-ink group-hover:underline">
          {product.name}
        </Link>
        <p className="line-clamp-1 text-xs text-ink-mute">{origin}</p>
        <p className="mt-auto pt-1 text-sm font-semibold text-ink">
          {product.product_type === "affiliate" && <span className="mr-1 text-xs font-normal text-ink-mute">a partir de</span>}
          {formatBRL(product.price_cents)}
        </p>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductWithRelations[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
