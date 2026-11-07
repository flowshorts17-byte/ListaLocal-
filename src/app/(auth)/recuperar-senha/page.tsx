import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { requestPasswordResetAction } from "../actions";

export const metadata: Metadata = { title: "Esqueci minha senha", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="container-page max-w-md py-14">
      <h1 className="h-display text-3xl">Esqueci minha senha</h1>
      <p className="mt-2 text-sm text-ink-soft">Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.</p>
      <ActionForm action={requestPasswordResetAction} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <SubmitButton className="btn-primary w-full" pendingLabel="Enviando…">Enviar link</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-sm text-ink-soft"><Link href="/entrar" className="text-ink underline">Voltar para Entrar</Link></p>
    </div>
  );
}
