import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Marca como expiradas as reservas pendentes vencidas.
 * Opcional: as reservas já são tratadas como expiradas automaticamente nas consultas;
 * esta rota apenas atualiza o status no banco. Protegida por CRON_SECRET (Vercel Cron).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "service role não configurada" }, { status: 503 });
  const { data, error } = await supabase.rpc("expire_reservations");
  if (error) return NextResponse.json({ error: "falha ao expirar" }, { status: 500 });
  return NextResponse.json({ expired: data });
}
