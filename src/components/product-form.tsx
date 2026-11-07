import { ActionForm, SubmitButton } from "./forms";
import { centsToInput } from "@/lib/format";
import { AVAILABILITY_LABEL, PRODUCT_STATUS_LABEL } from "@/lib/labels";
import type { ActionState, AffiliateProgram, Category, Product, Store } from "@/lib/types";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  product?: Product | null;
  type: "local" | "affiliate";
  categories: Category[];
  stores?: Pick<Store, "id" | "name" | "city">[]; // admin: escolher a loja
  programs?: Pick<AffiliateProgram, "id" | "name" | "marketplace_name">[];
  isAdmin?: boolean;
  canPublish?: boolean;
};

export function ProductForm({ action, product, type, categories, stores, programs, isAdmin, canPublish = true }: Props) {
  return (
    <ActionForm action={action} className="space-y-5">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="product_type" value={type} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">Nome do produto</label>
          <input className="input" id="name" name="name" required minLength={2} maxLength={140} defaultValue={product?.name} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">Descrição</label>
          <textarea className="input min-h-28" id="description" name="description" maxLength={5000} defaultValue={product?.description ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="price">{type === "affiliate" ? "Preço informado (R$)" : "Preço (R$)"}</label>
          <input className="input" id="price" name="price" inputMode="decimal" required placeholder="159,90" defaultValue={centsToInput(product?.price_cents)} />
        </div>
        <div>
          <label className="label" htmlFor="category_id">Categoria</label>
          <select className="input" id="category_id" name="category_id" defaultValue={product?.category_id ?? ""}>
            <option value="">Sem categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {type === "local" && stores && (
          <div className="sm:col-span-2">
            <label className="label" htmlFor="store_id">Loja</label>
            <select className="input" id="store_id" name="store_id" required defaultValue={product?.store_id ?? ""} disabled={!!product}>
              <option value="" disabled>Selecione…</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
            </select>
            {product && <input type="hidden" name="store_id" value={product.store_id ?? ""} />}
          </div>
        )}

        {type === "affiliate" && (
          <>
            <div>
              <label className="label" htmlFor="affiliate_program_id">Programa / marketplace</label>
              <select className="input" id="affiliate_program_id" name="affiliate_program_id" required defaultValue={product?.affiliate_program_id ?? ""}>
                <option value="" disabled>Selecione…</option>
                {(programs ?? []).map((p) => <option key={p.id} value={p.id}>{p.marketplace_name} ({p.name})</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="affiliate_url">Link de afiliado (oficial, gerado no programa)</label>
              <input className="input" id="affiliate_url" name="affiliate_url" type="url" required placeholder="https://…" defaultValue={product?.affiliate_url ?? ""} />
              <p className="mt-1 text-xs text-ink-mute">Cole exatamente o link gerado no painel do programa de afiliados. Nunca use links inventados.</p>
            </div>
          </>
        )}

        <div>
          <label className="label" htmlFor="availability">Disponibilidade</label>
          <select className="input" id="availability" name="availability" defaultValue={product?.availability ?? "available"}>
            {Object.entries(AVAILABILITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Publicação</label>
          <select className="input" id="status" name="status" defaultValue={product?.status ?? "draft"}>
            {Object.entries(PRODUCT_STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v} disabled={v === "published" && !canPublish}>{l}</option>
            ))}
          </select>
          {!canPublish && <p className="mt-1 text-xs text-warn">A publicação é liberada após a aprovação da loja.</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="image">Imagem (JPG, PNG ou WEBP, até 5 MB)</label>
          <input className="input" id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" />
          {isAdmin && (
            <>
              <label className="label mt-3" htmlFor="image_url">…ou URL https da imagem (somente com autorização de uso)</label>
              <input className="input" id="image_url" name="image_url" type="url" placeholder="https://" defaultValue={product?.image_url ?? ""} />
            </>
          )}
          {product?.image_url && <p className="mt-1 text-xs text-ink-mute">Imagem atual mantida se nenhum arquivo for enviado.</p>}
        </div>

        {isAdmin && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="is_featured" defaultChecked={product?.is_featured} /> Produto em destaque
          </label>
        )}
      </div>
      <SubmitButton className="btn-primary" pendingLabel="Salvando…">{product ? "Salvar alterações" : "Cadastrar produto"}</SubmitButton>
    </ActionForm>
  );
}
