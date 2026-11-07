import { requireSession } from "@/lib/auth";
import { EmptyState } from "@/components/notices";
import { ReservationsTable, type ReservationRow } from "@/components/reservations-table";
import { getMyStore } from "../store";

export default async function MyReservationsPage() {
  const s = await requireSession(["lojista"], "/painel/reservas");
  const store = await getMyStore(s);
  if (!store) return <EmptyState title="Cadastre sua loja primeiro" action={{ href: "/painel/loja", label: "Cadastrar loja" }} />;
  const { data } = await s.supabase
    .from("reservations")
    .select("id, guest_name, guest_phone, guest_message, status, expires_at, created_at, quantity, product:products(name, price_cents)")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data as unknown as ReservationRow[]) ?? [];
  return (
    <div>
      <h1 className="h-display text-3xl">Reservas e vendas</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Reservas feitas por convidados de listas de presentes. Entre em contato pelo telefone informado, confirme a reserva e, quando o
        pagamento for combinado e concluído, marque como <strong>venda concluída</strong>. Reservas pendentes expiram em 48 horas.
      </p>
      <div className="mt-6">
        {rows.length ? <ReservationsTable rows={rows} /> : <EmptyState title="Nenhuma reserva ainda" />}
      </div>
    </div>
  );
}
