import { requireSession } from "@/lib/auth";
import { InlineAction } from "@/components/inline-action";
import { formatDate } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import type { Profile } from "@/lib/types";
import { setUserRoleAction, toggleUserActiveAction } from "../actions";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const s = await requireSession(["admin"], "/admin/usuarios");
  let query = s.supabase.from("users").select("*").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.ilike("email", `%${q.slice(0, 80).replace(/[\\%_]/g, (m) => `\\${m}`)}%`);
  const { data } = await query;
  const users = (data as Profile[]) ?? [];
  return (
    <div>
      <h1 className="h-display text-3xl">Usuários</h1>
      <form className="mt-4 flex max-w-md gap-2"><input name="q" defaultValue={q} className="input" placeholder="Buscar por e-mail" /><button className="btn-primary">Buscar</button></form>
      <div className="mt-6 overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Nome / e-mail</th><th>Papel</th><th>Status</th><th>Cadastro</th><th>Ações</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name ?? "—"}<span className="block text-xs text-ink-mute">{u.email}</span></td>
                <td>{ROLE_LABEL[u.role]}</td>
                <td>{u.is_active ? "Ativo" : "Inativo"}</td>
                <td className="text-xs">{formatDate(u.created_at)}</td>
                <td>
                  {u.id === s.userId ? (
                    <span className="text-xs text-ink-mute">você</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {(["cliente", "lojista", "admin"] as const).filter((r) => r !== u.role).map((r) => (
                        <InlineAction key={r} action={setUserRoleAction} fields={{ id: u.id, role: r }} label={`Tornar ${ROLE_LABEL[r].toLowerCase()}`} />
                      ))}
                      <InlineAction action={toggleUserActiveAction} fields={{ id: u.id, value: String(!u.is_active) }} label={u.is_active ? "Desativar" : "Ativar"} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
