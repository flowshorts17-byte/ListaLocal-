import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/painel", "/admin", "/minhas-listas"];

/**
 * Proxy (antigo "middleware" no Next.js 16):
 * 1) renova a sessão do Supabase (cookies);
 * 2) bloqueia áreas privadas para visitantes não autenticados.
 * A checagem de PAPEL (admin/lojista) é feita no servidor de cada área
 * (layouts) e no banco (RLS) — o proxy é apenas a primeira barreira.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

  if (!url || !key) {
    if (isProtected) {
      const to = request.nextUrl.clone();
      to.pathname = "/entrar";
      to.search = "";
      return NextResponse.redirect(to);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtected && !user) {
    const to = request.nextUrl.clone();
    to.pathname = "/entrar";
    to.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(to);
  }

  if (isProtected) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: [
    // ignora arquivos estáticos, imagens e as rotas de redirecionamento de clique
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|r/|w/|ll-admin/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
