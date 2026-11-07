import { reservationStatusAction } from "@/app/painel/actions";
import { formatBRL, formatDate } from "@/lib/format";
import { RESERVATION_STATUS_LABEL } from "@/lib/labels";
import { formatWhatsappDisplay } from "@/lib/whatsapp";
import type { ReservationStatus } from "@/lib/types";

export type ReservationRow = {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_message: string | null;
  status: ReservationStatus;
  expires_at: string;
  created_at: string;
  quantity: number;
  product: { name: string; price_cents: number } | null;
  store?: { name: string } | null;
};

function StatusButton({ id, status, label, tone = "btn-ghost" }: { id: string; status: string; label: string; tone?: string }) {
  return (
    <form action={reservationStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={`${tone} btn-sm`}>{label}</button>
    </form>
  );
}

export function ReservationsTable({ rows, showStore = false }: { rows: ReservationRow[]; showStore?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr><th>Produto</th>{showStore && <th>Loja</th>}<th>Convidado</th><th>Situação</th><th>Criada / expira</th><th>Ações</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const expired = r.status === "pending" && new Date(r.expires_at) <= new Date();
            const phone = formatWhatsappDisplay(r.guest_phone) || r.guest_phone;
            return (
              <tr key={r.id}>
                <td>
                  {r.product?.name ?? "—"}
                  <span className="block text-xs text-ink-mute">{r.quantity} × {formatBRL(r.product?.price_cents)}</span>
                </td>
                {showStore && <td>{r.store?.name ?? "—"}</td>}
                <td>
                  {r.guest_name}
                  <span className="block text-xs text-ink-mute">{phone}</span>
                  {r.guest_message && <span className="block text-xs text-ink-mute">“{r.guest_message}”</span>}
                </td>
                <td>{expired ? "Expirada" : RESERVATION_STATUS_LABEL[r.status]}</td>
                <td className="whitespace-nowrap text-xs">
                  {formatDate(r.created_at, true)}
                  {r.status === "pending" && <span className="block text-ink-mute">até {formatDate(r.expires_at, true)}</span>}
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {r.status === "pending" && !expired && (
                      <>
                        <StatusButton id={r.id} status="confirmed" label="Confirmar" tone="btn-sage" />
                        <StatusButton id={r.id} status="cancelled" label="Cancelar" />
                      </>
                    )}
                    {r.status === "confirmed" && (
                      <>
                        <StatusButton id={r.id} status="completed" label="Venda concluída" tone="btn-sage" />
                        <StatusButton id={r.id} status="cancelled" label="Cancelar" />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
