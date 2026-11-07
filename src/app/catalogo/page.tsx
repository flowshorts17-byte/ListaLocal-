import type { Metadata } from "next";
import { CatalogView, type CatalogSearchParams } from "./catalog-view";

export const metadata: Metadata = {
  title: "Catálogo de produtos e presentes",
  description: "Produtos de lojas locais e ofertas de marketplaces parceiros, com filtros por categoria, cidade e preço.",
  alternates: { canonical: "/catalogo" },
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  const sp = await searchParams;
  return <CatalogView sp={sp} basePath="/catalogo" title="Catálogo" intro="Produtos de lojas locais e ofertas de marketplaces parceiros, identificados com clareza." />;
}
