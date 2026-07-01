import { Link } from "react-router-dom";
import type { CollectionCard as CollectionCardT } from "../types";

/** A Discover collection tile — cover image, emoji, title, description. */
export function CollectionCard({ c, size = "md" }: { c: CollectionCardT; size?: "md" | "lg" }) {
  return (
    <Link to={`/collections/${c.slug}`} className="card card-hover group relative block overflow-hidden">
      <div className={`relative ${size === "lg" ? "h-56" : "h-44"} bg-surface-2`}>
        {c.coverImage ? (
          <img src={c.coverImage} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand to-brand-dark text-5xl">{c.emoji}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <p className="font-display text-xl font-extrabold drop-shadow">{c.emoji} {c.title}</p>
          {c.description && <p className="mt-0.5 line-clamp-2 text-sm text-white/85">{c.description}</p>}
          <p className="mt-1 text-xs font-semibold text-white/80">{c.count} place{c.count === 1 ? "" : "s"} →</p>
        </div>
      </div>
    </Link>
  );
}
