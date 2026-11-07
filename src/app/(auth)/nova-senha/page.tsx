import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { updatePasswordAction } from "../actions";

export const metadata: Metadata = { title: "Nova senha", robots: { index: false } };

export default function NewPasswordPage() {
  return (
    <div className="container-page max-w-md py-14">
      <h1 className="h-display text-3xl">Criar nova senha</h1>
      <p className="mt-2 text-sm text-ink-soft">Escolha uma senha com pelo menos 8 caracteres.</p>
      <ActionForm action={updatePasswordAction} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="password">Nova senha</label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Repita a nova senha</label>
          <input className="input" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <SubmitButton className="btn-primary w-full" pendingLabel="Salvando…">Salvar nova senha</SubmitButton>
      </ActionForm>
    </div>
  );
}
