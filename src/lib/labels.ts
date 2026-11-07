import type { Availability, EventType, ProductStatus, ReservationStatus, Role, StoreStatus } from "./types";

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  cha_de_bebe: "Chá de bebê",
  cha_de_panela: "Chá de panela",
  casamento: "Casamento",
  aniversario: "Aniversário",
  casa_nova: "Casa nova",
  outros: "Outros eventos",
};

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: "Disponível",
  on_request: "Sob consulta",
  unavailable: "Indisponível",
};

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

export const STORE_STATUS_LABEL: Record<StoreStatus, string> = {
  pending: "Aguardando aprovação",
  approved: "Aprovada",
  rejected: "Recusada",
  suspended: "Suspensa",
};

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmada pela loja",
  completed: "Venda concluída",
  cancelled: "Cancelada",
  expired: "Expirada",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  lojista: "Lojista",
  cliente: "Cliente",
};

export const PURCHASE_STATUS_LABEL: Record<string, string> = {
  reported: "Informada (não verificada)",
  verified: "Verificada",
  rejected: "Rejeitada",
};

export const PURCHASE_SOURCE_LABEL: Record<string, string> = {
  guest_reported: "Informada pelo convidado",
  store_confirmed: "Confirmada pela loja",
  admin_confirmed: "Registrada pelo admin",
  affiliate_report: "Relatório do programa",
};

export const COMMISSION_STATUS_LABEL: Record<string, string> = {
  estimated: "Estimada",
  approved: "Aprovada",
  rejected: "Rejeitada",
  paid: "Paga",
};

export const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;
