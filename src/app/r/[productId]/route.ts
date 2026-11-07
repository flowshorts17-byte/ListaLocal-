import type { NextRequest } from "next/server";
import { handleClick } from "@/lib/click-handler";

export const dynamic = "force-dynamic";

/** COMPRAR NA LOJA: registra o clique e redireciona ao link de afiliado cadastrado. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  return handleClick(request, productId, "affiliate");
}
