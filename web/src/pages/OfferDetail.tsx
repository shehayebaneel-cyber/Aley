import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ClaimOfferModal } from "../components/ClaimOfferModal";
import { OfferCard, offerEmoji, expiryLabel } from "../components/OfferCard";
import { HeartIcon, ShareIcon, MapPinIcon, StarIcon, ClockIcon } from "../components/icons";
import { useUserAuth } from "../context/UserAuthContext";
import { useFetch } from "../lib/useFetch";
import type { OfferDetail as OfferDetailT } from "../types";

export function OfferDetail() {
  const { id } = useParams();
  const { data: offer, loading } = useFetch<OfferDetailT>(`/api/offers/${id}`);
  const { isSavedOffer, toggleSaveOffer } = useUserAuth();
  const [claim, setClaim] = useState(false);
  const [copied, setCopied] = useState(false);

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-16 text-muted">Loading…</div>;
  if (!offer) return <div className="mx-auto max-w-md px-4 py-24 text-center"><p className="text-lg font-semibold text-ink">Offer not found.</p><Link to="/offers" className="btn btn-primary mt-4 px-6 py-2.5">Browse offers</Link></div>;

  const saved = isSavedOffer(offer.id);
  const exp = expiryLabel(offer);
  const b = offer.business;

  async function share() {
    const url = window.location.href;
    const data = { title: offer!.title, text: `${offer!.badge} — ${offer!.title}`, url };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch { /* cancelled */ }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link to="/offers" className="text-sm font-semibold text-muted hover:text-ink">← All offers</Link>

      <div className="mt-3 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Banner */}
        <div className="overflow-hidden rounded-3xl">
          <div className="relative h-64 bg-surface-2 sm:h-80">
            {offer.image ? <img src={offer.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-7xl">{offerEmoji(offer.type)}</div>}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-xl bg-accent px-3.5 py-2 text-base font-extrabold text-white shadow-lg">{offerEmoji(offer.type)} {offer.badge}</span>
            {offer.isExpiringSoon && exp && <span className="absolute right-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">⏳ {exp}</span>}
          </div>
        </div>

        {/* Action panel */}
        <div className="card h-fit p-6">
          <p className="text-sm font-semibold text-brand">{offer.typeLabel}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight text-ink">{offer.title}</h1>
          {offer.description && <p className="mt-2 text-muted">{offer.description}</p>}

          {b && (
            <Link to={`/business/${b.slug}`} className="mt-4 flex items-center gap-3 rounded-2xl surface-2 p-3 transition hover:bg-surface">
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

          <div className="mt-4 space-y-2 text-sm">
            {exp && <p className="flex items-center gap-2 text-ink"><ClockIcon className="h-4 w-4 text-muted" /> {exp}</p>}
            {b?.address && <p className="flex items-center gap-2 text-muted"><MapPinIcon className="h-4 w-4" /> {b.address}</p>}
            {offer.remaining != null && <p className="text-xs font-medium text-amber-600">Only {offer.remaining} left!</p>}
          </div>

          <button onClick={() => setClaim(true)} disabled={offer.soldOut} className="btn btn-primary mt-5 w-full py-3 text-base disabled:opacity-50">
            {offer.soldOut ? "Fully claimed" : "Claim offer"}
          </button>
          <div className="mt-2 flex gap-2">
            <button onClick={() => toggleSaveOffer(offer.id)} className={`btn btn-ghost flex-1 py-2.5 ${saved ? "!text-rose-500" : ""}`}><HeartIcon className="h-4 w-4" filled={saved} /> {saved ? "Saved" : "Save"}</button>
            <button onClick={share} className="btn btn-ghost flex-1 py-2.5"><ShareIcon className="h-4 w-4" /> {copied ? "Copied!" : "Share"}</button>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {offer.redeemInfo && (
            <section className="card p-5">
              <h2 className="font-display font-bold text-ink">How to redeem</h2>
              <p className="mt-2 text-sm text-muted">{offer.redeemInfo}</p>
            </section>
          )}
          <section className="card p-5">
            <h2 className="font-display font-bold text-ink">Terms & conditions</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted">{offer.terms || "Standard terms apply. Subject to availability. Cannot be combined with other promotions. Present your claim code at the business to redeem."}</p>
          </section>
        </div>
      </div>

      {/* Similar */}
      {!!offer.similar?.length && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-extrabold text-ink">Similar offers</h2>
          <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{offer.similar.map((o) => <OfferCard key={o.id} offer={o} />)}</div>
        </section>
      )}

      {claim && <ClaimOfferModal offer={offer} onClose={() => setClaim(false)} />}
    </div>
  );
}
