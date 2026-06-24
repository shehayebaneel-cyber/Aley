import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProjectCard } from "../components/ProjectCard";
import { CheckIcon, HandHeartIcon, StarIcon, UsersIcon } from "../components/icons";
import { useContent } from "../context/ContentContext";
import { api, currency } from "../lib/api";
import type { Project, ProjectSummary } from "../types";

const CITY = "aley";

export function LoveAley() {
  const c = useContent();
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [active, setActive] = useState<Project[]>([]);
  const [completed, setCompleted] = useState<Project[]>([]);

  useEffect(() => {
    api.get<ProjectSummary>(`/api/projects/summary?city=${CITY}`).then(setSummary);
    api.get<Project[]>(`/api/projects?city=${CITY}&status=FUNDING`).then(setActive);
    api.get<Project[]>(`/api/projects?city=${CITY}&status=COMPLETED`).then(setCompleted);
  }, []);

  const actions = [
    { icon: "💡", title: "Suggest an improvement", desc: "Propose a project that makes Aley better.", to: "/projects" },
    { icon: "🗳️", title: "Vote on projects", desc: "Tell us which ideas matter most to you.", to: "/projects" },
    { icon: "💚", title: "Donate", desc: "Fund a project you believe in.", to: "/projects" },
    { icon: "🙌", title: "Volunteer", desc: "Lend your time and skills to the community.", to: "/contact" },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img src={c.loveAley.image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 to-black/80" />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center text-white">
          <h1 className="font-display text-4xl font-extrabold drop-shadow sm:text-5xl">{c.loveAley.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">{c.loveAley.subtitle}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/projects" className="btn btn-primary px-6 py-3"><HandHeartIcon className="h-5 w-5" /> Support a project</Link>
            <Link to="/projects" className="btn bg-white/15 px-6 py-3 text-white backdrop-blur">Suggest an improvement</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12">
        {/* Stats */}
        {summary && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { v: currency(summary.totalRaised), l: "raised for Aley" },
              { v: summary.active, l: "active projects" },
              { v: summary.completed, l: "completed" },
              { v: summary.contributors, l: "contributors" },
            ].map((s) => (
              <div key={s.l} className="card p-5 text-center">
                <p className="font-display text-3xl font-extrabold text-ink">{s.v}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{s.l}</p>
              </div>
            ))}
          </div>
        )}

        {/* Ways to help */}
        <section>
          <h2 className="font-display text-2xl font-extrabold text-ink">Ways to help</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {actions.map((a) => (
              <Link key={a.title} to={a.to} className="card card-hover p-5">
                <span className="text-3xl">{a.icon}</span>
                <p className="mt-2 font-display font-bold text-ink">{a.title}</p>
                <p className="mt-1 text-sm text-muted">{a.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Active projects */}
        {active.length > 0 && (
          <section>
            <div className="mb-5 flex items-end justify-between">
              <h2 className="font-display text-2xl font-extrabold text-ink">Projects you can fund now</h2>
              <Link to="/projects" className="text-sm font-semibold text-brand">See all →</Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{active.map((p) => <ProjectCard key={p.id} project={p} />)}</div>
          </section>
        )}

        {/* Before / after */}
        {completed.some((p) => p.beforePhotos[0] && p.progressPhotos[0]) && (
          <section>
            <h2 className="font-display text-2xl font-extrabold text-ink">Before & after</h2>
            <p className="mt-1 text-muted">Real results, funded by the community.</p>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              {completed.filter((p) => p.beforePhotos[0] && p.progressPhotos[0]).map((p) => (
                <Link key={p.id} to={`/projects/${p.slug}`} className="card card-hover overflow-hidden">
                  <div className="grid grid-cols-2">
                    <div className="relative"><img src={p.beforePhotos[0]} alt="before" className="aspect-[4/3] w-full object-cover" /><span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">Before</span></div>
                    <div className="relative"><img src={p.progressPhotos[0]} alt="after" className="aspect-[4/3] w-full object-cover" /><span className="absolute left-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-bold text-white">After</span></div>
                  </div>
                  <div className="p-4">
                    <p className="font-display font-bold text-ink">{p.title}</p>
                    <p className="text-sm text-muted">Raised {currency(p.amountRaised)} · {p.contributorCount} contributors</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Transparency + Report an issue */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink"><CheckIcon className="h-5 w-5 text-brand" /> Full transparency</h2>
            <p className="mt-2 text-muted">Every project publishes its donations, expenses, receipts, and a final cost report. Nothing is hidden.</p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              <li className="flex items-center gap-2"><UsersIcon className="h-4 w-4 text-brand" /> Public donation lists</li>
              <li className="flex items-center gap-2"><StarIcon className="h-4 w-4 text-brand" /> Itemised expense breakdowns + receipts</li>
              <li className="flex items-center gap-2"><HandHeartIcon className="h-4 w-4 text-brand" /> Contractor quotations & final reports</li>
            </ul>
            <Link to="/projects" className="btn btn-ghost mt-4 px-5 py-2.5">View expense reports</Link>
          </section>

          <ReportIssue />
        </div>
      </div>
    </div>
  );
}

function ReportIssue() {
  const [form, setForm] = useState({ title: "", location: "", description: "", submittedBy: "" });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !form.title.trim()) return;
    setBusy(true);
    try {
      // Recorded for the team as a "report" suggestion.
      await api.post("/api/projects/suggest", { ...form, type: "Issue / Report" });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6">
      <h2 className="font-display text-xl font-bold text-ink">Report an issue</h2>
      <p className="mt-1 text-sm text-muted">See a pothole, broken light, or something that needs fixing? Let the team know.</p>
      {done ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600"><CheckIcon className="h-5 w-5" /> Thanks! Your report was submitted.</div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What's the issue?" className="input" />
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="input" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe it…" className="input" />
          <input value={form.submittedBy} onChange={(e) => setForm({ ...form, submittedBy: e.target.value })} placeholder="Your name (optional)" className="input" />
          <button disabled={busy} className="btn btn-primary px-6 py-2.5 disabled:opacity-60">Submit report</button>
        </form>
      )}
    </section>
  );
}
