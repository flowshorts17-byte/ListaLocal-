import type { NextRequest } from "next/server";
import { handleClick } from "@/lib/click-handler";

export const dynamic = "force-dynamic";

/** COMPRAR PELO WHATSAPP: registra o clique e abre o WhatsApp comercial da loja. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  return handleClick(request, productId, "whatsapp");
}
