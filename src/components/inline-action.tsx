/** Botão que envia uma Server Action com campos ocultos (sem JavaScript obrigatório). */
export function InlineAction({
  action,
  fields,
  label,
  tone = "btn-ghost",
}: {
  action: (fd: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  tone?: string;
}) {
  return (
    <form action={action} className="inline-block">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={`${tone} btn-sm`}>{label}</button>
    </form>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-snug text-ink-mute">{hint}</p>}
    </div>
  );
}
