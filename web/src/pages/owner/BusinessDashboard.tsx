import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AiChat, type AiMessage } from "../../components/AiChat";
import { BarChart, StatCard } from "../../components/Charts";
import { GalleryManager } from "../../components/GalleryManager";
import { ImageField } from "../../components/ImageField";
import { MapPicker } from "../../components/MapPicker";
import { EVENT_CATEGORIES } from "../../lib/events";
import { fieldLabel } from "../../lib/requestForms";
import { MenuEditor } from "../../components/MenuEditor";
import { Stars } from "../../components/Stars";
import { ChatBubbles } from "../../components/ChatBubbles";
import { QRCode } from "../../components/QRCode";
import QR from "qrcode";
import { CalendarIcon, CheckIcon, GlobeIcon, StarIcon, TrashIcon } from "../../components/icons";
import { useOwnerAuth } from "../../context/OwnerAuthContext";
import { currency, dayName, formatEventDate, ownerApi, PRICE, TICKET_STATUS, timeAgo } from "../../lib/api";
import { kitFor, stepDone } from "../../lib/categoryKits";
import { downloadCsv } from "../../lib/csv";
import { useFetch } from "../../lib/useFetch";
import type { Appointment, AppointmentStatus, BookingAnalytics, BookingMode, Business, BusinessAnnouncement, BusinessOrder, Category, ChatConversation, ChatMessage, CustomerHistory, CustomerRow, EventItem, Facility, FacilityBooking, FacilityStats, GalleryImage, HoursRow, Offer, OwnerPartLead, Payout, Reservation, Review, Service, StaffMember, Transaction, Voucher, VoucherStats, VoucherType, Wallet, WaitlistEntry } from "../../types";

const TABS = ["Today", "Inbox", "Messages", "Customers", "Overview", "Earnings", "Analytics", "Assistant", "Orders", "Bookings", "Booking Setup", "Facilities", "Field Bookings", "Gift Vouchers", "Requests", "Reservations", "Marketing", "Engage", "Profile", "Photos", "Hours", "Menu", "Offers", "Events", "Reviews", "Share"] as const;
type Tab = (typeof TABS)[number];

// Group the tabs into a tidy 2-level nav so the dashboard isn't a wall of tabs.
// The nav shows EVERY tool (nothing hidden); the industry toolkit strip below the
// nav highlights the ones that matter for this business's category.
const TAB_GROUPS: { label: string; icon: string; tabs: Tab[] }[] = [
  { label: "Home", icon: "🏠", tabs: ["Today", "Inbox", "Overview"] },
  { label: "Messages", icon: "💬", tabs: ["Messages"] },
  { label: "Customers", icon: "👥", tabs: ["Customers"] },
  { label: "Finance", icon: "💰", tabs: ["Earnings", "Analytics"] },
  { label: "Sales", icon: "🛍️", tabs: ["Orders", "Menu", "Offers", "Gift Vouchers", "Requests"] },
  { label: "Marketing", icon: "📣", tabs: ["Marketing", "Engage"] },
  { label: "Bookings", icon: "📅", tabs: ["Bookings", "Booking Setup", "Facilities", "Field Bookings", "Reservations"] },
  { label: "Page", icon: "✏️", tabs: ["Profile", "Photos", "Hours", "Events", "Reviews", "Share"] },
  { label: "Assistant", icon: "✨", tabs: ["Assistant"] },
];

export function BusinessDashboard() {
  const { id } = useParams();
  const { refresh } = useOwnerAuth();
  const [tab, setTab] = useState<Tab>("Today");
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

  const kit = kitFor(biz.category);
  const toolLabel = (t: string) => (t === "Menu" && kit.catalogLabel ? kit.catalogLabel : t === "Share" ? "🔗 Share & QR" : t);
  const toolkit = Array.from(new Set([...kit.primary, "Share"]));

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

      {/* Industry toolkit — surfaces the tools that matter for this category. */}
      <div className="mt-4 rounded-2xl border border-brand/30 bg-brand-soft/40 p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{kit.emoji}</span>
          <p className="font-display font-extrabold text-ink">Your {kit.label} toolkit</p>
        </div>
        <p className="mt-0.5 text-sm text-muted">{kit.blurb}</p>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {toolkit.map((t) => (
            <button key={t} onClick={() => setTab(t as Tab)} className={`chip whitespace-nowrap ${tab === t ? "chip-active" : ""}`}>{toolLabel(t)}</button>
          ))}
        </div>
      </div>

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

      {(() => {
        const activeGroup = TAB_GROUPS.find((g) => g.tabs.includes(tab)) ?? TAB_GROUPS[0];
        return (
          <>
            {/* Top-level groups */}
            <div className="no-scrollbar mt-5 flex gap-1.5 overflow-x-auto pb-1">
              {TAB_GROUPS.map((g) => (
                <button
                  key={g.label}
                  onClick={() => { if (!g.tabs.includes(tab)) setTab(g.tabs[0]); }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${activeGroup.label === g.label ? "bg-brand text-white" : "surface-2 text-muted hover:text-ink"}`}
                >
                  <span>{g.icon}</span> {g.label}
                </button>
              ))}
            </div>
            {/* Sub-tabs within the active group (hidden when the group has only one) */}
            {activeGroup.tabs.length > 1 && (
              <div className="no-scrollbar mt-3 flex gap-1 overflow-x-auto border-b border-border">
                {activeGroup.tabs.map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap border-b-2 px-3.5 py-2 text-sm font-semibold transition ${tab === t ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}>{t}</button>
                ))}
              </div>
            )}
          </>
        );
      })()}

      <div className="mt-6">
        {tab === "Today" && <TodayTab biz={biz} onGo={(t) => setTab(t as Tab)} />}
        {tab === "Inbox" && <InboxTab biz={biz} onGo={(t) => setTab(t as Tab)} />}
        {tab === "Messages" && <MessagesTab biz={biz} />}
        {tab === "Customers" && <CustomersTab biz={biz} />}
        {tab === "Overview" && <Overview biz={biz} onGo={(t) => setTab(t as Tab)} />}
        {tab === "Earnings" && <EarningsTab biz={biz} />}
        {tab === "Analytics" && <AnalyticsTab biz={biz} />}
        {tab === "Assistant" && <AssistantTab biz={biz} />}
        {tab === "Orders" && <OrdersTab biz={biz} />}
        {tab === "Bookings" && <BookingsTab biz={biz} save={save} />}
        {tab === "Booking Setup" && <BookingSetupTab biz={biz} save={save} />}
        {tab === "Facilities" && <FacilitiesTab biz={biz} />}
        {tab === "Field Bookings" && <FieldBookingsTab biz={biz} />}
        {tab === "Gift Vouchers" && <VouchersTab biz={biz} />}
        {tab === "Requests" && <PartRequestsTab biz={biz} />}
        {tab === "Reservations" && <ReservationsTab biz={biz} save={save} />}
        {tab === "Profile" && <ProfileTab biz={biz} save={save} />}
        {tab === "Photos" && <PhotosTab biz={biz} save={save} />}
        {tab === "Hours" && <HoursTab biz={biz} save={save} />}
        {tab === "Menu" && <MenuTab biz={biz} save={save} />}
        {tab === "Marketing" && <MarketingTab biz={biz} onGo={(t) => setTab(t as Tab)} />}
        {tab === "Engage" && <EngageTab biz={biz} />}
        {tab === "Offers" && <OffersTab biz={biz} />}
        {tab === "Events" && <EventsTab biz={biz} />}
        {tab === "Reviews" && <ReviewsTab biz={biz} />}
        {tab === "Share" && <ShareTab biz={biz} />}
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

// ---- Today: the daily control-center home ----
interface TodaySummary {
  today: { orders: number; bookings: number; newCustomers: number; revenue: number; giftCardSales: { count: number; value: number }; offerRedemptions: number };
  upcoming: { count: number; list: { time: string; name: string; detail: string; status: string }[] };
  actions: { pendingOrders: number; pendingReservations: number; pendingAppointments: number; quotesWaiting: number; unrepliedReviews: number };
}
function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }

function TodayTab({ biz, onGo }: { biz: Business; onGo: (tab: string) => void }) {
  const { data, loading } = useFetch<TodaySummary>(`/api/owner/businesses/${biz.id}/today`);
  if (loading || !data) return <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-24 animate-pulse" />)}</div>;

  const A = data.actions;
  const actionItems = [
    { n: A.pendingOrders, label: "orders to confirm", tab: "Orders", icon: "🛍️" },
    { n: A.pendingAppointments, label: "appointments to confirm", tab: "Bookings", icon: "📅" },
    { n: A.pendingReservations, label: "reservations to confirm", tab: "Reservations", icon: "🍽️" },
    { n: A.quotesWaiting, label: "quote requests waiting", tab: "Requests", icon: "🔧" },
    { n: A.unrepliedReviews, label: "reviews to reply to", tab: "Reviews", icon: "⭐" },
  ].filter((a) => a.n > 0);
  const t = data.today;
  const stats = [
    { label: "Revenue today", value: currency(t.revenue) },
    { label: "New orders", value: t.orders },
    { label: "New bookings", value: t.bookings },
    { label: "New customers", value: t.newCustomers },
    { label: "Gift card sales", value: t.giftCardSales.count ? `${currency(t.giftCardSales.value)}` : "0" },
    { label: "Offer redemptions", value: t.offerRedemptions },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-ink">{greeting()}! 👋</h2>
        <p className="text-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · Here's what's happening at {biz.name}.</p>
      </div>

      {/* Needs your attention */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-ink">Needs your attention</h3>
          <button onClick={() => onGo("Inbox")} className="text-sm font-bold text-brand">Open inbox →</button>
        </div>
        {actionItems.length === 0 ? (
          <p className="mt-3 rounded-xl bg-emerald-500/10 px-4 py-6 text-center text-sm font-semibold text-emerald-600">✨ You're all caught up — nothing waiting.</p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {actionItems.map((a) => (
              <button key={a.tab} onClick={() => onGo(a.tab)} className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft/40 p-3 text-left transition hover:border-brand">
                <span className="text-xl">{a.icon}</span>
                <span className="flex-1 text-sm font-semibold text-ink"><span className="font-extrabold text-brand-dark">{a.n}</span> {a.label}</span>
                <span className="text-xs font-bold text-brand">Review →</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Today so far */}
      <div>
        <h3 className="mb-3 font-display font-bold text-ink">Today so far</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="card p-4">
              <p className="text-xs text-muted">{s.label}</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-ink">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming today */}
      <div className="card p-5">
        <h3 className="font-display font-bold text-ink">📆 Upcoming today</h3>
        {data.upcoming.list.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No appointments or bookings scheduled for the rest of today.</p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {data.upcoming.list.map((u, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <span className="w-14 shrink-0 font-mono text-sm font-bold text-brand-dark">{u.time}</span>
                <span className="flex-1 text-sm"><span className="font-semibold text-ink">{u.name}</span> <span className="text-muted">· {u.detail}</span></span>
                <span className="text-xs text-muted">{u.status.toLowerCase()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Inbox: one unified feed of everything needing attention ----
interface InboxItem { id: string; kind: string; icon: string; title: string; subtitle: string; time: string; status: string; needsAction: boolean; tab: string }
interface InboxData { items: InboxItem[]; counts: Record<string, number> }
const INBOX_FILTERS: { key: string; label: string; test: (i: InboxItem) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "action", label: "Needs action", test: (i) => i.needsAction },
  { key: "bookings", label: "Bookings", test: (i) => ["APPOINTMENT", "RESERVATION", "FACILITY", "EVENT"].includes(i.kind) },
  { key: "orders", label: "Orders", test: (i) => i.kind === "ORDER" },
  { key: "quotes", label: "Quotes", test: (i) => i.kind === "QUOTE" },
  { key: "sales", label: "Gift cards", test: (i) => i.kind === "GIFTCARD" },
  { key: "reviews", label: "Reviews", test: (i) => i.kind === "REVIEW" },
];

function InboxTab({ biz, onGo }: { biz: Business; onGo: (tab: string) => void }) {
  const { data, loading } = useFetch<InboxData>(`/api/owner/businesses/${biz.id}/inbox`);
  const [filter, setFilter] = useState("all");
  if (loading || !data) return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-16 animate-pulse" />)}</div>;

  const active = INBOX_FILTERS.find((f) => f.key === filter) ?? INBOX_FILTERS[0];
  const shown = data.items.filter(active.test);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-ink">Inbox</h2>
          <p className="text-sm text-muted">Everything happening at your business, in one place.</p>
        </div>
        {data.counts.action > 0 && <span className="rounded-full bg-brand px-3 py-1 text-sm font-bold text-white">{data.counts.action} need action</span>}
      </div>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {INBOX_FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`chip whitespace-nowrap ${filter === f.key ? "chip-active" : ""}`}>
            {f.label}{data.counts[f.key] ? ` (${data.counts[f.key]})` : ""}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {shown.length === 0 ? (
          <div className="card p-12 text-center text-muted">Nothing here yet.</div>
        ) : (
          shown.map((i) => (
            <button key={i.id} onClick={() => onGo(i.tab)} className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition hover:shadow-sm ${i.needsAction ? "border-brand/40 bg-brand-soft/30" : "border-border bg-surface"}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl surface-2 text-lg">{i.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{i.title}</p>
                <p className="truncate text-sm text-muted">{i.subtitle}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-xs text-muted">{timeAgo(i.time)}</span>
                {i.needsAction ? <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">Action</span> : <span className="text-[10px] font-semibold uppercase text-muted">{i.status.toLowerCase()}</span>}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ---- Messages: two-way chat with customers ----
function MessagesTab({ biz }: { biz: Business }) {
  const [convos, setConvos] = useState<ChatConversation[] | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const loadConvos = () => ownerApi.get<ChatConversation[]>(`/api/owner/businesses/${biz.id}/chats`).then(setConvos).catch(() => setConvos([]));
  useEffect(() => { loadConvos(); /* eslint-disable-next-line */ }, [biz.id]);
  useEffect(() => {
    if (active === null) return;
    let alive = true;
    const load = () => ownerApi.get<{ messages: ChatMessage[] }>(`/api/owner/businesses/${biz.id}/chats/${active}`).then((d) => alive && setMessages(d.messages)).catch(() => {});
    load();
    const t = setInterval(load, 4000);
    return () => { alive = false; clearInterval(t); };
  }, [active, biz.id]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy || active === null) return;
    setBusy(true);
    try { const m = await ownerApi.post<ChatMessage>(`/api/owner/businesses/${biz.id}/chats/${active}`, { body }); setMessages((x) => [...x, m]); setText(""); loadConvos(); } finally { setBusy(false); }
  }

  const activeConvo = convos?.find((c) => c.id === active);
  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <div className="card p-2 md:h-[62vh] md:overflow-y-auto">
        {convos === null ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="m-1 h-14 animate-pulse rounded-xl surface-2" />)
        ) : convos.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">No messages yet. Customers can message you from your public page.</p>
        ) : (
          convos.map((c) => (
            <button key={c.id} onClick={() => setActive(c.id)} className={`flex w-full items-center gap-2 rounded-xl p-2.5 text-left ${active === c.id ? "bg-brand-soft" : "hover:surface-2"}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface font-bold text-brand-dark">{(c.customerName || "?").slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink">{c.customerName || "Customer"}</span><span className="block truncate text-xs text-muted">{c.lastSender === "BUSINESS" ? "You: " : ""}{c.lastMessage}</span></span>
              {c.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{c.unread}</span>}
            </button>
          ))
        )}
      </div>
      <div className="card flex flex-col overflow-hidden p-0 md:h-[62vh]">
        {active === null ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-muted">Select a conversation to reply.</div>
        ) : (
          <>
            <div className="border-b border-border px-4 py-2.5 font-semibold text-ink">{activeConvo?.customerName || "Customer"}</div>
            <div className="flex-1 overflow-y-auto p-4"><ChatBubbles messages={messages} mineSender="BUSINESS" /></div>
            <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a reply…" className="input !py-2 text-sm" />
              <button type="submit" disabled={busy || !text.trim()} className="btn btn-primary shrink-0 px-4 py-2 text-sm disabled:opacity-50">Send</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Overview / analytics ----
function Overview({ biz, onGo }: { biz: Business; onGo: (tab: string) => void }) {
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

  // Category-specific setup checklist — guides owners to a complete, active page.
  const kit = kitFor(biz.category);
  const counts = { offers: data?.offers, events: data?.events };
  const steps = kit.steps.map((s) => ({ ...s, done: stepDone(s.key, biz, counts) }));
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="space-y-6">
      {doneCount < steps.length && (
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-ink">{kit.emoji} Set up your {kit.label.toLowerCase()} page</h3>
              <p className="text-sm text-muted">Complete these to start winning more customers on your page.</p>
            </div>
            <span className="shrink-0 rounded-full surface-2 px-3 py-1 text-sm font-bold text-ink">{doneCount}/{steps.length}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full surface-2"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
          <div className="mt-4 space-y-2">
            {steps.map((s) => (
              <button key={s.key + s.label} onClick={() => onGo(s.tab)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${s.done ? "border-border opacity-70" : "border-brand/30 hover:border-brand hover:bg-brand-soft/40"}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${s.done ? "bg-emerald-500 text-white" : "surface-2 text-muted"}`}>{s.done ? "✓" : ""}</span>
                <span className={`flex-1 text-sm font-semibold ${s.done ? "text-muted line-through" : "text-ink"}`}>{s.label}</span>
                {!s.done && <span className="text-xs font-bold text-brand">Set up →</span>}
              </button>
            ))}
          </div>
        </div>
      )}
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

// ---- Share & QR — turn the page into the business's digital hub ----
const PLACEMENTS = [
  { icon: "🚪", label: "At the entrance", hint: "A window sticker so walk-ins can browse & book." },
  { icon: "🍽️", label: "On tables & menus", hint: "Let diners see the menu, order or reserve." },
  { icon: "🧾", label: "On receipts", hint: "Invite every customer to leave a review." },
  { icon: "💳", label: "On business cards", hint: "One link with everything about you." },
  { icon: "📦", label: "On packaging", hint: "Turn deliveries into repeat customers." },
  { icon: "📱", label: "In your social bios", hint: "Send Instagram & Facebook traffic here." },
];

function ShareTab({ biz }: { biz: Business }) {
  const pageUrl = `${window.location.origin}/business/${biz.slug}`;
  const [copied, setCopied] = useState(false);

  function copy() { navigator.clipboard?.writeText(pageUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }
  async function downloadQr() {
    try {
      const url = await QR.toDataURL(pageUrl, { width: 1024, margin: 2 });
      const a = document.createElement("a");
      a.href = url; a.download = `${biz.slug}-qr.png`; a.click();
    } catch { /* ignore */ }
  }
  const waShare = `https://wa.me/?text=${encodeURIComponent(`Check out ${biz.name} on our page: ${pageUrl}`)}`;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-brand/30 bg-brand-soft/40 p-4">
        <p className="font-display font-extrabold text-ink">📣 Share your page, not your Instagram</p>
        <p className="mt-0.5 text-sm text-muted">Your page has everything in one place — menu, booking, ordering, gift cards, offers, reviews, directions & contact. Send customers here instead of a social profile, and they can act instantly.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* QR + link */}
        <div className="card flex flex-col items-center p-6 text-center">
          <QRCode value={pageUrl} size={200} />
          <p className="mt-3 text-sm font-semibold text-ink">Your page QR code</p>
          <p className="mt-0.5 break-all text-xs text-muted">{pageUrl}</p>
          <div className="mt-4 flex w-full flex-col gap-2">
            <button onClick={downloadQr} className="btn btn-primary py-2.5">⬇ Download QR (print-ready)</button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={copy} className="btn btn-ghost py-2 text-sm">{copied ? "✓ Copied" : "Copy link"}</button>
              <a href={waShare} target="_blank" rel="noreferrer" className="btn btn-ghost py-2 text-sm">Share on WhatsApp</a>
            </div>
          </div>
        </div>

        {/* Placement ideas */}
        <div className="card p-6">
          <h3 className="font-display font-bold text-ink">Where to put your QR</h3>
          <p className="text-sm text-muted">The more places customers can scan it, the more bookings, orders & reviews you get.</p>
          <div className="mt-4 space-y-3">
            {PLACEMENTS.map((p) => (
              <div key={p.label} className="flex gap-3">
                <span className="text-xl">{p.icon}</span>
                <div><p className="font-semibold text-ink">{p.label}</p><p className="text-sm text-muted">{p.hint}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Analytics dashboard ----
interface Metric { value: number; prev: number; delta: number }
interface Metrics {
  business: { hasReservations: boolean; hasDelivery: boolean };
  advanced: {
    giftCards: { sales: { count: number; revenue: number }; redemptions: number };
    offerRedemptions: number;
    aov: number;
    customers: { total: number; repeat: number; repeatRate: number; active: number; new: number; returning: number; retentionRate: number };
    conversion: { rate: number; booking: number; quote: number };
    quotes: { received: number; replied: number };
    peakHours: number[];
    popularItems: { name: string; count: number }[];
    popularServices: { name: string; count: number }[];
  };
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

function PeakHours({ hours }: { hours: number[] }) {
  const max = Math.max(1, ...hours);
  const total = hours.reduce((s, h) => s + h, 0);
  const peak = hours.indexOf(Math.max(...hours));
  if (total === 0) return <p className="mt-3 text-sm text-muted">Not enough bookings or orders yet to show peak hours.</p>;
  return (
    <div className="mt-3">
      <div className="flex h-24 items-end gap-0.5">
        {hours.map((h, i) => <div key={i} className={`flex-1 rounded-t ${i === peak ? "bg-brand" : "bg-brand/40"}`} style={{ height: `${Math.max(2, (h / max) * 100)}%` }} title={`${i}:00 — ${h}`} />)}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>
      <p className="mt-2 text-sm text-muted">Busiest around <span className="font-semibold text-ink">{peak}:00–{(peak + 1) % 24}:00</span>.</p>
    </div>
  );
}

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
  const a = m?.advanced;
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

          {/* Business insights (sales, customers, conversion, peak hours, popular) */}
          {a && (
            <>
              <div>
                <h3 className="mb-3 font-display font-bold text-ink">📈 Business insights</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  <StatCard label="Gift card sales" value={currency(a.giftCards.sales.revenue)} hint={`${a.giftCards.sales.count} sold`} />
                  <StatCard label="Gift cards redeemed" value={a.giftCards.redemptions} />
                  <StatCard label="Offer redemptions" value={a.offerRedemptions} />
                  <StatCard label="Avg order value" value={currency(a.aov)} />
                  <StatCard label="Repeat customers" value={a.customers.repeat} hint={`${a.customers.repeatRate}% of all`} />
                  <StatCard label="Retention" value={`${a.customers.retentionRate}%`} hint={`${a.customers.returning} returning`} />
                  <StatCard label="New customers" value={a.customers.new} hint="this period" />
                  <StatCard label="Conversion rate" value={`${a.conversion.rate}%`} hint="actions per 100 views" />
                  <StatCard label="Booking conversion" value={`${a.conversion.booking}%`} hint="kept vs booked" />
                  <StatCard label="Quote conversion" value={`${a.conversion.quote}%`} hint={`${a.quotes.replied}/${a.quotes.received} replied`} />
                  <StatCard label="Active customers" value={a.customers.active} hint="this period" />
                  <StatCard label="Total customers" value={a.customers.total} hint="all-time" />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="card p-5">
                  <h3 className="font-display font-bold text-ink">⏰ Peak business hours</h3>
                  <PeakHours hours={a.peakHours} />
                </div>
                <div className="card p-5">
                  <h3 className="font-display font-bold text-ink">🔥 Most popular</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Products</p>
                      {a.popularItems.length ? (
                        <ul className="mt-1.5 space-y-1 text-sm">{a.popularItems.map((it) => <li key={it.name} className="flex justify-between gap-2"><span className="truncate text-ink">{it.name}</span><span className="shrink-0 text-muted">{it.count}</span></li>)}</ul>
                      ) : <p className="mt-1.5 text-sm text-muted">No orders yet.</p>}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Services</p>
                      {a.popularServices.length ? (
                        <ul className="mt-1.5 space-y-1 text-sm">{a.popularServices.map((s) => <li key={s.name} className="flex justify-between gap-2"><span className="truncate text-ink">{s.name}</span><span className="shrink-0 text-muted">{s.count}</span></li>)}</ul>
                      ) : <p className="mt-1.5 text-sm text-muted">No bookings yet.</p>}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

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
  const { data: categories } = useFetch<Category[]>("/api/categories");
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
        {[["Visits", String(data.visits)], ["Completed", String(data.completed)], ["No-shows", String(data.noShows)], ["Total spent", `$${Math.round(data.spendTotal ?? data.spent).toLocaleString()}`]].map(([l, v]) => (
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
      {!!data.orders?.length && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-ink">Orders</p>
          <ul className="mt-1 space-y-1 text-xs text-muted">
            {data.orders.slice(0, 8).map((o) => (
              <li key={o.number} className="flex justify-between"><span>{o.number} · {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ") || "Order"}</span><span>${Math.round(o.subtotal)} · {o.status.toLowerCase()}</span></li>
            ))}
          </ul>
        </div>
      )}
      {!!data.giftCards?.length && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-ink">Gift cards received</p>
          <ul className="mt-1 space-y-1 text-xs text-muted">
            {data.giftCards.slice(0, 8).map((g) => (
              <li key={g.code} className="flex justify-between"><span>{g.title || "Gift card"} · ${Math.round(g.value)}</span><span>{g.status.toLowerCase()}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---- Customers: the full customer book (CRM) ----
const CUST_TAG_BADGE: Record<string, string> = { VIP: "bg-amber-400/20 text-amber-600", REGULAR: "bg-emerald-500/15 text-emerald-600", FIRST_VISIT: "bg-blue-500/15 text-blue-600" };
function CustomersTab({ biz }: { biz: Business }) {
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const load = () => ownerApi.get<CustomerRow[]>(`/api/owner/businesses/${biz.id}/customers?q=${encodeURIComponent(q)}`).then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const totalSpend = (rows ?? []).reduce((s, r) => s + r.spend, 0);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-ink">Customers</h2>
          <p className="text-sm text-muted">Everyone who's ordered, booked or bought from you — with their history & notes.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / phone" className="input !py-2 text-sm" />
          <button className="btn btn-ghost px-3 py-2 text-sm">Search</button>
        </form>
      </div>

      {rows && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="card p-3"><p className="text-xs text-muted">Customers</p><p className="font-display text-xl font-extrabold text-ink">{rows.length}</p></div>
          <div className="card p-3"><p className="text-xs text-muted">Total spend</p><p className="font-display text-xl font-extrabold text-ink">${Math.round(totalSpend).toLocaleString()}</p></div>
          <div className="card p-3"><p className="text-xs text-muted">Repeat customers</p><p className="font-display text-xl font-extrabold text-ink">{rows.filter((r) => r.visits > 1).length}</p></div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {rows === null ? (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-14 animate-pulse" />)
        ) : rows.length === 0 ? (
          <div className="card p-12 text-center text-muted">No customers yet. They'll appear here after their first order or booking.</div>
        ) : (
          rows.map((r) => (
            <div key={r.phone} className="card p-0">
              <button onClick={() => setOpen(open === r.phone ? null : r.phone)} className="flex w-full items-center gap-3 p-3.5 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand-dark">{(r.name || r.phone).slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-semibold text-ink">{r.name || r.phone}{r.tag && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CUST_TAG_BADGE[r.tag] ?? "bg-surface-2 text-muted"}`}>{r.tag.replace("_", " ")}</span>}</p>
                  <p className="truncate text-xs text-muted">{r.phone} · {r.visits} visit{r.visits === 1 ? "" : "s"}{r.lastVisit ? ` · last ${timeAgo(r.lastVisit)}` : ""}</p>
                </div>
                <span className="shrink-0 text-right"><span className="block font-bold text-ink">${Math.round(r.spend).toLocaleString()}</span><span className="text-[10px] text-muted">spent</span></span>
              </button>
              {open === r.phone && <div className="px-3.5 pb-3.5"><CustomerPanel bizId={biz.id} phone={r.phone} /></div>}
            </div>
          ))
        )}
      </div>
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

// ---- Facilities (hourly rentals) ----
function FacilitiesTab({ biz }: { biz: Business }) {
  const [list, setList] = useState<Facility[] | null>(null);
  const [nf, setNf] = useState({ name: "", type: "", hourlyRate: 20, capacityNote: "" });
  const load = () => ownerApi.get<Facility[]>(`/api/owner/businesses/${biz.id}/facilities`).then(setList).catch(() => setList([]));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [biz.id]);
  async function add(e: FormEvent) {
    e.preventDefault(); if (!nf.name.trim()) return;
    await ownerApi.post(`/api/owner/businesses/${biz.id}/facilities`, nf);
    setNf({ name: "", type: "", hourlyRate: 20, capacityNote: "" }); load();
  }
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display font-bold text-ink">Facilities & courts</h3>
        <p className="text-sm text-muted">Add each rentable space (court, field, hall). Set hourly rate, peak/weekend pricing and hours per facility.</p>
      </div>
      {(list ?? []).map((f) => <FacilityRow key={f.id} facility={f} biz={biz} reload={load} />)}
      {list && list.length === 0 && <p className="text-sm text-muted">No facilities yet — add your first below.</p>}
      <form onSubmit={add} className="card grid gap-2 p-4 sm:grid-cols-[1fr_1fr_7rem_auto]">
        <input value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} placeholder="Name (e.g. Court 1)" className="input !py-2 text-sm" />
        <input value={nf.type} onChange={(e) => setNf({ ...nf, type: e.target.value })} placeholder="Type (e.g. Padel court)" className="input !py-2 text-sm" />
        <input type="number" min={0} value={nf.hourlyRate} onChange={(e) => setNf({ ...nf, hourlyRate: Number(e.target.value) })} placeholder="$/hr" className="input !py-2 text-sm" />
        <button className="btn btn-primary px-4 py-2 text-sm">Add facility</button>
      </form>
    </div>
  );
}

function FacilityRow({ facility, biz, reload }: { facility: Facility; biz: Business; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({ name: facility.name, type: facility.type, description: facility.description, hourlyRate: facility.hourlyRate, capacityNote: facility.capacityNote, image: facility.image });
  const p: any = facility.pricing ?? {};
  const [pr, setPr] = useState({ weekendRate: p.weekendRate ?? 0, peakRate: p.peakRate ?? 0, peakStart: p.peakStart ?? "17:00", peakEnd: p.peakEnd ?? "22:00", nightRate: p.nightRate ?? 0, nightStart: p.nightStart ?? "22:00", holidayRate: p.holidayRate ?? 0, minHours: p.minHours ?? 1, maxHours: p.maxHours ?? 3, slotIncrementMin: p.slotIncrementMin ?? 30 });
  const sc: any = (facility as any).schedule ?? {};
  const [blocked, setBlocked] = useState<string[]>(sc.blockedDates ?? []);
  const [maint, setMaint] = useState<{ from: string; to: string; reason?: string }[]>(sc.maintenance ?? []);
  const [newBlock, setNewBlock] = useState("");

  async function save() {
    setBusy(true);
    try {
      await ownerApi.patch(`/api/owner/facilities/${facility.id}`, { ...f, pricing: pr, schedule: { ...sc, blockedDates: blocked, maintenance: maint } });
      setSaved(true); setTimeout(() => setSaved(false), 2000); reload();
    } finally { setBusy(false); }
  }
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1 font-semibold text-ink">{facility.name} <span className="text-xs font-normal text-muted">· {facility.type || "Facility"} · ${facility.hourlyRate}/hr</span></span>
        <button onClick={() => setOpen((o) => !o)} className="chip !text-xs">{open ? "Close" : "Edit"}</button>
        <button onClick={async () => { await ownerApi.patch(`/api/owner/facilities/${facility.id}`, { isActive: !facility.isActive }); reload(); }} className={`chip !text-xs ${facility.isActive ? "chip-active" : ""}`}>{facility.isActive ? "Active" : "Hidden"}</button>
        <button onClick={async () => { await ownerApi.delete(`/api/owner/facilities/${facility.id}`); reload(); }} className="text-red-500"><TrashIcon className="h-4 w-4" /></button>
      </div>
      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <div><ImageField value={f.image} uploadWith={ownerApi} onChange={(image) => setF({ ...f, image })} aspect="aspect-video" label="photo" /></div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Name" className="input !py-2 text-sm" />
                <input value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} placeholder="Type" className="input !py-2 text-sm" />
                <input type="number" min={0} value={f.hourlyRate} onChange={(e) => setF({ ...f, hourlyRate: Number(e.target.value) })} placeholder="$/hr" className="input !py-2 text-sm" />
                <input value={f.capacityNote} onChange={(e) => setF({ ...f, capacityNote: e.target.value })} placeholder="Capacity (e.g. 4 players)" className="input !py-2 text-sm" />
              </div>
              <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} placeholder="Description" className="input !py-2 text-sm" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Pricing</p>
            <div className="mt-1 grid gap-2 sm:grid-cols-3 text-sm">
              <label className="text-muted">Weekend $/hr<input type="number" min={0} value={pr.weekendRate} onChange={(e) => setPr({ ...pr, weekendRate: Number(e.target.value) })} className="input !py-1.5" /></label>
              <label className="text-muted">Peak $/hr<input type="number" min={0} value={pr.peakRate} onChange={(e) => setPr({ ...pr, peakRate: Number(e.target.value) })} className="input !py-1.5" /></label>
              <label className="text-muted">Peak window<span className="flex gap-1"><input type="time" value={pr.peakStart} onChange={(e) => setPr({ ...pr, peakStart: e.target.value })} className="input !py-1.5" /><input type="time" value={pr.peakEnd} onChange={(e) => setPr({ ...pr, peakEnd: e.target.value })} className="input !py-1.5" /></span></label>
              <label className="text-muted">Night $/hr<input type="number" min={0} value={pr.nightRate} onChange={(e) => setPr({ ...pr, nightRate: Number(e.target.value) })} className="input !py-1.5" /></label>
              <label className="text-muted">Night starts<input type="time" value={pr.nightStart} onChange={(e) => setPr({ ...pr, nightStart: e.target.value })} className="input !py-1.5" /></label>
              <label className="text-muted">Holiday $/hr<input type="number" min={0} value={pr.holidayRate} onChange={(e) => setPr({ ...pr, holidayRate: Number(e.target.value) })} className="input !py-1.5" /></label>
              <label className="text-muted">Min hours<input type="number" min={0.5} step={0.5} value={pr.minHours} onChange={(e) => setPr({ ...pr, minHours: Number(e.target.value) })} className="input !py-1.5" /></label>
              <label className="text-muted">Max hours<input type="number" min={0.5} step={0.5} value={pr.maxHours} onChange={(e) => setPr({ ...pr, maxHours: Number(e.target.value) })} className="input !py-1.5" /></label>
              <label className="text-muted">Slot step (min)<input type="number" min={15} step={15} value={pr.slotIncrementMin} onChange={(e) => setPr({ ...pr, slotIncrementMin: Number(e.target.value) })} className="input !py-1.5" /></label>
            </div>
            <p className="mt-1 text-xs text-muted">Leave a rate at 0 to use the base hourly rate. Facilities use the business <span className="font-semibold">Hours</span> unless you add closures below.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Closed dates / maintenance</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {blocked.map((d) => <span key={d} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink">{d}<button onClick={() => setBlocked(blocked.filter((x) => x !== d))} className="text-red-500">✕</button></span>)}
            </div>
            <div className="mt-1.5 flex gap-2">
              <input type="date" value={newBlock} onChange={(e) => setNewBlock(e.target.value)} className="input !py-1.5 text-sm" />
              <button onClick={() => { if (newBlock && !blocked.includes(newBlock)) { setBlocked([...blocked, newBlock].sort()); setNewBlock(""); } }} className="btn btn-ghost px-3 py-1.5 text-sm">Block date</button>
            </div>
            <div className="mt-2 space-y-1.5">
              {maint.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="date" value={m.from} onChange={(e) => setMaint(maint.map((x, j) => j === i ? { ...x, from: e.target.value } : x))} className="input !py-1.5 text-sm" />
                  <span className="text-muted">→</span>
                  <input type="date" value={m.to} onChange={(e) => setMaint(maint.map((x, j) => j === i ? { ...x, to: e.target.value } : x))} className="input !py-1.5 text-sm" />
                  <input value={m.reason ?? ""} onChange={(e) => setMaint(maint.map((x, j) => j === i ? { ...x, reason: e.target.value } : x))} placeholder="reason" className="input !py-1.5 text-sm flex-1" />
                  <button onClick={() => setMaint(maint.filter((_, j) => j !== i))} className="text-red-500"><TrashIcon className="h-4 w-4" /></button>
                </div>
              ))}
              <button onClick={() => setMaint([...maint, { from: "", to: "", reason: "" }])} className="chip !text-xs">+ Maintenance period</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={busy} className="btn btn-primary px-5 py-2 text-sm disabled:opacity-60">{busy ? "Saving…" : "Save facility"}</button>
            {saved && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><CheckIcon className="h-4 w-4" /> Saved</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Field Bookings: stats + weekly calendar (drag-drop) + list ----
const FB_BADGE: Record<string, string> = { CONFIRMED: "bg-emerald-500/15 text-emerald-600", PENDING: "bg-amber-400/15 text-amber-600", CANCELLED: "bg-red-500/15 text-red-500", COMPLETED: "bg-brand-soft text-brand-dark", NO_SHOW: "bg-surface-2 text-muted" };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function FieldBookingsTab({ biz }: { biz: Business }) {
  const [facs, setFacs] = useState<Facility[]>([]);
  const [facId, setFacId] = useState<number | null>(null);
  const [bookings, setBookings] = useState<FacilityBooking[]>([]);
  const [stats, setStats] = useState<FacilityStats | null>(null);
  const [weekStart, setWeekStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; });
  const [drag, setDrag] = useState<number | null>(null);

  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const hoursRange = Array.from({ length: 16 }, (_, i) => 8 + i); // 08:00 → 23:00

  const loadFacs = () => ownerApi.get<Facility[]>(`/api/owner/businesses/${biz.id}/facilities`).then((l) => { setFacs(l); if (facId == null && l[0]) setFacId(l[0].id); }).catch(() => setFacs([]));
  const loadBookings = () => ownerApi.get<FacilityBooking[]>(`/api/owner/businesses/${biz.id}/facility-bookings?from=${ymd(week[0])}&to=${ymd(week[6])}`).then(setBookings).catch(() => setBookings([]));
  const loadStats = () => ownerApi.get<FacilityStats>(`/api/owner/businesses/${biz.id}/facility-stats?period=month`).then(setStats).catch(() => setStats(null));
  useEffect(() => { loadFacs(); loadStats(); /* eslint-disable-next-line */ }, [biz.id]);
  useEffect(() => { loadBookings(); /* eslint-disable-next-line */ }, [biz.id, weekStart]);

  async function move(id: number, date: string, startTime: string) {
    try { await ownerApi.patch(`/api/owner/facility-bookings/${id}`, { date, startTime }); loadBookings(); }
    catch (e) { window.alert(e instanceof Error ? e.message : "Couldn't move booking."); }
  }
  async function setStatus(id: number, status: string) { await ownerApi.patch(`/api/owner/facility-bookings/${id}`, { status }); loadBookings(); }

  if (facs.length === 0) {
    return <div className="card p-8 text-center"><p className="font-display font-bold text-ink">No facilities yet</p><p className="mt-1 text-muted">Add courts/fields in the <span className="font-semibold">Facilities</span> tab to start taking bookings.</p></div>;
  }

  const shown = bookings.filter((b) => (facId == null || b.facilityId === facId) && b.status !== "CANCELLED");
  const cur = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <section className="card p-5">
          <h3 className="font-display font-bold text-ink">This month</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[["Bookings", String(stats.totalBookings)], ["Hours booked", String(stats.bookedHours)], ["Revenue", cur(stats.revenue)], ["Occupancy", `${stats.occupancyPct}%`], ["Cancelled", String(stats.cancelled)], ["Busiest", stats.busiestFacility ? stats.busiestFacility.name : "—"]].map(([l, v]) => (
              <div key={l} className="rounded-xl surface-2 p-3"><p className="text-xs text-muted">{l}</p><p className="font-display text-lg font-extrabold text-ink">{v}</p></div>
            ))}
          </div>
        </section>
      )}

      {/* Calendar controls */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={facId ?? ""} onChange={(e) => setFacId(Number(e.target.value))} className="input !py-2 text-sm w-auto">
          {facs.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })} className="btn btn-ghost px-3 py-1.5 text-sm">‹ Prev</button>
          <span className="text-sm font-semibold text-ink">{week[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {week[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          <button onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })} className="btn btn-ghost px-3 py-1.5 text-sm">Next ›</button>
        </div>
      </div>

      {/* Weekly calendar grid (drag a booking to another cell to reschedule) */}
      <div className="card overflow-x-auto p-3">
        <div className="min-w-[700px]">
          <div className="grid" style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}>
            <div />
            {week.map((d) => <div key={d.toISOString()} className="px-1 pb-2 text-center text-xs font-semibold text-ink">{d.toLocaleDateString(undefined, { weekday: "short" })}<br /><span className="text-muted">{d.getDate()}</span></div>)}
            {hoursRange.map((h) => (
              <div key={h} className="contents">
                <div className="border-t border-border py-3 pr-1 text-right text-[10px] text-muted">{String(h).padStart(2, "0")}:00</div>
                {week.map((d) => {
                  const ds = ymd(d); const hh = `${String(h).padStart(2, "0")}:00`;
                  const cell = shown.filter((b) => b.date === ds && b.startTime.slice(0, 2) === String(h).padStart(2, "0"));
                  return (
                    <div key={ds + h} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag != null) { move(drag, ds, hh); setDrag(null); } }} className="min-h-[40px] border-t border-l border-border p-0.5">
                      {cell.map((b) => (
                        <div key={b.id} draggable onDragStart={() => setDrag(b.id)} title={`${b.facilityName} · ${b.customerName}`} className="mb-0.5 cursor-move rounded-md bg-brand/15 px-1.5 py-1 text-[10px] leading-tight text-brand-dark">
                          <span className="font-bold">{b.startTime}</span> {b.customerName.split(" ")[0]}<br /><span className="opacity-80">{b.facilityName}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">Drag a booking to another day/time to reschedule. Times snap to the hour.</p>
      </div>

      {/* Upcoming list */}
      <div>
        <h3 className="font-display font-bold text-ink">This week's bookings</h3>
        <div className="mt-2 space-y-2">
          {shown.length === 0 && <p className="text-sm text-muted">No bookings this week.</p>}
          {[...shown].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)).map((b) => (
            <div key={b.id} className="card flex flex-wrap items-center gap-2 p-3">
              <div className="flex-1">
                <p className="font-semibold text-ink">{b.facilityName} <span className="font-normal text-muted">· {b.date} {b.startTime} ({b.durationMin / 60}h)</span></p>
                <p className="text-sm text-muted">{b.customerName} · {b.customerPhone}{b.players ? ` · ${b.players} players` : ""} · {cur(b.price)}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${FB_BADGE[b.status]}`}>{b.status.replace("_", "-")}</span>
              {b.status === "CONFIRMED" && <button onClick={() => setStatus(b.id, "COMPLETED")} className="btn btn-ghost px-3 py-1.5 text-xs">Complete</button>}
              {b.status !== "CANCELLED" && b.status !== "COMPLETED" && <button onClick={() => setStatus(b.id, "CANCELLED")} className="btn btn-ghost px-3 py-1.5 text-xs text-red-500">Cancel</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Earnings / Wallet (business finance) ----
const TX_LABEL: Record<string, string> = { VOUCHER: "🎁 Gift voucher", FACILITY: "🏟️ Court booking", ORDER: "🛍️ Order", APPOINTMENT: "📅 Appointment", DELIVERY: "🚚 Delivery", ADJUSTMENT: "⚙️ Adjustment" };
const PAY_BADGE: Record<string, string> = { PAID: "bg-emerald-500/15 text-emerald-600", PENDING: "bg-amber-400/15 text-amber-600", UNPAID: "bg-amber-400/15 text-amber-600", PARTIALLY_REFUNDED: "bg-amber-400/15 text-amber-600", REFUNDED: "bg-red-500/15 text-red-500", FAILED: "bg-red-500/15 text-red-500", CANCELLED: "bg-surface-2 text-muted" };
const PO_BADGE: Record<string, string> = { PENDING: "bg-amber-400/15 text-amber-600", PAID: "bg-emerald-500/15 text-emerald-600", FAILED: "bg-red-500/15 text-red-500", CANCELLED: "bg-surface-2 text-muted" };
const cur2 = (n: number) => `$${(Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
function EarningsTab({ biz }: { biz: Business }) {
  const [data, setData] = useState<{ wallet: Wallet; commission: { rate: number; fixedFee: number; source: string }; transactions: Transaction[]; payouts: Payout[] } | null>(null);
  const load = () => ownerApi.get<{ wallet: Wallet; commission: { rate: number; fixedFee: number; source: string }; transactions: Transaction[]; payouts: Payout[] }>(`/api/owner/businesses/${biz.id}/wallet`).then(setData).catch(() => setData(null));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [biz.id]);
  async function refund(t: Transaction) {
    const def = (t.amount - t.refundedAmount).toFixed(2);
    const v = window.prompt(`Refund amount (max $${def}):`, def);
    if (v == null) return;
    if (!window.confirm("Record this refund? It cancels the item and logs the amount. (Money is returned once a payment gateway is connected.)")) return;
    try { await ownerApi.post(`/api/owner/transactions/${t.id}/refund`, { amount: Number(v) }); load(); }
    catch (e) { window.alert(e instanceof Error ? e.message : "Couldn't refund."); }
  }
  if (!data) return <div className="card h-72 animate-pulse" />;
  const w = data.wallet;
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-ink">💡 Demo mode — amounts are recorded for your books and payouts are tracked; real money moves once a payment gateway is connected.</div>

      {/* Wallet */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold text-ink">Wallet</h3>
          <button onClick={() => downloadCsv(`${biz.slug}-transactions.csv`, ["ID", "Date", "Source", "Reference", "Customer", "Gross", "Commission", "Net", "Payment", "Payout", "Refunded"], data.transactions.map((t) => [t.id, new Date(t.createdAt).toISOString().slice(0, 10), t.source, t.code, t.customerName, t.amount, t.commission, t.net, t.status, t.payoutStatus, t.refundedAmount]))} className="btn btn-ghost px-3 py-1.5 text-xs">⬇ Export CSV</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-brand-soft p-3"><p className="text-xs text-brand-dark">Available for payout</p><p className="font-display text-xl font-extrabold text-brand-dark">{cur2(w.availableBalance)}</p></div>
          <div className="rounded-xl surface-2 p-3"><p className="text-xs text-muted">Pending balance</p><p className="font-display text-xl font-extrabold text-ink">{cur2(w.pendingBalance)}</p></div>
          <div className="rounded-xl surface-2 p-3"><p className="text-xs text-muted">Outstanding (owed)</p><p className="font-display text-xl font-extrabold text-ink">{cur2(w.outstandingBalance)}</p></div>
          <div className="rounded-xl surface-2 p-3"><p className="text-xs text-muted">Paid out</p><p className="font-display text-xl font-extrabold text-ink">{cur2(w.paidOut)}</p></div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
          <div className="rounded-xl surface-2 p-3"><p className="text-xs text-muted">Total sales</p><p className="font-bold text-ink">{cur2(w.totalSales)}</p></div>
          <div className="rounded-xl surface-2 p-3"><p className="text-xs text-muted">Commission deducted</p><p className="font-bold text-ink">−{cur2(w.commission)}</p></div>
          <div className="rounded-xl surface-2 p-3"><p className="text-xs text-muted">Refunds</p><p className="font-bold text-ink">{cur2(w.refunds)}</p></div>
          <div className="rounded-xl surface-2 p-3"><p className="text-xs text-muted">Lifetime earnings</p><p className="font-bold text-ink">{cur2(w.lifetimeEarnings)}</p></div>
        </div>
        <p className="mt-2 text-xs text-muted">Your commission rate: <span className="font-semibold text-ink">{data.commission.rate}%</span>{data.commission.fixedFee ? ` + ${cur2(data.commission.fixedFee)}/transaction` : ""} ({data.commission.source}). Net = sales − commission.</p>
      </section>

      {/* Payout history */}
      <section className="card p-5">
        <h3 className="font-display font-bold text-ink">Payout history</h3>
        <div className="mt-2 space-y-2">
          {data.payouts.length === 0 && <p className="text-sm text-muted">No payouts yet. The platform pays out your available balance on a schedule.</p>}
          {data.payouts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5 text-sm">
              <span className="flex-1 text-ink"><span className="font-semibold">{cur2(p.net)}</span> <span className="text-muted">· {p.periodStart || "—"}{p.periodEnd ? ` → ${p.periodEnd}` : ""} · gross {cur2(p.grossSales)} − comm {cur2(p.commission)}</span></span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PO_BADGE[p.status]}`}>{p.status.toLowerCase()}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Transactions */}
      <section className="card p-5">
        <h3 className="font-display font-bold text-ink">Transactions</h3>
        <div className="mt-2 space-y-2">
          {data.transactions.length === 0 && <div className="p-6 text-center text-sm text-muted">No sales yet.</div>}
          {data.transactions.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{TX_LABEL[t.source] ?? t.source} · gross {cur2(t.amount)} · <span className="text-emerald-600">net {cur2(t.net)}</span>{t.commission ? <span className="text-muted"> (−{cur2(t.commission)} comm)</span> : null}{t.refundedAmount > 0 ? <span className="text-red-500"> · −{cur2(t.refundedAmount)} refunded</span> : null}</p>
                <p className="text-muted">{t.description} · {t.customerName || "—"} · {new Date(t.createdAt).toLocaleDateString()}{t.code ? ` · ${t.code}` : ""}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PAY_BADGE[t.status] ?? "bg-surface-2 text-muted"}`}>{t.status.replace("_", " ").toLowerCase()}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.payoutStatus === "PAID" ? "bg-emerald-500/15 text-emerald-600" : "bg-surface-2 text-muted"}`}>payout: {t.payoutStatus.toLowerCase()}</span>
              {t.status !== "REFUNDED" && t.status !== "CANCELLED" && t.amount > 0 && <button onClick={() => refund(t)} className="btn btn-ghost px-3 py-1.5 text-xs text-red-500">Refund</button>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---- Gift Vouchers ----
const V_BADGE: Record<string, string> = { ACTIVE: "bg-emerald-500/15 text-emerald-600", PENDING_DELIVERY: "bg-amber-400/15 text-amber-600", REDEEMED: "bg-surface-2 text-muted", EXPIRED: "bg-red-500/15 text-red-500", DISABLED: "bg-red-500/15 text-red-500" };
function VouchersTab({ biz }: { biz: Business }) {
  const [types, setTypes] = useState<VoucherType[] | null>(null);
  const [sold, setSold] = useState<Voucher[]>([]);
  const [stats, setStats] = useState<VoucherStats | null>(null);
  const [nf, setNf] = useState({ kind: "FIXED", name: "", value: 25, price: 0, expiryDays: 365, maxQuantity: 0, terms: "" });
  const loadTypes = () => ownerApi.get<VoucherType[]>(`/api/owner/businesses/${biz.id}/voucher-types`).then(setTypes).catch(() => setTypes([]));
  const loadSold = () => ownerApi.get<Voucher[]>(`/api/owner/businesses/${biz.id}/vouchers`).then(setSold).catch(() => setSold([]));
  const loadStats = () => ownerApi.get<VoucherStats>(`/api/owner/businesses/${biz.id}/voucher-stats`).then(setStats).catch(() => setStats(null));
  useEffect(() => { loadTypes(); loadSold(); loadStats(); /* eslint-disable-next-line */ }, [biz.id]);
  async function add(e: FormEvent) {
    e.preventDefault(); if (!nf.name.trim()) return;
    await ownerApi.post(`/api/owner/businesses/${biz.id}/voucher-types`, nf);
    setNf({ kind: "FIXED", name: "", value: 25, price: 0, expiryDays: 365, maxQuantity: 0, terms: "" });
    loadTypes();
  }
  const cur = (n: number) => `$${Math.round(n).toLocaleString()}`;
  return (
    <div className="space-y-5">
      {stats && (
        <section className="card p-5">
          <div className="flex items-center justify-between"><h3 className="font-display font-bold text-ink">Voucher performance</h3><Link to="/owner/redeem" className="btn btn-primary px-4 py-1.5 text-sm">🎟️ Redeem a voucher</Link></div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[["Sold", String(stats.sold)], ["Revenue", cur(stats.revenue)], ["Redeemed", String(stats.redeemed)], ["Redemption", `${stats.redemptionRate}%`], ["Avg value", cur(stats.avgValue)], ["Outstanding", cur(stats.outstandingLiability)]].map(([l, v]) => (
              <div key={l} className="rounded-xl surface-2 p-3"><p className="text-xs text-muted">{l}</p><p className="font-display text-lg font-extrabold text-ink">{v}</p></div>
            ))}
          </div>
          {stats.mostPopular && <p className="mt-2 text-sm text-muted">Most popular: <span className="font-semibold text-ink">{stats.mostPopular.name}</span> ({stats.mostPopular.count})</p>}
        </section>
      )}

      <section className="card p-5">
        <h3 className="font-display font-bold text-ink">Voucher products</h3>
        <p className="text-sm text-muted">Create gift cards (fixed value), product vouchers or service vouchers. Customers buy them from your page.</p>
        <div className="mt-3 space-y-2">
          {(types ?? []).map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5">
              <span className="flex-1 font-semibold text-ink">{t.name} <span className="text-xs font-normal text-muted">· {t.kind === "FIXED" ? (t.value > 0 ? `$${t.value} gift card` : "custom amount") : t.kind.toLowerCase()}{t.expiryDays ? ` · ${t.expiryDays}d` : ""} · sold {t.soldCount ?? 0}</span></span>
              <button onClick={async () => { await ownerApi.patch(`/api/owner/voucher-types/${t.id}`, { isFeatured: !t.isFeatured }); loadTypes(); }} className={`chip !text-xs ${t.isFeatured ? "chip-active" : ""}`}>{t.isFeatured ? "★ Featured" : "Feature"}</button>
              <button onClick={async () => { await ownerApi.patch(`/api/owner/voucher-types/${t.id}`, { status: t.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }); loadTypes(); }} className={`chip !text-xs ${t.status === "ACTIVE" ? "chip-active" : ""}`}>{t.status === "ACTIVE" ? "Active" : "Paused"}</button>
              <button onClick={async () => { if (confirm("Delete this voucher product?")) { await ownerApi.delete(`/api/owner/voucher-types/${t.id}`); loadTypes(); } }} className="text-red-500"><TrashIcon className="h-4 w-4" /></button>
            </div>
          ))}
          {types && types.length === 0 && <p className="text-sm text-muted">No voucher products yet.</p>}
        </div>
        <form onSubmit={add} className="mt-3 grid gap-2 sm:grid-cols-2">
          <select value={nf.kind} onChange={(e) => setNf({ ...nf, kind: e.target.value })} className="input !py-2 text-sm"><option value="FIXED">Fixed value (gift card)</option><option value="PRODUCT">Specific product</option><option value="SERVICE">Service</option></select>
          <input value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} placeholder={nf.kind === "FIXED" ? "Name (e.g. $25 Gift Card)" : "Name (e.g. Free Haircut)"} className="input !py-2 text-sm" />
          <label className="text-xs text-muted">Value $ <span className="font-normal">(0 = let buyer choose)</span><input type="number" min={0} value={nf.value} onChange={(e) => setNf({ ...nf, value: Number(e.target.value) })} className="input !py-2 text-sm" /></label>
          <label className="text-xs text-muted">Price $ <span className="font-normal">(0 = same as value)</span><input type="number" min={0} value={nf.price} onChange={(e) => setNf({ ...nf, price: Number(e.target.value) })} className="input !py-2 text-sm" /></label>
          <label className="text-xs text-muted">Expiry (days, 0 = none)<input type="number" min={0} value={nf.expiryDays} onChange={(e) => setNf({ ...nf, expiryDays: Number(e.target.value) })} className="input !py-2 text-sm" /></label>
          <label className="text-xs text-muted">Max quantity (0 = unlimited)<input type="number" min={0} value={nf.maxQuantity} onChange={(e) => setNf({ ...nf, maxQuantity: Number(e.target.value) })} className="input !py-2 text-sm" /></label>
          <input value={nf.terms} onChange={(e) => setNf({ ...nf, terms: e.target.value })} placeholder="Terms & conditions (optional)" className="input !py-2 text-sm sm:col-span-2" />
          <button className="btn btn-primary px-4 py-2 text-sm sm:col-span-2">Add voucher product</button>
        </form>
      </section>

      <section className="card p-5">
        <h3 className="font-display font-bold text-ink">Sold vouchers</h3>
        <div className="mt-3 space-y-2">
          {sold.length === 0 && <p className="text-sm text-muted">No vouchers sold yet.</p>}
          {sold.slice(0, 50).map((v) => (
            <div key={v.code} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5 text-sm">
              <span className="font-mono font-semibold text-ink">{v.code}</span>
              <span className="flex-1 text-muted">{v.title} · {v.recipientName || "—"}{v.kind === "FIXED" ? ` · ${cur(v.balance)}/${cur(v.value)}` : ""}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${V_BADGE[v.status] ?? "bg-surface-2 text-muted"}`}>{v.status.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---- Offers ----
const OFFER_TYPE_OPTIONS: { key: string; label: string }[] = [
  { key: "PERCENT", label: "Percentage discount" }, { key: "BOGO", label: "Buy One Get One" }, { key: "FREE_ITEM", label: "Free item" },
  { key: "HAPPY_HOUR", label: "Happy hour" }, { key: "PACKAGE", label: "Package deal" }, { key: "STUDENT", label: "Student discount" },
  { key: "BIRTHDAY", label: "Birthday offer" }, { key: "SEASONAL", label: "Seasonal offer" }, { key: "FIRST_VISIT", label: "First visit offer" }, { key: "LOYALTY", label: "Loyalty offer" },
];
const BLANK_OFFER = { title: "", description: "", type: "PERCENT", badge: "", terms: "", redeemInfo: "", endDate: "", maxRedemptions: 0, isFeatured: false, image: null as string | null };
// ---- Part Requests (spare-parts RFQ leads) ----
const LEAD_HEADLINE = ["partNeeded", "serviceNeeded", "item", "problem", "tireSize"];
function PartLead({ lead, bizId, onChanged }: { lead: OwnerPartLead; bizId: number; onChanged: () => void }) {
  const p = lead.payload;
  const headline = LEAD_HEADLINE.map((k) => p[k]).find(Boolean) || lead.categorySlug.replace(/-/g, " ");
  const details = Object.entries(p).filter(([k, v]) => v && !LEAD_HEADLINE.includes(k));
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState({ available: lead.myQuote?.available ?? true, price: String(lead.myQuote?.price ?? ""), eta: lead.myQuote?.eta ?? "", offersDelivery: lead.myQuote?.offersDelivery ?? false, note: lead.myQuote?.note ?? "" });
  const [busy, setBusy] = useState(false);
  const wa = lead.customerWhatsapp.replace(/[^\d]/g, "") || lead.customerPhone.replace(/[^\d]/g, "");
  async function reply(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await ownerApi.post(`/api/owner/part-requests/${lead.requestId}/quote`, { businessId: bizId, available: q.available, price: Number(q.price) || 0, eta: q.eta, offersDelivery: q.offersDelivery, note: q.note }); onChanged(); }
    finally { setBusy(false); }
  }
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-bold text-ink">{headline}</p>
          {!!details.length && <p className="text-sm text-muted">{details.map(([k, v]) => `${fieldLabel(lead.categorySlug, k)}: ${v}`).join(" · ")}</p>}
          <p className="text-xs text-muted">{lead.city || "—"} · {timeAgo(lead.createdAt)}</p>
          {lead.notes && <p className="mt-1 text-sm text-muted">"{lead.notes}"</p>}
          {!!lead.photos.length && <div className="mt-2 flex gap-2">{lead.photos.map((ph, i) => <img key={i} src={ph} alt="" className="h-14 w-14 rounded-lg object-cover" />)}</div>}
        </div>
        <div className="shrink-0 text-right">
          {lead.myQuote ? <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${lead.myQuote.status === "ACCEPTED" ? "bg-emerald-500/15 text-emerald-600" : lead.myQuote.status === "DECLINED" ? "bg-red-500/15 text-red-500" : "bg-sky-500/15 text-sky-600"}`}>{lead.myQuote.status === "ACCEPTED" ? "✓ You won this!" : lead.myQuote.status === "DECLINED" ? "Not selected" : "Replied"}</span>
                        : <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-600">New lead</span>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={`tel:${lead.customerPhone}`} className="btn btn-ghost px-3 py-1.5 text-xs">📞 {lead.customerName}</a>
        {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn bg-emerald-500 px-3 py-1.5 text-xs text-white">WhatsApp</a>}
        {lead.myQuote?.status !== "ACCEPTED" && <button onClick={() => setOpen((o) => !o)} className="btn btn-primary px-3 py-1.5 text-xs">{lead.myQuote ? "Update reply" : "Reply with quote"}</button>}
        {!lead.myQuote && <button onClick={async () => { await ownerApi.patch(`/api/owner/part-targets/${lead.targetId}`, { status: "DECLINED" }); onChanged(); }} className="btn btn-ghost px-3 py-1.5 text-xs text-muted">Skip</button>}
      </div>
      {open && (
        <form onSubmit={reply} className="mt-3 space-y-2 rounded-xl surface-2 p-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setQ({ ...q, available: true })} className={`chip ${q.available ? "chip-active" : ""}`}>✓ Available</button>
            <button type="button" onClick={() => setQ({ ...q, available: false })} className={`chip ${!q.available ? "chip-active" : ""}`}>✗ Not available</button>
            <button type="button" onClick={() => setQ({ ...q, offersDelivery: !q.offersDelivery })} className={`chip ${q.offersDelivery ? "chip-active" : ""}`}>🛵 I can deliver</button>
          </div>
          {q.available && (
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min={0} value={q.price} onChange={(e) => setQ({ ...q, price: e.target.value })} placeholder="Your price ($)" className="input !py-1.5 text-sm" />
              <input value={q.eta} onChange={(e) => setQ({ ...q, eta: e.target.value })} placeholder="Completion time (e.g. 2 days)" className="input !py-1.5 text-sm" />
            </div>
          )}
          <textarea value={q.note} onChange={(e) => setQ({ ...q, note: e.target.value })} rows={2} placeholder="Note to customer (condition, warranty, timing…)" className="input !py-1.5 text-sm" />
          <button disabled={busy} className="btn btn-primary w-full py-2 text-sm disabled:opacity-60">{busy ? "Sending…" : "Send reply to customer"}</button>
        </form>
      )}
    </div>
  );
}

function PartRequestsTab({ biz }: { biz: Business }) {
  const [leads, setLeads] = useState<OwnerPartLead[] | null>(null);
  const [q, setQ] = useState("");
  const load = () => ownerApi.get<OwnerPartLead[]>(`/api/owner/businesses/${biz.id}/part-requests`).then(setLeads);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [biz.id]);
  const shown = (leads ?? []).filter((l) => { const ql = q.trim().toLowerCase(); return !ql || `${Object.values(l.payload).join(" ")} ${l.categorySlug}`.toLowerCase().includes(ql); });
  const newCount = (leads ?? []).filter((l) => !l.myQuote && l.targetStatus !== "DECLINED").length;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-ink">Requests <span className="text-muted">· {newCount} new</span></h3>
          <p className="text-sm text-muted">Customer requests sent to your business. Reply fast with price, timing &amp; availability to win the job.</p>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search requests…" className="input max-w-xs" />
      </div>
      {leads && shown.length === 0 && <div className="card mt-4 p-10 text-center text-muted">No requests yet. New leads show up here automatically.</div>}
      <div className="mt-4 space-y-3">
        {shown.map((l) => <PartLead key={l.targetId} lead={l} bizId={biz.id} onChanged={load} />)}
      </div>
    </div>
  );
}

function OffersTab({ biz }: { biz: Business }) {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [form, setForm] = useState({ ...BLANK_OFFER });
  const reload = () => ownerApi.get<Offer[]>(`/api/owner/businesses/${biz.id}/offers`).then(setOffers);
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [biz.id]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await ownerApi.post(`/api/owner/businesses/${biz.id}/offers`, form);
    setForm({ ...BLANK_OFFER });
    reload();
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <form onSubmit={add} className="card h-fit space-y-3 p-5">
        <h3 className="font-display font-bold text-ink">New offer</h3>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title (e.g. 50% off all pizzas)" className="input" />
        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" className="input" />
        <label className="block text-xs font-semibold text-muted">Offer type
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input mt-1">{OFFER_TYPE_OPTIONS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select>
        </label>
        <input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder='Badge — big label e.g. "50% OFF" (optional)' className="input" />
        <label className="block text-xs font-semibold text-muted">Ends on (optional)
          <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="input mt-1" />
        </label>
        <input type="number" min={0} value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: Number(e.target.value) })} placeholder="Max claims (0 = unlimited)" className="input" />
        <textarea rows={2} value={form.redeemInfo} onChange={(e) => setForm({ ...form, redeemInfo: e.target.value })} placeholder="How to redeem (shown to customer)" className="input" />
        <textarea rows={2} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} placeholder="Terms & conditions" className="input" />
        <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Feature this deal</label>
        <ImageField value={form.image} onChange={(image) => setForm({ ...form, image })} label="offer image" />
        <button className="btn btn-primary w-full py-2.5">Add offer</button>
      </form>
      <div className="space-y-3">
        <Link to="/owner/redeem-offer" className="flex items-center justify-between rounded-xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-dark hover:bg-brand-soft/70">🎟️ Redeem a customer's offer code →</Link>
        {offers?.length === 0 && <div className="card p-8 text-center text-muted">No offers yet.</div>}
        {(offers ?? []).map((o) => (
          <div key={o.id} className="card flex items-center gap-4 p-4">
            {o.image && <img src={o.image} alt="" className="h-16 w-16 rounded-lg object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{o.title} <span className="chip !py-0 !text-[10px]">{(o.badge || o.type).replace(/_/g, " ")}</span>{o.isFeatured && <span className="ml-1 chip !py-0 !text-[10px] chip-active">Featured</span>}</p>
              <p className="line-clamp-1 text-sm text-muted">{o.description}</p>
              <p className="mt-0.5 text-xs text-muted">{o.redeemedCount ?? 0} claimed{o.endDate ? ` · ends ${new Date(o.endDate).toLocaleDateString()}` : ""}</p>
            </div>
            <button onClick={async () => { await ownerApi.delete(`/api/owner/offers/${o.id}`); reload(); }} className="btn btn-ghost px-3 py-2 text-sm text-red-500">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Events ----
const TICKET_KINDS = ["GENERAL", "VIP", "EARLY_BIRD", "STUDENT", "FAMILY"];
const BLANK_EVENT = { title: "", description: "", category: "festivals", location: "", lat: null as number | null, lng: null as number | null, startTime: "", endTime: "", capacity: 0, isFeatured: false, image: null as string | null };

function EventTicketsManager({ eventId }: { eventId: number }) {
  const [tickets, setTickets] = useState<{ id: number; name: string; kind: string; price: number; quantity: number; soldCount: number }[]>([]);
  const [f, setF] = useState({ name: "", kind: "GENERAL", price: 0, quantity: 0, description: "" });
  const load = () => ownerApi.get<typeof tickets>(`/api/owner/events/${eventId}/tickets`).then(setTickets);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [eventId]);
  async function add(e: FormEvent) { e.preventDefault(); if (!f.name.trim()) return; await ownerApi.post(`/api/owner/events/${eventId}/tickets`, f); setF({ name: "", kind: "GENERAL", price: 0, quantity: 0, description: "" }); load(); }
  return (
    <div className="mt-3 rounded-xl surface-2 p-3">
      <p className="text-sm font-bold text-ink">Ticket types <span className="font-normal text-muted">(none = free RSVP event)</span></p>
      <div className="mt-2 space-y-1.5">
        {tickets.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
            <span className="text-ink">{t.name} <span className="text-muted">· {t.kind} · {t.price ? `$${t.price}` : "Free"}{t.quantity ? ` · ${t.soldCount}/${t.quantity} sold` : ` · ${t.soldCount} sold`}</span></span>
            <button onClick={async () => { await ownerApi.delete(`/api/owner/event-tickets/${t.id}`); load(); }} className="text-xs font-semibold text-red-500">Remove</button>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="mt-2 grid grid-cols-2 gap-2">
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Name (e.g. VIP)" className="input !py-1.5 text-sm" />
        <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className="input !py-1.5 text-sm">{TICKET_KINDS.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}</select>
        <input type="number" min={0} value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} placeholder="Price (0 = free)" className="input !py-1.5 text-sm" />
        <input type="number" min={0} value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} placeholder="Qty (0 = ∞)" className="input !py-1.5 text-sm" />
        <button className="btn btn-ghost col-span-2 py-1.5 text-sm">+ Add ticket type</button>
      </form>
    </div>
  );
}

function EventBookingsView({ eventId }: { eventId: number }) {
  const [data, setData] = useState<{ bookings: { id: number; customerName: string; quantity: number; amount: number; method: string; status: string; code: string; ticketType?: { name: string } | null }[]; summary: { bookings: number; attendees: number; checkedIn: number; revenue: number } } | null>(null);
  const load = () => ownerApi.get<NonNullable<typeof data>>(`/api/owner/events/${eventId}/bookings`).then(setData);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [eventId]);
  if (!data) return <p className="mt-3 text-sm text-muted">Loading bookings…</p>;
  const act = async (id: number, action: string) => { await ownerApi.patch(`/api/owner/event-bookings/${id}`, { action }); load(); };
  return (
    <div className="mt-3 rounded-xl surface-2 p-3">
      <div className="grid grid-cols-4 gap-2 text-center">
        {[["Bookings", data.summary.bookings], ["Attendees", data.summary.attendees], ["Checked in", data.summary.checkedIn], ["Revenue", `$${data.summary.revenue}`]].map(([l, v]) => (
          <div key={l as string} className="rounded-lg bg-surface p-2"><p className="font-display text-lg font-extrabold text-ink">{v}</p><p className="text-[10px] uppercase text-muted">{l}</p></div>
        ))}
      </div>
      <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
        {data.bookings.length === 0 && <p className="py-3 text-center text-sm text-muted">No bookings yet.</p>}
        {data.bookings.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
            <span className="min-w-0"><span className="font-semibold text-ink">{b.customerName || "Guest"}</span> <span className="text-muted">· {b.quantity}× {b.ticketType?.name ?? "spot"} · {b.code}</span></span>
            <span className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${b.status === "CHECKED_IN" ? "bg-brand-soft text-brand-dark" : b.status === "CANCELLED" ? "bg-red-500/15 text-red-500" : "bg-emerald-500/15 text-emerald-600"}`}>{b.status.replace("_", " ")}</span>
              {b.status === "CONFIRMED" && <button onClick={() => act(b.id, "checkin")} className="text-xs font-semibold text-brand">Check in</button>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventsTab({ biz }: { biz: Business }) {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [form, setForm] = useState({ ...BLANK_EVENT });
  const [open, setOpen] = useState<{ id: number; view: "tickets" | "bookings" } | null>(null);
  const reload = () => ownerApi.get<EventItem[]>(`/api/owner/businesses/${biz.id}/events`).then(setEvents);
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [biz.id]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.startTime) return;
    await ownerApi.post(`/api/owner/businesses/${biz.id}/events`, form);
    setForm({ ...BLANK_EVENT });
    reload();
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <form onSubmit={add} className="card h-fit space-y-3 p-5">
        <h3 className="font-display font-bold text-ink">New event</h3>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" className="input" />
        <label className="block text-xs font-semibold text-muted">Category
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input mt-1">{EVENT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}</select>
        </label>
        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details" className="input" />
        <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Venue / location" className="input" />
        <MapPicker lat={form.lat} lng={form.lng} onChange={({ lat, lng }) => setForm({ ...form, lat, lng })} />
        <label className="block text-xs font-semibold text-muted">Starts<input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="input mt-1" /></label>
        <label className="block text-xs font-semibold text-muted">Ends (optional)<input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="input mt-1" /></label>
        <input type="number" min={0} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} placeholder="Capacity (0 = unlimited)" className="input" />
        <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Feature this event</label>
        <ImageField value={form.image} onChange={(image) => setForm({ ...form, image })} label="event poster" />
        <button className="btn btn-primary w-full py-2.5">Add event</button>
        <p className="text-xs text-muted">After creating, add ticket types (VIP, early bird, etc.) below — or leave none for a free RSVP event.</p>
      </form>
      <div className="space-y-3">
        {events?.length === 0 && <div className="card p-8 text-center text-muted">No events yet.</div>}
        {(events ?? []).map((ev) => (
          <div key={ev.id} className="card p-4">
            <div className="flex items-center gap-4">
              {ev.image && <img src={ev.image} alt="" className="h-16 w-16 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{ev.title} <span className="chip !py-0 !text-[10px]">{ev.categoryLabel ?? ev.category}</span>{ev.isFeatured && <span className="ml-1 chip !py-0 !text-[10px] chip-active">Featured</span>}</p>
                <p className="text-sm text-muted">{formatEventDate(ev.startTime)} · {ev.location}</p>
                <p className="text-xs text-muted">{ev.attending ?? 0} going · {ev.interested ?? 0} interested · {ev.viewCount ?? 0} views</p>
              </div>
              <button onClick={async () => { await ownerApi.delete(`/api/owner/events/${ev.id}`); reload(); }} className="btn btn-ghost px-3 py-2 text-sm text-red-500">Delete</button>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => setOpen(open?.id === ev.id && open.view === "tickets" ? null : { id: ev.id, view: "tickets" })} className={`chip ${open?.id === ev.id && open.view === "tickets" ? "chip-active" : ""}`}>🎟️ Tickets</button>
              <button onClick={() => setOpen(open?.id === ev.id && open.view === "bookings" ? null : { id: ev.id, view: "bookings" })} className={`chip ${open?.id === ev.id && open.view === "bookings" ? "chip-active" : ""}`}>📋 Bookings & revenue</button>
            </div>
            {open?.id === ev.id && open.view === "tickets" && <EventTicketsManager eventId={ev.id} />}
            {open?.id === ev.id && open.view === "bookings" && <EventBookingsView eventId={ev.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Reviews ----
// ---- Marketing hub: one launchpad for offers, events, gift cards & announcements ----
interface MarketingSummary { offers: { active: number; total: number }; events: { active: number; total: number }; giftCards: { active: number; total: number }; announcements: { active: number; total: number } }

function AnnouncementForm({ bizId, initial, onClose, onSaved }: { bizId: number; initial: BusinessAnnouncement | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: initial?.title ?? "", body: initial?.body ?? "", image: initial?.image ?? "", pinned: initial?.pinned ?? false, isActive: initial?.isActive ?? true, startsAt: initial?.startsAt?.slice(0, 10) ?? "", endsAt: initial?.endsAt?.slice(0, 10) ?? "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function save() {
    if (!f.title.trim()) return setErr("A title is required.");
    setBusy(true); setErr("");
    const body = { ...f, image: f.image || null, startsAt: f.startsAt || null, endsAt: f.endsAt || null };
    try {
      if (initial) await ownerApi.patch(`/api/owner/announcements/${initial.id}`, body);
      else await ownerApi.post(`/api/owner/businesses/${bizId}/announcements`, body);
      onSaved();
    } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't save."); setBusy(false); }
  }
  return (
    <div className="card border border-brand/30 p-4">
      <div className="flex items-center justify-between">
        <p className="font-display font-bold text-ink">{initial ? "Edit announcement" : "New announcement"}</p>
        <button onClick={onClose} className="text-sm text-muted hover:text-ink">Cancel</button>
      </div>
      <div className="mt-3 space-y-3">
        <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title — e.g. Open late this weekend 🎉" className="input" />
        <textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={3} placeholder="Details (optional)" className="input" />
        <div className="max-w-xs"><ImageField value={f.image} uploadWith={ownerApi} onChange={(image) => setF({ ...f, image: image ?? "" })} label="banner" /></div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold text-ink">Show from <input type="date" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} className="input mt-1" /></label>
          <label className="text-sm font-semibold text-ink">Until <input type="date" value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} className="input mt-1" /></label>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} /> 📌 Pin to top</label>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Live</label>
        </div>
        {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{err}</p>}
        <button onClick={save} disabled={busy} className="btn btn-primary w-full py-2.5 disabled:opacity-60">{busy ? "Saving…" : "Save announcement"}</button>
      </div>
    </div>
  );
}

function MarketingTab({ biz, onGo }: { biz: Business; onGo: (tab: string) => void }) {
  const { data: sum } = useFetch<MarketingSummary>(`/api/owner/businesses/${biz.id}/marketing`);
  const [anns, setAnns] = useState<BusinessAnnouncement[] | null>(null);
  const [editing, setEditing] = useState<BusinessAnnouncement | null | undefined>(undefined);
  const reload = () => ownerApi.get<BusinessAnnouncement[]>(`/api/owner/businesses/${biz.id}/announcements`).then(setAnns);
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [biz.id]);

  const cards = [
    { emoji: "🏷️", label: "Offers & deals", tab: "Offers", s: sum?.offers, cta: "Create a deal" },
    { emoji: "🎟️", label: "Events", tab: "Events", s: sum?.events, cta: "Host an event" },
    { emoji: "🎁", label: "Gift cards", tab: "Gift Vouchers", s: sum?.giftCards, cta: "Sell gift cards" },
  ];

  async function toggle(a: BusinessAnnouncement, patch: Partial<BusinessAnnouncement>) { await ownerApi.patch(`/api/owner/announcements/${a.id}`, patch); reload(); }
  async function del(a: BusinessAnnouncement) { if (!confirm(`Delete "${a.title}"?`)) return; await ownerApi.delete(`/api/owner/announcements/${a.id}`); reload(); }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-ink">Marketing</h2>
        <p className="text-sm text-muted">Create and manage everything that brings customers in — from one place.</p>
      </div>

      {/* Launchpad */}
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card flex flex-col p-4">
            <div className="flex items-center gap-2"><span className="text-2xl">{c.emoji}</span><p className="font-display font-bold text-ink">{c.label}</p></div>
            <p className="mt-1 text-sm text-muted">{c.s ? `${c.s.active} active · ${c.s.total} total` : "—"}</p>
            <button onClick={() => onGo(c.tab)} className="btn btn-primary mt-3 py-2 text-sm">{c.cta}</button>
          </div>
        ))}
      </div>

      {/* Announcements */}
      <div>
        <div className="flex items-center justify-between">
          <div><h3 className="font-display font-bold text-ink">📣 Announcements</h3><p className="text-sm text-muted">Posts shown on your public page — new menu, holiday hours, a flash promo.</p></div>
          {editing === undefined && <button onClick={() => setEditing(null)} className="btn btn-primary px-4 py-2 text-sm">+ New</button>}
        </div>

        {editing !== undefined && <div className="mt-3"><AnnouncementForm bizId={biz.id} initial={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); reload(); }} /></div>}

        <div className="mt-3 space-y-2">
          {anns === null ? (
            Array.from({ length: 2 }).map((_, i) => <div key={i} className="card h-16 animate-pulse" />)
          ) : anns.length === 0 ? (
            <div className="card p-8 text-center text-muted">No announcements yet. Post one to keep customers in the loop.</div>
          ) : (
            anns.map((a) => (
              <div key={a.id} className="card flex items-center gap-3 p-3">
                {a.image && <img src={a.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-semibold text-ink">{a.title}
                    {a.pinned && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-dark">📌 Pinned</span>}
                    {!a.isActive && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-muted">Hidden</span>}
                  </p>
                  {a.body && <p className="truncate text-xs text-muted">{a.body}</p>}
                </div>
                <div className="flex shrink-0 gap-2 text-xs font-semibold">
                  <button onClick={() => toggle(a, { pinned: !a.pinned })} className="text-muted hover:text-ink">{a.pinned ? "Unpin" : "Pin"}</button>
                  <button onClick={() => toggle(a, { isActive: !a.isActive })} className="text-muted hover:text-ink">{a.isActive ? "Hide" : "Show"}</button>
                  <button onClick={() => setEditing(a)} className="text-brand">Edit</button>
                  <button onClick={() => del(a)} className="text-red-500">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Customer engagement: notify an audience segment ----
interface SegCounts { all: number; followers: number; customers: number; giftcards: number; events: number }
const SEG_OPTS: { key: keyof SegCounts; label: string; emoji: string; hint: string }[] = [
  { key: "all", label: "Everyone reached", emoji: "🌍", hint: "Everyone who follows or has used your business" },
  { key: "followers", label: "Followers", emoji: "❤️", hint: "Customers who saved your page" },
  { key: "customers", label: "Past customers", emoji: "🧾", hint: "Ordered or booked before" },
  { key: "giftcards", label: "Gift card holders", emoji: "🎁", hint: "Bought a gift card" },
  { key: "events", label: "Event attendees", emoji: "🎟️", hint: "Registered for an event" },
];

function EngageTab({ biz }: { biz: Business }) {
  const { data: counts } = useFetch<SegCounts>(`/api/owner/businesses/${biz.id}/engage`);
  const [segment, setSegment] = useState<keyof SegCounts>("all");
  const [form, setForm] = useState({ title: "", body: "", link: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const audience = counts ? counts[segment] : 0;

  async function send() {
    if (!form.title.trim()) return setErr("Add a message title.");
    setBusy(true); setErr(""); setSent(null);
    try {
      const r = await ownerApi.post<{ sent: number }>(`/api/owner/businesses/${biz.id}/engage`, { segment, ...form });
      setSent(r.sent); setForm({ title: "", body: "", link: "" });
    } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't send."); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-ink">Engage customers</h2>
        <p className="text-sm text-muted">Send a notification to bring customers back — a new offer, an event reminder, or a thank-you.</p>
      </div>

      {sent !== null && (
        <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 p-4">
          <p className="text-sm font-semibold text-emerald-600">{sent > 0 ? `✅ Sent to ${sent} customer${sent === 1 ? "" : "s"}.` : "No customers in that audience yet — grow it first."}</p>
          <button onClick={() => setSent(null)} className="text-xs font-semibold text-muted hover:text-ink">Dismiss</button>
        </div>
      )}

      {/* Audience */}
      <div>
        <p className="text-sm font-semibold text-ink">Who should get this?</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SEG_OPTS.map((s) => (
            <button key={s.key} onClick={() => setSegment(s.key)} className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${segment === s.key ? "border-brand bg-brand-soft/50" : "border-border hover:border-brand/50"}`}>
              <span className="text-xl">{s.emoji}</span>
              <span className="min-w-0 flex-1"><span className="block font-semibold text-ink">{s.label}</span><span className="block truncate text-xs text-muted">{s.hint}</span></span>
              <span className="shrink-0 font-display font-extrabold text-ink">{counts ? counts[s.key] : "—"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Compose */}
      <div className="card space-y-3 p-5">
        <p className="font-display font-bold text-ink">Your message</p>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title — e.g. 20% off this weekend only! 🎉" className="input" />
        <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} placeholder="Message (optional)" className="input" />
        <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder={`Link (optional) — e.g. /business/${biz.slug}`} className="input" />
        {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{err}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">Sending to <span className="font-bold text-ink">{audience}</span> customer{audience === 1 ? "" : "s"}</p>
          <button onClick={send} disabled={busy || !audience} className="btn btn-primary px-6 py-2.5 disabled:opacity-50">{busy ? "Sending…" : "Send notification"}</button>
        </div>
      </div>
      <p className="text-center text-xs text-muted">📣 Notifications appear in each customer's in-app bell. Email & SMS delivery can be added later.</p>
    </div>
  );
}

function ReviewsTab({ biz }: { biz: Business }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const reload = () => ownerApi.get<Review[]>(`/api/owner/businesses/${biz.id}/reviews`).then(setReviews);
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [biz.id]);

  const approved = (reviews ?? []).filter((r) => (r.status ?? "APPROVED") === "APPROVED");
  const total = approved.length;
  const avg = total ? approved.reduce((s, r) => s + r.rating, 0) / total : 0;
  const max = Math.max(1, ...[5, 4, 3, 2, 1].map((st) => approved.filter((r) => r.rating === st).length));
  const now = Date.now();
  const days = (r: Review) => (now - new Date(r.createdAt).getTime()) / 86400000;
  const in30 = approved.filter((r) => days(r) < 30);
  const prev30 = approved.filter((r) => days(r) >= 30 && days(r) < 60);
  const avg30 = in30.length ? in30.reduce((s, r) => s + r.rating, 0) / in30.length : 0;
  const replied = approved.filter((r) => r.reply).length;
  const trendUp = in30.length - prev30.length;

  return (
    <div className="space-y-4">
      {reviews && total > 0 && (
        <div className="card p-5">
          <h3 className="font-display font-bold text-ink">📊 Reputation at a glance</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-[auto_1fr]">
            <div className="text-center">
              <p className="font-display text-4xl font-extrabold text-ink">{avg.toFixed(1)}</p>
              <Stars rating={Math.round(avg)} className="mx-auto mt-1 h-4 w-4" />
              <p className="mt-1 text-xs text-muted">{total} review{total === 1 ? "" : "s"}</p>
            </div>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = approved.filter((r) => r.rating === star).length;
                return (
                  <div key={star} className="flex items-center gap-2 text-sm">
                    <span className="inline-flex w-8 items-center gap-0.5 text-muted">{star}<StarIcon className="h-3 w-3 text-amber-400" /></span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full surface-2"><div className="h-full rounded-full bg-amber-400" style={{ width: `${(count / max) * 100}%` }} /></div>
                    <span className="w-6 text-right text-muted">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3 text-center">
            <div><p className="font-display text-lg font-extrabold text-ink">{in30.length}</p><p className="text-xs text-muted">new · 30d {trendUp !== 0 && <span className={trendUp > 0 ? "text-emerald-600" : "text-red-500"}>{trendUp > 0 ? "▲" : "▼"}{Math.abs(trendUp)}</span>}</p></div>
            <div><p className="font-display text-lg font-extrabold text-ink">{avg30 ? avg30.toFixed(1) : "—"}</p><p className="text-xs text-muted">avg · 30d</p></div>
            <div><p className="font-display text-lg font-extrabold text-ink">{total ? Math.round((replied / total) * 100) : 0}%</p><p className="text-xs text-muted">replied</p></div>
          </div>
        </div>
      )}
      {reviews?.length === 0 && <div className="card p-8 text-center text-muted">No reviews yet.</div>}
      {(reviews ?? []).map((r) => <ReviewRow key={r.id} review={r} businessName={biz.name} onChanged={reload} />)}
    </div>
  );
}

function ReviewRow({ review, businessName, onChanged }: { review: Review; businessName: string; onChanged: () => void }) {
  const [reply, setReply] = useState(review.reply ?? "");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const status = review.status;

  async function feature() { setBusy(true); await ownerApi.post(`/api/owner/reviews/${review.id}/feature`, { featured: !review.featured }).finally(() => setBusy(false)); onChanged(); }
  async function report() {
    const reason = window.prompt("Report this review as inappropriate? Add a reason (optional):", "");
    if (reason === null) return;
    setBusy(true); await ownerApi.post(`/api/owner/reviews/${review.id}/report`, { reason }).finally(() => setBusy(false)); onChanged();
  }

  return (
    <div className={`card p-5 ${review.featured ? "ring-1 ring-amber-400/50" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold text-ink">{review.authorName}
          {review.featured && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-600">★ Featured</span>}
          {review.reported && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-500">Reported</span>}
        </span>
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
          <button onClick={async () => { await ownerApi.post(`/api/owner/reviews/${review.id}/reply`, { reply }); setOpen(false); onChanged(); }} className="btn btn-primary shrink-0 px-4 py-2 text-sm">Reply</button>
        </div>
      )}
      <div className="mt-3 flex gap-3 border-t border-border pt-3 text-xs font-semibold">
        <button onClick={feature} disabled={busy} className={review.featured ? "text-amber-600" : "text-muted hover:text-ink"}>{review.featured ? "★ Featured" : "☆ Feature"}</button>
        {!review.reported && <button onClick={report} disabled={busy} className="text-muted hover:text-red-500">🚩 Report</button>}
      </div>
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
