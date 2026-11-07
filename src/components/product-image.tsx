import Image from "next/image";
import { SUPABASE_URL } from "@/lib/env";

function isOptimizable(src: string) {
  try {
    const host = new URL(src).hostname;
    const sb = SUPABASE_URL ? new URL(SUPABASE_URL).hostname : null;
    return sb ? host === sb : host.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export function ProductImage({ src, alt, sizes, priority = false }: { src: string | null; alt: string; sizes: string; priority?: boolean }) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-sand text-ink-mute" aria-label="Sem imagem">
        <span className="font-display text-3xl italic opacity-40">L</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!isOptimizable(src)}
      className="object-cover"
    />
  );
}
