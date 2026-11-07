import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { SetupNotice } from "@/components/notices";
import { signInAction } from "../actions";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="container-page max-w-md py-14">
      <h1 className="h-display text-3xl">Entrar</h1>
      <p className="mt-2 text-sm text-ink-soft">Acesse suas listas de presentes ou o painel da sua loja.</p>
      <div className="mt-6"><SetupNotice /></div>
      {sp.erro === "link-invalido" && <p className="mt-4 rounded-md bg-accent-soft p-3 text-sm text-accent-dark">Esse link expirou ou já foi usado. Entre ou peça um novo.</p>}
      {sp.erro === "conta-inativa" && <p className="mt-4 rounded-md bg-accent-soft p-3 text-sm text-accent-dark">Sua conta está inativa. Fale com o suporte.</p>}
      <ActionForm action={signInAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={sp.next ?? "/"} />
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <SubmitButton className="btn-primary w-full" pendingLabel="Entrando…">Entrar</SubmitButton>
        <p className="text-right text-sm"><Link href="/recuperar-senha" className="text-ink-soft underline">Esqueci minha senha</Link></p>
      </ActionForm>
      <p className="mt-6 text-sm text-ink-soft">
        Ainda não tem conta? <Link href="/cadastro" className="text-ink underline">Criar conta</Link>
      </p>
    </div>
  );
}
