import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BuyVoucherModal } from "../components/BuyVoucherModal";
import { GiftCard, giftHeadline, validityLabel } from "../components/GiftCard";
import { HeartIcon, MapPinIcon, ShareIcon, StarIcon } from "../components/icons";
import { useUserAuth } from "../context/UserAuthContext";
import { userApi } from "../lib/api";
import { useFetch } from "../lib/useFetch";
import type { Business, GiftCardDetailT } from "../types";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

export function GiftCardDetail() {
  const { id } = useParams();
  const { data: g, loading } = useFetch<GiftCardDetailT>(id ? `/api/vouchers/card/${id}` : null);
  const { user, openAuth } = useUserAuth();
  const [saved, setSaved] = useState(false);
  const [synced, setSynced] = useState(false);
  const [buy, setBuy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (g && !synced) { setSaved(!!g.saved); setSynced(true); }
  if (loading) return <div className="mx-auto max-w-4xl px-4 py-16 text-muted">Loading…</div>;
  if (!g) return <div className="mx-auto max-w-md px-4 py-24 text-center"><p className="text-lg font-semibold text-ink">Gift card not found.</p><Link to="/gift-cards" className="btn btn-primary mt-4 px-6 py-2.5">All gift cards</Link></div>;

  const b = g.business;
  async function toggleSave() {
    if (!user) return openAuth();
    const next = !saved; setSaved(next);
    try { next ? await userApi.post(`/api/me/gift-cards/${g!.id}/save`, {}) : await userApi.delete(`/api/me/gift-cards/${g!.id}/save`); } catch { setSaved(!next); }
  }
  async function share() {
    const url = window.location.href;
    try { if (navigator.share) await navigator.share({ title: giftHeadline(g!), url }); else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } } catch { /* cancelled */ }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link to="/gift-cards" className="text-sm font-semibold text-muted hover:text-ink">← All gift cards</Link>

      <div className="mt-3 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Banner */}
        <div className="overflow-hidden rounded-3xl">
          <div className="relative flex h-64 items-end bg-gradient-to-br from-brand to-brand-dark sm:h-80">
            {g.image && <img src={g.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-brand-dark shadow">🎁 Gift card</span>
            {g.discounted && <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow">Save {money(g.value - g.price)}</span>}
            <p className="relative p-6 font-display text-3xl font-extrabold text-white drop-shadow sm:text-4xl">{giftHeadline(g)}</p>
          </div>
        </div>

        {/* Action panel */}
        <div className="card h-fit p-6">
          {b && (
            <Link to={`/business/${b.slug}`} className="flex items-center gap-3 rounded-2xl surface-2 p-3 transition hover:bg-surface">
              {b.logo ? <img src={b.logo} alt="" className="h-11 w-11 rounded-xl object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft">{b.category?.icon ?? "🏬"}</span>}
              <div className="min-w-0">
                <p className="truncate font-display font-bold text-ink">{b.name}</p>
                <p className="flex items-center gap-2 text-xs text-muted">
                  {!!b.rating && <span className="inline-flex items-center gap-0.5"><StarIcon className="h-3 w-3 text-amber-400" />{b.rating.toFixed(1)}</span>}
                  {b.category && <span>{b.category.icon} {b.category.name}</span>}
                </p>
              </div>
            </Link>
          )}
          <p className="mt-4 font-display text-3xl font-extrabold text-ink">{money(g.price)}{g.discounted && <span className="ml-2 text-lg font-semibold text-muted line-through">{money(g.value)}</span>}</p>
          <p className="text-sm text-muted">{validityLabel(g.expiryDays)}{g.kind !== "FIXED" ? " · redeemable in-store" : ""}</p>
          {b?.address && <p className="mt-2 flex items-center gap-1 text-sm text-muted"><MapPinIcon className="h-4 w-4" /> {b.address}</p>}

          <button onClick={() => setBuy(true)} className="btn btn-primary mt-5 w-full py-3 text-base">Buy this gift card</button>
          <div className="mt-2 flex gap-2">
            <button onClick={toggleSave} className={`btn btn-ghost flex-1 py-2.5 ${saved ? "!text-rose-500" : ""}`}><HeartIcon className="h-4 w-4" filled={saved} /> {saved ? "Saved" : "Save"}</button>
            <button onClick={share} className="btn btn-ghost flex-1 py-2.5"><ShareIcon className="h-4 w-4" /> {copied ? "Copied!" : "Share"}</button>
          </div>
          <p className="mt-3 text-center text-xs text-muted">💳 Digital · delivered instantly · send to a friend or schedule it</p>
        </div>
      </div>

      {/* Details */}
      <div className="mt-6 space-y-4">
        {g.description && (
          <section className="card p-5">
            <h2 className="font-display font-bold text-ink">About this gift card</h2>
            <p className="mt-2 text-muted">{g.description}</p>
          </section>
        )}
        <section className="card p-5">
          <h2 className="font-display font-bold text-ink">What's included</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li>✓ {g.kind === "FIXED" ? `${money(g.value)} to spend at ${b?.name ?? "the business"}` : `"${g.name}" at ${b?.name ?? "the business"}`}</li>
            <li>✓ {validityLabel(g.expiryDays)}</li>
            <li>✓ Delivered instantly by email or WhatsApp — with a personal message</li>
            <li>✓ Schedule delivery for a birthday or special date</li>
          </ul>
        </section>
        {g.terms && (
          <section className="card p-5">
            <h2 className="font-display font-bold text-ink">Terms &amp; conditions</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted">{g.terms}</p>
          </section>
        )}
      </div>

      {/* Similar */}
      {!!g.similar?.length && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-extrabold text-ink">Similar gift cards</h2>
          <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{g.similar.map((s) => <GiftCard key={s.id} g={s} onBuy={() => { /* navigate handled by card links */ }} />)}</div>
        </section>
      )}

      {buy && b && <BuyVoucherModal business={{ id: g.businessId, slug: b.slug, name: b.name } as Business} initialTypeId={g.id} onClose={() => setBuy(false)} />}
    </div>
  );
}
