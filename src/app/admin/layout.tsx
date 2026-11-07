import Link from "next/link";
import { requireSession } from "@/lib/auth";

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "ListaLocal Admin",
  manifest: "/ll-admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "LL Admin", statusBarStyle: "default" },
  icons: { apple: "/ll-admin/apple-180.png" },
};

export const viewport: Viewport = { themeColor: "#c4532f" };

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/lojas", label: "Lojas" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/afiliados", label: "Programas de afiliados" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/cliques", label: "Cliques" },
  { href: "/admin/reservas", label: "Reservas" },
  { href: "/admin/vendas", label: "Vendas e comissões" },
  { href: "/admin/listas", label: "Listas" },
  { href: "/admin/usuarios", label: "Usuários" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSession(["admin"], "/admin");
  return (
    <div className="container-page py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Administração</p>
      <nav aria-label="Administração" className="mt-3 flex gap-1 overflow-x-auto border-b border-sand-200 text-sm">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-ink-soft hover:border-sand-300 hover:text-ink">
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="pt-8">{children}</div>
    </div>
  );
}
