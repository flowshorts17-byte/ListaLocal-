import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, Honeypot, SubmitButton } from "@/components/forms";
import { SetupNotice } from "@/components/notices";
import { signUpAction } from "../actions";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const sp = await searchParams;
  const defaultType = sp.tipo === "lojista" ? "lojista" : "cliente";
  // eslint-disable-next-line react-hooks/purity -- marca o início do preenchimento (proteção anti-robô)
  const startedAt = Date.now();
  return (
    <div className="container-page max-w-md py-14">
      <h1 className="h-display text-3xl">Criar conta</h1>
      <p className="mt-2 text-sm text-ink-soft">Gratuito para quem cria listas e para lojas participantes.</p>
      <div className="mt-6"><SetupNotice /></div>
      <ActionForm action={signUpAction} className="relative mt-6 space-y-4">
        <Honeypot />
        <input type="hidden" name="started_at" value={startedAt} />
        <fieldset>
          <legend className="label">Tipo de conta</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "cliente", t: "Pessoa", d: "Criar listas de presentes" },
              { v: "lojista", t: "Loja", d: "Cadastrar meu estabelecimento" },
            ].map((o) => (
              <label key={o.v} className="cursor-pointer rounded-md border border-sand-300 p-3 text-sm has-[:checked]:border-sage has-[:checked]:bg-sage-soft">
                <input type="radio" name="account_type" value={o.v} defaultChecked={o.v === defaultType} className="sr-only" />
                <span className="block font-medium">{o.t}</span>
                <span className="block text-xs text-ink-soft">{o.d}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="full_name">Nome completo</label>
          <input className="input" id="full_name" name="full_name" autoComplete="name" required minLength={2} maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          <p className="mt-1 text-xs text-ink-mute">Mínimo de 8 caracteres.</p>
        </div>
        <label className="flex items-start gap-2 text-sm text-ink-soft">
          <input type="checkbox" name="accept_terms" required className="mt-1" />
          <span>
            Li e aceito os <Link href="/termos" className="underline">Termos de Uso</Link> e a{" "}
            <Link href="/privacidade" className="underline">Política de Privacidade</Link>.
          </span>
        </label>
        <SubmitButton className="btn-primary w-full" pendingLabel="Criando conta…">Criar conta</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-sm text-ink-soft">
        Já tem conta? <Link href="/entrar" className="text-ink underline">Entrar</Link>
      </p>
    </div>
  );
}
