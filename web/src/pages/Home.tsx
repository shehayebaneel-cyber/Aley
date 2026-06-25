import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BusinessCard } from "../components/BusinessCard";
import { ProgressBar, ProjectCard } from "../components/ProjectCard";
import { CalendarIcon, ChevronRight, HandHeartIcon, MapPinIcon, SearchIcon, TagIcon, UsersIcon } from "../components/icons";
import { useContent } from "../context/ContentContext";
import { currency, formatEventDate } from "../lib/api";
import { useFetch } from "../lib/useFetch";
import type { HomeData, ProjectSummary } from "../types";

const CITY = "aley";

export function Home() {
  const { data } = useFetch<HomeData>(`/api/home?city=${CITY}`);
  const { data: projects } = useFetch<ProjectSummary>(`/api/projects/summary?city=${CITY}`);
  const c = useContent();
  const S = c.sections;
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const search = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/explore?q=${encodeURIComponent(q.trim())}`);
  };

  const mainProject = projects?.featured.find((p) => p.status !== "COMPLETED") ?? projects?.featured[0];

  return (
    <div>
      {/* ---- Emotional hero ---- */}
      <section className="relative isolate flex min-h-[78vh] items-center overflow-hidden">
        <div className="absolute inset-0 -z-20">
          <img src={c.hero.image} alt="Aley" className="kenburns h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/45 to-black/80" />
        <div className="mx-auto w-full max-w-7xl px-4 py-20 text-center text-white">
          <span className="fade-up inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">
            <MapPinIcon className="h-4 w-4" /> {c.hero.badge || `${data?.city?.name ?? c.brand.name} · ${data?.city?.nameAr ?? "عاليه"}`}
          </span>
          <h1 className="fade-up mx-auto mt-5 max-w-4xl font-display text-4xl font-extrabold leading-tight drop-shadow-lg sm:text-6xl">
            {c.hero.title}
          </h1>
          <p className="fade-up mx-auto mt-4 max-w-2xl text-lg text-white/90 drop-shadow">
            {c.hero.subtitle}
          </p>

          <form onSubmit={search} className="fade-up mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full bg-white/95 p-2 shadow-2xl">
            <SearchIcon className="ml-3 h-5 w-5 shrink-0 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.hero.searchPlaceholder} className="min-w-0 flex-1 bg-transparent px-1 py-2 text-ink outline-none placeholder:text-muted" />
            <button type="submit" className="btn btn-primary px-6 py-2.5">Search</button>
          </form>

          <div className="fade-up mt-5 flex flex-wrap items-center justify-center gap-2">
            {(data?.categories ?? []).slice(0, 6).map((c) => (
              <Link key={c.id} to={`/explore?category=${c.slug}`} className="rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25">
                {c.icon} {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Trust stats ---- */}
      {S.stats.show && (
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-4 px-4 py-8 sm:grid-cols-6">
          <Stat value={data?.stats?.businesses} label="Businesses" />
          <Stat value={data?.stats?.categories} label="Categories" />
          <Stat value={data?.stats?.events} label="Events" />
          <Stat value={projects ? projects.active + projects.completed : undefined} label="Projects" />
          <Stat value={projects ? currency(projects.totalRaised) : undefined} label="Raised" />
          <Stat value={projects?.contributors} label="Contributors" />
        </div>
      </section>
      )}

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-12">
        {/* Popular categories */}
        <Section show={S.categories.show} title={S.categories.title!} subtitle={S.categories.subtitle} to="/explore">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {(data?.categories ?? []).map((c) => (
              <Link key={c.id} to={`/explore?category=${c.slug}`} className="card card-hover flex flex-col items-center gap-2 p-5 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ background: `${c.color}1a` }}>{c.icon}</span>
                <span className="text-sm font-semibold text-ink">{c.name}</span>
                <span className="text-xs text-muted">{c.count} places</span>
              </Link>
            ))}
          </div>
        </Section>

        {/* Featured businesses */}
        {!!data?.featured?.length && (
          <Section show={S.featured.show} title={S.featured.title!} subtitle={S.featured.subtitle} to="/explore?featured=true">
            <Grid>{data.featured.map((b) => <BusinessCard key={b.id} business={b} showActions />)}</Grid>
          </Section>
        )}

        {/* Help Build Aley — community projects, moved high */}
        {S.community.show && projects && (mainProject || projects.active > 0) && (
          <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand/12 via-surface to-emerald-400/10 p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="chip !border-brand/30 !bg-brand-soft !text-brand-dark"><HandHeartIcon className="h-4 w-4" /> Community</span>
                <h2 className="mt-3 font-display text-2xl font-extrabold text-ink sm:text-3xl">{S.community.title}</h2>
                <p className="mt-1 text-muted">{S.community.subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/projects" className="btn btn-primary px-5 py-2.5">Suggest a Project</Link>
                <Link to="/projects" className="btn btn-ghost px-5 py-2.5">Love Aley ❤</Link>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Pill value={currency(projects.totalRaised)} label="raised" />
              <Pill value={projects.active} label="active" />
              <Pill value={projects.completed} label="completed" />
              <Pill value={projects.contributors} label="contributors" />
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              {/* Main active project spotlight */}
              {mainProject && (
                <div className="card overflow-hidden">
                  <div className="grid sm:grid-cols-2">
                    <div className="relative aspect-video sm:aspect-auto">
                      <img src={mainProject.proposedPhotos[0] ?? mainProject.progressPhotos[0] ?? mainProject.beforePhotos[0] ?? ""} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="p-5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-brand">Spotlight project</span>
                      <h3 className="mt-1 font-display text-lg font-bold text-ink">{mainProject.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{mainProject.description}</p>
                      <div className="mt-3"><ProgressBar raised={mainProject.amountRaised} goal={mainProject.fundingGoal} /></div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link to={`/projects/${mainProject.slug}`} className="btn btn-primary px-4 py-2 text-sm"><HandHeartIcon className="h-4 w-4" /> Donate</Link>
                        <Link to={`/projects/${mainProject.slug}`} className="btn btn-ghost px-4 py-2 text-sm">View expenses</Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Other featured projects */}
              <div className="grid gap-4">
                {projects.featured.filter((p) => p.id !== mainProject?.id).slice(0, 2).map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            </div>
          </section>
        )}

        {/* Hidden Gems */}
        <Section show={S.gems.show} title={S.gems.title!} subtitle={S.gems.subtitle}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {S.gems.items.map((g) => (
              <Link key={g.title} to={g.to} className="group relative aspect-[4/3] overflow-hidden rounded-2xl">
                <img src={g.img} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="font-display text-lg font-bold drop-shadow">{g.title}</p>
                  <p className="text-sm text-white/85">{g.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        {/* Offers */}
        {!!data?.offers?.length && (
          <Section show={S.offers.show} title={S.offers.title!} subtitle={S.offers.subtitle} to="/offers">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.offers.map((o) => (
                <Link key={o.id} to={o.business ? `/business/${o.business.slug}` : "/offers"} className="card card-hover group flex overflow-hidden">
                  {o.image && <img src={o.image} alt="" loading="lazy" className="h-28 w-28 shrink-0 object-cover" />}
                  <div className="flex flex-col justify-center p-4">
                    <span className="chip !py-0.5 !text-[11px] self-start"><TagIcon className="h-3.5 w-3.5 text-accent" /> {o.type.replace("_", " ")}</span>
                    <p className="mt-1 font-display font-bold text-ink">{o.title}</p>
                    <p className="line-clamp-1 text-sm text-muted">{o.business?.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Events */}
        {!!data?.events?.length && (
          <Section show={S.events.show} title={S.events.title!} subtitle={S.events.subtitle} to="/events">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.events.map((e) => (
                <div key={e.id} className="card card-hover overflow-hidden">
                  {e.image && <img src={e.image} alt="" loading="lazy" className="h-36 w-full object-cover" />}
                  <div className="p-4">
                    <span className="chip !py-0.5 !text-[11px]"><CalendarIcon className="h-3.5 w-3.5 text-brand" /> {e.category}</span>
                    <p className="mt-2 font-display font-bold text-ink">{e.title}</p>
                    <p className="text-sm text-muted">{formatEventDate(e.startTime)} · {e.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Map CTA */}
        {S.mapCta.show && (
        <Link to="/map" className="card card-hover relative flex items-center justify-between gap-4 overflow-hidden bg-gradient-to-r from-brand to-brand-dark p-8 text-white">
          <div>
            <h3 className="font-display text-2xl font-extrabold">{S.mapCta.title}</h3>
            <p className="mt-1 text-white/85">{S.mapCta.subtitle}</p>
          </div>
          <span className="btn bg-white/15 px-5 py-2.5 backdrop-blur">Open map <ChevronRight className="h-5 w-5" /></span>
        </Link>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string | number | undefined; label: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{value ?? "—"}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function Pill({ value, label }: { value: string | number; label: string }) {
  return <span className="rounded-full bg-surface px-4 py-2 shadow-sm"><b className="text-ink">{value}</b> <span className="text-muted">{label}</span></span>;
}

function Section({ title, subtitle, to, show = true, children }: { title: string; subtitle?: string; to?: string; show?: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-muted">{subtitle}</p>}
        </div>
        {to && <Link to={to} className="shrink-0 text-sm font-semibold text-brand hover:text-brand-dark">See all →</Link>}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}
