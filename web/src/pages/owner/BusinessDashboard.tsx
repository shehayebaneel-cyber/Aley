import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AiChat, type AiMessage } from "../../components/AiChat";
import { BarChart, StatCard } from "../../components/Charts";
import { ImageField } from "../../components/ImageField";
import { Stars } from "../../components/Stars";
import { CheckIcon, GlobeIcon, StarIcon } from "../../components/icons";
import { useOwnerAuth } from "../../context/OwnerAuthContext";
import { currency, dayName, formatEventDate, ownerApi, PRICE, TICKET_STATUS, timeAgo } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import type { Business, BusinessOrder, Category, EventItem, HoursRow, Offer, Reservation, Review } from "../../types";

const TABS = ["Overview", "Analytics", "Assistant", "Orders", "Reservations", "Profile", "Photos", "Hours", "Offers", "Events", "Reviews"] as const;
type Tab = (typeof TABS)[number];

export function BusinessDashboard() {
  const { id } = useParams();
  const { refresh } = useOwnerAuth();
  const [tab, setTab] = useState<Tab>("Overview");
  const [biz, setBiz] = useState<Business | null>(null);
  const [error, setError] = useState("");

  const load = () => ownerApi.get<Business>(`/api/owner/businesses/${id}`).then(setBiz).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Push edits to the server and refresh both local + sidebar state.
  async function save(patch: Partial<Business>) {
    const updated = await ownerApi.patch<Business>(`/api/owner/businesses/${id}`, patch);
    setBiz(updated);
    refresh();
    return updated;
  }

  if (error) return <div className="card p-10 text-center text-muted">{error} <Link to="/owner" className="font-semibold text-brand">← Back</Link></div>;
  if (!biz) return <div className="card h-72 animate-pulse" />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/owner" className="text-sm font-semibold text-muted hover:text-ink">← All businesses</Link>
        </div>
        <Link to={`/business/${biz.slug}`} target="_blank" className="btn btn-ghost px-4 py-2 text-sm"><GlobeIcon className="h-4 w-4" /> View public page</Link>
      </div>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">{biz.name}</h1>
      <p className="text-muted">{biz.category.icon} {biz.category.name} · {PRICE(biz.priceRange)}</p>

      {biz.reviewStatus === "PENDING" && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4">
          <span className="text-xl">🕓</span>
          <div>
            <p className="font-semibold text-ink">Awaiting approval</p>
            <p className="text-sm text-muted">This business isn't public yet. Our team reviews new listings before they go live — you can keep editing it now and it'll appear once approved.</p>
          </div>
        </div>
      )}
      {biz.reviewStatus === "REJECTED" && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-400/40 bg-red-500/10 p-4">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-ink">Not approved</p>
            <p className="text-sm text-muted">This listing wasn't approved for publishing. Please review the details, make any needed changes, and contact us if you think this was a mistake.</p>
          </div>
        </div>
      )}

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "Overview" && <Overview biz={biz} />}
        {tab === "Analytics" && <AnalyticsTab biz={biz} />}
        {tab === "Assistant" && <AssistantTab biz={biz} />}
        {tab === "Orders" && <OrdersTab biz={biz} />}
        {tab === "Reservations" && <ReservationsTab biz={biz} save={save} />}
        {tab === "Profile" && <ProfileTab biz={biz} save={save} />}
        {tab === "Photos" && <PhotosTab biz={biz} save={save} />}
        {tab === "Hours" && <HoursTab biz={biz} save={save} />}
        {tab === "Offers" && <OffersTab biz={biz} />}
        {tab === "Events" && <EventsTab biz={biz} />}
        {tab === "Reviews" && <ReviewsTab biz={biz} />}
      </div>
    </div>
  );
}

function SaveBar({ onSave, dirty }: { onSave: () => Promise<void>; dirty: boolean }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className="mt-5 flex items-center gap-3">
      <button
        onClick={async () => { setBusy(true); setDone(false); try { await onSave(); setDone(true); } finally { setBusy(false); } }}
        disabled={busy || !dirty}
        className="btn btn-primary px-6 py-2.5 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save changes"}
      </button>
      {done && !dirty && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><CheckIcon className="h-4 w-4" /> Saved</span>}
    </div>
  );
}

// ---- Overview / analytics ----
function Overview({ biz }: { biz: Business }) {
  const { data } = useFetch<{ viewCount: number; rating: number; reviewCount: number; pendingReviews: number; offers: number; events: number; breakdown: { star: number; count: number }[] }>(`/api/owner/businesses/${biz.id}/analytics`);
  const stats = [
    { label: "Profile views", value: data?.viewCount ?? "—" },
    { label: "Rating", value: data ? (data.rating > 0 ? data.rating.toFixed(1) : "New") : "—" },
    { label: "Reviews", value: data?.reviewCount ?? "—" },
    { label: "Active offers", value: data?.offers ?? "—" },
    { label: "Events", value: data?.events ?? "—" },
    { label: "Pending reviews", value: data?.pendingReviews ?? "—" },
  ];
  const max = Math.max(1, ...(data?.breakdown ?? []).map((b) => b.count));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-ink">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <h3 className="font-display font-bold text-ink">Rating breakdown</h3>
        <div className="mt-3 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = data?.breakdown.find((b) => b.star === star)?.count ?? 0;
            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="inline-flex w-10 items-center gap-0.5 text-muted">{star}<StarIcon className="h-3.5 w-3.5 text-amber-400" /></span>
                <div className="h-2 flex-1 overflow-hidden rounded-full surface-2"><div className="h-full rounded-full bg-amber-400" style={{ width: `${(count / max) * 100}%` }} /></div>
                <span className="w-6 text-right text-muted">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---- Analytics dashboard ----
interface Metric { value: number; prev: number; delta: number }
interface Metrics {
  business: { hasReservations: boolean; hasDelivery: boolean };
  cards: {
    profileViews: Metric; searchAppearances: Metric; ctr: number;
    phoneViews: Metric; calls: Metric; whatsapp: Metric; website: Metric; directions: Metric;
    interactions: Metric; favorites: Metric;
    bookings: { requests: number; confirmed: number; cancelled: number };
    orders: { received: number; completed: number; cancelled: number; revenue: number };
    deliveries: number;
    reviews: { total: number; newCount: number; avg: number; periodAvg: number };
  };
  series: { profileViews: { date: string; value: number }[]; interactions: { date: string; value: number }[]; searchAppearances: { date: string; value: number }[] };
  insights: string[];
}
const PERIODS: { key: string; label: string }[] = [
  { key: "today", label: "Today" }, { key: "yesterday", label: "Yesterday" }, { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" }, { key: "90d", label: "Last 90 days" }, { key: "year", label: "This year" }, { key: "custom", label: "Custom" },
];

function AnalyticsTab({ biz }: { biz: Business }) {
  const [period, setPeriod] = useState("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (period === "custom" && (!from || !to)) return;
    setLoading(true);
    const p = new URLSearchParams({ period });
    if (period === "custom") { p.set("from", from); p.set("to", to); }
    ownerApi.get<Metrics>(`/api/owner/businesses/${biz.id}/metrics?${p}`).then(setM).finally(() => setLoading(false));
  }, [biz.id, period, from, to]);

  const c = m?.cards;
  return (
    <div className="space-y-6">
      {/* Time filter */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => <button key={p.key} onClick={() => setPeriod(p.key)} className={`chip ${period === p.key ? "chip-active" : ""}`}>{p.label}</button>)}
        {period === "custom" && (
          <span className="flex items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input !py-1.5 text-sm" />
            <span className="text-muted">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input !py-1.5 text-sm" />
          </span>
        )}
      </div>

      {!c ? (
        <div className="card h-40 animate-pulse" />
      ) : (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="Profile views" value={c.profileViews.value} delta={c.profileViews.delta} />
            <StatCard label="Search appearances" value={c.searchAppearances.value} delta={c.searchAppearances.delta} />
            <StatCard label="Click-through rate" value={`${c.ctr}%`} hint="views ÷ appearances" />
            <StatCard label="Total interactions" value={c.interactions.value} delta={c.interactions.delta} />
            <StatCard label="Phone views" value={c.phoneViews.value} delta={c.phoneViews.delta} />
            <StatCard label="Call clicks" value={c.calls.value} delta={c.calls.delta} />
            <StatCard label="WhatsApp clicks" value={c.whatsapp.value} delta={c.whatsapp.delta} />
            <StatCard label="Directions" value={c.directions.value} delta={c.directions.delta} />
            <StatCard label="Website clicks" value={c.website.value} delta={c.website.delta} />
            <StatCard label="Favorites / saves" value={c.favorites.value} delta={c.favorites.delta} />
            <StatCard label="Reviews" value={c.reviews.total} hint={c.reviews.newCount ? `+${c.reviews.newCount} this period` : "no new"} />
            <StatCard label="Avg rating" value={c.reviews.avg > 0 ? c.reviews.avg.toFixed(1) : "New"} />
            {biz.hasReservations && <StatCard label="Bookings" value={c.bookings.requests} hint={`${c.bookings.confirmed} confirmed`} />}
            <StatCard label="Orders" value={c.orders.received} hint={`${c.orders.completed} completed`} />
            <StatCard label="Revenue (orders)" value={currency(c.orders.revenue)} />
            <StatCard label="Deliveries" value={c.deliveries} />
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5"><h3 className="font-display font-bold text-ink">Daily profile views</h3><div className="mt-3"><BarChart data={m!.series.profileViews} /></div></div>
            <div className="card p-5"><h3 className="font-display font-bold text-ink">Customer interactions</h3><div className="mt-3"><BarChart data={m!.series.interactions} color="#6366f1" /></div></div>
            <div className="card p-5 lg:col-span-2"><h3 className="font-display font-bold text-ink">Search appearances</h3><div className="mt-3"><BarChart data={m!.series.searchAppearances} color="#f59e0b" /></div></div>
          </div>

          {/* Interaction summary + insights */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h3 className="font-display font-bold text-ink">Interaction summary</h3>
              <dl className="mt-3 space-y-1.5 text-sm">
                {[
                  ["Search appearances", c.searchAppearances.value], ["Profile views", c.profileViews.value], ["Phone views", c.phoneViews.value],
                  ["Call clicks", c.calls.value], ["WhatsApp clicks", c.whatsapp.value], ["Direction clicks", c.directions.value],
                  ["Website clicks", c.website.value], ["Favorites", c.favorites.value], ["Bookings", c.bookings.requests], ["New reviews", c.reviews.newCount],
                ].map(([l, v]) => <div key={l} className="flex justify-between border-b border-border/60 pb-1.5"><dt className="text-muted">{l}</dt><dd className="font-semibold text-ink">{v}</dd></div>)}
              </dl>
            </div>
            <div className="card p-5">
              <h3 className="font-display font-bold text-ink">💡 Insights</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {m!.insights.map((i, idx) => <li key={idx} className="flex gap-2"><span className="text-brand">•</span> {i}</li>)}
              </ul>
            </div>
          </div>
          {loading && <p className="text-center text-xs text-muted">Updating…</p>}
        </>
      )}
    </div>
  );
}

// ---- AI business assistant ----
function AssistantTab({ biz }: { biz: Business }) {
  const send = async (messages: AiMessage[]) =>
    (await ownerApi.post<{ reply: string }>("/api/ai/owner", { messages, businessId: biz.id })).reply;
  return (
    <div className="card h-[64vh] min-h-[440px] p-3">
      <AiChat
        send={send}
        greeting={`Hi! I'm your business assistant for **${biz.name}**. Ask me things like "How is my business performing?", "Why are my views down?", "Write a promotion", "Suggest a better description", or "Analyze my reviews".`}
        suggestions={["How is my business performing this month?", "Why might my profile views be down?", "Write a weekend promotion", "Suggest a better business description", "Analyze my recent reviews", "Give me 3 social media post ideas"]}
      />
    </div>
  );
}

// ---- Orders (this business's tickets) ----
const NEXT: Record<string, string | null> = { PENDING: "PREPARING", PREPARING: "READY", READY: null, CANCELLED: null };
function OrdersTab({ biz }: { biz: Business }) {
  const [tickets, setTickets] = useState<BusinessOrder[] | null>(null);
  const reload = () => ownerApi.get<BusinessOrder[]>(`/api/owner/businesses/${biz.id}/orders`).then(setTickets);
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [biz.id]);

  async function update(id: number, body: Record<string, unknown>) {
    await ownerApi.patch(`/api/owner/business-orders/${id}`, body);
    reload();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Orders placed for {biz.name}. Update each as you prepare it — the customer sees the status live.</p>
      {tickets?.length === 0 && <div className="card p-10 text-center text-muted">No orders yet.</div>}
      {(tickets ?? []).map((t) => {
        const st = TICKET_STATUS[t.status];
        const next = NEXT[t.status];
        return (
          <div key={t.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-display font-bold text-ink">{t.order?.number} · {t.order?.customerName}</p>
                <p className="text-xs text-muted">{t.order ? formatEventDate(t.order.createdAt) : ""} · {t.order?.fulfillment === "DELIVERY" ? "Delivery" : "Pickup"} · <a href={`tel:${t.order?.customerPhone}`} className="text-brand">{t.order?.customerPhone}</a></p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
            </div>
            {t.order?.fulfillment === "DELIVERY" && t.order?.address && (
              <p className="mt-1 text-xs text-muted">📍 {t.order.address}{t.order.lat != null && t.order.lng != null && <> · <a href={`https://www.google.com/maps/search/?api=1&query=${t.order.lat},${t.order.lng}`} target="_blank" rel="noreferrer" className="font-semibold text-brand">Maps</a></>}</p>
            )}
            {t.order?.note && <p className="mt-1 text-xs text-muted">📝 {t.order.note}</p>}
            <ul className="mt-2 divide-y divide-border">
              {t.items.map((it) => (
                <li key={it.id} className="flex justify-between py-1.5 text-sm"><span className="text-ink">{it.quantity}× {it.name}</span><span className="text-muted">{currency(it.lineTotal)}</span></li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
              <span className="text-muted">Your total: <b className="text-ink">{currency(t.subtotal)}</b> · commission {currency(t.commissionAmount)} ({t.commissionRate}%)</span>
            </div>
            {t.status !== "CANCELLED" && t.status !== "READY" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {next && <button onClick={() => update(t.id, { status: next })} className="btn btn-primary px-4 py-2 text-sm">Mark {TICKET_STATUS[next].label}</button>}
                {t.status === "PREPARING" && <input defaultValue={t.prepTime} onBlur={(e) => e.target.value !== t.prepTime && update(t.id, { prepTime: e.target.value })} placeholder="Prep time (e.g. 15 min)" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />}
                <button onClick={() => { if (confirm("Cancel this part of the order?")) update(t.id, { status: "CANCELLED" }); }} className="btn btn-ghost px-4 py-2 text-sm text-red-500">Cancel</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Reservations (table bookings) ----
const RES_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pending", cls: "bg-amber-400/20 text-amber-600" },
  CONFIRMED: { label: "Confirmed", cls: "bg-emerald-500/15 text-emerald-600" },
  DECLINED: { label: "Declined", cls: "bg-red-500/15 text-red-500" },
  CANCELLED: { label: "Cancelled", cls: "surface-2 text-muted" },
};
function ReservationsTab({ biz, save }: { biz: Business; save: (p: Partial<Business>) => Promise<Business> }) {
  const [list, setList] = useState<Reservation[] | null>(null);
  const reload = () => ownerApi.get<Reservation[]>(`/api/owner/businesses/${biz.id}/reservations`).then(setList);
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [biz.id]);

  async function setStatus(id: number, status: string) {
    await ownerApi.patch(`/api/owner/reservations/${id}`, { status });
    reload();
  }

  if (!biz.hasReservations) {
    return (
      <div className="card p-8 text-center">
        <p className="font-semibold text-ink">Reservations are turned off.</p>
        <p className="mt-1 text-muted">Enable “Accepts reservations” so visitors can request a table from your page.</p>
        <button onClick={() => save({ hasReservations: true }).then(reload)} className="btn btn-primary mt-4 px-5 py-2.5">Enable reservations</button>
      </div>
    );
  }

  const pending = (list ?? []).filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Booking requests for {biz.name}.{pending > 0 ? ` ${pending} awaiting your response.` : ""} Confirm or decline — then call the guest to finalise.</p>
      {list?.length === 0 && <div className="card p-10 text-center text-muted">No bookings yet.</div>}
      {(list ?? []).map((r) => {
        const st = RES_STATUS[r.status] ?? RES_STATUS.PENDING;
        return (
          <div key={r.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-display font-bold text-ink">{r.name} · party of {r.partySize}</p>
                <p className="text-xs text-muted">📅 {r.date} at {r.time} · <a href={`tel:${r.phone}`} className="text-brand">{r.phone}</a>{r.email ? ` · ${r.email}` : ""}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
            </div>
            {r.note && <p className="mt-1 text-xs text-muted">📝 {r.note}</p>}
            {r.status === "PENDING" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setStatus(r.id, "CONFIRMED")} className="btn btn-primary px-4 py-2 text-sm">Confirm</button>
                <button onClick={() => setStatus(r.id, "DECLINED")} className="btn btn-ghost px-4 py-2 text-sm text-red-500">Decline</button>
              </div>
            )}
            {r.status === "CONFIRMED" && (
              <button onClick={() => setStatus(r.id, "CANCELLED")} className="btn btn-ghost mt-3 px-4 py-2 text-sm text-red-500">Cancel booking</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Profile ----
function ProfileTab({ biz, save }: { biz: Business; save: (p: Partial<Business>) => Promise<Business> }) {
  const { data: categories } = useFetch<Category[]>("/api/categories?city=aley");
  const [f, setF] = useState({
    name: biz.name, tagline: biz.tagline, categoryId: biz.category.id, description: biz.description,
    phone: biz.phone, whatsapp: biz.whatsapp, instagram: biz.instagram, facebook: biz.facebook,
    website: biz.website, email: biz.email, address: biz.address,
    lat: biz.lat?.toString() ?? "", lng: biz.lng?.toString() ?? "",
    priceRange: biz.priceRange, hasDelivery: biz.hasDelivery, hasReservations: biz.hasReservations,
    tags: biz.tags.join(", "),
  });
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-5">
        <h3 className="font-display font-bold text-ink">Basics</h3>
        <div className="mt-3 space-y-3">
          <Field label="Name"><input value={f.name} onChange={(e) => set({ name: e.target.value })} className="input" /></Field>
          <Field label="Tagline"><input value={f.tagline} onChange={(e) => set({ tagline: e.target.value })} className="input" /></Field>
          <Field label="Category">
            <select value={f.categoryId} onChange={(e) => set({ categoryId: Number(e.target.value) })} className="input">
              {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </Field>
          <Field label="Description"><textarea rows={5} value={f.description} onChange={(e) => set({ description: e.target.value })} className="input" /></Field>
          <Field label="Tags (comma separated)"><input value={f.tags} onChange={(e) => set({ tags: e.target.value })} className="input" placeholder="espresso, brunch, wifi" /></Field>
          <Field label="Price range">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((p) => (
                <button key={p} type="button" onClick={() => set({ priceRange: p })} className={`chip ${f.priceRange === p ? "chip-active" : ""}`}>{"$".repeat(p)}</button>
              ))}
            </div>
          </Field>
          <div className="flex gap-2">
            <button type="button" onClick={() => set({ hasDelivery: !f.hasDelivery })} className={`chip ${f.hasDelivery ? "chip-active" : ""}`}>Delivery</button>
            <button type="button" onClick={() => set({ hasReservations: !f.hasReservations })} className={`chip ${f.hasReservations ? "chip-active" : ""}`}>Reservations</button>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h3 className="font-display font-bold text-ink">Contact & location</h3>
        <div className="mt-3 space-y-3">
          <Field label="Phone"><input value={f.phone} onChange={(e) => set({ phone: e.target.value })} className="input" /></Field>
          <Field label="WhatsApp"><input value={f.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} className="input" /></Field>
          <Field label="Instagram (handle)"><input value={f.instagram} onChange={(e) => set({ instagram: e.target.value })} className="input" placeholder="beanavenue" /></Field>
          <Field label="Facebook URL"><input value={f.facebook} onChange={(e) => set({ facebook: e.target.value })} className="input" /></Field>
          <Field label="Website"><input value={f.website} onChange={(e) => set({ website: e.target.value })} className="input" /></Field>
          <Field label="Email"><input value={f.email} onChange={(e) => set({ email: e.target.value })} className="input" /></Field>
          <Field label="Address"><input value={f.address} onChange={(e) => set({ address: e.target.value })} className="input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude"><input value={f.lat} onChange={(e) => set({ lat: e.target.value })} className="input" inputMode="decimal" /></Field>
            <Field label="Longitude"><input value={f.lng} onChange={(e) => set({ lng: e.target.value })} className="input" inputMode="decimal" /></Field>
          </div>
        </div>
        <div className="lg:hidden"><SaveBar dirty onSave={async () => { await save({ ...f, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean), lat: f.lat ? Number(f.lat) : null, lng: f.lng ? Number(f.lng) : null } as unknown as Partial<Business>); }} /></div>
      </section>

      <div className="hidden lg:col-span-2 lg:block">
        <SaveBar dirty onSave={async () => { await save({ ...f, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean), lat: f.lat ? Number(f.lat) : null, lng: f.lng ? Number(f.lng) : null } as unknown as Partial<Business>); }} />
      </div>
    </div>
  );
}

// ---- Photos ----
function PhotosTab({ biz, save }: { biz: Business; save: (p: Partial<Business>) => Promise<Business> }) {
  const [logo, setLogo] = useState(biz.logo);
  const [cover, setCover] = useState(biz.cover);
  const [gallery, setGallery] = useState<string[]>(biz.gallery);
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <section className="card p-5"><h3 className="font-display font-bold text-ink">Logo</h3><div className="mt-3 max-w-[12rem]"><ImageField value={logo} onChange={setLogo} aspect="aspect-square" label="logo" /></div></section>
        <section className="card p-5"><h3 className="font-display font-bold text-ink">Cover photo</h3><div className="mt-3"><ImageField value={cover} onChange={setCover} label="cover" /></div></section>
      </div>
      <section className="card p-5">
        <h3 className="font-display font-bold text-ink">Gallery</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {gallery.map((g, i) => (
            <div key={i} className="relative">
              <img src={g} alt="" className="aspect-square w-full rounded-xl object-cover" />
              <button onClick={() => setGallery(gallery.filter((_, j) => j !== i))} className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">Remove</button>
            </div>
          ))}
          <div className="aspect-square"><ImageField value={null} onChange={(url) => url && setGallery([...gallery, url])} aspect="aspect-square" label="photo" /></div>
        </div>
      </section>
      <SaveBar dirty onSave={async () => { await save({ logo, cover, gallery }); }} />
    </div>
  );
}

// ---- Hours ----
function HoursTab({ biz, save }: { biz: Business; save: (p: Partial<Business>) => Promise<Business> }) {
  const initial: HoursRow[] = [0, 1, 2, 3, 4, 5, 6].map((day) => biz.hours.find((h) => h.day === day) ?? { day, open: "09:00", close: "22:00", closed: false });
  const [hours, setHours] = useState<HoursRow[]>(initial);
  const setRow = (day: number, p: Partial<HoursRow>) => setHours(hours.map((h) => (h.day === day ? { ...h, ...p } : h)));
  return (
    <section className="card max-w-lg p-5">
      <h3 className="font-display font-bold text-ink">Opening hours</h3>
      <div className="mt-3 space-y-2">
        {hours.map((h) => (
          <div key={h.day} className="flex items-center gap-3">
            <span className="w-12 text-sm font-semibold text-ink">{dayName(h.day)}</span>
            {h.closed ? (
              <span className="flex-1 text-sm text-muted">Closed</span>
            ) : (
              <div className="flex flex-1 items-center gap-2">
                <input type="time" value={h.open} onChange={(e) => setRow(h.day, { open: e.target.value })} className="input !py-1.5 text-sm" />
                <span className="text-muted">–</span>
                <input type="time" value={h.close} onChange={(e) => setRow(h.day, { close: e.target.value })} className="input !py-1.5 text-sm" />
              </div>
            )}
            <button onClick={() => setRow(h.day, { closed: !h.closed })} className={`chip ${h.closed ? "chip-active" : ""}`}>{h.closed ? "Closed" : "Open"}</button>
          </div>
        ))}
      </div>
      <SaveBar dirty onSave={async () => { await save({ hours }); }} />
    </section>
  );
}

// ---- Offers ----
const OFFER_TYPES = ["DISCOUNT", "BOGO", "HAPPY_HOUR", "SEASONAL"];
function OffersTab({ biz }: { biz: Business }) {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [form, setForm] = useState({ title: "", description: "", type: "DISCOUNT", image: null as string | null });
  const reload = () => ownerApi.get<Offer[]>(`/api/owner/businesses/${biz.id}/offers`).then(setOffers);
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [biz.id]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await ownerApi.post(`/api/owner/businesses/${biz.id}/offers`, form);
    setForm({ title: "", description: "", type: "DISCOUNT", image: null });
    reload();
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <form onSubmit={add} className="card h-fit space-y-3 p-5">
        <h3 className="font-display font-bold text-ink">New offer</h3>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title (e.g. 20% off)" className="input" />
        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details" className="input" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">{OFFER_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <ImageField value={form.image} onChange={(image) => setForm({ ...form, image })} label="offer image" />
        <button className="btn btn-primary w-full py-2.5">Add offer</button>
      </form>
      <div className="space-y-3">
        {offers?.length === 0 && <div className="card p-8 text-center text-muted">No offers yet.</div>}
        {(offers ?? []).map((o) => (
          <div key={o.id} className="card flex items-center gap-4 p-4">
            {o.image && <img src={o.image} alt="" className="h-16 w-16 rounded-lg object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{o.title} <span className="chip !py-0 !text-[10px]">{o.type.replace("_", " ")}</span></p>
              <p className="line-clamp-1 text-sm text-muted">{o.description}</p>
            </div>
            <button onClick={async () => { await ownerApi.delete(`/api/owner/offers/${o.id}`); reload(); }} className="btn btn-ghost px-3 py-2 text-sm text-red-500">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Events ----
function EventsTab({ biz }: { biz: Business }) {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [form, setForm] = useState({ title: "", description: "", category: "Community", location: "", startTime: "", image: null as string | null });
  const reload = () => ownerApi.get<EventItem[]>(`/api/owner/businesses/${biz.id}/events`).then(setEvents);
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [biz.id]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.startTime) return;
    await ownerApi.post(`/api/owner/businesses/${biz.id}/events`, form);
    setForm({ title: "", description: "", category: "Community", location: "", startTime: "", image: null });
    reload();
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <form onSubmit={add} className="card h-fit space-y-3 p-5">
        <h3 className="font-display font-bold text-ink">New event</h3>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" className="input" />
        <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category (Live Music…)" className="input" />
        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details" className="input" />
        <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="input" />
        <label className="block text-sm font-semibold text-ink">Start<input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="input mt-1" /></label>
        <ImageField value={form.image} onChange={(image) => setForm({ ...form, image })} label="event image" />
        <button className="btn btn-primary w-full py-2.5">Add event</button>
      </form>
      <div className="space-y-3">
        {events?.length === 0 && <div className="card p-8 text-center text-muted">No events yet.</div>}
        {(events ?? []).map((ev) => (
          <div key={ev.id} className="card flex items-center gap-4 p-4">
            {ev.image && <img src={ev.image} alt="" className="h-16 w-16 rounded-lg object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{ev.title} <span className="chip !py-0 !text-[10px]">{ev.category}</span></p>
              <p className="text-sm text-muted">{formatEventDate(ev.startTime)} · {ev.location}</p>
            </div>
            <button onClick={async () => { await ownerApi.delete(`/api/owner/events/${ev.id}`); reload(); }} className="btn btn-ghost px-3 py-2 text-sm text-red-500">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Reviews ----
function ReviewsTab({ biz }: { biz: Business }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const reload = () => ownerApi.get<Review[]>(`/api/owner/businesses/${biz.id}/reviews`).then(setReviews);
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [biz.id]);

  return (
    <div className="space-y-4">
      {reviews?.length === 0 && <div className="card p-8 text-center text-muted">No reviews yet.</div>}
      {(reviews ?? []).map((r) => <ReviewRow key={r.id} review={r} businessName={biz.name} onReplied={reload} />)}
    </div>
  );
}

function ReviewRow({ review, businessName, onReplied }: { review: Review; businessName: string; onReplied: () => void }) {
  const [reply, setReply] = useState(review.reply ?? "");
  const [open, setOpen] = useState(false);
  const status = (review as Review & { status?: string }).status;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink">{review.authorName}</span>
        <div className="flex items-center gap-2">
          {status && status !== "APPROVED" && <span className="chip !py-0 !text-[10px]">{status}</span>}
          <span className="text-xs text-muted">{timeAgo(review.createdAt)}</span>
        </div>
      </div>
      <Stars rating={review.rating} className="mt-1 h-4 w-4" />
      {review.comment && <p className="mt-1 text-sm text-muted">{review.comment}</p>}
      {review.reply && !open && (
        <div className="mt-3 rounded-xl surface-2 p-3 text-sm">
          <p className="font-semibold text-ink">Response from {businessName}</p>
          <p className="text-muted">{review.reply}</p>
          <button onClick={() => setOpen(true)} className="mt-1 text-xs font-semibold text-brand">Edit reply</button>
        </div>
      )}
      {(!review.reply || open) && (
        <div className="mt-3 flex gap-2">
          <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a public reply…" className="input !py-2 text-sm" />
          <button
            onClick={async () => { await ownerApi.post(`/api/owner/reviews/${review.id}/reply`, { reply }); setOpen(false); onReplied(); }}
            className="btn btn-primary shrink-0 px-4 py-2 text-sm"
          >
            Reply
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
