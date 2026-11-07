import { requireSession } from "@/lib/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { BR_STATES } from "@/lib/labels";
import { formatWhatsappDisplay } from "@/lib/whatsapp";
import { saveStoreAction } from "../actions";
import { getMyStore } from "../store";

export default async function StoreSettingsPage() {
  const s = await requireSession(["lojista"], "/painel/loja");
  const store = await getMyStore(s);
  return (
    <div className="max-w-2xl">
      <h1 className="h-display text-3xl">{store ? "Dados da loja" : "Cadastrar loja"}</h1>
      <ActionForm action={saveStoreAction} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="name">Nome da loja</label>
          <input className="input" id="name" name="name" required minLength={2} maxLength={100} defaultValue={store?.name} />
        </div>
        <div>
          <label className="label" htmlFor="description">Descrição</label>
          <textarea className="input min-h-24" id="description" name="description" maxLength={2000} defaultValue={store?.description ?? ""} />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <div>
            <label className="label" htmlFor="city">Cidade</label>
            <input className="input" id="city" name="city" required defaultValue={store?.city ?? "Santo Augusto"} />
          </div>
          <div>
            <label className="label" htmlFor="state">Estado</label>
            <select className="input" id="state" name="state" defaultValue={store?.state ?? "RS"}>
              {BR_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="address">Endereço (opcional)</label>
          <input className="input" id="address" name="address" maxLength={200} defaultValue={store?.address ?? ""} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="whatsapp">WhatsApp comercial</label>
            <input className="input" id="whatsapp" name="whatsapp" required inputMode="tel" placeholder="(55) 99999-9999" defaultValue={store ? formatWhatsappDisplay(store.whatsapp) : ""} />
          </div>
          <div>
            <label className="label" htmlFor="instagram">Instagram (opcional)</label>
            <input className="input" id="instagram" name="instagram" placeholder="@sualoja" defaultValue={store?.instagram ?? ""} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="logo">Logotipo (JPG, PNG ou WEBP, até 5 MB)</label>
          <input className="input" id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" />
        </div>
        <SubmitButton className="btn-primary" pendingLabel="Salvando…">{store ? "Salvar" : "Enviar para aprovação"}</SubmitButton>
      </ActionForm>
    </div>
  );
}
