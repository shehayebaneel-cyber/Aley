import { Link } from "react-router-dom";
import { HeartIcon } from "./icons";
import { useUserAuth } from "../context/UserAuthContext";
import type { Offer } from "../types";

const OFFER_EMOJI: Record<string, string> = {
  PERCENT: "🏷️", BOGO: "🎯", FREE_ITEM: "🎁", HAPPY_HOUR: "🍹", PACKAGE: "📦",
  STUDENT: "🎓", BIRTHDAY: "🎂", SEASONAL: "❄️", FIRST_VISIT: "👋", LOYALTY: "⭐", DISCOUNT: "🏷️",
};
export const offerEmoji = (t: string) => OFFER_EMOJI[t] ?? "🏷️";

/** Short human expiry label, or null if no end date. */
export function expiryLabel(o: Offer): string | null {
  if (o.daysLeft == null) return null;
  if (o.daysLeft < 0) return "Expired";
  if (o.daysLeft === 0) return "Ends today";
  if (o.daysLeft === 1) return "Ends tomorrow";
  if (o.daysLeft <= 14) return `${o.daysLeft} days left`;
  return o.endDate ? `Until ${new Date(o.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : null;
}

export function OfferCard({ offer, size = "md" }: { offer: Offer; size?: "md" | "lg" }) {
  const { isSavedOffer, toggleSaveOffer } = useUserAuth();
  const saved = isSavedOffer(offer.id);
  const exp = expiryLabel(offer);
  const big = size === "lg";

  return (
    <Link to={`/offer/${offer.id}`} className="card card-hover group relative flex flex-col overflow-hidden">
      <div className={`relative overflow-hidden bg-surface-2 ${big ? "h-52" : "h-44"}`}>
        {offer.image ? (
          <img src={offer.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">{offerEmoji(offer.type)}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" />

        {/* Big discount badge */}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-xl bg-accent px-3 py-1.5 text-sm font-extrabold text-white shadow-lg">
          {offerEmoji(offer.type)} {offer.badge}
        </span>

        {/* status ribbon */}
        {offer.isExpiringSoon && exp && (
          <span className="absolute right-12 top-3 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white shadow">⏳ {exp}</span>
        )}
        {!offer.isExpiringSoon && offer.isNew && (
          <span className="absolute right-12 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow">NEW</span>
        )}

        {/* save heart */}
        <button
          onClick={(e) => { e.preventDefault(); toggleSaveOffer(offer.id); }}
          aria-label={saved ? "Unsave offer" : "Save offer"}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow backdrop-blur transition hover:bg-white"
        >
          <HeartIcon className="h-4 w-4" filled={saved} />
        </button>

        {/* business chip on image */}
        {offer.business && (
          <div className="absolute bottom-2 left-3 right-3 flex items-center gap-2">
            {offer.business.logo && <img src={offer.business.logo} alt="" className="h-6 w-6 rounded-full border border-white/60 object-cover" />}
            <span className="truncate text-xs font-semibold text-white drop-shadow">{offer.business.name}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Offer title is the hero text */}
        <h3 className={`font-display font-extrabold leading-snug text-ink ${big ? "text-xl" : "text-lg"} line-clamp-2`}>{offer.title}</h3>
        {offer.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{offer.description}</p>}
        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
            {offer.business?.category && <>{offer.business.category.icon} {offer.business.category.name}</>}
          </span>
          {exp && !offer.isExpiringSoon && <span className="text-xs font-medium text-muted">{exp}</span>}
        </div>
        <span className="mt-3 inline-flex items-center justify-center rounded-full bg-brand-soft py-2 text-sm font-bold text-brand-dark transition group-hover:bg-brand group-hover:text-white">
          View deal
        </span>
      </div>
    </Link>
  );
}
