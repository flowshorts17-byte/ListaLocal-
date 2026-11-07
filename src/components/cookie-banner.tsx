"use client";

import Link from "next/link";
import { useSyncExternalStore, useState } from "react";

const CONSENT = "ll_consent";
const SID = "ll_sid";
const YEAR = 60 * 60 * 24 * 365;

function readConsent(): string | null {
  const m = document.cookie.match(/(?:^|; )ll_consent=([^;]+)/);
  return m ? decodeURIComponent(m[1]!) : null;
}

function subscribe() {
  return () => {};
}

export function CookieBanner() {
  const stored = useSyncExternalStore(subscribe, readConsent, () => "ssr");
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || stored !== null) return null;

  function choose(value: "all" | "essential") {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT}=${value}; Max-Age=${YEAR}; Path=/; SameSite=Lax${secure}`;
    if (value === "all") {
      document.cookie = `${SID}=${crypto.randomUUID()}; Max-Age=${YEAR}; Path=/; SameSite=Lax${secure}`;
    } else {
      document.cookie = `${SID}=; Max-Age=0; Path=/`;
    }
    setDismissed(true);
  }

  return (
    <div role="dialog" aria-live="polite" aria-label="Preferências de cookies" className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-300 bg-paper p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
      <div className="container-page flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-soft">
          Usamos cookies essenciais para login e segurança. Com sua permissão, também usamos um identificador anônimo para
          medir visitas e cliques. <Link href="/cookies" className="underline">Saiba mais</Link>.
        </p>
        <div className="flex shrink-0 gap-2">
          <button className="btn-ghost btn-sm" onClick={() => choose("essential")}>Somente essenciais</button>
          <button className="btn-primary btn-sm" onClick={() => choose("all")}>Aceitar métricas</button>
        </div>
      </div>
    </div>
  );
}
