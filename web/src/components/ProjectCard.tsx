import { Link } from "react-router-dom";
import { currency, PROJECT_STATUS } from "../lib/api";
import type { Project } from "../types";
import { MapPinIcon, UsersIcon } from "./icons";

export function ProgressBar({ raised, goal }: { raised: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  return (
    <div>
      <div className="h-2.5 overflow-hidden rounded-full surface-2">
        <div className="h-full rounded-full bg-gradient-to-r from-brand to-emerald-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-sm">
        <span className="font-bold text-ink">{currency(raised)} <span className="font-normal text-muted">raised</span></span>
        <span className="font-semibold text-brand">{pct}%</span>
      </div>
    </div>
  );
}

export function ProjectCard({ project: p }: { project: Project }) {
  const cover = p.proposedPhotos[0] ?? p.progressPhotos[0] ?? p.beforePhotos[0] ?? null;
  const st = PROJECT_STATUS[p.status];
  return (
    <Link to={`/projects/${p.slug}`} className="card card-hover group block overflow-hidden">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        {cover && <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
        {p.type && <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">{p.type}</span>}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 font-display text-lg font-bold text-ink">{p.title}</h3>
        {p.location && <p className="mt-0.5 flex items-center gap-1 text-sm text-muted"><MapPinIcon className="h-4 w-4" /> {p.location}</p>}
        <div className="mt-3"><ProgressBar raised={p.amountRaised} goal={p.fundingGoal} /></div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span className="inline-flex items-center gap-1"><UsersIcon className="h-3.5 w-3.5" /> {p.contributorCount} contributors</span>
          <span>Goal {currency(p.fundingGoal)}</span>
        </div>
      </div>
    </Link>
  );
}
