export type Role = "admin" | "lojista" | "cliente";
export type ProductType = "local" | "affiliate";
export type Availability = "available" | "on_request" | "unavailable";
export type ProductStatus = "draft" | "published" | "archived";
export type StoreStatus = "pending" | "approved" | "rejected" | "suspended";
export type EventType = "cha_de_bebe" | "cha_de_panela" | "casamento" | "aniversario" | "casa_nova" | "outros";
export type ReservationStatus = "pending" | "confirmed" | "completed" | "cancelled" | "expired";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

export type Store = {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  city: string;
  state: string;
  address: string | null;
  whatsapp: string;
  instagram: string | null;
  status: StoreStatus;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type AffiliateProgram = {
  id: string;
  name: string;
  slug: string;
  marketplace_name: string;
  website_url: string | null;
  terms_url: string | null;
  estimated_commission_pct: number | null;
  notes: string | null;
  is_active: boolean;
};

export type Product = {
  id: string;
  product_type: ProductType;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  category_id: string | null;
  store_id: string | null;
  affiliate_program_id: string | null;
  affiliate_url: string | null;
  availability: Availability;
  status: ProductStatus;
  is_featured: boolean;
  is_demo: boolean;
  price_updated_at: string;
  updated_at: string;
  created_at: string;
};

export type ProductWithRelations = Product & {
  category: Pick<Category, "name" | "slug"> | null;
  store: Pick<Store, "name" | "slug" | "city" | "state" | "whatsapp" | "is_demo"> | null;
  program: Pick<AffiliateProgram, "marketplace_name"> | null;
};

export type GiftList = {
  id: string;
  owner_id: string;
  title: string;
  event_type: EventType;
  event_date: string | null;
  description: string | null;
  city: string | null;
  slug: string;
  is_public: boolean;
  status: "active" | "closed" | "archived";
  created_at: string;
};

export type GiftListItem = {
  id: string;
  gift_list_id: string;
  product_id: string;
  quantity_desired: number;
  note: string | null;
  sort_order: number;
};

export type ItemStatus = {
  item_id: string;
  quantity_desired: number;
  reserved_qty: number;
  purchased_qty: number;
  reported_qty: number;
};

export type Reservation = {
  id: string;
  gift_list_item_id: string;
  product_id: string;
  store_id: string;
  quantity: number;
  guest_name: string;
  guest_phone: string;
  guest_message: string | null;
  status: ReservationStatus;
  expires_at: string;
  created_at: string;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  cta_label: string | null;
  sort_order: number;
  is_active: boolean;
};

export type ActionState = { ok: boolean; message: string } | null;
