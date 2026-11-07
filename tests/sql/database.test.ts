/**
 * Testes do banco (migrações + RLS + funções) usando PGlite (PostgreSQL 18 em WASM)
 * com um stub mínimo de auth/storage do Supabase (tests/sql/supabase-stub.sql).
 *
 * Limitação conhecida: o PGlite é de conexão única, então NÃO é possível testar
 * duas transações realmente simultâneas. Testamos a regra de não-sobreposição
 * sequencialmente; a serialização concorrente depende do `SELECT ... FOR UPDATE`
 * em reserve_gift_item(), que é comportamento padrão do PostgreSQL.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const migrationsDir = join(root, "supabase", "migrations");

let db: PGlite;

const ids = {
  admin: "00000000-0000-0000-0000-00000000000a",
  lojistaA: "00000000-0000-0000-0000-0000000000a1",
  lojistaB: "00000000-0000-0000-0000-0000000000b1",
  cliente: "00000000-0000-0000-0000-0000000000c1",
  cliente2: "00000000-0000-0000-0000-0000000000c2",
  hacker: "00000000-0000-0000-0000-0000000000ff",
};

type Who = "anon" | "postgres" | keyof typeof ids;

async function as<T = Record<string, unknown>>(who: Who, sql: string, params: unknown[] = []) {
  await db.exec("reset role; reset request.jwt.claims;");
  if (who === "anon") {
    await db.exec(`set role anon;`);
  } else if (who !== "postgres") {
    await db.exec(`set request.jwt.claims = '${JSON.stringify({ sub: ids[who], role: "authenticated" })}'; set role authenticated;`);
  }
  try {
    const res = await db.query<T>(sql, params);
    return res;
  } finally {
    await db.exec("reset role; reset request.jwt.claims;");
  }
}

async function expectError(p: Promise<unknown>, match?: RegExp) {
  let err: unknown = null;
  try {
    await p;
  } catch (e) {
    err = e;
  }
  expect(err, "esperava erro").not.toBeNull();
  if (match) expect(String((err as Error).message)).toMatch(match);
}

const one = async <T = Record<string, unknown>>(who: Who, sql: string, params: unknown[] = []) =>
  (await as<T>(who, sql, params)).rows[0];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(__dirname, "supabase-stub.sql"), "utf8"));
  for (const f of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(migrationsDir, f), "utf8"));
  }
  await db.exec(readFileSync(join(root, "supabase", "seed.sql"), "utf8"));

  // usuários via auth.users (dispara handle_new_user)
  const mk = (id: string, email: string, meta: object) =>
    db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1,$2,$3)", [id, email, JSON.stringify(meta)]);
  await mk(ids.admin, "admin@x.com", { full_name: "Admin" });
  await mk(ids.lojistaA, "a@x.com", { full_name: "Loja A", account_type: "lojista" });
  await mk(ids.lojistaB, "b@x.com", { full_name: "Loja B", account_type: "lojista" });
  await mk(ids.cliente, "c@x.com", { full_name: "Cliente" });
  await mk(ids.cliente2, "c2@x.com", { full_name: "Cliente 2" });
  await mk(ids.hacker, "h@x.com", { full_name: "Hacker", account_type: "admin" });
  // primeiro admin: promovido via SQL (como no README)
  await db.query("update public.users set role = 'admin' where id = $1", [ids.admin]);
}, 60_000);

describe("migrações e seed", () => {
  it("aplica todas as migrações e cria as 14 tabelas com RLS ligado", async () => {
    const r = await as<{ relname: string; relrowsecurity: boolean }>(
      "postgres",
      `select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' order by 1`,
    );
    const names = r.rows.map((x) => x.relname);
    for (const t of [
      "users", "stores", "products", "categories", "affiliate_programs", "affiliate_clicks", "events",
      "gift_lists", "gift_list_items", "reservations", "purchases", "commissions", "subscriptions", "banners",
    ]) expect(names).toContain(t);
    expect(r.rows.every((x) => x.relrowsecurity)).toBe(true);
  });

  it("seed não contém vendas, reservas, cliques, comissões nem produtos afiliados", async () => {
    const r = await one<{ p: number; r: number; c: number; a: number; ev: number; aff: number; nondemo: number }>(
      "postgres",
      `select (select count(*) from purchases)::int p, (select count(*) from reservations)::int r,
              (select count(*) from commissions)::int c, (select count(*) from affiliate_clicks)::int a,
              (select count(*) from events)::int ev,
              (select count(*) from products where product_type='affiliate')::int aff,
              (select count(*) from products where not is_demo)::int nondemo`,
    );
    expect(r).toEqual({ p: 0, r: 0, c: 0, a: 0, ev: 0, aff: 0, nondemo: 0 });
  });
});

describe("usuários e papéis", () => {
  it("cadastro cria perfil; metadado 'admin' é ignorado (vira cliente)", async () => {
    const r = await as<{ id: string; role: string }>("postgres", "select id, role from users order by email");
    const byId = Object.fromEntries(r.rows.map((x) => [x.id, x.role]));
    expect(byId[ids.hacker]).toBe("cliente");
    expect(byId[ids.lojistaA]).toBe("lojista");
    expect(byId[ids.admin]).toBe("admin");
  });

  it("usuário não consegue promover o próprio papel", async () => {
    await expectError(as("hacker", "update users set role = 'admin' where id = $1", [ids.hacker]), /administradores/);
  });

  it("usuário só enxerga o próprio perfil; anônimo não lê users", async () => {
    const r = await as("cliente", "select id from users");
    expect(r.rows).toHaveLength(1);
    await expectError(as("anon", "select id from users"), /permission denied/);
    const adm = await as("admin", "select id from users");
    expect(adm.rows.length).toBeGreaterThanOrEqual(6);
  });
});

let storeA: string;
let storeB: string;
let prodA: string;

describe("lojas e produtos (lojista)", () => {
  it("lojista cria loja pendente e não pode se autoaprovar", async () => {
    await expectError(
      as("lojistaA", `insert into stores (owner_id,name,slug,city,state,whatsapp,status) values ($1,'Loja A','loja-a','Santo Augusto','RS','5555991234567','approved')`, [ids.lojistaA]),
      /pendente/,
    );
    storeA = (await one<{ id: string }>("lojistaA",
      `insert into stores (owner_id,name,slug,city,state,whatsapp) values ($1,'Loja A','loja-a','Santo Augusto','RS','5555991234567') returning id`,
      [ids.lojistaA]))!.id;
    storeB = (await one<{ id: string }>("lojistaB",
      `insert into stores (owner_id,name,slug,city,state,whatsapp) values ($1,'Loja B','loja-b','Ijuí','RS','5555997654321') returning id`,
      [ids.lojistaB]))!.id;
    await expectError(as("lojistaA", "update stores set status='approved' where id=$1", [storeA]), /administradores/);
  });

  it("cliente não pode criar loja; loja não pode ser criada em nome de outro", async () => {
    await expectError(as("cliente", `insert into stores (owner_id,name,slug,city,state,whatsapp) values ($1,'X','x','A','RS','5555991234567')`, [ids.cliente]));
    await expectError(as("lojistaB", `insert into stores (owner_id,name,slug,city,state,whatsapp) values ($1,'X','x2','A','RS','5555991234567')`, [ids.lojistaA]));
  });

  it("WhatsApp inválido é rejeitado por restrição", async () => {
    await expectError(as("postgres", `insert into stores (name,slug,city,state,whatsapp) values ('X','x3','A','RS','12345')`), /check/);
  });

  it("lojista não publica antes da aprovação; cria rascunho", async () => {
    await expectError(
      as("lojistaA", `insert into products (product_type,name,slug,price_cents,store_id,status) values ('local','Vaso','vaso',5000,$1,'published')`, [storeA]),
      /aprovada/,
    );
    prodA = (await one<{ id: string }>("lojistaA",
      `insert into products (product_type,name,slug,price_cents,store_id) values ('local','Vaso de cerâmica','vaso-de-ceramica',5000,$1) returning id`, [storeA]))!.id;
  });

  it("anônimo não vê loja pendente nem rascunho", async () => {
    const s = await as("anon", "select id from stores where id = $1", [storeA]);
    expect(s.rows).toHaveLength(0);
    const p = await as("anon", "select id from products where id = $1", [prodA]);
    expect(p.rows).toHaveLength(0);
  });

  it("admin aprova a loja; lojista publica; anônimo passa a ver", async () => {
    await as("admin", "update stores set status='approved' where id=$1", [storeA]);
    const st = await one<{ approved_by: string }>("postgres", "select approved_by from stores where id=$1", [storeA]);
    expect(st!.approved_by).toBe(ids.admin);
    await as("lojistaA", "update products set status='published' where id=$1", [prodA]);
    const p = await as("anon", "select id, published_at from products where id = $1", [prodA]);
    expect(p.rows).toHaveLength(1);
  });

  it("lojista não destaca produto nem cria produto afiliado", async () => {
    await expectError(as("lojistaA", "update products set is_featured=true where id=$1", [prodA]), /permitida/);
    const prog = (await one<{ id: string }>("postgres", "select id from affiliate_programs limit 1"))!.id;
    await expectError(
      as("lojistaA", `insert into products (product_type,name,slug,price_cents,affiliate_url,affiliate_program_id) values ('affiliate','X','x-aff',100,'https://exemplo.com',$1)`, [prog]),
      /row-level security|produtos locais/,
    );
  });

  it("lojista B não vê rascunhos nem altera preço de produto de A (proteção de preço)", async () => {
    await as("lojistaA", `insert into products (product_type,name,slug,price_cents,store_id) values ('local','Rascunho A','rascunho-a',100,$1)`, [storeA]);
    const r = await as("lojistaB", "select id from products where slug='rascunho-a'");
    expect(r.rows).toHaveLength(0);
    const u = await as("lojistaB", "update products set price_cents = 1 where id=$1", [prodA]);
    expect(u.affectedRows ?? 0).toBe(0);
    const a = await as("anon", "update products set price_cents = 1 where id=$1", [prodA]).catch((e) => e);
    expect(String(a?.message ?? "")).toMatch(/permission denied/);
    const p = await one<{ price_cents: number }>("postgres", "select price_cents from products where id=$1", [prodA]);
    expect(p!.price_cents).toBe(5000);
  });

  it("lojista não move produto para loja de outro", async () => {
    await expectError(as("lojistaA", "update products set store_id=$1 where id=$2", [storeB, prodA]));
  });
});

let affProd: string;
let programId: string;

describe("produtos afiliados (admin)", () => {
  it("admin cadastra afiliado; restrições exigem link https e programa", async () => {
    programId = (await one<{ id: string }>("admin", "update affiliate_programs set is_active=true where slug='amazon-associados' returning id"))!.id;
    await expectError(as("admin", `insert into products (product_type,name,slug,price_cents,affiliate_program_id) values ('affiliate','Sem link','sem-link',100,$1)`, [programId]), /check/);
    await expectError(as("admin", `insert into products (product_type,name,slug,price_cents,affiliate_program_id,affiliate_url) values ('affiliate','Http','http',100,$1,'http://inseguro.com')`, [programId]), /check/);
    affProd = (await one<{ id: string }>("admin",
      `insert into products (product_type,name,slug,price_cents,affiliate_program_id,affiliate_url,status) values ('affiliate','Liquidificador','liquidificador',19990,$1,'https://www.amazon.com.br/dp/TESTE?tag=teste-20','published') returning id`,
      [programId]))!.id;
    const r = await as("anon", "select id from products where id=$1", [affProd]);
    expect(r.rows).toHaveLength(1);
  });
});

describe("rastreamento de cliques", () => {
  it("clique local registra evento e devolve WhatsApp da loja (do banco)", async () => {
    const r = await one<{ product_type: string; whatsapp: string; affiliate_url: string | null }>(
      "anon", "select * from register_product_click($1, null, 'sess-1', 'https://google.com', null, null, null)", [prodA]);
    expect(r).toMatchObject({ product_type: "local", whatsapp: "5555991234567", affiliate_url: null });
    const ev = await one<{ n: number }>("postgres", "select count(*)::int n from events where event_type='whatsapp_click' and product_id=$1 and store_id=$2", [prodA, storeA]);
    expect(ev!.n).toBe(1);
  });

  it("clique afiliado registra affiliate_clicks e devolve o link salvo", async () => {
    const r = await one<{ product_type: string; affiliate_url: string; whatsapp: string | null }>(
      "anon", "select * from register_product_click($1, null, 'sess-1', null, 'instagram', 'social', 'natal')", [affProd]);
    expect(r).toMatchObject({ product_type: "affiliate", affiliate_url: "https://www.amazon.com.br/dp/TESTE?tag=teste-20", whatsapp: null });
    const c = await one<{ n: number; utm_source: string }>("postgres", "select count(*)::int n, max(utm_source) utm_source from affiliate_clicks where product_id=$1", [affProd]);
    expect(c).toEqual({ n: 1, utm_source: "instagram" });
  });

  it("produto de demonstração não abre WhatsApp real", async () => {
    const r = await one<{ whatsapp: string | null; is_demo: boolean }>(
      "anon", "select * from register_product_click((select id from products where slug='demo-jogo-de-toalhas-bordadas'))");
    expect(r).toMatchObject({ whatsapp: null, is_demo: true });
  });

  it("produto não publicado não gera destino", async () => {
    const r = await as("anon", "select * from register_product_click((select id from products where slug='rascunho-a'))");
    expect(r.rows).toHaveLength(0);
  });

  it("anônimo não insere cliques diretamente nem lê métricas", async () => {
    await expectError(as("anon", "insert into events (event_type) values ('page_view')"), /permission denied/);
    await expectError(as("anon", "select * from affiliate_clicks"), /permission denied/);
    const r = await as("cliente", "select * from affiliate_clicks");
    expect(r.rows).toHaveLength(0);
  });

  it("popular_product_ids soma cliques e visualizações (anônimo pode consultar)", async () => {
    const r = await as<{ product_id: string; score: number }>("anon", "select * from popular_product_ids(5)");
    expect(r.rows.map((x) => x.product_id)).toContain(prodA);
  });

  it("log_event aceita só tipos de visualização", async () => {
    await as("anon", "select log_event('product_view', $1)", [prodA]);
    await expectError(as("anon", "select log_event('whatsapp_click', $1)", [prodA]), /inválido/);
  });
});

let listId: string;
let itemLocal: string;
let itemAff: string;

describe("listas de presentes", () => {
  it("cliente cria lista e adiciona itens publicados", async () => {
    listId = (await one<{ id: string }>("cliente",
      `insert into gift_lists (owner_id,title,event_type,event_date,slug) values ($1,'Chá da Ana','cha_de_panela','2026-12-20','cha-da-ana-abc123') returning id`,
      [ids.cliente]))!.id;
    itemLocal = (await one<{ id: string }>("cliente", "insert into gift_list_items (gift_list_id, product_id) values ($1,$2) returning id", [listId, prodA]))!.id;
    itemAff = (await one<{ id: string }>("cliente", "insert into gift_list_items (gift_list_id, product_id, quantity_desired) values ($1,$2,1) returning id", [listId, affProd]))!.id;
    const draft = (await one<{ id: string }>("postgres", "select id from products where slug='rascunho-a'"))!.id;
    await expectError(as("cliente", "insert into gift_list_items (gift_list_id, product_id) values ($1, $2)", [listId, draft]), /publicados/);
  });

  it("evento inválido é rejeitado", async () => {
    await expectError(as("cliente", `insert into gift_lists (owner_id,title,event_type,slug) values ($1,'Festa','formatura','festa-1')`, [ids.cliente]), /check/);
  });

  it("outro usuário não altera a lista; anônimo lê a lista pública", async () => {
    await expectError(as("cliente2", "insert into gift_list_items (gift_list_id, product_id) values ($1,$2)", [listId, affProd]));
    const u = await as("cliente2", "update gift_lists set title='hack' where id=$1", [listId]);
    expect(u.affectedRows ?? 0).toBe(0);
    const r = await as("anon", "select id from gift_list_items where gift_list_id=$1", [listId]);
    expect(r.rows).toHaveLength(2);
  });
});

let resId: string;

describe("reservas (itens locais)", () => {
  it("convidado reserva item local", async () => {
    const r = await one<{ reservation_id: string; expires_at: string }>(
      "anon", "select * from reserve_gift_item($1,'Maria','(55) 99123-4567','Parabéns!')", [itemLocal]);
    resId = r!.reservation_id;
    expect(resId).toBeTruthy();
    const st = await one<{ status: string; guest_phone: string; h: number }>("postgres",
      "select status, guest_phone, round(extract(epoch from expires_at - created_at)/3600)::int h from reservations where id=$1", [resId]);
    expect(st).toEqual({ status: "pending", guest_phone: "55991234567", h: 48 });
  });

  it("segunda reserva do mesmo item é bloqueada (sem sobreposição)", async () => {
    await expectError(as("anon", "select * from reserve_gift_item($1,'João','55999990000')", [itemLocal]), /já foi reservado/);
  });

  it("item afiliado não aceita reserva", async () => {
    await expectError(as("anon", "select * from reserve_gift_item($1,'João','55999990000')", [itemAff]), /lojas locais/);
  });

  it("anônimo não lê reservas (dados pessoais); dono da lista e loja leem", async () => {
    await expectError(as("anon", "select * from reservations"), /permission denied/);
    expect((await as("cliente", "select id from reservations")).rows).toHaveLength(1);
    expect((await as("lojistaA", "select id from reservations")).rows).toHaveLength(1);
    expect((await as("lojistaB", "select id from reservations")).rows).toHaveLength(0);
    expect((await as("cliente2", "select id from reservations")).rows).toHaveLength(0);
  });

  it("status público mostra reservado sem expor dados pessoais", async () => {
    const r = await as<Record<string, unknown>>("anon", "select * from gift_list_item_status($1)", [listId]);
    const loc = r.rows.find((x) => x.item_id === itemLocal)!;
    expect(loc).toMatchObject({ reserved_qty: 1, purchased_qty: 0 });
    expect(Object.keys(loc)).not.toContain("guest_name");
  });

  it("reserva vencida libera o item", async () => {
    await as("postgres", "update reservations set created_at = now() - interval '3 days', expires_at = now() - interval '1 day' where id=$1", [resId]);
    const r = await one<{ reservation_id: string }>("anon", "select * from reserve_gift_item($1,'João','55999990000')", [itemLocal]);
    expect(r!.reservation_id).toBeTruthy();
    const old = await one<{ status: string }>("postgres", "select status from reservations where id=$1", [resId]);
    expect(old!.status).toBe("expired");
    resId = r!.reservation_id;
  });

  it("limite de 5 reservas por telefone por hora", async () => {
    // cria um segundo item com quantidade alta para testar o limite
    const it2 = (await one<{ id: string }>("postgres",
      "insert into gift_list_items (gift_list_id, product_id, quantity_desired) select $1, id, 20 from products where slug='demo-conjunto-de-potes-de-vidro' returning id", [listId]))!.id;
    for (let i = 0; i < 4; i++) {
      await as("anon", "select * from reserve_gift_item($1,'João','55999990000')", [it2]);
    }
    await expectError(as("anon", "select * from reserve_gift_item($1,'João','55999990000')", [it2]), /Muitas reservas/);
  });

  it("loja B não altera reserva da loja A; transição inválida é recusada", async () => {
    await expectError(as("lojistaB", "select set_reservation_status($1,'confirmed')", [resId]), /permissão/);
    await expectError(as("lojistaA", "select set_reservation_status($1,'completed')", [resId]), /não permitida/);
    await expectError(as("anon", "select set_reservation_status($1,'confirmed')", [resId]), /permission denied/);
  });

  it("loja confirma e conclui → venda VERIFICADA com preço do banco", async () => {
    await as("lojistaA", "select set_reservation_status($1,'confirmed')", [resId]);
    await as("lojistaA", "select set_reservation_status($1,'completed')", [resId]);
    const p = await one<Record<string, unknown>>("postgres",
      "select source, verification_status, amount_cents, store_id from purchases where reservation_id=$1", [resId]);
    expect(p).toEqual({ source: "store_confirmed", verification_status: "verified", amount_cents: 5000, store_id: storeA });
    await expectError(as("anon", "select * from reserve_gift_item($1,'Pedro','55988887777')", [itemLocal]), /já foi reservado/);
  });
});

describe("integridade do histórico", () => {
  it("item com reservas não pode ser apagado pelo organizador", async () => {
    await expectError(as("cliente", "delete from gift_list_items where id=$1", [itemLocal]), /foreign key|violates/);
  });
});

describe("compras de itens afiliados (informadas)", () => {
  it("convidado informa compra → 'reported', e o item NÃO é bloqueado", async () => {
    await as("anon", "select report_affiliate_purchase($1,'Carla','Comprei na Amazon')", [itemAff]);
    await as("anon", "select report_affiliate_purchase($1,'Bruno')", [itemAff]);
    const st = await one<Record<string, number>>("anon", "select reported_qty, purchased_qty, reserved_qty from gift_list_item_status($1) where item_id=$2", [listId, itemAff]);
    expect(st).toEqual({ reported_qty: 2, purchased_qty: 0, reserved_qty: 0 });
    // ainda é possível clicar/comprar
    const c = await as("anon", "select * from register_product_click($1, $2)", [affProd, listId]);
    expect(c.rows).toHaveLength(1);
  });

  it("anônimo não consegue inserir venda 'verificada' diretamente", async () => {
    await expectError(as("anon", `insert into purchases (product_type, source, verification_status) values ('affiliate','admin_confirmed','verified')`), /permission denied/);
    await expectError(as("cliente", `insert into purchases (product_type, source, verification_status) values ('affiliate','admin_confirmed','verified')`), /row-level security/);
  });

  it("restrição impede venda informada pelo convidado nascer verificada", async () => {
    await expectError(as("postgres", `insert into purchases (product_type, source, verification_status) values ('affiliate','guest_reported','verified')`), /purchases_verified_source/);
  });
});

describe("indicadores", () => {
  it("admin vê métricas separando cliques, intenções, vendas e comissões", async () => {
    await as("admin", "insert into commissions (affiliate_program_id, amount_cents, status) values ($1, 1200, 'estimated'), ($1, 800, 'approved')", [programId]);
    const m = (await one<{ m: Record<string, number> }>("admin", "select admin_metrics(30) m"))!.m;
    expect(m.whatsapp_clicks).toBe(2);
    expect(m.affiliate_clicks).toBe(2);
    expect(m.purchase_intents).toBeGreaterThanOrEqual(6);
    expect(m.reported_sales).toBe(2);
    expect(m.verified_sales).toBe(1);
    expect(m.verified_sales_cents).toBe(5000);
    expect(m.commissions_estimated_cents).toBe(1200);
    expect(m.commissions_approved_cents).toBe(800);
  });

  it("não-admin não acessa métricas gerais nem comissões", async () => {
    await expectError(as("lojistaA", "select admin_metrics(30)"), /restrito/);
    expect((await as("lojistaA", "select * from commissions")).rows).toHaveLength(0);
    const sm = (await one<{ m: Record<string, number> }>("lojistaA", "select store_metrics($1, 30) m", [storeA]))!.m;
    expect(sm.whatsapp_clicks).toBe(1);
    await expectError(as("lojistaB", "select store_metrics($1, 30)", [storeA]), /permissão/);
  });
});

describe("storage (imagens)", () => {
  it("bucket configurado com limite de 5 MB e tipos de imagem", async () => {
    const b = await one<{ file_size_limit: number; allowed_mime_types: string[]; public: boolean }>("postgres", "select * from storage.buckets where id='product-images'");
    expect(Number(b!.file_size_limit)).toBe(5242880);
    expect(b!.allowed_mime_types).toEqual(["image/jpeg", "image/png", "image/webp"]);
  });

  it("lojista envia só na própria pasta e só imagens; cliente não envia", async () => {
    await as("lojistaA", `insert into storage.objects (bucket_id, name) values ('product-images', $1)`, [`${ids.lojistaA}/foto.webp`]);
    await expectError(as("lojistaA", `insert into storage.objects (bucket_id, name) values ('product-images', $1)`, [`${ids.lojistaB}/foto.webp`]), /row-level security/);
    await expectError(as("lojistaA", `insert into storage.objects (bucket_id, name) values ('product-images', $1)`, [`${ids.lojistaA}/virus.exe`]), /row-level security/);
    await expectError(as("cliente", `insert into storage.objects (bucket_id, name) values ('product-images', $1)`, [`${ids.cliente}/foto.png`]), /row-level security/);
  });
});
