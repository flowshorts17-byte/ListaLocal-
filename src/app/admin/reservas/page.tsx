import { requireSession } from "@/lib/auth";
import { EmptyState } from "@/components/notices";
import { ReservationsTable, type ReservationRow } from "@/components/reservations-table";

export default async function AdminReservations() {
  const s = await requireSession(["admin"], "/admin/reservas");
  const { data } = await s.supabase
    .from("reservations")
    .select("id, guest_name, guest_phone, guest_message, status, expires_at, created_at, quantity, product:products(name, price_cents), store:stores(name)")
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = (data as unknown as ReservationRow[]) ?? [];
  return (
    <div>
      <h1 className="h-display text-3xl">Reservas</h1>
      <div className="mt-6">{rows.length ? <ReservationsTable rows={rows} showStore /> : <EmptyState title="Nenhuma reserva" />}</div>
    </div>
  );
}
