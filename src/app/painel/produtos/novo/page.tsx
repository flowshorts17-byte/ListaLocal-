import { requireSession } from "@/lib/auth";
import { ProductForm } from "@/components/product-form";
import { EmptyState } from "@/components/notices";
import { getCategories } from "@/lib/data";
import { saveMyProductAction } from "../../actions";
import { getMyStore } from "../../store";

export default async function NewProductPage() {
  const s = await requireSession(["lojista"], "/painel/produtos/novo");
  const store = await getMyStore(s);
  if (!store) return <EmptyState title="Cadastre sua loja primeiro" action={{ href: "/painel/loja", label: "Cadastrar loja" }} />;
  const categories = await getCategories();
  return (
    <div className="max-w-2xl">
      <h1 className="h-display text-3xl">Novo produto</h1>
      <div className="mt-6">
        <ProductForm action={saveMyProductAction} type="local" categories={categories} canPublish={store.status === "approved"} />
      </div>
    </div>
  );
}
