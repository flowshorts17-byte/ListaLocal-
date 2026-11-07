import { EVENT_TYPE_LABEL } from "@/lib/labels";
import type { GiftList } from "@/lib/types";

export function ListFields({ list }: { list?: GiftList }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="title">Nome do evento</label>
        <input className="input" id="title" name="title" required minLength={3} maxLength={120} defaultValue={list?.title} placeholder="Ex.: Chá de panela da Ana" />
      </div>
      <div>
        <label className="label" htmlFor="event_type">Tipo de evento</label>
        <select className="input" id="event_type" name="event_type" defaultValue={list?.event_type ?? "cha_de_panela"}>
          {Object.entries(EVENT_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="event_date">Data</label>
        <input className="input" id="event_date" name="event_date" type="date" defaultValue={list?.event_date ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="city">Cidade (opcional)</label>
        <input className="input" id="city" name="city" maxLength={80} defaultValue={list?.city ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="description">Mensagem para os convidados (opcional)</label>
        <textarea className="input min-h-20" id="description" name="description" maxLength={1000} defaultValue={list?.description ?? ""} />
      </div>
    </div>
  );
}
