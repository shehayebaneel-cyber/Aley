import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrashIcon } from "../../components/icons";
import { adminApi, formatEventDate } from "../../lib/api";

interface AEvent { id: number; title: string; category: string; startTime: string; isPublished: boolean; business: { name: string; slug: string } | null }
interface AOffer { id: number; title: string; type: string; isActive: boolean; business: { name: string; slug: string } | null }

export function AdminEventsOffers() {
  const [tab, setTab] = useState<"events" | "offers">("events");
  const [events, setEvents] = useState<AEvent[]>([]);
  const [offers, setOffers] = useState<AOffer[]>([]);

  const load = () => {
    adminApi.get<AEvent[]>("/api/admin/events").then(setEvents);
    adminApi.get<AOffer[]>("/api/admin/offers").then(setOffers);
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-ink">Events & Offers</h1>
      <div className="mt-4 flex gap-2">
        <button onClick={() => setTab("events")} className={`chip ${tab === "events" ? "chip-active" : ""}`}>Events ({events.length})</button>
        <button onClick={() => setTab("offers")} className={`chip ${tab === "offers" ? "chip-active" : ""}`}>Offers ({offers.length})</button>
      </div>

      <div className="mt-5 space-y-2">
        {tab === "events" && events.map((e) => (
          <div key={e.id} className="card flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{e.title} <span className="chip !py-0 !text-[10px]">{e.category}</span></p>
              <p className="text-xs text-muted">{formatEventDate(e.startTime)} · {e.business ? <Link to={`/business/${e.business.slug}`} className="text-brand">{e.business.name}</Link> : "—"}</p>
            </div>
            <button onClick={async () => { await adminApi.patch(`/api/admin/events/${e.id}`, { isPublished: !e.isPublished }); load(); }} className={`chip ${e.isPublished ? "chip-active" : ""}`}>{e.isPublished ? "Published" : "Hidden"}</button>
            <button onClick={async () => { if (confirm("Delete event?")) { await adminApi.delete(`/api/admin/events/${e.id}`); load(); } }} className="btn btn-ghost h-9 w-9 !p-0 text-red-500"><TrashIcon className="h-4 w-4" /></button>
          </div>
        ))}
        {tab === "offers" && offers.map((o) => (
          <div key={o.id} className="card flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{o.title} <span className="chip !py-0 !text-[10px]">{o.type.replace("_", " ")}</span></p>
              <p className="text-xs text-muted">{o.business ? <Link to={`/business/${o.business.slug}`} className="text-brand">{o.business.name}</Link> : "—"}</p>
            </div>
            <button onClick={async () => { await adminApi.patch(`/api/admin/offers/${o.id}`, { isActive: !o.isActive }); load(); }} className={`chip ${o.isActive ? "chip-active" : ""}`}>{o.isActive ? "Active" : "Inactive"}</button>
            <button onClick={async () => { if (confirm("Delete offer?")) { await adminApi.delete(`/api/admin/offers/${o.id}`); load(); } }} className="btn btn-ghost h-9 w-9 !p-0 text-red-500"><TrashIcon className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
