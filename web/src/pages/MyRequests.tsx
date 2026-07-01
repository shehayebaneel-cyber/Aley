import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RequestPartModal } from "../components/RequestPartModal";
import { PhoneIcon, StarIcon, TruckIcon, WhatsAppIcon } from "../components/icons";
import { useUserAuth } from "../context/UserAuthContext";
import { userApi, timeAgo } from "../lib/api";
import { fieldLabel } from "../lib/requestForms";
import type { PartRequest, PartQuote } from "../types";

const HEADLINE_KEYS = ["partNeeded", "serviceNeeded", "item", "problem", "tireSize"];
const prettyCat = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const headlineOf = (r: PartRequest) => HEADLINE_KEYS.map((k) => r.payload[k]).find(Boolean) || prettyCat(r.categorySlug);
const detailsOf = (r: PartRequest) => Object.entries(r.payload).filter(([k, v]) => v && !HEADLINE_KEYS.includes(k));

const STATUS: Record<string, { label: string; cls: string }> = {
  SUBMITTED: { label: "Submitted", cls: "bg-slate-400/15 text-slate-500" },
  SENT: { label: "Sent to shops", cls: "bg-sky-500/15 text-sky-600" },
  REPLIES: { label: "Replies received", cls: "bg-amber-500/15 text-amber-600" },
  SELECTED: { label: "Offer selected", cls: "bg-emerald-500/15 text-emerald-600" },
  COMPLETED: { label: "Completed", cls: "bg-brand-soft text-brand-dark" },
  CANCELLED: { label: "Cancelled", cls: "bg-red-500/15 text-red-500" },
  EXPIRED: { label: "Expired", cls: "bg-surface-2 text-muted" },
};

function QuoteRow({ q, requestId, selectedId, locked, onAccept }: { q: PartQuote; requestId: number; selectedId: number | null; locked: boolean; onAccept: (qid: number) => void }) {
  const wa = q.business.whatsapp.replace(/[^\d]/g, "");
  const chosen = selectedId === q.id;
  return (
    <div className={`rounded-xl border p-3 ${chosen ? "border-brand bg-brand-soft" : "border-border"}`}>
      <div className="flex items-center gap-3">
        {q.business.logo ? <img src={q.business.logo} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2">🔧</span>}
        <div className="min-w-0 flex-1">
          <Link to={`/business/${q.business.slug}`} className="font-semibold text-ink hover:text-brand">{q.business.name}</Link>
          <p className="flex items-center gap-2 text-xs text-muted">
            {!!q.business.rating && <span className="inline-flex items-center gap-0.5"><StarIcon className="h-3 w-3 text-amber-400" />{q.business.rating.toFixed(1)}</span>}
            {q.offersDelivery && <span className="inline-flex items-center gap-0.5"><TruckIcon className="h-3 w-3" /> delivers</span>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {q.available ? <p className="font-display text-lg font-extrabold text-ink">{q.price ? `$${q.price}` : "Available"}</p> : <p className="text-sm font-semibold text-red-500">Unavailable</p>}
          {q.eta && <p className="text-xs text-muted">⏱ {q.eta}</p>}
        </div>
      </div>
      {q.note && <p className="mt-2 text-sm text-muted">{q.note}</p>}
      {!!q.photos.length && <div className="mt-2 flex gap-2">{q.photos.map((p, i) => <img key={i} src={p} alt="" className="h-14 w-14 rounded-lg object-cover" />)}</div>}
      <div className="mt-2 flex gap-2">
        {q.business.phone && <a href={`tel:${q.business.phone}`} className="btn btn-ghost flex-1 py-1.5 text-xs"><PhoneIcon className="h-4 w-4" /> Call</a>}
        {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn flex-1 bg-emerald-500 py-1.5 text-xs text-white"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>}
        {q.available && !locked && <button onClick={() => onAccept(q.id)} className="btn btn-primary flex-1 py-1.5 text-xs">Choose this shop</button>}
        {chosen && <span className="btn flex-1 cursor-default bg-emerald-500 py-1.5 text-xs text-white">✓ Chosen</span>}
      </div>
    </div>
  );
}

export function MyRequests() {
  const { user, loading, openAuth } = useUserAuth();
  const [reqs, setReqs] = useState<PartRequest[] | null>(null);
  const [newReq, setNewReq] = useState(false);
  const load = () => userApi.get<PartRequest[]>("/api/me/part-requests").then(setReqs).catch(() => setReqs([]));
  useEffect(() => { if (user) load(); }, [user]);

  async function accept(reqId: number, quoteId: number) {
    if (!confirm("Choose this shop's offer?")) return;
    await userApi.post(`/api/me/part-requests/${reqId}/accept`, { quoteId });
    load();
  }
  async function act(reqId: number, action: "complete" | "cancel") {
    if (!confirm(action === "cancel" ? "Cancel this request?" : "Mark as completed?")) return;
    await userApi.post(`/api/me/part-requests/${reqId}/${action}`, {});
    load();
  }

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</div>;
  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-extrabold text-ink">My part requests</h1>
        <p className="mt-2 text-muted">Log in to post part requests and track shop replies.</p>
        <button onClick={openAuth} className="btn btn-primary mt-6 px-6 py-3">Log in</button>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold text-ink">My Requests</h1>
        <button onClick={() => setNewReq(true)} className="btn btn-primary px-4 py-2 text-sm">+ New request</button>
      </div>

      {reqs && reqs.length === 0 && (
        <div className="card mt-6 p-12 text-center text-muted">No requests yet. <Link to="/spare-parts" className="font-semibold text-brand">Find a part →</Link></div>
      )}
      <div className="mt-6 space-y-4">
        {(reqs ?? []).map((r) => {
          const st = STATUS[r.status] ?? STATUS.SENT;
          const locked = ["SELECTED", "COMPLETED", "CANCELLED", "EXPIRED"].includes(r.status);
          return (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-ink">{headlineOf(r)}</p>
                  <p className="text-sm text-muted">{prettyCat(r.categorySlug)}</p>
                  {!!detailsOf(r).length && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{detailsOf(r).map(([k, v]) => `${fieldLabel(r.categorySlug, k)}: ${v}`).join(" · ")}</p>}
                  <p className="mt-0.5 text-xs text-muted">Sent to {r.sentTo} business{r.sentTo === 1 ? "" : "es"} · {timeAgo(r.createdAt)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
              </div>

              {r.quotes.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-semibold text-ink">{r.quotes.length} repl{r.quotes.length === 1 ? "y" : "ies"}</p>
                  {r.quotes.map((q) => <QuoteRow key={q.id} q={q} requestId={r.id} selectedId={r.selectedQuoteId} locked={locked} onAccept={(qid) => accept(r.id, qid)} />)}
                </div>
              ) : (
                <p className="mt-3 rounded-xl surface-2 p-3 text-sm text-muted">Waiting for shops to reply…</p>
              )}

              {!["COMPLETED", "CANCELLED", "EXPIRED"].includes(r.status) && (
                <div className="mt-3 flex gap-2">
                  {r.status === "SELECTED" && <button onClick={() => act(r.id, "complete")} className="btn btn-ghost px-3 py-1.5 text-xs">Mark completed</button>}
                  <button onClick={() => act(r.id, "cancel")} className="btn btn-ghost px-3 py-1.5 text-xs text-red-500">Cancel request</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {newReq && <RequestPartModal onClose={() => { setNewReq(false); load(); }} />}
    </div>
  );
}
