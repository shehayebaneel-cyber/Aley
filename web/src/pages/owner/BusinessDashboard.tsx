import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AiChat, type AiMessage } from "../../components/AiChat";
import { BarChart, StatCard } from "../../components/Charts";
import { GalleryManager } from "../../components/GalleryManager";
import { ImageField } from "../../components/ImageField";
import { MenuEditor } from "../../components/MenuEditor";
import { Stars } from "../../components/Stars";
import { CalendarIcon, CheckIcon, GlobeIcon, StarIcon, TrashIcon } from "../../components/icons";
import { useOwnerAuth } from "../../context/OwnerAuthContext";
import { currency, dayName, formatEventDate, ownerApi, PRICE, TICKET_STATUS, timeAgo } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import type { Appointment, AppointmentStatus, BookingAnalytics, BookingMode, Business, BusinessOrder, Category, CustomerHistory, EventItem, GalleryImage, HoursRow, Offer, Reservation, Review, Service, StaffMember, WaitlistEntry } from "../../types";

const TABS = ["Overview", "Analytics", "Assistant", "Orders", "Bookings", "Booking Setup", "Reservations", "Profile", "Photos", "Hours", "Menu", "Offers", "Events", "Reviews"] as const;
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
        {tab === "Bookings" && <BookingsTab biz={biz} save={save} />}
        {tab === "Booking Setup" && <BookingSetupTab biz={biz} save={save} />}
        {tab === "Reservations" && <ReservationsTab biz={biz} save={save} />}
        {tab === "Profile" && <ProfileTab biz={biz} save={save} />}
        {tab === "Photos" && <PhotosTab biz={biz} save={save} />}
        {tab === "Hours" && <HoursTab biz={biz} save={save} />}
        {tab === "Menu" && <MenuTab biz={biz} save={save} />}
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
  const [gallery, setGallery] = useState<GalleryImage[]>(biz.gallery);
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <section className="card p-5"><h3 className="font-display font-bold text-ink">Logo</h3><div className="mt-3 max-w-[12rem]"><ImageField value={logo} onChange={setLogo} aspect="aspect-square" label="logo" /></div></section>
        <section className="card p-5"><h3 className="font-display font-bold text-ink">Cover photo</h3><div className="mt-3"><ImageField value={cover} onChange={setCover} label="cover" /></div></section>
      </div>
      <section className="card p-5">
        <h3 className="font-display font-bold text-ink">Gallery</h3>
        <div className="mt-3">
          <GalleryManager value={gallery} onChange={setGallery} cover={cover} onCoverChange={setCover} uploader={ownerApi} />
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

// ---- Menu / Products ----
function MenuTab({ biz, save }: { biz: Business; save: (p: Partial<Business>) => Promise<Business> }) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="font-display font-bold text-ink">Your menu</h3>
        <p className="text-sm text-muted">Add photos, descriptions and customization options. Customers browse with their eyes — great photos sell.</p>
      </div>
      <MenuEditor
        initialSections={biz.products ?? []}
        initialLabel={biz.productLabel ?? "Menu"}
        uploader={ownerApi}
        onSave={(products, productLabel) => save({ products, productLabel })}
      />
    </div>
  );
}

// ---- Bookings (appointments) ----
const APPT_BADGE: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-400/15 text-amber-600",
  CONFIRMED: "bg-emerald-500/15 text-emerald-600",
  RESCHEDULED: "bg-blue-500/15 text-blue-600",
  CANCELLED: "bg-red-500/15 text-red-500",
  COMPLETED: "bg-brand-soft text-brand-dark",
  NO_SHOW: "bg-surface-2 text-muted",
};
function BookingsTab({ biz, save }: { biz: Business; save: (p: Partial<Business>) => Promise<Business> }) {
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [filter, setFilter] = useState<"ALL" | AppointmentStatus>("ALL");
  const [stats, setStats] = useState<BookingAnalytics | null>(null);
  const [period, setPeriod] = useState("month");
  const [openCust, setOpenCust] = useState<string | null>(null); // appointment uid (id) whose customer panel is open
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const load = () => ownerApi.get<Appointment[]>(`/api/owner/businesses/${biz.id}/appointments`).then(setAppts).catch(() => setAppts([]));
  const loadStats = () => ownerApi.get<BookingAnalytics>(`/api/owner/businesses/${biz.id}/booking-analytics?period=${period}`).then(setStats).catch(() => setStats(null));
  const loadWaitlist = () => ownerApi.get<WaitlistEntry[]>(`/api/owner/businesses/${biz.id}/waitlist`).then(setWaitlist).catch(() => setWaitlist([]));
  useEffect(() => { if (biz.appointmentBookable) { load(); loadStats(); loadWaitlist(); } /* eslint-disable-next-line */ }, [biz.id, biz.appointmentBookable, period]);
  async function setWaitStatus(id: number, status: string) { await ownerApi.patch(`/api/owner/waitlist/${id}`, { status }); loadWaitlist(); }

  async function update(id: number, body: Record<string, unknown>) {
    await ownerApi.patch(`/api/owner/appointments/${id}`, body);
    load();
  }
  async function reschedule(a: Appointment) {
    const date = window.prompt("New date (YYYY-MM-DD):", a.date);
    if (!date) return;
    const time = window.prompt("New time (HH:MM):", a.time);
    if (!time) return;
    await update(a.id, { date, time });
  }

  if (!biz.appointmentBookable) {
    return (
      <div className="card p-8 text-center">
        <p className="font-display font-bold text-ink">Appointments are turned off</p>
        <p className="mt-1 text-muted">Turn on booking in <span className="font-semibold">Booking Setup</span> so customers can request appointments.</p>
        <button onClick={async () => { await save({ bookingConfig: { ...(biz.bookingConfig ?? {}), mode: "appointment" } }); }} className="btn btn-primary mt-4 px-5 py-2.5">Enable booking</button>
      </div>
    );
  }

  const shown = (appts ?? []).filter((a) => filter === "ALL" || a.status === filter);
  const statuses: ("ALL" | AppointmentStatus)[] = ["ALL", "PENDING", "CONFIRMED", "RESCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"];

  const cur = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return (
    <div>
      {/* Analytics summary */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold text-ink">Booking stats</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {[["month", "This month"], ["30d", "30 days"], ["all", "All time"]].map(([v, l]) => (
              <button key={v} onClick={() => setPeriod(v)} className={`chip !text-xs ${period === v ? "chip-active" : ""}`}>{l}</button>
            ))}
            <Link to="/owner/checkin" className="btn btn-ghost px-3 py-1.5 text-xs">📷 Check-in</Link>
          </div>
        </div>
        {stats && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Appointments", String(stats.total)],
                ["Completed", String(stats.completed)],
                ["Cancelled", String(stats.cancelled)],
                ["No-shows", String(stats.noShow)],
                ["Revenue", cur(stats.revenue)],
                ["Avg value", cur(stats.avgValue)],
              ].map(([label, val]) => (
                <div key={label} className="rounded-xl surface-2 p-3">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="font-display text-lg font-extrabold text-ink">{val}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
              <div className="rounded-xl surface-2 p-3"><p className="text-xs text-muted">Most booked service</p><p className="font-semibold text-ink">{stats.topService ? `${stats.topService.name} (${stats.topService.count})` : "—"}</p></div>
              <div className="rounded-xl surface-2 p-3"><p className="text-xs text-muted">Most popular staff</p><p className="font-semibold text-ink">{stats.topStaff ? `${stats.topStaff.name} (${stats.topStaff.count})` : "—"}</p></div>
              <div className="rounded-xl surface-2 p-3"><p className="text-xs text-muted">Peak hours</p><p className="font-semibold text-ink">{stats.peakHours.length ? stats.peakHours.slice(0, 3).map((p) => `${p.hour} (${p.count})`).join(", ") : "—"}</p></div>
            </div>
          </>
        )}
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`chip ${filter === s ? "chip-active" : ""}`}>{s === "ALL" ? "All" : s.replace("_", "-").toLowerCase()}</button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {appts === null && <div className="card h-24 animate-pulse" />}
        {appts && shown.length === 0 && <div className="card p-8 text-center text-muted">No appointments here yet.</div>}
        {shown.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{a.serviceName || "Appointment"} {a.staffName && <span className="font-normal text-muted">with {a.staffName}</span>}</p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-ink"><CalendarIcon className="h-4 w-4 text-brand" /> {a.date} · {a.time} <span className="text-muted">({a.durationMin} min)</span></p>
                <p className="mt-0.5 text-sm text-muted">{a.customerName} · {a.customerPhone}{a.price > 0 ? ` · $${a.price}` : ""}</p>
                {a.note && <p className="mt-1 text-sm text-muted">“{a.note}”</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${APPT_BADGE[a.status]}`}>{a.status.replace("_", "-")}</span>
                {a.arrivedAt && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">Arrived ✓</span>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {a.status === "PENDING" && <>
                <button onClick={() => update(a.id, { status: "CONFIRMED" })} className="btn btn-primary px-3 py-1.5 text-xs">Confirm</button>
                <button onClick={() => update(a.id, { status: "CANCELLED" })} className="btn btn-ghost px-3 py-1.5 text-xs text-red-500">Decline</button>
              </>}
              {(a.status === "CONFIRMED" || a.status === "RESCHEDULED") && <>
                <button onClick={() => update(a.id, { status: "COMPLETED" })} className="btn btn-primary px-3 py-1.5 text-xs">Mark complete</button>
                <button onClick={() => update(a.id, { status: "NO_SHOW" })} className="btn btn-ghost px-3 py-1.5 text-xs">No-show</button>
                <button onClick={() => update(a.id, { status: "CANCELLED" })} className="btn btn-ghost px-3 py-1.5 text-xs text-red-500">Cancel</button>
              </>}
              {a.status !== "CANCELLED" && a.status !== "COMPLETED" && (
                <button onClick={() => reschedule(a)} className="btn btn-ghost px-3 py-1.5 text-xs">Reschedule</button>
              )}
              <button onClick={() => setOpenCust(openCust === `${a.id}` ? null : `${a.id}`)} className="btn btn-ghost px-3 py-1.5 text-xs">{openCust === `${a.id}` ? "Hide customer" : "Customer"}</button>
            </div>
            {openCust === `${a.id}` && <CustomerPanel bizId={biz.id} phone={a.customerPhone} />}
          </div>
        ))}
      </div>

      {/* Waitlist */}
      {waitlist.length > 0 && (
        <section className="card mt-6 p-5">
          <h3 className="font-display font-bold text-ink">Waitlist <span className="text-sm font-normal text-muted">({waitlist.length})</span></h3>
          <p className="text-sm text-muted">Customers waiting for a spot. When one cancels, the next person is flagged automatically.</p>
          <div className="mt-3 space-y-2">
            {waitlist.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5">
                <span className="flex-1">
                  <span className="font-semibold text-ink">{w.customerName}</span> <span className="text-xs text-muted">· {w.customerPhone} · wants {w.date}</span>
                  {w.note && <span className="block text-xs text-muted">“{w.note}”</span>}
                </span>
                {w.status === "NOTIFIED" && <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-600">Notified</span>}
                <button onClick={() => setWaitStatus(w.id, "CONVERTED")} className="chip !text-xs">Booked</button>
                <button onClick={() => setWaitStatus(w.id, "CLOSED")} className="text-red-500"><TrashIcon className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const CRM_TAGS: { key: string; label: string }[] = [
  { key: "", label: "No tag" }, { key: "VIP", label: "⭐ VIP" }, { key: "REGULAR", label: "Regular" }, { key: "FIRST_VISIT", label: "First visit" },
];
const TAG_BADGE: Record<string, string> = { VIP: "bg-amber-400/20 text-amber-600", REGULAR: "bg-emerald-500/15 text-emerald-600", FIRST_VISIT: "bg-blue-500/15 text-blue-600" };

// Mini-CRM panel: a customer's history, totals, tag and notes (keyed by phone).
function CustomerPanel({ bizId, phone }: { bizId: number; phone: string }) {
  const [data, setData] = useState<CustomerHistory | null>(null);
  const [tag, setTag] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    ownerApi.get<CustomerHistory>(`/api/owner/businesses/${bizId}/customers/${encodeURIComponent(phone)}`)
      .then((d) => { setData(d); setTag(d.storedTag); setNotes(d.notes); })
      .catch(() => setData(null));
  }, [bizId, phone]);

  async function save() {
    await ownerApi.patch(`/api/owner/businesses/${bizId}/customers/${encodeURIComponent(phone)}`, { tag, notes, name: data?.name });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  if (!data) return <div className="mt-3 h-20 animate-pulse rounded-xl surface-2" />;
  const effective = tag || data.suggestedTag;
  return (
    <div className="mt-3 rounded-xl surface-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ink">{data.name || phone}</span>
        {effective && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TAG_BADGE[effective] ?? "bg-surface-2 text-muted"}`}>{effective.replace("_", " ")}</span>}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[["Visits", String(data.visits)], ["Completed", String(data.completed)], ["No-shows", String(data.noShows)], ["Total spent", `$${Math.round(data.spent).toLocaleString()}`]].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-surface p-2"><p className="text-[11px] text-muted">{l}</p><p className="font-bold text-ink">{v}</p></div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink">Tag</span>
        {CRM_TAGS.map((t) => <button key={t.key} onClick={() => setTag(t.key)} className={`chip !text-xs ${tag === t.key ? "chip-active" : ""}`}>{t.label}</button>)}
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Private notes about this customer…" className="input mt-2 !py-2 text-sm" />
      <div className="mt-2 flex items-center gap-3">
        <button onClick={save} className="btn btn-primary px-4 py-1.5 text-xs">Save</button>
        {saved && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckIcon className="h-3.5 w-3.5" /> Saved</span>}
      </div>
      {data.appointments.length > 1 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-ink">Previous appointments</p>
          <ul className="mt-1 space-y-1 text-xs text-muted">
            {data.appointments.slice(0, 8).map((a) => (
              <li key={a.id} className="flex justify-between"><span>{a.date} · {a.serviceName || "Appointment"}</span><span>{a.status.replace("_", "-").toLowerCase()}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---- Booking Setup (services, staff, settings) ----
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// A staff member with editable profile + personal schedule (hours, breaks, vacation).
function StaffRow({ staff, reload }: { staff: StaffMember; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    role: staff.role ?? "", experience: staff.experience ?? "", bio: staff.bio ?? "",
    languages: (staff.languages ?? []).join(", "), avatar: staff.avatar ?? null as string | null,
  });
  const sched = staff.schedule ?? {};
  const [customHours, setCustomHours] = useState(!!sched.workingHours?.length);
  const [hours, setHours] = useState<HoursRow[]>(() =>
    [0, 1, 2, 3, 4, 5, 6].map((day) => sched.workingHours?.find((h) => h.day === day) ?? { day, open: "09:00", close: "18:00", closed: day === 0 }),
  );
  const [breaks, setBreaks] = useState<{ day: number; start: string; end: string }[]>(sched.breaks ?? []);
  const [timeOff, setTimeOff] = useState<{ from: string; to: string }[]>(sched.timeOff ?? []);

  async function save() {
    setBusy(true);
    try {
      await ownerApi.patch(`/api/owner/staff/${staff.id}`, {
        role: f.role, experience: f.experience, bio: f.bio,
        languages: f.languages.split(",").map((s) => s.trim()).filter(Boolean),
        avatar: f.avatar,
        schedule: { workingHours: customHours ? hours : [], breaks, timeOff },
      });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      reload();
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-xl border border-border p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {staff.avatar ? <img src={staff.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-muted">{staff.name.charAt(0)}</span>}
        <span className="flex-1 font-semibold text-ink">{staff.name} {staff.role && <span className="text-xs font-normal text-muted">· {staff.role}</span>}{!!timeOff.length && <span className="ml-2 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">on leave set</span>}</span>
        <button onClick={() => setOpen((o) => !o)} className="chip !text-xs">{open ? "Close" : "Edit"}</button>
        <button onClick={async () => { await ownerApi.patch(`/api/owner/staff/${staff.id}`, { isActive: !staff.isActive }); reload(); }} className={`chip !text-xs ${staff.isActive ? "chip-active" : ""}`}>{staff.isActive ? "Active" : "Hidden"}</button>
        <button onClick={async () => { await ownerApi.delete(`/api/owner/staff/${staff.id}`); reload(); }} className="text-red-500"><TrashIcon className="h-4 w-4" /></button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <div><ImageField value={f.avatar} uploadWith={ownerApi} onChange={(avatar) => setF({ ...f, avatar })} aspect="aspect-square" label="photo" /></div>
            <div className="space-y-2">
              <input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="Role (e.g. Senior Barber)" className="input !py-2 text-sm" />
              <input value={f.experience} onChange={(e) => setF({ ...f, experience: e.target.value })} placeholder="Experience (e.g. 5 years)" className="input !py-2 text-sm" />
              <input value={f.languages} onChange={(e) => setF({ ...f, languages: e.target.value })} placeholder="Languages (comma separated, e.g. Arabic, English)" className="input !py-2 text-sm" />
              <textarea value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} rows={2} placeholder="Short bio (optional)" className="input !py-2 text-sm" />
            </div>
          </div>

          {/* Personal working hours */}
          <div>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" checked={customHours} onChange={(e) => setCustomHours(e.target.checked)} /> Custom working hours <span className="font-normal text-muted">(off = use business hours)</span></label>
            {customHours && (
              <div className="mt-2 space-y-1.5">
                {hours.map((h, i) => (
                  <div key={h.day} className="flex items-center gap-2">
                    <span className="w-10 text-sm font-semibold text-ink">{DOW[h.day]}</span>
                    {h.closed ? <span className="flex-1 text-sm text-muted">Off</span> : (
                      <div className="flex flex-1 items-center gap-2">
                        <input type="time" value={h.open} onChange={(e) => setHours(hours.map((x, j) => j === i ? { ...x, open: e.target.value } : x))} className="input !py-1.5 text-sm" />
                        <span className="text-muted">–</span>
                        <input type="time" value={h.close} onChange={(e) => setHours(hours.map((x, j) => j === i ? { ...x, close: e.target.value } : x))} className="input !py-1.5 text-sm" />
                      </div>
                    )}
                    <button onClick={() => setHours(hours.map((x, j) => j === i ? { ...x, closed: !x.closed } : x))} className={`chip !text-xs ${h.closed ? "chip-active" : ""}`}>{h.closed ? "Off" : "Working"}</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Personal breaks */}
          <div>
            <p className="text-sm font-semibold text-ink">Breaks</p>
            <div className="mt-1.5 space-y-1.5">
              {breaks.map((br, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={br.day} onChange={(e) => setBreaks(breaks.map((x, j) => j === i ? { ...x, day: Number(e.target.value) } : x))} className="input !py-1.5 text-sm w-24">{DOW.map((d, di) => <option key={di} value={di}>{d}</option>)}</select>
                  <input type="time" value={br.start} onChange={(e) => setBreaks(breaks.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} className="input !py-1.5 text-sm" />
                  <span className="text-muted">–</span>
                  <input type="time" value={br.end} onChange={(e) => setBreaks(breaks.map((x, j) => j === i ? { ...x, end: e.target.value } : x))} className="input !py-1.5 text-sm" />
                  <button onClick={() => setBreaks(breaks.filter((_, j) => j !== i))} className="text-red-500"><TrashIcon className="h-4 w-4" /></button>
                </div>
              ))}
              <button onClick={() => setBreaks([...breaks, { day: 1, start: "13:00", end: "14:00" }])} className="chip !text-xs">+ Add break</button>
            </div>
          </div>

          {/* Vacation / time off */}
          <div>
            <p className="text-sm font-semibold text-ink">Vacation / time off</p>
            <div className="mt-1.5 space-y-1.5">
              {timeOff.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="date" value={t.from} onChange={(e) => setTimeOff(timeOff.map((x, j) => j === i ? { ...x, from: e.target.value } : x))} className="input !py-1.5 text-sm" />
                  <span className="text-muted">→</span>
                  <input type="date" value={t.to} onChange={(e) => setTimeOff(timeOff.map((x, j) => j === i ? { ...x, to: e.target.value } : x))} className="input !py-1.5 text-sm" />
                  <button onClick={() => setTimeOff(timeOff.filter((_, j) => j !== i))} className="text-red-500"><TrashIcon className="h-4 w-4" /></button>
                </div>
              ))}
              <button onClick={() => setTimeOff([...timeOff, { from: "", to: "" }])} className="chip !text-xs">+ Add leave</button>
              <p className="text-xs text-muted">Bookings on these dates won't be offered for this staff member.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={save} disabled={busy} className="btn btn-primary px-5 py-2 text-sm disabled:opacity-60">{busy ? "Saving…" : "Save staff"}</button>
            {saved && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><CheckIcon className="h-4 w-4" /> Saved</span>}
          </div>
        </div>
      )}
    </div>
  );
}
function BookingSetupTab({ biz, save }: { biz: Business; save: (p: Partial<Business>) => Promise<Business> }) {
  const [services, setServices] = useState<Service[] | null>(null);
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const cfg = biz.bookingConfig ?? {};
  const [settings, setSettings] = useState({
    slotInterval: cfg.slotInterval ?? 30,
    capacity: cfg.capacity ?? 1,
    leadTimeHours: cfg.leadTimeHours ?? 1,
    horizonDays: cfg.horizonDays ?? 30,
    bufferBefore: cfg.bufferBefore ?? 0,
    bufferAfter: cfg.bufferAfter ?? 0,
    maxPerDay: cfg.maxPerDay ?? 0,
    cancellationHours: cfg.cancellationHours ?? 12,
  });
  const [mode, setMode] = useState<"" | BookingMode>(cfg.mode ?? "");
  const [allowCancel, setAllowCancel] = useState(cfg.allowCustomerCancel ?? true);
  const [allowReschedule, setAllowReschedule] = useState(cfg.allowCustomerReschedule ?? true);
  const [policyNote, setPolicyNote] = useState(cfg.policyNote ?? "");
  const [daysOff, setDaysOff] = useState<string[]>(cfg.daysOff ?? []);
  const [breaks, setBreaks] = useState<{ day: number; start: string; end: string }[]>(cfg.breaks ?? []);
  const [newSvc, setNewSvc] = useState({ name: "", durationMin: 30, price: 0, description: "" });
  const [newStaff, setNewStaff] = useState({ name: "", role: "", avatar: null as string | null });
  const [newDayOff, setNewDayOff] = useState("");
  const [savedMode, setSavedMode] = useState(false);

  async function saveMode(m: "" | BookingMode) {
    setMode(m);
    await save({ bookingConfig: { ...cfg, mode: m } });
    setSavedMode(true); setTimeout(() => setSavedMode(false), 2000);
  }

  const loadSvc = () => ownerApi.get<Service[]>(`/api/owner/businesses/${biz.id}/services`).then(setServices).catch(() => setServices([]));
  const loadStaff = () => ownerApi.get<StaffMember[]>(`/api/owner/businesses/${biz.id}/staff`).then(setStaff).catch(() => setStaff([]));
  useEffect(() => { loadSvc(); loadStaff(); /* eslint-disable-next-line */ }, [biz.id]);

  async function addService(e: FormEvent) {
    e.preventDefault();
    if (!newSvc.name.trim()) return;
    await ownerApi.post(`/api/owner/businesses/${biz.id}/services`, newSvc);
    setNewSvc({ name: "", durationMin: 30, price: 0, description: "" });
    loadSvc();
  }
  async function addStaff(e: FormEvent) {
    e.preventDefault();
    if (!newStaff.name.trim()) return;
    await ownerApi.post(`/api/owner/businesses/${biz.id}/staff`, newStaff);
    setNewStaff({ name: "", role: "", avatar: null });
    loadStaff();
  }
  async function saveSettings() {
    await save({ bookingConfig: { ...cfg, ...settings, mode, allowCustomerCancel: allowCancel, allowCustomerReschedule: allowReschedule, policyNote, daysOff, breaks } });
  }

  return (
    <div className="space-y-6">
      {/* Mode (category-driven, with override) */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-ink">Booking mode</h3>
            <p className="text-sm text-muted">By default this follows your category ({biz.category.name}). Currently showing: <span className="font-semibold text-ink">{biz.bookingCta ?? (biz.appointmentBookable ? "Book Appointment" : "Off")}</span>.</p>
          </div>
          {savedMode && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><CheckIcon className="h-4 w-4" /> Saved</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {([["", "Auto (by category)"], ["appointment", "Book Appointment"], ["service", "Request Service"], ["none", "Off"]] as ["" | BookingMode, string][]).map(([val, label]) => (
            <button key={val} onClick={() => saveMode(val)} className={`chip ${mode === val ? "chip-active" : ""}`}>{label}</button>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="card p-5">
        <h3 className="font-display font-bold text-ink">Services</h3>
        <p className="text-sm text-muted">Each service has its own duration and price.</p>
        <div className="mt-3 space-y-2">
          {(services ?? []).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5">
              <span className="flex-1 font-semibold text-ink">{s.name} <span className="text-xs font-normal text-muted">· {s.durationMin} min · {s.price > 0 ? `$${s.price}` : "Free"}</span></span>
              <button onClick={async () => { await ownerApi.patch(`/api/owner/services/${s.id}`, { isActive: !s.isActive }); loadSvc(); }} className={`chip !text-xs ${s.isActive ? "chip-active" : ""}`}>{s.isActive ? "Active" : "Hidden"}</button>
              <button onClick={async () => { await ownerApi.delete(`/api/owner/services/${s.id}`); loadSvc(); }} className="text-red-500"><TrashIcon className="h-4 w-4" /></button>
            </div>
          ))}
          {services && services.length === 0 && <p className="text-sm text-muted">No services yet.</p>}
        </div>
        <form onSubmit={addService} className="mt-3 grid gap-2 sm:grid-cols-[1fr_7rem_7rem_auto]">
          <input value={newSvc.name} onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })} placeholder="Service name" className="input !py-2 text-sm" />
          <input type="number" min={5} step={5} value={newSvc.durationMin} onChange={(e) => setNewSvc({ ...newSvc, durationMin: Number(e.target.value) })} placeholder="min" className="input !py-2 text-sm" />
          <input type="number" min={0} step={0.5} value={newSvc.price} onChange={(e) => setNewSvc({ ...newSvc, price: Number(e.target.value) })} placeholder="$" className="input !py-2 text-sm" />
          <button className="btn btn-primary px-4 py-2 text-sm">Add</button>
        </form>
      </section>

      {/* Staff */}
      <section className="card p-5">
        <h3 className="font-display font-bold text-ink">Staff members <span className="text-xs font-normal text-muted">(optional)</span></h3>
        <div className="mt-3 space-y-2">
          {(staff ?? []).map((m) => <StaffRow key={m.id} staff={m} reload={loadStaff} />)}
          {staff && staff.length === 0 && <p className="text-sm text-muted">No staff added — customers will just pick a time.</p>}
        </div>
        <form onSubmit={addStaff} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="Name" className="input !py-2 text-sm" />
          <input value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })} placeholder="Role (e.g. Barber)" className="input !py-2 text-sm" />
          <button className="btn btn-primary px-4 py-2 text-sm">Add</button>
        </form>
      </section>

      {/* Settings */}
      <section className="card p-5">
        <h3 className="font-display font-bold text-ink">Availability settings</h3>
        <p className="text-sm text-muted">Appointments use your opening <span className="font-semibold">Hours</span>. Add breaks and days off below.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-ink">Slot interval (min)
            <input type="number" min={5} step={5} value={settings.slotInterval} onChange={(e) => setSettings({ ...settings, slotInterval: Number(e.target.value) })} className="input mt-1 !py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold text-ink">Capacity per slot
            <input type="number" min={1} value={settings.capacity} onChange={(e) => setSettings({ ...settings, capacity: Number(e.target.value) })} className="input mt-1 !py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold text-ink">Min notice (hours)
            <input type="number" min={0} value={settings.leadTimeHours} onChange={(e) => setSettings({ ...settings, leadTimeHours: Number(e.target.value) })} className="input mt-1 !py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold text-ink">Bookable ahead (days)
            <input type="number" min={1} value={settings.horizonDays} onChange={(e) => setSettings({ ...settings, horizonDays: Number(e.target.value) })} className="input mt-1 !py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold text-ink">Buffer before (min)
            <input type="number" min={0} step={5} value={settings.bufferBefore} onChange={(e) => setSettings({ ...settings, bufferBefore: Number(e.target.value) })} className="input mt-1 !py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold text-ink">Buffer after (min)
            <input type="number" min={0} step={5} value={settings.bufferAfter} onChange={(e) => setSettings({ ...settings, bufferAfter: Number(e.target.value) })} className="input mt-1 !py-2 text-sm" />
          </label>
          <label className="text-sm font-semibold text-ink">Max appointments / day <span className="font-normal text-muted">(0 = unlimited)</span>
            <input type="number" min={0} value={settings.maxPerDay} onChange={(e) => setSettings({ ...settings, maxPerDay: Number(e.target.value) })} className="input mt-1 !py-2 text-sm" />
          </label>
        </div>

        {/* Cancellation policy */}
        <div className="mt-4 rounded-xl surface-2 p-3">
          <p className="text-sm font-semibold text-ink">Customer cancellation policy</p>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-1.5 text-ink"><input type="checkbox" checked={allowCancel} onChange={(e) => setAllowCancel(e.target.checked)} /> Allow cancel</label>
            <label className="inline-flex items-center gap-1.5 text-ink"><input type="checkbox" checked={allowReschedule} onChange={(e) => setAllowReschedule(e.target.checked)} /> Allow reschedule</label>
            <label className="inline-flex items-center gap-1.5 text-ink">Cutoff (hours before)
              <input type="number" min={0} value={settings.cancellationHours} onChange={(e) => setSettings({ ...settings, cancellationHours: Number(e.target.value) })} className="input !py-1.5 text-sm w-20" />
            </label>
          </div>
          <input value={policyNote} onChange={(e) => setPolicyNote(e.target.value)} placeholder="Policy note shown to customers (optional)" className="input mt-2 !py-2 text-sm" />
        </div>

        {/* Breaks */}
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink">Break times</p>
          <div className="mt-2 space-y-2">
            {breaks.map((br, i) => (
              <div key={i} className="flex items-center gap-2">
                <select value={br.day} onChange={(e) => setBreaks(breaks.map((x, j) => j === i ? { ...x, day: Number(e.target.value) } : x))} className="input !py-1.5 text-sm w-28">
                  {DOW.map((d, di) => <option key={di} value={di}>{d}</option>)}
                </select>
                <input type="time" value={br.start} onChange={(e) => setBreaks(breaks.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} className="input !py-1.5 text-sm" />
                <span className="text-muted">–</span>
                <input type="time" value={br.end} onChange={(e) => setBreaks(breaks.map((x, j) => j === i ? { ...x, end: e.target.value } : x))} className="input !py-1.5 text-sm" />
                <button onClick={() => setBreaks(breaks.filter((_, j) => j !== i))} className="text-red-500"><TrashIcon className="h-4 w-4" /></button>
              </div>
            ))}
            <button onClick={() => setBreaks([...breaks, { day: 1, start: "13:00", end: "14:00" }])} className="chip !text-xs">+ Add break</button>
          </div>
        </div>

        {/* Days off */}
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink">Days off</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {daysOff.map((d) => (
              <span key={d} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink">{d}<button onClick={() => setDaysOff(daysOff.filter((x) => x !== d))} className="text-red-500">✕</button></span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input type="date" value={newDayOff} onChange={(e) => setNewDayOff(e.target.value)} className="input !py-2 text-sm" />
            <button onClick={() => { if (newDayOff && !daysOff.includes(newDayOff)) { setDaysOff([...daysOff, newDayOff].sort()); setNewDayOff(""); } }} className="btn btn-ghost px-4 py-2 text-sm">Add day off</button>
          </div>
        </div>

        <SaveBar dirty onSave={saveSettings} />
      </section>
    </div>
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
