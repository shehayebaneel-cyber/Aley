import { Link } from "react-router-dom";
import { PRICE } from "../lib/api";
import type { Business } from "../types";
import { FavoriteButton } from "./FavoriteButton";
import { BookIcon, MapPinIcon, PhoneIcon, StarIcon, TruckIcon, VerifiedIcon, WhatsAppIcon } from "./icons";

export function BusinessCard({ business: b, showActions = false }: { business: Business; showActions?: boolean }) {
  const wa = (b.whatsapp || "").replace(/[^\d]/g, "");
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <Link to={`/business/${b.slug}`} className="card card-hover group block overflow-hidden">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        {b.cover && (
          <img
            src={b.cover}
            alt={b.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <span
          className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white backdrop-blur"
          style={{ background: `${b.category.color}cc` }}
        >
          {b.category.icon} {b.category.name}
        </span>
        <span
          className={`absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold ${
            b.openNow ? "bg-emerald-500/90 text-white" : "bg-black/55 text-white"
          }`}
        >
          {b.openNow ? "Open" : "Closed"}
        </span>
        <FavoriteButton businessId={b.id} className="absolute right-3 top-3" />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex items-center gap-1 font-display text-lg font-bold text-ink">
            <span className="truncate">{b.name}</span>
            {b.isVerified && <VerifiedIcon className="h-4 w-4 shrink-0 text-brand" />}
          </h3>
          <span className="shrink-0 text-sm font-semibold text-muted">{PRICE(b.priceRange)}</span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted">{b.tagline}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1 font-semibold text-ink">
            <StarIcon className="h-4 w-4 text-amber-400" />
            {b.rating > 0 ? b.rating.toFixed(1) : "New"}
            <span className="font-normal text-muted">({b.reviewCount})</span>
          </span>
          {b.address && (
            <span className="inline-flex items-center gap-1 truncate text-muted">
              <MapPinIcon className="h-4 w-4" /> {b.address}
            </span>
          )}
        </div>

        {(b.hasDelivery || b.hasReservations) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {b.hasDelivery && (
              <span className="chip !py-1 !text-xs">
                <TruckIcon /> Delivery
              </span>
            )}
            {b.hasReservations && (
              <span className="chip !py-1 !text-xs">
                <BookIcon /> Reservations
              </span>
            )}
          </div>
        )}

        {showActions && (
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
            {b.phone ? (
              <a href={`tel:${b.phone}`} onClick={stop} className="btn btn-ghost py-2 text-xs"><PhoneIcon className="h-4 w-4" /> Call</a>
            ) : (
              <span className="btn btn-ghost cursor-default py-2 text-xs opacity-40"><PhoneIcon className="h-4 w-4" /> Call</span>
            )}
            {wa ? (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" onClick={stop} className="btn py-2 text-xs bg-emerald-500 text-white"><WhatsAppIcon className="h-4 w-4" /> Chat</a>
            ) : (
              <span className="btn btn-ghost cursor-default py-2 text-xs opacity-40"><WhatsAppIcon className="h-4 w-4" /> Chat</span>
            )}
            <span className="btn btn-primary py-2 text-xs">View</span>
          </div>
        )}
      </div>
    </Link>
  );
}
