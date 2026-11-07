// Gera supabase/setup-completo.sql (todas as migrações em ordem) para colar no SQL Editor do Supabase.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const out = [
  "-- ListaLocal — setup completo (gerado por scripts/bundle-sql.mjs). Execute UMA vez num projeto novo.",
  ...files.map((f) => `\n-- >>> ${f}\n${readFileSync(join(dir, f), "utf8")}`),
].join("\n");
writeFileSync(join(process.cwd(), "supabase", "setup-completo.sql"), out);
console.log(`setup-completo.sql gerado com ${files.length} migrações.`);
